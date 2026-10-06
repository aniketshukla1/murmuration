# Motion brief: Vesper

1. **Signature:** a particle cloud that re-forms, section by section, into what a passenger sees from a night train. Lit carriages glide past under the moon, station lamps slide away, a light runs down the route, town lights pass the cabin window, snow drifts over the pass, the stars turn about the pole, the sun clears the sea and a railway clock keeps time.
2. **Why this subject:** a night journey is small lights moving in the dark: windows, lamps, stars, the sun on water. Its verbs are glide, slide away, run along, drift, turn, rise and tick.
3. **Intensity:** 6.
4. **Supporting moves:** a header mark that waxes and wanes like the moon; a departure board whose letters flip into place once; numbers that count up to their real values; a beam of light round the last stop's card.
5. **What drives it:** scroll moves the cloud between shapes and raises the sun. The pointer parts the particles and leans the hero's tags. Touch gets the same shapes without the pointer effects.
6. **At rest:** every section has a drawn stand-in: the train's windows, the moon, the platform lamps, the route with its stops, the window, the ridge, a starfield, the sun on the sea and the clock dial. Under reduced motion every shape holds still and the clock stops at 21:40.

## Timing

```css
:root {
  --dur-hover: 300ms;          /* knob turns, buttons */
  --dur-reveal: 500ms;
  --ease-out: cubic-bezier(0.2, 0.8, 0.2, 1);
  /* particle hop between shapes: about 0.6 s (murmuration.js) */
  /* departure board: one letter settles every 45 ms, rows 90 ms apart */
}
```
