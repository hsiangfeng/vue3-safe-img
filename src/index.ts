import VueSafeImg from './plugin'

export default VueSafeImg
export { default as SafeImg } from './component.vue'
export { useSafeImg } from './composable'
export { DEFAULT_IMAGE } from './assets/default-svg'
export type { PluginOptions, SourceInput, ErrorInfo } from './types'
export type { LoadStatus } from './lib/loader'
