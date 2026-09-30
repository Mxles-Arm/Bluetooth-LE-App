import { ReactNode } from 'react';
import { ActivityIndicator, Platform, Pressable, StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { ArrowIcon, CheckIcon } from './icons';
import { BORDER, SHADOW, Theme, radius, space } from './theme';

export const MONO = Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' }) as string;

/** Flat box with a thick outline and a hard offset shadow (works the same on iOS and Android). */
export function HardBox(props: {
  theme: Theme; children: ReactNode; fill?: string; style?: StyleProp<ViewStyle>; r?: number; shadow?: boolean;
}) {
  const { theme, children, fill, style, r = radius.lg, shadow = true } = props;
  return (
    <View style={{ marginRight: shadow ? SHADOW : 0, marginBottom: shadow ? SHADOW : 0 }}>
      {shadow && (
        <View pointerEvents="none" style={{
          position: 'absolute', top: SHADOW, left: SHADOW, right: -SHADOW, bottom: -SHADOW,
          backgroundColor: theme.line, borderRadius: r,
        }} />
      )}
      <View style={[{
        backgroundColor: fill ?? theme.surface, borderRadius: r, borderWidth: BORDER, borderColor: theme.line,
      }, style]}>
        {children}
      </View>
    </View>
  );
}

type BtnVariant = 'primary' | 'secondary' | 'danger';

export function HardButton(props: {
  theme: Theme; title: string; onPress: () => void; variant?: BtnVariant;
  disabled?: boolean; loading?: boolean; arrow?: boolean;
}) {
  const { theme, title, onPress, variant = 'primary', disabled, loading, arrow } = props;
  const fill = variant === 'primary' ? theme.gold : theme.surface;
  const fg = variant === 'primary' ? theme.onGold : variant === 'danger' ? theme.redText : theme.text;
  const border = variant === 'danger' ? theme.redText : theme.line;
  const shadowColor = variant === 'danger' ? theme.redText : theme.line;
  return (
    <View style={{ marginRight: SHADOW, marginBottom: SHADOW, opacity: disabled ? 0.45 : 1 }}>
      <View pointerEvents="none" style={{
        position: 'absolute', top: SHADOW, left: SHADOW, right: -SHADOW, bottom: -SHADOW,
        backgroundColor: shadowColor, borderRadius: radius.md,
      }} />
      <Pressable
        onPress={onPress}
        disabled={disabled}
        accessibilityRole="button"
        accessibilityLabel={title}
        accessibilityState={{ disabled: !!disabled, busy: !!loading }}
        style={({ pressed }) => ({
          minHeight: 56, borderRadius: radius.md, borderWidth: BORDER, borderColor: border, backgroundColor: fill,
          paddingHorizontal: space.md, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
          transform: pressed ? [{ translateX: SHADOW - 1 }, { translateY: SHADOW - 1 }] : [],
        })}
      >
        <Text style={{ fontSize: 17, fontWeight: '800', color: fg, flexShrink: 1 }}>{title}</Text>
        {loading ? <ActivityIndicator color={fg} /> : arrow ? <ArrowIcon size={22} color={fg} /> : null}
      </Pressable>
    </View>
  );
}

export function Segmented(props: {
  theme: Theme; label: string; value: string;
  options: { key: string; text: string }[]; onChange: (k: string) => void;
}) {
  const { theme, label, value, options, onChange } = props;
  return (
    <View style={{ flex: 1, gap: space.xs }}>
      <Text style={{ fontFamily: MONO, fontSize: 12, fontWeight: '700', color: theme.textSecondary, letterSpacing: 1 }}>
        {label}
      </Text>
      <View style={{
        flexDirection: 'row', borderWidth: BORDER, borderColor: theme.line, borderRadius: radius.md,
        backgroundColor: theme.surface, overflow: 'hidden',
      }}>
        {options.map((o, i) => {
          const active = o.key === value;
          return (
            <Pressable key={o.key} onPress={() => onChange(o.key)} accessibilityRole="button"
              accessibilityState={{ selected: active }} accessibilityLabel={`${label}: ${o.text}`}
              style={{
                flex: 1, minHeight: 44, alignItems: 'center', justifyContent: 'center',
                backgroundColor: active ? theme.gold : 'transparent',
                borderLeftWidth: i === 0 ? 0 : BORDER, borderLeftColor: theme.line,
              }}>
              <Text style={{ fontSize: 15, fontWeight: '800', color: active ? theme.onGold : theme.textSecondary }}>
                {o.text}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

export type StepState = 'todo' | 'active' | 'done';

/** Real sequence (scan -> write -> reveal), so numbers are meaningful here. */
export function StepRail(props: { theme: Theme; labels: string[]; states: StepState[] }) {
  const { theme, labels, states } = props;
  const n = labels.length;
  const edge = `${100 / (2 * n)}%` as `${number}%`;
  return (
    <View accessible={false}>
      {/* connector lines live in their own layer so they never draw over a node */}
      <View pointerEvents="none" style={{
        position: 'absolute', top: 19, left: edge, right: edge, height: BORDER, flexDirection: 'row',
      }}>
        {labels.slice(1).map((l, i) => (
          <View key={l} style={{
            flex: 1, backgroundColor: states[i] === 'done' ? theme.success : theme.textSecondary,
            opacity: states[i] === 'done' ? 1 : 0.4,
          }} />
        ))}
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
        {labels.map((label, i) => {
          const st = states[i];
          const fill = st === 'done' ? theme.success : st === 'active' ? theme.gold : theme.surface;
          const fg = st === 'done' ? theme.onSuccess : st === 'active' ? theme.onGold : theme.textSecondary;
          return (
            <View key={label} style={{ flex: 1, alignItems: 'center' }}
              accessible accessibilityLabel={`${i + 1}. ${label}`} accessibilityState={{ selected: st === 'active' }}>
              <View style={{
                width: 42, height: 42, borderRadius: 21, borderWidth: BORDER, borderColor: theme.line,
                backgroundColor: fill, alignItems: 'center', justifyContent: 'center',
              }}>
                {st === 'done'
                  ? <CheckIcon size={20} color={theme.onSuccess} />
                  : <Text style={{ fontFamily: MONO, fontSize: 17, fontWeight: '800', color: fg }}>{i + 1}</Text>}
              </View>
              <Text style={{
                marginTop: space.xs + 2, fontSize: 14, fontWeight: st === 'active' ? '800' : '600',
                color: st === 'todo' ? theme.textSecondary : theme.text, textAlign: 'center',
              }}>{label}</Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}
