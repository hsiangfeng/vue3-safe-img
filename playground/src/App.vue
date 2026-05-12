<script setup lang="ts">
import { computed, ref } from 'vue'
import { SafeImg, useSafeImg } from 'vue3-safe-img'

const okSquare = 'https://picsum.photos/seed/square/600/600'
const okWide = 'https://picsum.photos/seed/wide/1200/450'
const okPortrait = 'https://picsum.photos/seed/portrait/450/800'
const okBig = 'https://picsum.photos/seed/big/1920/1080'
const badUrl = 'https://this-host-does-not-exist.invalid/cover.jpg'
const customFallback = 'https://picsum.photos/seed/fallback/400/400'

const layered = ref(true)
const blurPx = ref(32)
const blur = computed(() => `${blurPx.value}px`)

const composableSrc = ref(badUrl)
const { currentSrc, status } = useSafeImg(composableSrc, {
  fallback: customFallback,
})
</script>

<template>
  <main>
    <h1>vue3-safe-img playground</h1>
    <p class="lead">
      左邊是實際渲染畫面，右邊是對應的程式碼。
      切換上方的 checkbox 可以打開／關掉雙層模糊背景。
    </p>

    <div class="controls">
      <label>
        <input v-model="layered" type="checkbox" />
        雙層模糊背景 (layered)
      </label>
      <label>
        模糊強度 (blurAmount)
        <input
          v-model.number="blurPx"
          type="range"
          min="0"
          max="80"
          step="1"
        />
        <input
          v-model.number="blurPx"
          type="number"
          min="0"
          max="200"
          step="1"
        />
        px
      </label>
    </div>

    <section>
      <h2>1. 固定 400×400 盒子塞 1920×1080 大圖</h2>
      <p class="note">圖自動 fit 成 400×225，上下空白由模糊背景補。</p>
      <div class="example">
        <SafeImg
          class="demo box-400"
          :src="okBig"
          :layered="layered"
          :blur-amount="blur"
        />
        <pre><code>&lt;script setup&gt;
import { SafeImg } from 'vue3-safe-img'
&lt;/script&gt;

&lt;template&gt;
  &lt;SafeImg
    class="box-400"
    src="https://picsum.photos/seed/big/1920/1080"
    blur-amount="32px"
  /&gt;
&lt;/template&gt;

&lt;style&gt;
.box-400 {
  width: 400px;
  height: 400px;
}
&lt;/style&gt;</code></pre>
      </div>
    </section>

    <section>
      <h2>2. 垂直長圖塞 16:9 寬框（左右模糊背景）</h2>
      <div class="example">
        <SafeImg
          class="demo ratio-16-9"
          :src="okPortrait"
          :layered="layered"
          :blur-amount="blur"
        />
        <pre><code>&lt;script setup&gt;
import { SafeImg } from 'vue3-safe-img'
&lt;/script&gt;

&lt;template&gt;
  &lt;SafeImg
    class="ratio-16-9"
    src="https://picsum.photos/seed/portrait/450/800"
  /&gt;
&lt;/template&gt;

&lt;style&gt;
.ratio-16-9 {
  width: 100%;
  aspect-ratio: 16 / 9;
}
&lt;/style&gt;</code></pre>
      </div>
    </section>

    <section>
      <h2>3. 方形圖塞 16:9 寬框</h2>
      <div class="example">
        <SafeImg
          class="demo ratio-16-9"
          :src="okSquare"
          :layered="layered"
          :blur-amount="blur"
        />
        <pre><code>&lt;SafeImg
  class="ratio-16-9"
  src="https://picsum.photos/seed/square/600/600"
/&gt;

&lt;style&gt;
.ratio-16-9 {
  width: 100%;
  aspect-ratio: 16 / 9;
}
&lt;/style&gt;</code></pre>
      </div>
    </section>

    <section>
      <h2>4. 寬圖塞 1:1 方框（上下模糊背景）</h2>
      <div class="example">
        <SafeImg
          class="demo ratio-1-1"
          :src="okWide"
          :layered="layered"
          :blur-amount="blur"
        />
        <pre><code>&lt;SafeImg
  class="ratio-1-1"
  src="https://picsum.photos/seed/wide/1200/450"
/&gt;

&lt;style&gt;
.ratio-1-1 {
  width: 100%;
  max-width: 400px;
  aspect-ratio: 1 / 1;
}
&lt;/style&gt;</code></pre>
      </div>
    </section>

    <section>
      <h2>5. 壞圖 + 自訂 fallback</h2>
      <div class="example">
        <SafeImg
          class="demo ratio-16-9"
          :src="badUrl"
          :fallback="customFallback"
          :layered="layered"
          :blur-amount="blur"
          @error="(info) => console.log('image failed:', info)"
        />
        <pre><code>&lt;script setup&gt;
import { SafeImg } from 'vue3-safe-img'

const handleError = (info) =&gt; {
  console.log('image failed:', info)
}
&lt;/script&gt;

&lt;template&gt;
  &lt;SafeImg
    class="ratio-16-9"
    src="https://broken.example/cover.jpg"
    fallback="/local-default.jpg"
    @error="handleError"
  /&gt;
&lt;/template&gt;

