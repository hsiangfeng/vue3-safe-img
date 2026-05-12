# vue3-safe-img

> [繁體中文](./README.zh-TW.md) · [Live demo](https://israynotarray.com/vue3-safe-img/)

A small Vue 3 plugin for the broken-image problem. Picks up an `<img>` (or wraps
one) and gives it a fallback chain, retry-with-delay, a shared failed-URL cache,
and an optional YouTube-style blurred backdrop when the image's aspect ratio
doesn't match its container.

Three entry points so you can pick whichever fits the call site:

- `v-safe-img` directive — drops onto an existing `<img>`.
- `<SafeImg>` component — adds the optional layered backdrop.
- `useSafeImg` composable — headless, when you want to build your own UI.

Written in TypeScript, ESM + CJS, 100 % test coverage, no runtime dependencies
besides `vue`.

## Install

```bash
pnpm add vue3-safe-img
# npm install vue3-safe-img
# yarn add vue3-safe-img
```

## Register the plugin

```ts
import { createApp } from 'vue'
import VueSafeImg from 'vue3-safe-img'
import 'vue3-safe-img/style.css'

const app = createApp(App)
app.use(VueSafeImg, {
  defaultSrc: '/assets/placeholder.png',
  retry: 2,
  retryDelay: 500,
  lazy: true,
  cacheSize: 100,
  // onError: (info) => Sentry.captureMessage('image failed', { extra: info }),
})
```

Everything is optional. Skip the option object and the built-in SVG fallback
takes over.

## `<SafeImg>` component

```vue
<script setup>
import { SafeImg } from 'vue3-safe-img'
</script>

<template>
  <SafeImg
    class="cover"
    src="https://example.com/cover.jpg"
    fallback="/local-default.jpg"
    alt="Article cover"
  />
</template>

<style>
.cover {
  width: 100%;
  aspect-ratio: 16 / 9;
}
</style>
```

### Layered backdrop (default)

With `layered` left at its default (`true`) the component renders:

```html
<div class="vsi-frame" style="--vsi-image: url(...)">
  <img class="vsi-main" src="..." />
</div>
```

- The wrapper holds the same image as `background-image`, sized `cover`.
- A `::before` pseudo-element runs `backdrop-filter: blur()` over the wrapper.
- The inner `<img>` sits on top with `object-fit: contain`.

When the image aspect doesn't match the container, the empty space fills with a
blurred copy of the same image — the way YouTube fills the sides of a vertical
video. Pass `:layered="false"` to skip all that and get a plain `<img>`.

### Loading skeleton

The wrapper is rendered immediately, even before the image finishes loading, so
the container reserves its slot. The default background (`#e5e7eb`) acts as a
skeleton. Override it via the `--vsi-bg` CSS variable:

```css
.cover {
  --vsi-bg: #1f2937; /* dark-mode skeleton */
}
```

A few things worth knowing up front:

- The wrapper itself has no intrinsic size. Give it `width`/`height` or
  `aspect-ratio` via parent CSS, the `class` prop, or the `style` prop.
- `:layered="false"` mode doesn't reserve space — it falls back to native `<img>`
  behaviour. Use width/height attributes if you need a layout slot without the
  backdrop.

### Props

| Prop          | Type                          | Default    | Notes                                                       |
| ------------- | ----------------------------- | ---------- | ----------------------------------------------------------- |
| `src`         | `string`                      | _required_ | Main image URL.                                             |
| `fallback`    | `string \| string[]`          | global     | Per-instance fallback chain, tried in order.                |
| `placeholder` | `string`                      | global     | dataURL or colour shown while the main image loads.         |
| `layered`     | `boolean`                     | `true`     | Render the blurred-backdrop wrapper.                        |
| `blurAmount`  | `string` (CSS length)         | `'20px'`   | Backdrop blur strength.                                     |
| `retry`       | `number`                      | global     | Retry count on transient failure.                           |
| `lazy`        | `boolean`                     | global     | Apply native `loading="lazy"` to the inner `<img>`.         |

### Attribute split

- `class` and `style` go to the wrapper `<div>` (that's how you size it).
- Every other native `<img>` attribute (`alt`, `width`, `srcset`, …) goes to
  the inner `<img>`.
- When the component switches to a fallback, `srcset` and `sizes` are stripped
  from the inner `<img>` so the browser doesn't ask for a variant of the broken
  URL.

### Manual retry

```vue
<script setup>
import { ref } from 'vue'

const imgRef = ref()
// imgRef.value.retry() drops the URL from the failure cache and reloads.
</script>

<template>
  <SafeImg ref="imgRef" :src="userAvatar" />
</template>
```

## `v-safe-img` directive

```vue
<template>
  <img v-safe-img="user.avatar" />
  <img v-safe-img="{ src: cover, fallback: '/default.jpg', retry: 0 }" />
</template>
```

The directive owns the `<img>` you write — there is no extra wrapper, so the
layered backdrop is exclusive to `<SafeImg>`. Use the directive when you have
an existing `<img>` and only need the fallback/retry behaviour.

## `useSafeImg` composable

```ts
import { ref } from 'vue'
import { useSafeImg } from 'vue3-safe-img'

const src = ref('cover.jpg')
const { currentSrc, status, retry } = useSafeImg(src, {
  fallback: '/default.jpg',
  retry: 2,
})
```

| Returned     | Type                                                              | Notes                                                              |
| ------------ | ----------------------------------------------------------------- | ------------------------------------------------------------------ |
| `currentSrc` | `Ref<string>`                                                     | The URL actually being shown (main, placeholder or fallback).      |
| `status`     | `Ref<'loading' \| 'loaded' \| 'fallback' \| 'error'>`             | Current state.                                                     |
| `retry`      | `() => void`                                                      | Drop the current src from the failure cache and reload.            |

## Plugin options

| Option        | Type                                | Default                | Notes                                                                              |
| ------------- | ----------------------------------- | ---------------------- | ---------------------------------------------------------------------------------- |
| `defaultSrc`  | `string`                            | built-in SVG dataURL   | Last-resort fallback when the per-instance chain is exhausted or empty.            |
| `placeholder` | `string`                            | `undefined`            | Shown while the main image is loading.                                             |
| `retry`       | `number`                            | `2`                    | Retries on transient failure before walking the fallback chain.                    |
| `retryDelay`  | `number` (ms)                       | `500`                  | Fixed delay between retries. No exponential backoff (images aren't APIs).          |
| `lazy`        | `boolean`                           | `true`                 | Sets `loading="lazy"` on the inner `<img>`.                                        |
| `cacheSize`   | `number`                            | `100`                  | LRU cache for failed URLs. `0` disables it.                                        |
| `onError`     | `(info: ErrorInfo) => void`         | `undefined`            | Fires once per final failure. Hook it to Sentry / analytics.                       |

### `ErrorInfo`

```ts
interface ErrorInfo {
  src: string                       // failed main URL
  attempts: number                  // how many times we tried before falling back
  fallbackUsed: string              // which fallback was shown
  element?: HTMLImageElement        // the actual <img> (directive only)
}
```

## What's not in scope

- Responsive image generation (`srcset` / `sizes`, `<picture>`, WebP/AVIF). Use
  an image CDN or a dedicated package.
- Build-time placeholder hashing (plaiceholder, sharp). Pass a pre-built dataURL
  via `placeholder` instead.
- Container aspect-ratio control. Parent CSS / classes own that.

## SSR / Nuxt

The component and composable defer DOM work to `onMounted`, so they're safe on
the server. The server-rendered output is the layered wrapper in its skeleton
state; the image loads after hydration.

## License

MIT
