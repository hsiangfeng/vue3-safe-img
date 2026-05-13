# vue3-safe-img

> [English](./README.md) · [線上範例](https://israynotarray.com/vue3-safe-img/)

處理「圖片壞掉」這件事的小型 Vue 3 套件。對既有的 `<img>` 補上 fallback chain、自動重試、共用的失敗 URL 快取，並提供可選的 YouTube 風格模糊背景，圖片比例跟容器不一致時自動填空白。

提供三種接入方式，挑現場順手的用：

- `v-safe-img` directive：直接掛在既有的 `<img>` 上。
- `<SafeImg>` component：附帶可選的雙層模糊背景。
- `useSafeImg` composable：純邏輯，自己組 UI 時用。

TypeScript、ESM + CJS、100% 測試覆蓋率，除了 `vue` 之外沒有其他 runtime 相依。

## 安裝

```bash
pnpm add vue3-safe-img
# npm install vue3-safe-img
# yarn add vue3-safe-img
```

## 註冊 plugin

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

所有欄位都可以省略，不傳就走內建 SVG fallback。

## `<SafeImg>` 元件

```vue
<script setup>
import { SafeImg } from 'vue3-safe-img'
</script>

<template>
  <SafeImg
    class="cover"
    src="https://example.com/cover.jpg"
    fallback="/local-default.jpg"
    alt="文章封面"
  />
</template>

<style>
.cover {
  width: 100%;
  aspect-ratio: 16 / 9;
}
</style>
```

### 雙層模糊背景（預設）

`layered` 預設為 `true`，元件會渲染：

```html
<div class="vsi-frame" style="--vsi-image: url(...)">
  <img class="vsi-main" src="..." />
</div>
```

- wrapper 把同一張圖當成 `background-image`，`cover` 鋪滿。
- `::before` 偽元素跑 `backdrop-filter: blur()` 模糊背景。
- 內層 `<img>` 用 `object-fit: contain` 浮在最上層。

當圖片比例跟容器不一致時，空白處會被同一張圖的模糊版填滿，效果就是 YouTube 直式影片在 16:9 player 兩側那種補白。不想要的話 `:layered="false"` 退化成單一 `<img>`。

### Loading 骨架

wrapper 在元件 mount 後立刻渲染，圖片還沒下載完也佔得到位置。預設背景色（`#e5e7eb`）當骨架使用，可以透過 `--vsi-bg` CSS variable 蓋掉：

```css
.cover {
  --vsi-bg: #1f2937; /* 深色主題的骨架色 */
}
```

幾個前提要先講：

- wrapper 本身沒有內建尺寸，需要透過父層 CSS、`class` prop 或 `style` prop 給定 `width`／`height` 或 `aspect-ratio`。
- `:layered="false"` 模式不會幫你保留位置，回歸原生 `<img>` 行為，可以靠 `width`／`height` 屬性自己撐版。

### Props

| Prop          | 型別                          | 預設       | 說明                                                        |
| ------------- | ----------------------------- | ---------- | ----------------------------------------------------------- |
| `src`         | `string`                      | 必填       | 主圖 URL。                                                  |
| `fallback`    | `string \| string[]`          | 走全域     | 此元件的 fallback chain，依序嘗試。                         |
| `placeholder` | `string`                      | 走全域     | 載入中要顯示的 dataURL 或純色。                             |
| `layered`     | `boolean`                     | `true`     | 是否啟用雙層模糊背景。                                      |
| `blurAmount`  | `string`（CSS 長度）          | `'20px'`   | 背景模糊強度。                                              |
| `retry`       | `number`                      | 走全域     | 暫時性失敗的重試次數。                                      |
| `lazy`        | `boolean`                     | 走全域     | 是否在內層 `<img>` 加上原生 `loading="lazy"`。              |

### Attrs 分流

- `class` 跟 `style` 套到 wrapper `<div>` 上（這是設定尺寸的方式）。
- 其餘原生 `<img>` 屬性（`alt`、`width`、`srcset` 之類）會套到內層 `<img>`。
- 切換到 fallback 時，內層 `<img>` 上的 `srcset` 與 `sizes` 會被拔掉，避免瀏覽器拿原始 srcset 的變體當 fallback。

### 手動 retry

```vue
<script setup>
import { ref } from 'vue'

const imgRef = ref()
// imgRef.value.retry() 會把當前 URL 從失敗快取拔掉，再重新載入
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

directive 直接綁在你寫的 `<img>` 上，沒有額外 wrapper，所以雙層模糊背景是 `<SafeImg>` 元件獨有的功能。如果你已經有現成的 `<img>` 結構、只要 fallback／retry 行為，用 directive 最乾淨。

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

| 回傳         | 型別                                                              | 說明                                                              |
| ------------ | ----------------------------------------------------------------- | ----------------------------------------------------------------- |
| `currentSrc` | `Ref<string>`                                                     | 當前實際顯示的 URL（主圖、placeholder 或 fallback）。             |
| `status`     | `Ref<'loading' \| 'loaded' \| 'fallback' \| 'error'>`             | 目前的載入狀態。                                                  |
| `retry`      | `() => void`                                                      | 把當前 src 從失敗快取拔掉並重新載入。                             |

## Plugin 選項

| 選項          | 型別                                | 預設                  | 說明                                                                               |
| ------------- | ----------------------------------- | --------------------- | ---------------------------------------------------------------------------------- |
| `defaultSrc`  | `string`                            | 內建 SVG dataURL      | per-instance fallback 都用完之後的最後一道防線。                                   |
| `placeholder` | `string`                            | `undefined`           | 載入中要顯示的圖。                                                                 |
| `retry`       | `number`                            | `2`                   | 暫時性失敗的重試次數，超過就走 fallback。                                          |
| `retryDelay`  | `number`（毫秒）                    | `500`                 | 重試之間的固定間隔，不做 exponential backoff（圖片不是 API）。                     |
| `lazy`        | `boolean`                           | `true`                | 是否在內層 `<img>` 加上原生 `loading="lazy"`。                                     |
| `cacheSize`   | `number`                            | `100`                 | 失敗 URL 的 LRU 容量，`0` 為停用。                                                 |
| `onError`     | `(info: ErrorInfo) => void`         | `undefined`           | 主圖確認失敗時觸發一次，適合接 Sentry 或 Analytics。                               |

### `ErrorInfo`

```ts
interface ErrorInfo {
  src: string                       // 失敗的主圖 URL
  attempts: number                  // 確定走 fallback 前嘗試了幾次
  fallbackUsed: string              // 最終顯示的 fallback URL
  element?: HTMLImageElement        // 對應的 <img>（僅 directive 模式會帶）
}
```

## 範圍之外

以下這些刻意不做，請改用其他套件：

- 響應式圖片生成（`srcset` / `sizes`、`<picture>`、WebP/AVIF）：交給 image CDN 或專門套件。
- 編譯期 placeholder hash（plaiceholder、sharp）：自己生 dataURL 餵 `placeholder`。
- 容器比例控制：父層 CSS 或自己的 class 處理。

## SSR / Nuxt

元件跟 composable 把 DOM 操作放在 `onMounted` 之後，所以 SSR 環境下不會炸。Server-side render 出來會是骨架狀態的 wrapper，hydration 後才開始載圖。

## 贊助

如果這個套件有幫到你，可以從這邊請我喝杯咖啡：

- [Buy Me a Coffee](https://buymeacoffee.com/israynotarray)
- [Portaly 台灣贊助](https://portaly.cc/israynotarray/support)

## 授權

MIT
