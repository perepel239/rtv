/**
 * Manager for smart sockets
 */
import os from 'os';
import path from 'path';
import fs from 'fs-extra';
import Loggee from 'loggee';
import fetch from 'node-fetch';
import { throwIf } from '../../helpers';
import { values as config } from '../../config';

const GET_INFO_URL = 'https://api.iot.yandex.net/v1.0/user/info';
const TOGGLE_REQUEST_URL = 'https://api.iot.yandex.net/v1.0/devices/actions';
const TOGGLE_DATA = `{"devices":[{"id": "{SOCKET_ID}","actions": \
  [{"type": "devices.capabilities.on_off", "state": {"instance": "on", "value": {IS_ON}}}]}]}`;
const logger = Loggee.create('smart-sockets-manager');

const SMART_SOCKETS_FILE = path.join(os.homedir(), '.smart-sockets');
let smartSockets: Record<string, string> = {};

export function init() {
  try {
    fs.ensureFileSync(SMART_SOCKETS_FILE);
    const data = fs.readFileSync(SMART_SOCKETS_FILE, 'utf8');
    if (data && data.length) {
      smartSockets = JSON.parse(data);
    }
  } catch (err) {
    logger.error(err);
  }
}

export function get(ip: string) {
  return smartSockets[ip] || '';
}

export async function getSmartSocketInfo(ip: string) {
  const socketId = get(ip);

  if (!socketId) return { ip: ip };

  const response = await fetch(GET_INFO_URL, {
    method: 'GET',
    headers: { Authorization: 'Bearer ' + config.smartSocketControlToken },
  });
  const text = await response.text();
  logger.log(`RESPONSE (${response.status}):`, text);
  const json = text ? JSON.parse(text) : null;
  throwIf(!response.ok, (json && json.message) || text);

  try {
    const devices = json.devices as Array<any>;
    const device = devices.find((x) => x.id === socketId);
    const capabilities = device.capabilities as Array<any>;
    const onOffValue = capabilities.find((x) => x.type === 'devices.capabilities.on_off')?.state.value === true;
    return { ip: ip, isOn: onOffValue };
  } catch {
    logger.log('Failed to parse socket state response.');
  }

  return { ip: ip };
}

export async function toggleSmartSocket(ip: string, isOn: string) {
  const socketId = get(ip);

  if (!socketId) return null;

  const response = await fetch(TOGGLE_REQUEST_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + config.smartSocketControlToken },
    body: TOGGLE_DATA.replace('{SOCKET_ID}', socketId).replace('{IS_ON}', isOn),
  });
  const text = await response.text();
  logger.log(`RESPONSE (${response.status}):`, text);
  const json = text ? JSON.parse(text) : null;
  throwIf(!response.ok, (json && json.message) || text);
  return json;
}
