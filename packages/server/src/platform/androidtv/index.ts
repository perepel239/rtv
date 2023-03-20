/**
 * Module for communicating with AndroidTV.
 */

import Loggee from 'loggee';
import { getKnownTvs } from '../../api/tv/service';
import { getAliasByAppId } from '../../api/app/service';
import { NotNullOrUndefined } from '../../helpers';
import { tryExecCmd } from '../../helpers/cli';
import remoteKeys from './remote-keys';

const logger = Loggee.create('androidtv');
const DEBUG_PORT = 5555;
const REMOTE_CONTROL_PORT = 1239;
const FETCH_DEBUG_SESSION_TIMEOUT = 3000;
const INSTALL_APK_TIMEOUT = 120 * 1000;

/**
 * Platform name
 */
export const NAME = 'androidtv';

/**
 * TODO
 */
export const WAKE_UP_PORT = undefined;

/**
 * TODO Init if any
 */
//export const init = function () {

//};

/**
 * Installs app on TV.
 */
export const installApp = async function (tvIp: string, packagePath: string) {
  const result = await tryExecCmd(
    `adb -s ${tvIp}:${DEBUG_PORT} install ${packagePath}`,
    undefined,
    { isSilent: false },
    INSTALL_APK_TIMEOUT
  );

  return { result };
};

/**
 * Uninstall app from TV.
 */
export const uninstallApp = async function (tvIp: string, appId: string) {
  const result = await tryExecCmd(`adb -s ${tvIp}:${DEBUG_PORT} uninstall ${appId}`);

  return { result };
};

/**
 * Get app state on TV.
 */
export const getAppState = async function (tvIp: string, appId: string) {
  const appList = await getAppList(tvIp);
  const installed = appList.map((app) => app.appId).includes(appId);

  return installed ? { installed: true, running: true } : { installed: false, running: false };
};

/**
 * Launch app on TV.
 */
export const launchApp = async function (tvIp: string, appId: string, params?: Record<string, string>) {
  const result = await tryExecCmd(
    `adb -s ${tvIp}:${DEBUG_PORT} shell monkey -p ${appId} -c android.intent.category.LAUNCHER 1`
  );

  return { result };
};

/**
 * Close app on TV.
 */
export const closeApp = async function (tvIp: string, appId: string) {
  const result = await tryExecCmd(`adb -s ${tvIp}:${DEBUG_PORT} shell am force-stop ${appId}`);

  return { result };
};

/**
 * Gets list of installed apps.
 */
export const getAppList = async function (tvIp: string) {
  const packagesList = await tryExecCmd(`adb -s ${tvIp}:${DEBUG_PORT} shell pm list packages`);

  return packagesList
    .replace(/package:/g, '')
    .split('\n')
    .map((appId) => ({ appId, alias: getAliasByAppId(appId, NAME) }));
};

/**
 * Discovers AndroidTV devices.
 *
 * @param {boolean}
 * @returns {Promise<Array>}
 */
export const discoverTVs = async function () {
  const allDevices = getKnownTvs().filter((tv) => tv.platform === NAME);
  const devices = await Promise.all(
    allDevices.map(async (tv) => {
      const isActive = await isActiveDebugSession(tv.ip);
      return isActive ? tv : undefined;
    })
  );

  return devices.filter(NotNullOrUndefined);
};

export const isReady = async function (ip: string, timeout?: number) {
  return isActiveDebugSession(ip, timeout);
};

/**
 * Get info about TV.
 *
 * @returns {Promise<Object>}
 */
export const getTVInfo = async function () {
  return {};
};
/**
 * Wait until TV is ready
 */
export const waitForReady = async function () {
  throw new Error('Not implemented');
};

/**
 * Returns developer panel url.
 */
export const getDevPanelUrl = async function () {
  throw new Error('Not implemented');
};

/**
 * Returns tv logs url.
 */
export const getLogsUrl = async function () {
  throw new Error('Not implemented');
};

/**
 * Debug app on TV.
 */
export const debugApp = async function (tvIP: string) {
  throw new Error('Not implemented. Please close manually');
};

/**
 * launch browser with optional url.
 */
export const launchBrowser = async function () {
  throw new Error('Not implemented');
};

export const packApp = async function () {
  throw new Error('Not implemented');
};

export const saveTv = function () {
  // No-op for PS
};

export const deleteTv = function () {
  // No-op for PS
};

export const enableDevMode = async function (tvIP: string) {
  const result = await tryExecCmd(`adb connect ${tvIP}`);

  return result;
};

export const getRemoteControlWsInfo = async function (tvIP: string) {
  return {
    rawWsUrl: `ws://${tvIP}:${REMOTE_CONTROL_PORT}`,
    payloadPattern: '{{KEY}}',
    keys: remoteKeys,
  };
};

async function isActiveDebugSession(ip: string, timeout = FETCH_DEBUG_SESSION_TIMEOUT) {
  try {
    //const response = await fetch(`http://${ip}:${DEBUG_PORT}`, {
    // TODO: use AbortController
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    //  timeout,
    //});
    //return response.status === 200;
    return true;
  } catch (e) {
    return false;
  }
}
