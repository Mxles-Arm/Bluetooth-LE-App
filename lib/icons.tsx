// Tiny vector icons built from plain Views (no icon package needed)
import { View } from 'react-native';

type P = { size?: number; color: string };

export function ArrowIcon({ size = 20, color, rotate = 0 }: P & { rotate?: number }) {
  const t = Math.max(2, Math.round(size / 9));
  const head = size * 0.5;
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center',
      transform: [{ rotate: `${rotate}deg` }] }}>
      <View style={{ position: 'absolute', left: size * 0.08, width: size * 0.82, height: t,
        borderRadius: t, backgroundColor: color }} />
      <View style={{ position: 'absolute', right: size * 0.1, width: head, height: head,
        borderTopWidth: t, borderRightWidth: t, borderColor: color,
        transform: [{ rotate: '45deg' }], borderTopRightRadius: t / 2 }} />
    </View>
  );
}

export function StarIcon({ size = 20, color }: P) {
  const s = size * 0.62;
  const base = { position: 'absolute' as const, width: s, height: s, borderRadius: s * 0.14, backgroundColor: color };
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <View style={base} />
      <View style={[base, { transform: [{ rotate: '45deg' }] }]} />
    </View>
  );
}

export function ScanIcon({ size = 20, color }: P) {
  const t = Math.max(2, Math.round(size / 10));
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <View style={{ position: 'absolute', width: size, height: size, borderRadius: size / 2,
        borderWidth: t, borderColor: color, opacity: 0.45 }} />
      <View style={{ position: 'absolute', width: size * 0.6, height: size * 0.6, borderRadius: size * 0.3,
        borderWidth: t, borderColor: color }} />
      <View style={{ width: size * 0.2, height: size * 0.2, borderRadius: size * 0.1, backgroundColor: color }} />
    </View>
  );
}

export function CheckIcon({ size = 18, color }: P) {
  const t = Math.max(2, Math.round(size / 7));
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <View style={{ width: size * 0.32, height: size * 0.56, borderRightWidth: t, borderBottomWidth: t,
        borderColor: color, transform: [{ rotate: '45deg' }, { translateY: -size * 0.06 }] }} />
    </View>
  );
}
