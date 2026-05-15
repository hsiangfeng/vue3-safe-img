<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, useAttrs, watch } from 'vue'
import type { ErrorInfo } from './types'
import { resolveValue } from './core/resolve'
import { injectOptions, injectCache } from './context'
import { startLoad, type LoadController, type LoadStatus } from './lib/loader'

const props = withDefaults(
  defineProps<{
    src: string
    fallback?: string | string[]
    placeholder?: string
    layered?: boolean
    blurAmount?: string
    retry?: number
    lazy?: boolean
  }>(),
  {
    layered: true,
    blurAmount: '20px',
  },
)

const emit = defineEmits<{
  error: [info: ErrorInfo]
}>()

defineOptions({ inheritAttrs: false })

const rawAttrs = useAttrs()
const globals = injectOptions()
const cache = injectCache()

const config = computed(() => {
  const merged = { ...globals }
  if (props.lazy !== undefined) {
    merged.lazy = props.lazy
  }
  return resolveValue(
    {
      src: props.src,
      fallback: props.fallback,
      placeholder: props.placeholder,
      retry: props.retry,
    },
    merged,
  )
})

const displaySrc = ref<string>(config.value.placeholder ?? '')
const status = ref<LoadStatus>('loading')
let controller: LoadController | undefined

const start = () => {
  controller?.cancel()
  displaySrc.value = config.value.placeholder ?? ''
  status.value = 'loading'
  if (!config.value.src) {
    console.warn('[vue3-safe-img] <SafeImg>: src prop is empty')
    return
  }
  controller = startLoad(config.value, cache, (result) => {
    status.value = result.status
    if (result.status === 'loaded' || result.status === 'fallback') {
      displaySrc.value = result.src
    }
    if (result.errorInfo) {
      emit('error', result.errorInfo)
    }
  })
}

const retry = () => {
  cache.delete(config.value.src)
  start()
}

defineExpose({ retry })

onMounted(start)

watch(
  () => [props.src, props.fallback, props.placeholder, props.retry] as const,
  start,
  { deep: true },
)

onBeforeUnmount(() => controller?.cancel())

// displaySrc 空時 --vsi-image 走 none，露出背景灰當骨架
const frameStyle = computed(() => {
  const style: Record<string, string> = {
    '--vsi-blur': props.blurAmount,
    '--vsi-image': 'none',
  }
  if (displaySrc.value) {
    style['--vsi-image'] = `url('${displaySrc.value}')`
  }
  return style
})

// fallback 時拔掉使用者塞的 srcset / sizes，避免瀏覽器再去抓變體
const imgAttrs = computed(() => {
  const { class: _c, style: _s, ...rest } = rawAttrs as Record<string, unknown>
  if (status.value !== 'fallback') return rest
  const cleaned = { ...rest }
  delete cleaned.srcset
  delete cleaned.sizes
  return cleaned
})
</script>

<template>
  <div
    v-if="layered"
    :class="['vsi-frame', $attrs.class]"
    :style="[frameStyle, $attrs.style]"
  >
    <img v-if="displaySrc" class="vsi-main" :src="displaySrc" v-bind="imgAttrs" />
  </div>
  <img v-else-if="displaySrc" :src="displaySrc" v-bind="rawAttrs" />
</template>

<style>
.vsi-frame {
  position: relative;
  isolation: isolate;
  overflow: hidden;
  display: grid;
  background-color: var(--vsi-bg, #e5e7eb);
  background-image: var(--vsi-image);
  background-size: cover;
  background-position: center;
  background-repeat: no-repeat;
}

.vsi-frame::before {
  content: '';
  position: absolute;
  inset: 0;
  backdrop-filter: blur(var(--vsi-blur, 20px));
  -webkit-backdrop-filter: blur(var(--vsi-blur, 20px));
  pointer-events: none;
}

.vsi-main {
  position: relative;
  z-index: 1;
  grid-area: 1 / 1;
  display: block;
  width: 100%;
  height: 100%;
  min-width: 0;
  min-height: 0;
  object-fit: contain;
  object-position: center;
}
</style>
