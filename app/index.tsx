import { Buffer } from 'buffer'; // Run: npm install buffer
import Constants, { ExecutionEnvironment } from 'expo-constants';
import { useEffect, useRef, useState } from 'react';
import {
  AccessibilityInfo, ActivityIndicator, Alert, KeyboardAvoidingView, PermissionsAndroid,
  Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View, useColorScheme,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { BleManager, Device, Subscription } from 'react-native-ble-plx';
import { MockBleManager } from '../lib/bleMock';
import { CheckIcon } from '../lib/icons';
import { Lang, strings } from '../lib/i18n';
import { BORDER, Theme, ThemeName, radius, space, themes } from '../lib/theme';
import { HardBox, HardButton, MONO, Segmented, StepRail, StepState } from '../lib/ui';
import { Wheel, parseGrade } from '../lib/Wheel';

// Expo Go has no native Bluetooth module, so it automatically uses a fake device
// (for designing the UI). A development build / APK always uses real Bluetooth.
const USE_MOCK = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

const manager = (USE_MOCK ? new MockBleManager() : new BleManager()) as unknown as BleManager;

// Replace these with your target device's UUIDs
const SERVICE_UUID = 'aee04821-1973-4e1f-a590-e84b10d580e7';
const CHAR_UUID = 'cde07b1a-889b-44b7-a99f-c888dddac729'; //
const CHAR_UUID_NOTIFY = 'cde07b1a-889b-44b7-a99f-c888dddac729';
// Same as CHAR_UUID for this example

const SCAN_SECONDS = 10;
const MY_NAME = 'Theerawat Noonngam';
const QUICK_NAMES = [MY_NAME];

type ErrorKey = 'errPermission' | 'errScan' | 'errConnect' | 'errRead' | 'errWrite' | 'errBtOff' | 'errNoService';

// Some devices only put their name in the advertisement (localName)
const nameOf = (d: Device) => d.name || d.localName || '';
// Stop scanning safely (v3 returns a Promise that can reject)
const safeStopScan = () => { Promise.resolve(manager.stopDeviceScan()).catch(() => {}); };
type ReadEntry = { value: string; time: string; phase: 'before' | 'after' };

export default function Index() {
  const systemScheme = useColorScheme();
  const [themeName, setThemeName] = useState<ThemeName>(systemScheme === 'dark' ? 'dark' : 'light');
  const [lang, setLang] = useState<Lang>('th');
  const t = strings[lang];
  const theme = themes[themeName];
  const s = makeStyles(theme);

  const [devices, setDevices] = useState<Device[]>([]);
  const [connectedDevice, setConnectedDevice] = useState<Device | null>(null);
  const [receivedData, setReceivedData] = useState<string>('');
  const [readLog, setReadLog] = useState<ReadEntry[]>([]);
  const [hasWritten, setHasWritten] = useState(false);
  const [writeValue, setWriteValue] = useState<string>(MY_NAME);
  const [scanning, setScanning] = useState(false);
  const [busy, setBusy] = useState<'connect' | 'read' | 'write' | null>(null);
  const [errorKey, setErrorKey] = useState<ErrorKey | ''>('');
  const [reduceMotion, setReduceMotion] = useState(false);
  const scanTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hasWrittenRef = useRef(false);
  const disconnectSub = useRef<Subscription | null>(null);
  const [btOn, setBtOn] = useState(true);

  async function requestPermissions() {
    if (Platform.OS === 'android') { // Android 12+ permissions
      if (Platform.Version >= 31) {
        const granted = await PermissionsAndroid.requestMultiple([
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        ]);
        return (
          granted['android.permission.BLUETOOTH_SCAN'] === PermissionsAndroid.RESULTS.GRANTED &&
          granted['android.permission.BLUETOOTH_CONNECT'] === PermissionsAndroid.RESULTS.GRANTED &&
          granted['android.permission.ACCESS_FINE_LOCATION'] === PermissionsAndroid.RESULTS.GRANTED
        );
      } else { // Android 11 or lower
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION
        );
        return granted === PermissionsAndroid.RESULTS.GRANTED;
      }
    }
    return true; // iOS handles this via Info.plist when the scan starts
  }

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion).catch(() => {});
  }, []);

  useEffect(() => { // Request permissions on mount
    requestPermissions().then((granted) => {
      if (!granted) {
        console.log('Bluetooth permissions not granted');
        setErrorKey('errPermission');
      }
    });
    // Watch the Bluetooth adapter (on / off)
    const stateSub = USE_MOCK ? null : manager.onStateChange((state) => {
      setBtOn(state === 'PoweredOn');
    }, true);
    return () => {
      safeStopScan();
      if (scanTimer.current) clearTimeout(scanTimer.current);
      stateSub?.remove();
      disconnectSub.current?.remove();
    };
  }, []);

  const resetSession = () => {
    disconnectSub.current?.remove();
    disconnectSub.current = null;
    setConnectedDevice(null);
    setReceivedData('');
    setReadLog([]);
    setHasWritten(false);
    hasWrittenRef.current = false;
    setWriteValue(MY_NAME);
  };

  const stopScan = () => {
    safeStopScan();
    if (scanTimer.current) clearTimeout(scanTimer.current);
    setScanning(false);
  };

  // 1. Scan for Peripherals
  const startScan = async () => {
    setDevices([]);
    setErrorKey('');
    if (!(await requestPermissions())) {
      setErrorKey('errPermission');
      return;
    }
    if (!USE_MOCK && (await manager.state()) !== 'PoweredOn') {
      setErrorKey('errBtOff');
      return;
    }
    if (scanTimer.current) clearTimeout(scanTimer.current);
    setScanning(true);
    manager.startDeviceScan(null, null, (error, device) => {
      if (error) {
        console.log('Scan error:', error);
        setErrorKey('errScan');
        stopScan();
        return;
      }
      if (device && nameOf(device)) {
        setDevices((prevDevices) => {
          if (prevDevices.some((d) => d.id === device.id)) return prevDevices;
          return [...prevDevices, device];
        });
      }
    });
    scanTimer.current = setTimeout(stopScan, SCAN_SECONDS * 1000);
  };

  // 2. Connect to a Device
  const connectToDevice = async (device: Device) => {
    stopScan();
    setErrorKey('');
    setBusy('connect');
    try {
      // Ask for a bigger packet size so longer names / results fit (Android)
      const connected = await manager.connectToDevice(device.id,
        Platform.OS === 'android' ? { requestMTU: 185 } : undefined);
      // Crucial Step: Discover services and characteristics before interacting
      const discovered = await connected.discoverAllServicesAndCharacteristics();
      // Make sure this is the class device (has the right service)
      if (!USE_MOCK) {
        const services = await discovered.services();
        const hasService = services.some((sv) => sv.uuid.toLowerCase() === SERVICE_UUID);
        if (!hasService) {
          await manager.cancelDeviceConnection(discovered.id).catch(() => {});
          setErrorKey('errNoService');
          return;
        }
      }
      setConnectedDevice(discovered);
      console.log('Connected to:', nameOf(discovered));
      // If the device drops the link, go back to the scan screen
      disconnectSub.current?.remove();
      disconnectSub.current = discovered.onDisconnected?.(() => resetSession()) ?? null;
    } catch (error) {
      console.log('Connection failed:', error);
      manager.cancelDeviceConnection(device.id).catch(() => {});
      setErrorKey('errConnect');
    } finally {
      setBusy(null);
    }
  };

  // 3. READ Mode (Synchronous Pull)
  const readCharacteristic = async () => {
    if (!connectedDevice) return;
    setErrorKey('');
    setBusy('read');
    try {
      const device_id: string = connectedDevice.id.toString();
      const characteristic = await manager.readCharacteristicForDevice(
        device_id,
        SERVICE_UUID,
        CHAR_UUID
      );
      // Decode Base64 string back to readable text/numbers
      const rawData = Buffer.from(characteristic.value || '', 'base64').toString('utf-8');
      setReceivedData(rawData);
      setReadLog((prev) => [...prev, {
        value: rawData,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        phase: hasWrittenRef.current ? 'after' : 'before',
      }]);
      console.log('Read Value:', rawData);
    } catch (error) {
      console.log('Read failed:', error);
      setErrorKey('errRead');
    } finally {
      setBusy(null);
    }
  };

  // 4. WRITE Mode (Push Data)
  const writeCharacteristic = async () => {
    if (!connectedDevice) return;
    if (!writeValue.trim()) {
      Alert.alert(t.inputErrorTitle, t.inputErrorMsg);
      return;
    }
    setErrorKey('');
    setBusy('write');
    try { // Data MUST be converted to Base64
      const base64Value = Buffer.from(writeValue.trim(), 'utf-8').toString('base64');
      const device_id: string = connectedDevice.id.toString();
      // Use writeCharacteristicWithResponseForDevice() for Write Request
      // Use writeCharacteristicWithoutResponseForDevice() for Write Command
      await manager.writeCharacteristicWithResponseForDevice(device_id, SERVICE_UUID,
        CHAR_UUID, base64Value);
      hasWrittenRef.current = true;
      setHasWritten(true);
      Alert.alert(t.writeOkTitle, t.writeOkMsg(writeValue.trim()));
    } catch (error) {
      console.log('Write failed:', error);
      setErrorKey('errWrite');
    } finally {
      setBusy(null);
    }
  };

  // 5. NOTIFY / INDICATE Mode (Asynchronous Push Subscriptions)
  // Not used by this screen (kept from the sample code). Call it from a button if needed.
  const startNotificationStream = () => {
    if (!connectedDevice) return;
    // monitorCharacteristicForDevice handles both Notifications and Indications
    manager.monitorCharacteristicForDevice(connectedDevice.id, SERVICE_UUID, CHAR_UUID_NOTIFY,
      (error, char) => {
        if (error) {
          console.log('Notification error:', error);
          return;
        }
        if (char?.value) {
          const rawData = Buffer.from(char.value, 'base64').toString('utf-8');
          setReceivedData(rawData);
        }
      }
    );
  };
  void startNotificationStream;

  // 6. Disconnect from Device
  const disconnectDevice = async () => {
    if (!connectedDevice) return;
    disconnectSub.current?.remove(); // avoid a second reset from onDisconnected
    disconnectSub.current = null;
    try {
      await manager.cancelDeviceConnection(connectedDevice.id);
    } catch (error) {
      console.log('Disconnect failed:', error);
    }
    resetSession();
    Alert.alert(t.disconnectedTitle, t.disconnectedMsg);
  };

  /* ---------- derived UI state ---------- */
  const isConnected = !!connectedDevice;
  const hasAfterRead = readLog.some((r) => r.phase === 'after');
  const steps: StepState[] = [
    isConnected ? 'done' : 'active',
    !isConnected ? 'todo' : hasWritten ? 'done' : 'active',
    !hasWritten ? 'todo' : hasAfterRead ? 'done' : 'active',
  ];
  const lastAfter = [...readLog].reverse().find((r) => r.phase === 'after');
  const landing = lastAfter ? parseGrade(lastAfter.value) : null;
  const revealing = busy === 'read' && hasWritten;

  let statusText = t.readyTitle;
  if (errorKey) statusText = t[errorKey];
  else if (busy === 'connect') statusText = t.connectingTitle;
  else if (!btOn) statusText = t.errBtOff;
  else if (isConnected) statusText = t.connectedTitle(connectedDevice ? nameOf(connectedDevice) : '');
  else if (scanning) statusText = t.scanningTitle;

  return (
    <SafeAreaView style={s.safe}>
      <StatusBar style={themeName === 'dark' ? 'light' : 'dark'} />
      <KeyboardAvoidingView style={s.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">
          <View style={s.content}>
            {/* Top bar */}
            <View style={s.topBar}>
              <Text style={s.eyebrow}>{t.eyebrow}</Text>
              <View style={s.statusPill}>
                <View style={[s.statusSquare, { backgroundColor: isConnected ? theme.success : theme.textSecondary }]} />
                <Text style={s.statusPillText}>{isConnected ? t.connected : t.notConnected}</Text>
              </View>
            </View>

            {/* Theme + language */}
            <View style={s.controlsRow}>
              <Segmented theme={theme} label={t.theme.toUpperCase()} value={themeName}
                options={[{ key: 'light', text: t.light }, { key: 'dark', text: t.dark }]}
                onChange={(k) => setThemeName(k as ThemeName)} />
              <Segmented theme={theme} label={t.language.toUpperCase()} value={lang}
                options={[{ key: 'th', text: 'TH' }, { key: 'en', text: 'EN' }]}
                onChange={(k) => setLang(k as Lang)} />
            </View>

            {/* Signature: the wheel */}
            <HardBox theme={theme} fill={theme.felt} r={radius.lg} style={s.feltPanel}>
              <View accessible accessibilityRole="image"
                accessibilityLabel={t.wheelLabel(landing ?? t.wheelIdle)}>
                <Wheel theme={theme} spinning={revealing} landing={landing} reduceMotion={reduceMotion} />
              </View>
              <Text style={s.title} accessibilityRole="header">{t.appName}</Text>
              <Text style={s.tagline}>{t.tagline}</Text>
            </HardBox>

            {/* Sequence */}
            <StepRail theme={theme} labels={[t.short1, t.short2, t.short3]} states={steps} />

            {/* Status strip */}
            <HardBox theme={theme} r={radius.md} shadow={false}
              style={[s.strip, !!errorKey && { borderColor: theme.redText }]}>
              <View accessibilityRole={errorKey ? 'alert' : undefined} style={s.stripInner}>
                {(busy === 'connect' || scanning) && <ActivityIndicator color={theme.text} />}
                <Text style={[s.stripText, !!errorKey && { color: theme.redText }]}>{statusText}</Text>
              </View>
            </HardBox>

            {/* ---- Step 1 ---- */}
            {!isConnected ? (
              <HardBox theme={theme} style={s.panel}>
                <Text style={s.stepLabel}>{t.stepOf(1)}</Text>
                <Text style={s.panelTitle} accessibilityRole="header">{t.p1Title}</Text>
                <Text style={s.caption}>{t.p1Sub}</Text>
                <HardButton theme={theme} arrow title={scanning ? t.scanningBtn : t.scanBtn} onPress={startScan}
                  disabled={scanning || busy === 'connect'} loading={scanning} />
                <Text style={s.fieldLabel}>{t.nearby}</Text>
                <View style={{ gap: space.sm }}>
                  {devices.length === 0 ? (
                    <View style={s.emptyBox}>
                      <Text style={s.emptyTitle}>{scanning ? t.scanningTitle : t.noDevices}</Text>
                      {!scanning && <Text style={s.caption}>{t.scanHint}</Text>}
                    </View>
                  ) : (
                    devices.map((item) => (
                      <Pressable key={item.id}
                        style={({ pressed }) => [s.deviceRow, pressed && { backgroundColor: theme.gold }]}
                        onPress={() => connectToDevice(item)}
                        disabled={item.isConnectable === false || busy === 'connect'}
                        accessibilityRole="button"
                        accessibilityLabel={`${nameOf(item)}, ${item.rssi} dBm`}>
                        <View style={s.flex}>
                          <Text style={s.deviceName}>{nameOf(item)}</Text>
                          <Text style={s.caption} numberOfLines={1}>
                            {item.isConnectable === false ? t.notConnectable : item.id}
                          </Text>
                        </View>
                        <Text style={s.rssi}>{item.rssi} dBm</Text>
                      </Pressable>
                    ))
                  )}
                </View>
              </HardBox>
            ) : (
              <HardBox theme={theme} r={radius.md} style={s.summary}>
                <View style={s.summaryIcon}><CheckIcon size={20} color={theme.onSuccess} /></View>
                <View style={s.flex}>
                  <Text style={s.stepLabel}>{t.stepOf(1)}</Text>
                  <Text style={s.summaryText} numberOfLines={2}>{t.connectedSummary(connectedDevice ? nameOf(connectedDevice) : '')}</Text>
                </View>
              </HardBox>
            )}

            {isConnected && (
              <>
                {/* ---- Step 2 ---- */}
                <HardBox theme={theme} style={s.panel}>
                  <Text style={s.stepLabel}>{t.stepOf(2)}</Text>
                  <Text style={s.panelTitle} accessibilityRole="header">{t.p2Title}</Text>
                  <Text style={s.caption}>{t.p2Sub}</Text>
                  <HardButton theme={theme} variant="secondary" title={t.readBefore} onPress={readCharacteristic}
                    disabled={busy !== null} loading={busy === 'read' && !hasWritten} />
                  <Text style={s.fieldLabel}>{t.nameLabel}</Text>
                  <TextInput style={s.input} value={writeValue} onChangeText={setWriteValue}
                    placeholder={t.placeholder} placeholderTextColor={theme.textSecondary}
                    accessibilityLabel={t.nameLabel} autoCapitalize="words" />
                  <View style={s.chipRow}>
                    <Text style={s.caption}>{t.quickFill}</Text>
                    {QUICK_NAMES.map((n) => (
                      <Pressable key={n} onPress={() => setWriteValue(n)} accessibilityRole="button"
                        accessibilityLabel={`${t.quickFill}: ${n}`}
                        style={({ pressed }) => [s.quickChip, pressed && { backgroundColor: theme.gold }]}>
                        <Text style={s.quickChipText}>{n}</Text>
                      </Pressable>
                    ))}
                  </View>
                  <HardButton theme={theme} arrow title={t.writeBtn} onPress={writeCharacteristic}
                    disabled={busy !== null} loading={busy === 'write'} />
                </HardBox>

                {/* ---- Step 3 ---- */}
                <HardBox theme={theme} style={s.panel}>
                  <Text style={s.stepLabel}>{t.stepOf(3)}</Text>
                  <Text style={s.panelTitle} accessibilityRole="header">{t.p3Title}</Text>
                  <Text style={s.caption}>{hasWritten ? t.p3Sub : t.p3Locked}</Text>
                  <HardButton theme={theme} arrow title={t.revealBtn} onPress={readCharacteristic}
                    disabled={busy !== null || !hasWritten} loading={revealing} />

                  <View style={s.scoreboard}>
                    <Text style={s.fieldLabel}>{t.result}</Text>
                    <Text style={[s.valueText, !receivedData && { color: theme.textSecondary, fontSize: 18 }]}>
                      {receivedData || t.noData}
                    </Text>
                  </View>
                  {readLog.length > 0 && (
                    <View style={s.historyBox}>
                      <Text style={s.fieldLabel}>{t.history}</Text>
                      {readLog.map((r, i) => (
                        <View key={i} style={s.historyRow}>
                          <View style={s.flex}>
                            <Text style={s.historyValue}>{t.readNo} {i + 1}: {r.value}</Text>
                            <Text style={s.historyTime}>{r.time}</Text>
                          </View>
                          <View style={[s.phaseTag, r.phase === 'after' && { backgroundColor: theme.gold }]}>
                            <Text style={[s.phaseText, r.phase === 'after' && { color: theme.onGold }]}>
                              {r.phase === 'after' ? t.after : t.before}
                            </Text>
                          </View>
                        </View>
                      ))}
                    </View>
                  )}
                </HardBox>

                <HardButton theme={theme} variant="danger" title={t.disconnect} onPress={disconnectDevice}
                  disabled={busy !== null} />
              </>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

/* ---------- Styles (token driven, 8pt rhythm) ---------- */

function makeStyles(th: Theme) {
  return StyleSheet.create({
    flex: { flex: 1 },
    safe: { flex: 1, backgroundColor: th.bg },
    scroll: { paddingHorizontal: space.md, paddingBottom: space.xl, paddingTop: space.sm },
    content: { width: '100%', maxWidth: 560, alignSelf: 'center', gap: space.md },

    topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 44 },
    eyebrow: { fontFamily: MONO, fontSize: 13, fontWeight: '800', letterSpacing: 2, color: th.text },
    statusPill: {
      flexDirection: 'row', alignItems: 'center', gap: space.sm, minHeight: 36, paddingHorizontal: space.md - 4,
      borderWidth: 2, borderColor: th.line, borderRadius: radius.sm, backgroundColor: th.surface,
    },
    statusSquare: { width: 10, height: 10, borderRadius: 2 },
    statusPillText: { fontSize: 13, fontWeight: '700', color: th.text },
    controlsRow: { flexDirection: 'row', gap: space.md },

    feltPanel: { alignItems: 'center', paddingVertical: space.lg, paddingHorizontal: space.md, gap: space.sm },
    title: { fontSize: 36, lineHeight: 44, fontWeight: '900', color: th.onFelt, textAlign: 'center', marginTop: space.sm },
    tagline: { fontSize: 16, lineHeight: 24, color: th.onFelt, textAlign: 'center', maxWidth: 300 },

    strip: { paddingHorizontal: space.md, minHeight: 48, justifyContent: 'center' },
    stripInner: { flexDirection: 'row', alignItems: 'center', gap: space.sm + 4 },
    stripText: { fontFamily: MONO, fontSize: 14, fontWeight: '700', color: th.text, flexShrink: 1 },

    panel: { padding: space.md + 4, gap: space.md - 4 },
    stepLabel: { fontFamily: MONO, fontSize: 12, fontWeight: '800', letterSpacing: 1.5, color: th.textSecondary },
    panelTitle: { fontSize: 24, lineHeight: 30, fontWeight: '900', color: th.text },
    caption: { fontSize: 14, lineHeight: 21, color: th.textSecondary },
    fieldLabel: { fontFamily: MONO, fontSize: 12, fontWeight: '800', letterSpacing: 1, color: th.textSecondary },

    summary: { padding: space.md, flexDirection: 'row', alignItems: 'center', gap: space.md },
    summaryIcon: {
      width: 40, height: 40, borderRadius: 20, backgroundColor: th.success, borderWidth: BORDER, borderColor: th.line,
      alignItems: 'center', justifyContent: 'center',
    },
    summaryText: { fontSize: 17, fontWeight: '800', color: th.text },

    emptyBox: {
      borderWidth: 2, borderStyle: 'dashed', borderColor: th.textSecondary, borderRadius: radius.md,
      padding: space.md, gap: space.xs,
    },
    emptyTitle: { fontSize: 16, fontWeight: '800', color: th.text },
    deviceRow: {
      flexDirection: 'row', alignItems: 'center', gap: space.md, minHeight: 64,
      borderWidth: 2, borderColor: th.line, borderRadius: radius.md, padding: space.md, backgroundColor: th.surfaceAlt,
    },
    deviceName: { fontSize: 17, fontWeight: '800', color: th.text },
    rssi: { fontFamily: MONO, fontSize: 14, fontWeight: '800', color: th.text },

    input: {
      minHeight: 54, borderRadius: radius.md, backgroundColor: th.surfaceAlt, borderWidth: 2,
      borderColor: th.line, paddingHorizontal: space.md, fontSize: 17, color: th.text,
    },
    chipRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: space.sm },
    quickChip: {
      minHeight: 44, justifyContent: 'center', paddingHorizontal: space.md, borderRadius: radius.sm,
      borderWidth: 2, borderColor: th.line, backgroundColor: th.surface,
    },
    quickChipText: { fontSize: 15, fontWeight: '700', color: th.text },

    scoreboard: {
      borderWidth: 2, borderColor: th.line, borderRadius: radius.md, backgroundColor: th.surfaceAlt,
      padding: space.md, gap: space.sm, marginTop: space.xs,
    },
    valueText: { fontFamily: MONO, fontSize: 22, lineHeight: 30, fontWeight: '800', color: th.text },
    historyBox: { gap: space.sm, paddingTop: space.sm },
    historyRow: { flexDirection: 'row', alignItems: 'center', gap: space.md },
    historyValue: { fontSize: 15, lineHeight: 22, fontWeight: '700', color: th.text },
    historyTime: { fontFamily: MONO, fontSize: 12, color: th.textSecondary },
    phaseTag: {
      borderWidth: 2, borderColor: th.line, borderRadius: radius.sm, paddingHorizontal: space.sm + 2,
      minHeight: 32, justifyContent: 'center', backgroundColor: th.surface,
    },
    phaseText: { fontSize: 12, fontWeight: '800', color: th.textSecondary },
  });
}
