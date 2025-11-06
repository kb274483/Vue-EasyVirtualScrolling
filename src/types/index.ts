import type { Ref } from 'vue'
export type VirtualScrollItem = unknown

export type Direction = 'vertical' | 'horizontal' 
export interface VirtualRange{
  start: number
  end: number
}

export interface VScrollOptions{
  direction: Direction | Ref<Direction>
  itemSize: number  | Ref<number>
  itemCount: number  | Ref<number>
  overscan: number
  dynamic?: boolean
  useWorker?: boolean
}

export interface ScrollPayload {
  scrollTop: number
  scrollLeft: number
  scrollOffset: number
}

export interface ResizePayload {
  width: number
  height: number
}

export interface SizeCache {
  [index: number]: number
}