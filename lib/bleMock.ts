// Mock BLE for UI development (Web / Expo Go). Not used when USE_MOCK = false.
import { Buffer } from 'buffer';
import { Alert, Platform } from 'react-native';

// react-native-web's Alert.alert does nothing, so show a browser alert instead
if (Platform.OS === 'web') {
  (Alert as any).alert = (title: string, message?: string) => {
    window.alert(message ? `${title}\n${message}` : title);
  };
}

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

const b64 = (s: string) => Buffer.from(s, 'utf-8').toString('base64');

let storedName = '';

function makeDevice(id: string, name: string, rssi: number): any {
  const device: any = {
    id,
    name,
    rssi,
    isConnectable: true,
    discoverAllServicesAndCharacteristics: async () => device,
  };
  return device;
}

export class MockBleManager {
  private scanTimers: ReturnType<typeof setTimeout>[] = [];

  stopDeviceScan() {
    this.scanTimers.forEach(clearTimeout);
    this.scanTimers = [];
  }

  startDeviceScan(_u: any, _o: any, listener: (e: any, d: any) => void) {
    this.stopDeviceScan();
    const found = [
      makeDevice('AA:BB:CC:DD:EE:01', 'Grade Device', -52),
      makeDevice('AA:BB:CC:DD:EE:02', 'Mi Band 7', -68),
      makeDevice('AA:BB:CC:DD:EE:03', 'JBL Flip 6', -75),
    ];
    found.forEach((d, i) =>
      this.scanTimers.push(setTimeout(() => listener(null, d), 400 * (i + 1)))
    );
  }

  async connectToDevice(id: string) {
    await wait(500);
    return makeDevice(id, id.endsWith('01') ? 'Grade Device' : 'Mock Device', -52);
  }

  async cancelDeviceConnection(id: string) {
    await wait(200);
    return makeDevice(id, 'Mock Device', -52);
  }

  async readCharacteristicForDevice(_id: string, _s: string, _c: string) {
    await wait(300);
    const text = storedName
      ? `${storedName} - predicted grade: A`
      : 'Hello from Grade Device';
    return { value: b64(text) };
  }

  async writeCharacteristicWithResponseForDevice(
    _id: string, _s: string, _c: string, base64Value: string
  ) {
    await wait(300);
    storedName = Buffer.from(base64Value, 'base64').toString('utf-8');
    return { value: base64Value };
  }

  monitorCharacteristicForDevice(
    _id: string, _s: string, _c: string, listener: (e: any, c: any) => void
  ) {
    const t = setInterval(() => listener(null, { value: b64(`tick ${Date.now() % 100000}`) }), 1000);
    return { remove: () => clearInterval(t) };
  }
}
