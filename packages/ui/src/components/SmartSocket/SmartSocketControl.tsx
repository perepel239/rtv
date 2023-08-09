import { useMutation, useQueryClient, useQuery } from 'react-query';
import { KnownTv, SmartSocketInfo } from 'rtv-client';

import Button from 'components/Button/Button';
import { errorToast } from 'components/ToastContainer/ToastContainer';
import { ReactComponent as TVIcon } from 'icons/socket.svg';
import * as paramsHelper from 'utils/params';
import { queries } from 'utils/queries';
import { fetchSmartSocketInfo } from 'utils/rtv-client';
import { toggleSmartSocket } from 'utils/rtv-client';

import styles from './SmartSocketControl.module.css';

interface SmartSocketProps {
  tv?: KnownTv;
}

const SmartSocketControl: React.FC<SmartSocketProps> = ({ tv }) => {
  const queryClient = useQueryClient();

  const { data: socketInfo = {} } = useQuery([queries.smartSocketState, tv?.ip], () => fetchSmartSocketInfo(paramsHelper.getTvIp() || ''), {
    onError: () => errorToast('Smart socket info was not loaded'),
    refetchOnWindowFocus: false,
  });

  const togglePowerSocketMutation = useMutation(
    ({ tvIp }: { tvIp: string }) => toggleSmartSocket(tvIp, !(socketInfo as SmartSocketInfo)?.isOn),
    {
      onSuccess: () => queryClient.invalidateQueries(queries.smartSocketState)
    }
  )
  const onTogglePowerSocket = () => {
    if (tv) {
      togglePowerSocketMutation.mutate({ tvIp: tv.ip });
    }
  }
  const smartSocketControlEnabled = (tvIp?: string) => {
    return (socketInfo as SmartSocketInfo)?.isOn !== undefined;
  }

  return (
  <Button
    className={smartSocketControlEnabled(tv?.ip) ? ((socketInfo as SmartSocketInfo)?.isOn ? styles.socketOn : styles.socketOff) : styles.socketDisabled}          
    variant="secondary"
    onClick={onTogglePowerSocket}
    disabled={!smartSocketControlEnabled(tv?.ip)}
    tooltipId={styles.tooltip}
  >
    <TVIcon width={22} height={22} />
  </Button>);
};

export default SmartSocketControl;

