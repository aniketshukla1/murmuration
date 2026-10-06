# The logo in a React Native app

`templates/layered-mark.tsx` draws the brand's mark as layered depth and moves it with a motion written for the brand, so the app's mark speaks the same motion language as the site. It uses Reanimated 4 (`useSharedValue` with `.get()` and `.set()`, `useAnimatedStyle`, `useReducedMotion`) and `react-native-svg`.

## How it reads as 3D without a 3D engine
- **Depth:** darker copies of the mark sit behind the front one. Each slides sideways by `-sin(yaw) * depth * size * 0.016` as the mark turns, which is how a solid object's side shows. Use more and closer shades if the edge-on view looks striped.
- **Motion:** one worklet, `move(t)`, returns the pose (offsets, scale, yaw, pitch, roll) for `t` seconds. Everything runs on the UI thread.
- **Reduced motion:** the flat mark, still.

## Write the motion from the brief
Take the site's signature verb (`MOTION.md`) and give the mark its own version of it. A railway brand's mark could tick through a quarter turn and pause; a bakery's could rise slowly and settle; a sailing club's could heel and recover; a bank's could hold almost still and catch the light. `moves.turn` and `moves.float` in the template show the format only: don't ship either as a default.

Interaction is optional: if the mark responds to a tap, keep it to one short gesture with a selection haptic, and make it end exactly where the idle motion resumes.

## Using it
Replace `PATHS`, `ACCENT` and the shades with the brand's, then:

```tsx
const ownMove = (t: number) => { 'worklet'; return { x: 0, y: 0, scale: 1, yaw: 0, pitch: 0, roll: 0 }; };
<LayeredMark size={64} color="#1F2A44" accent="#E8833F" move={ownMove} style={{ position: 'absolute', right: 24, top: 80 }} />
```

Verify on the simulator with a burst of screenshots (`xcrun simctl io <udid> screenshot` in a loop about 0.35 seconds apart), cropped and combined with `scripts/sheet.py`.