&lt;style&gt;
.ratio-16-9 {
  width: 100%;
  aspect-ratio: 16 / 9;
}
&lt;/style&gt;</code></pre>
      </div>
    </section>

    <section>
      <h2>6. 壞圖 + 走全域 default svg</h2>
      <div class="example">
        <SafeImg
          class="demo ratio-16-9"
          :src="badUrl"
          :layered="layered"
          :blur-amount="blur"
        />
        <pre><code>&lt;script setup&gt;
import { SafeImg } from 'vue3-safe-img'
&lt;/script&gt;

&lt;template&gt;
  &lt;!-- 沒給 fallback：依序試 plugin 的 defaultSrc，
       還是沒設就用套件內建破圖 SVG --&gt;
  &lt;SafeImg
    class="ratio-16-9"
    src="https://broken.example/cover.jpg"
  /&gt;
&lt;/template&gt;

&lt;style&gt;
.ratio-16-9 {
  width: 100%;
  aspect-ratio: 16 / 9;
}
&lt;/style&gt;</code></pre>
      </div>
    </section>

    <section>
      <h2>7. directive 用法（無雙層背景）</h2>
      <div class="example">
        <div class="demo ratio-16-9 directive-frame">
          <img v-safe-img="{ src: badUrl, fallback: customFallback }" />
        </div>
        <pre><code>&lt;!-- 全域 app.use(VueSafeImg) 後 directive 即可使用 --&gt;
&lt;template&gt;
  &lt;div class="frame"&gt;
    &lt;img v-safe-img="{
      src: 'https://broken.example/cover.jpg',
      fallback: '/local-default.jpg',
    }" /&gt;
  &lt;/div&gt;
&lt;/template&gt;

&lt;style&gt;
.frame {
  width: 100%;
  aspect-ratio: 16 / 9;
}
.frame img {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
}
&lt;/style&gt;</code></pre>
      </div>
    </section>

    <section>
      <h2>8. composable 用法</h2>
      <p class="note">
        當前 status：<code>{{ status }}</code>，currentSrc：<code>{{ currentSrc }}</code>
      </p>
      <div class="example">
        <div class="demo ratio-16-9 directive-frame">
          <img :src="currentSrc" />
        </div>
        <pre><code>&lt;script setup&gt;
import { ref } from 'vue'
import { useSafeImg } from 'vue3-safe-img'

const src = ref('https://broken.example/cover.jpg')
const { currentSrc, status, retry } = useSafeImg(src, {
  fallback: '/local-default.jpg',
})
&lt;/script&gt;

&lt;template&gt;
  &lt;p&gt;status: {{ status }}&lt;/p&gt;
  &lt;div class="frame"&gt;
    &lt;img :src="currentSrc" /&gt;
  &lt;/div&gt;
&lt;/template&gt;

&lt;style&gt;
.frame {
  width: 100%;
  aspect-ratio: 16 / 9;
}
.frame img {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
}
&lt;/style&gt;</code></pre>
      </div>
    </section>
  </main>
</template>

<style>
body {
  font-family: system-ui, -apple-system, sans-serif;
  margin: 0;
  background: #fafafa;
  color: #1f2937;
}

main {
  max-width: 960px;
  margin: 0 auto;
  padding: 2rem 1rem 4rem;
}

h1 {
  margin-bottom: 0.25rem;
}

.lead {
  margin: 0 0 1.5rem;
  color: #4b5563;
  font-size: 0.9375rem;
  line-height: 1.5;
}

h2 {
  margin: 2rem 0 0.5rem;
  font-size: 1rem;
  font-weight: 600;
  color: #111827;
}

.controls {
  display: flex;
  gap: 1.5rem;
  margin: 1rem 0 2rem;
  padding: 0.75rem 1rem;
  background: #fff;
  border-radius: 8px;
  border: 1px solid #e5e7eb;
  flex-wrap: wrap;
}

.controls label {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.875rem;
}

.controls input[type="number"] {
  width: 60px;
  padding: 0.25rem 0.5rem;
  border: 1px solid #d1d5db;
  border-radius: 4px;
}

.controls input[type="range"] {
  width: 140px;
}

section {
  margin-bottom: 1.5rem;
}

.example {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
  align-items: start;
}

@media (max-width: 720px) {
  .example {
    grid-template-columns: 1fr;
  }
}

.example pre {
  margin: 0;
  padding: 0.75rem 1rem;
  background: #1f2937;
  color: #f9fafb;
  border-radius: 8px;
  font-size: 0.8125rem;
  line-height: 1.5;
  overflow-x: auto;
}

.example pre code {
  font-family: 'Menlo', 'Consolas', monospace;
}

.demo {
  width: 100%;
  margin: 0;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  background-color: #f3f4f6;
}

.ratio-16-9 {
  aspect-ratio: 16 / 9;
}

.ratio-1-1 {
  aspect-ratio: 1 / 1;
  max-width: 400px;
}

.box-400 {
  width: 400px;
  height: 400px;
}

.note {
  margin: -0.25rem 0 0.75rem;
  font-size: 0.8125rem;
  color: #6b7280;
}

.note code {
  background: #e5e7eb;
  padding: 0.125rem 0.375rem;
  border-radius: 3px;
  font-size: 0.75rem;
}

.directive-frame img {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
}
</style>
