/**
 * Handlers for tv routes
 */
import { URL } from 'url';
import { Request, Response } from 'express';
import Loggee from 'loggee';
import * as platform from '../../platform';
import { sendXml, send404 } from '../protocol';
import { getServerOrigin, getServerOriginWs } from '../../helpers/srv';
import { switchVPN } from '../../helpers/network';
import { proxyUrlAsPath } from '../../proxy/helper';
import { RTV_USER, getRtvUserFromExpressRequest } from '../../helpers/rtv-user';
import { formatLastUsedInfo, freeTv as free, getTvLastUsed, whoIsUsingTv } from '../../helpers/tv-last-used';
import * as wol from '../../platform/shared/smart-wol';
import { getAppByAppId } from '../app/service';
import * as TvService from './service';
import * as SmartSocketManager from './smart-sockets';
import { KnownTv, RemoteControlInfo, Result, SmartSocketInfo, TVInfo, URLInfo } from './types';

const logger = Loggee.create();

interface PkgInfo {
  downloadPath: string;
  size: string;
}

export const getKnownTvs = async (req: Request, res: Response<KnownTv[]>) => {
  let tvs = TvService.getKnownTvs();
  const showInvisible = req.query.showInvisible === 'true';
  if (!showInvisible) {
    tvs = tvs.filter((device) => device.isVisible !== false);
  }
  const additionalInfo = req.query.additionalInfo === 'true';
  if (additionalInfo) {
    tvs = await Promise.all(
      tvs.map(async (tv) => ({
        ...tv,
        lastUsed: formatLastUsedInfo(getTvLastUsed(tv.ip)),
        occupied: whoIsUsingTv(tv.ip),
        online: await platform.isOnline(tv.ip, tv.platform),
      }))
    );
  }
  res.json(tvs);
};

export const saveKnownTv = async (req: Request<unknown, unknown, KnownTv>, res: Response<KnownTv>) => {
  const tv = req.body;
  await platform.saveTv(tv);
  await switchVPN(tv.ip, tv.vpn);
  const newTv = TvService.saveKnownTv(tv);
  res.json(newTv);
};

export const deleteKnownTv = async (req: Request, res: Response<void>) => {
  const id = req.params.id;
  await platform.deleteTv(id);
  TvService.deleteKnownTv(id);
  res.end();
};

export const getTvList = async (req: Request, res: Response<KnownTv[]>) => {
  const devices = await platform.discoverTVs();
  res.json(devices);
};

export const getTvInfo = async (req: Request, res: Response<TVInfo>) => {
  const ip = req.query.ip as string;
  const info = await platform.getTVInfo(ip);
  const online = await platform.isOnline(ip, info.platform);
  res.json({
    ...info,
    lastUsed: formatLastUsedInfo(getTvLastUsed(ip)),
    online,
  });
};

export const getDevPanelUrl = async (req: Request, res: Response<URLInfo>) => {
  const relativeUrl = await platform.getDevPanelUrl(req.query.ip as string);
  const origin = getServerOrigin(req);
  const url = `${origin}${relativeUrl}`;
  res.json({ url });
};

export const getLogsUrl = async (req: Request, res: Response<URLInfo>) => {
  const relativeUrl = await platform.getLogsUrl(req.query.ip as string);
  const origin = getServerOrigin(req);
  const url = `${origin}${relativeUrl}`;
  res.json({ url });
};

export const launchBrowser = async (req: Request, res: Response<Result>) => {
  const { ip, url } = req.query as Record<string, string>;
  const result = await platform.launchBrowser(ip, url);
  res.json({ result });
};

export const wakeUpTv = async (req: Request, res: Response<Result>) => {
  const { ip } = req.query as Record<string, string>;
  const port = await platform.getWakeUpPort(ip);
  if (port === null) {
    throw new Error('Not supported by platform');
  }
  try {
    await wol.wakeUpTv(ip, port);
  } catch (error) {
    logger.log(error);
  }

  await platform.waitForReady(ip);
  res.json({ result: `Wake up tv with ip ${ip}` });
};

export const getRemoteControlWsInfo = async (req: Request, res: Response<RemoteControlInfo>) => {
  const { ip } = req.query as Record<string, string>;
  const remoteInfo = await platform.getRemoteControlWsInfo(ip);
  const wsUrl = new URL(`${getServerOriginWs(req)}${proxyUrlAsPath(remoteInfo.rawWsUrl)}`);
  wsUrl.searchParams.append(RTV_USER, getRtvUserFromExpressRequest(req));
  res.json({ ...remoteInfo, wsUrl: wsUrl.href });
};

export const enableDevMode = async (req: Request, res: Response<Result>) => {
  const result = await platform.enableDevMode(req.query.ip as string);
  res.json({ result });
};

export const freeTv = async (req: Request, res: Response<Result>) => {
  const { ip } = req.query as Record<string, string>;
  free(ip);
  res.json({ result: `TV ${ip} is free now` });
};

export const getSmartSocketInfo = async (req: Request, res: Response<SmartSocketInfo>) => {
  const { ip } = req.query as Record<string, string>;
  const result = await SmartSocketManager.getSmartSocketInfo(ip);
  res.json({ ip: `${ip}`, isOn: result?.isOn });
};

export const toggleSmartSocket = async (req: Request, res: Response<Result>) => {
  const { ip, isOn } = req.query as Record<string, string>;
  const result = await SmartSocketManager.toggleSmartSocket(ip, isOn);
  res.json({ result });
};

export const getWidgetlist = async (req: Request, res: Response<string>) => {
  const tv = TvService.getKnownTv(req.ip);
  if (!tv || !tv.pkgUrls) {
    send404(`No pkg URLs found for tv ${req.ip}`, req, res);
    return;
  }

  const serverUrl = getServerOrigin(req);
  const pkgUrls = tv.pkgUrls;
  const appIds = Object.keys(pkgUrls);
  const widgetList = appIds.map((appId) => widgetInfo(appId, pkgUrls[appId], serverUrl)).filter(Boolean);

  const xml = `
<?xml version="1.0" encoding="UTF-8"?>
<rsp stat="ok">
<list>
  ${widgetList.join('\n')}
</list>
</rsp>
`.trim();

  sendXml(xml, res);
};

function widgetInfo(appId: string, app: PkgInfo | undefined, serverUrl: string) {
  const knownApp = getAppByAppId(appId, 'orsay');
  if (!knownApp || !app) {
    return null;
  }

  return `
<widget id="${appId}">
  <title>${knownApp.alias}</title>
  <compression size="${app.size}" type="zip"/>
  <description>${knownApp.description}</description>
  <download>${serverUrl}${app.downloadPath}</download>
</widget>
`.trim();
}
