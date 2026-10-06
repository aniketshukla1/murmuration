// Template from the murmuration skill: a logo drawn as layered depth for a React Native app,
// moved by a motion written for the brand. Replace PATHS, ACCENT and the shades with the
// brand's, and write a `move` from the site's motion brief; the two in `moves` show the format
// only. Uses Reanimated 4 and react-native-svg. Reduced motion renders the flat mark.
import { useEffect } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useReducedMotion, useSharedValue, withRepeat, withTiming, type SharedValue } from 'react-native-reanimated';
import Svg, { Circle, Path } from 'react-native-svg';

/** The mark in a 48-unit box. A placeholder: replace with the brand's paths. */
const PATHS = ['M24 6 43 40H5Z'];
/** One accent circle (a dot, an eye, a sun); remove it if the mark has none. */
const ACCENT = { cx: 24, cy: 30, r: 4 };

/** Where the mark is at one moment: offsets in points, scale, and rotations in degrees. */
export type Pose = { x: number; y: number; scale: number; yaw: number; pitch: number; roll: number };
/** A motion: given seconds, the pose. It runs on the UI thread, so mark it 'worklet'. */
export type Move = (t: number) => Pose;

/** Format examples only. A brand's mark moves with its own verb (see react-native.md). */
export const moves = {
  turn: (t: number): Pose => {
    'worklet';
    return { x: 0, y: 0, scale: 1, yaw: Math.sin(t * 0.6) * 35, pitch: 8, roll: 0 };
  },
  float: (t: number): Pose => {
    'worklet';
    return { x: 0, y: Math.sin(t * 1.1) * 3, scale: 1, yaw: Math.sin(t * 0.5) * 8, pitch: 4, roll: Math.sin(t * 0.8) * 4 };
  },
};

export interface LayeredMarkProps {
  size?: number;
  /** The front face. */
  color?: string;
  /** The accent circle on the front face. */
  accent?: string;
  /** Back layers, darkest first; more and closer shades look smoother edge-on. */
  shades?: string[];
  move?: Move;
  style?: StyleProp<ViewStyle>;
}

export function LayeredMark({
  size = 64,
  color = '#3A42C4',
  accent = '#E0A43A',
  shades = ['#14163A', '#1D2152', '#272B6C', '#303684'],
  move = moves.turn,
  style,
}: LayeredMarkProps) {
  const reduced = useReducedMotion();
  const clock = useSharedValue(0);

  useEffect(() => {
    if (reduced) return;
    // Seconds since the mark appeared, counting for an hour at a time.
    clock.set(withRepeat(withTiming(3600, { duration: 3600 * 1000, easing: Easing.linear }), -1, false));
  }, [reduced, clock]);

  return (
    <View style={[{ width: size, height: size }, style]} accessible={false}>
      {reduced ? (
        <Mark size={size} color={color} accent={accent} />
      ) : (
        <>
          {shades.map((shade, i) => (
            <Layer key={`${shade}-${i}`} depth={shades.length - i} size={size} color={shade} accent={shade} clock={clock} move={move} />
          ))}
          <Layer depth={0} size={size} color={color} accent={accent} clock={clock} move={move} />
        </>
      )}
    </View>
  );
}

function Layer({ depth, size, color, accent, clock, move }: {
  depth: number;
  size: number;
  color: string;
  accent: string;
  clock: SharedValue<number>;
  move: Move;
}) {
  const step = size * 0.016;
  const animated = useAnimatedStyle(() => {
    const pose = move(clock.get());
    // A layer further back slides sideways as the mark turns, the way a solid object's side shows.
    const shift = -Math.sin((pose.yaw * Math.PI) / 180) * depth * step;
    return {
      transform: [
        { perspective: size * 5 },
        { translateX: pose.x + shift },
        { translateY: pose.y + depth * step * 0.35 },
        { scale: pose.scale },
        { rotateY: `${pose.yaw}deg` },
        { rotateX: `${pose.pitch}deg` },
        { rotateZ: `${pose.roll}deg` },
      ],
    };
  });
  return (
    <Animated.View style={[StyleSheet.absoluteFill, animated]}>
      <Mark size={size} color={color} accent={accent} />
    </Animated.View>
  );
}

function Mark({ size, color, accent }: { size: number; color: string; accent: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 48 48">
      {PATHS.map((d) => <Path key={d} d={d} fill={color} />)}
      <Circle cx={ACCENT.cx} cy={ACCENT.cy} r={ACCENT.r} fill={accent} />
    </Svg>
  );
}
