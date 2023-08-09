import { TVInfo, KnownTv, Result, SmartSocketInfo } from 'rtv-server';
import { WsRemoteControl } from '../remote-control/ws-remote-control';
import ApiBase from './common/api-base';

// eslint-disable-next-line @typescript-eslint/no-empty-function
const noop = () => {};
const WAKE_UP_TIMEOUT = 60000;

export default class TV extends ApiBase {
  /**
   * TVs list with brief information
   */
  async list({ fullscan = false } = {}): Promise<TVInfo[]> {
    return this._request({
      path: 'tv/list',
      queryObj: { fullscan },
    });
  }

  /**
   * Get known TVs
   */
  async getKnownTvs({ showInvisible = false, additionalInfo = false } = {}): Promise<KnownTv[]> {
    return this._request({
      path: 'tv/known',
      queryObj: { showInvisible, additionalInfo },
    });
  }

  /**
   * Save known TV
   */
  async saveKnownTv(tv: Omit<KnownTv, 'id'>) {
    return this._request({
      path: 'tv/known',
      options: {
        method: 'post',
        body: JSON.stringify(tv),
        headers: {
          'content-type': 'application/json',
        },
      },
    });
  }

  /**
   * Delete known TV
   */
  async deleteKnownTv(id: string): Promise<void> {
    return this._request({
      path: `tv/known/${id}`,
      options: {
        method: 'delete',
      },
    });
  }

  /**
   * TV expanded information
   */
  async info(ip: string): Promise<TVInfo> {
    return this._request({
      path: 'tv/info',
      queryObj: { ip },
    });
  }

  /**
   * Link to tv dev panel page
   */
  async devPanel(ip: string) {
    return this._request({
      path: 'tv/dev-panel',
      queryObj: { ip },
    });
  }

  /**
   * Link to tv logs page
   */
  async tvLogs(ip: string) {
    return this._request({
      path: 'tv/logs',
      queryObj: { ip },
    });
  }

  /**
   * Open browser on TV
   */
  async browser(ip: string, url: string) {
    return this._request({
      path: 'tv/browser',
      queryObj: { ip, url },
      options: { method: 'post' },
    });
  }

  /**
   * Wake up TV
   */
  async up(ip: string) {
    return this._request({
      path: 'tv/up',
      queryObj: { ip },
      options: {
        method: 'post',
        timeout: WAKE_UP_TIMEOUT,
      },
    });
  }

  /**
   * Enable TV remote control
   */
  async remoteControl(ip: string, { onClose = noop }) {
    const { wsUrl, payloadPattern, keys } = await this._request({
      path: 'tv/remote-control',
      queryObj: { ip },
      options: { method: 'post' },
    });

    const remote = new WsRemoteControl(wsUrl, payloadPattern, keys);
    await remote.connect({ onClose });

    return remote;
  }

  /**
   * Enable Developer Mode (for WebOS only)
   */
  async enableDevMode(ip: string): Promise<Result> {
    return this._request({
      path: 'tv/dev-mode/enable',
      queryObj: { ip },
      options: { method: 'post' },
    });
  }

  /**
   * Free TV
   */
  async free(ip: string) {
    return this._request({
      path: 'tv/free',
      queryObj: { ip },
      options: {
        method: 'post',
      },
    });
  }

  /**
   * TODO: Move smart sockets to Room API
   * TV expanded information
   */
  async getSmartSocketInfo(ip: string): Promise<SmartSocketInfo> {
    return this._request({
      path: 'tv/smart-socket-info',
      queryObj: { ip },
    });
  }

  /**
   * TODO: Move smart sockets to Room API
   * TV expanded information
   */
  async toggleSmartSocketState(ip: string, isOn: boolean): Promise<Result> {
    return this._request({
      path: 'tv/smart-socket-toggle',
      queryObj: { ip, isOn },
      options: { method: 'post' },
    });
  }
}
