import { useEffect, useRef } from 'react';
import { Animated, Easing, Text, View } from 'react-native';
import { MONO } from './ui';
import { BORDER, Theme } from './theme';

export const GRADES = ['A', 'B+', 'B', 'C+', 'C', 'D+', 'D', 'F'];
const SLOT = 360 / GRADES.length;
const SIZE = 232;

/** Finds a grade letter at the end of the device text, e.g. "... predicted grade: B+" -> "B+". */
export function parseGrade(text: string): string | null {
  const m = [...text.matchAll(/(?:^|[^A-Za-z])([A-DF][+-]?)(?![A-Za-z0-9])/g)];
  if (!m.length) return null;
  const g = m[m.length - 1][1].toUpperCase();
  return GRADES.includes(g) ? g : null;
}

/**
 * Roulette wheel. Spins while `spinning`; when it stops it settles with `landing`
 * (a grade letter from the device) under the pointer. No letter -> it just rests.
 */
export function Wheel(props: { theme: Theme; spinning: boolean; landing: string | null; reduceMotion: boolean }) {
  const { theme, spinning, landing, reduceMotion } = props;
  const deg = useRef(new Animated.Value(0)).current;
  const running = useRef(false);

  useEffect(() => {
    if (spinning) {
      if (reduceMotion) return;
      running.current = true;
      let base = 0;
      const loop = () => {
        if (!running.current) return;
        base += 720;
        Animated.timing(deg, { toValue: base, duration: 1400, easing: Easing.linear, useNativeDriver: true })
          .start(({ finished }) => { if (finished) loop(); });
      };
      deg.stopAnimation((cur) => { base = cur; loop(); });
    } else {
      running.current = false;
      deg.stopAnimation((cur) => {
        const idx = landing ? GRADES.indexOf(landing) : -1;
        if (idx < 0) return;
        const rest = (360 - idx * SLOT) % 360;
        const target = Math.ceil((cur + 360 - rest) / 360) * 360 + rest;
        if (reduceMotion) { deg.setValue(target); return; }
        Animated.timing(deg, { toValue: target, duration: 1500, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
      });
    }
  }, [spinning, landing, reduceMotion, deg]);

  const rotate = deg.interpolate({ inputRange: [0, 360], outputRange: ['0deg', '360deg'] });
  const inverse = deg.interpolate({ inputRange: [0, 360], outputRange: ['0deg', '-360deg'] });

  return (
    <View style={{ width: SIZE, height: SIZE + 26, alignItems: 'center' }} importantForAccessibility="no-hide-descendants">
      {/* pointer */}
      <View style={{ position: 'absolute', top: 0, zIndex: 3, alignItems: 'center' }}>
        <View style={{ width: 0, height: 0, borderLeftWidth: 15, borderRightWidth: 15, borderTopWidth: 26,
          borderLeftColor: 'transparent', borderRightColor: 'transparent', borderTopColor: theme.gold }} />
      </View>
      <Animated.View style={{
        marginTop: 20, width: SIZE, height: SIZE, borderRadius: SIZE / 2, borderWidth: BORDER + 1,
        borderColor: theme.ink, backgroundColor: '#0A3F23', transform: [{ rotate }],
      }}>
        {GRADES.map((g, i) => (
          <View key={g} style={{
            position: 'absolute', width: SIZE - 2 * (BORDER + 1), height: SIZE - 2 * (BORDER + 1),
            alignItems: 'center', transform: [{ rotate: `${i * SLOT}deg` }],
          }}>
            <View style={{
              marginTop: 8, width: 36, height: 44, borderRadius: 10, borderWidth: 2, borderColor: '#F6F3E4',
              backgroundColor: i % 2 === 0 ? theme.red : theme.ink, alignItems: 'center', justifyContent: 'center',
            }}>
              {/* counter-rotate the letter so it always reads upright while the wheel spins */}
              <Animated.View style={{ transform: [{ rotate: inverse }, { rotate: `${-i * SLOT}deg` }] }}>
                <Text style={{ fontFamily: MONO, fontSize: 16, fontWeight: '800', color: '#FFFFFF' }}>{g}</Text>
              </Animated.View>
            </View>
          </View>
        ))}
        {/* inner ring */}
        <View style={{
          position: 'absolute', top: 66, left: 66, width: SIZE - 2 * (BORDER + 1) - 132, height: SIZE - 2 * (BORDER + 1) - 132,
          borderRadius: 100, borderWidth: 3, borderColor: theme.gold, backgroundColor: theme.felt,
        }} />
      </Animated.View>
      {/* static hub */}
      <View style={{
        position: 'absolute', top: 20 + SIZE / 2 - 42, width: 84, height: 84, borderRadius: 42, borderWidth: BORDER,
        borderColor: theme.ink, backgroundColor: theme.gold, alignItems: 'center', justifyContent: 'center',
      }}>
        <Text style={{ fontFamily: MONO, fontSize: landing && landing.length > 1 ? 30 : 38, fontWeight: '900', color: theme.onGold }}>
          {spinning ? '…' : landing ?? '?'}
        </Text>
      </View>
    </View>
  );
}
