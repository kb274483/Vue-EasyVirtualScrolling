<template>
  <component
    :is="tag"
    ref="containerRef"
    :class="['vs-container', containerClass]"
    :style="containerStyles"
    @scroll.passive="onScroll"
  >
    <component
      :is="innerTag"
      :class="['vs-inner', innerClass]"
      :style="innerStyles"
    >
      <div
        class="vs-transformer"
        :style="transformStyles"
      >
        <component
          v-for="(item, i) in visibleItems"
          :is="itemTag"
          :key="keyFor(item, range.start + i)"
          :class="['vs-item', itemClass]"
          :style="itemStyles"
          @click="onItemClick(item, range.start + i, $event)"
        >
          <slot :item="item" :index="range.start + i" />
        </component>
      </div>
    </component>
  </component>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import type { CSSProperties } from 'vue'
import { useVirtualScroll } from '@/composables/useVirtualScroll'
import type { Direction, VirtualRange, ScrollPayload, ResizePayload } from '@/types'

type Item = unknown
type ClassType =
  | string
  | Record<string, boolean>
  | Array<string | Record<string, boolean>>

interface Props<T = Item> {
  items: T[]
  itemSize: number
  overscan?: number
  height?: number | string
  direction?: Direction
  tag?: string
  innerTag?: string
  itemTag?: string
  containerClass?: ClassType
  containerStyle?: CSSProperties
  innerClass?: ClassType
  innerStyle?: CSSProperties
  itemClass?: ClassType
  itemStyle?: CSSProperties
  keyField?: string | ((item: T, index: number) => string | number)
}

const props = withDefaults(defineProps<Props<Item>>(), {
  overscan: 5,
  direction: 'vertical',
  tag: 'div',
  innerTag: 'div',
  itemTag: 'div'
})

const emit = defineEmits<{
  (e: 'scroll', payload: ScrollPayload): void
  (e: 'range-change', payload: VirtualRange): void
  (e: 'reach-start'): void
  (e: 'reach-end'): void
  (e: 'item-click', payload: { item: Item; index: number; event: MouseEvent }): void
  (e: 'resize', payload: ResizePayload): void
}>()

const containerRef = ref<HTMLElement | null>(null)

const { range, offset, totalSize, viewportSize, scrollOffset, atStart, atEnd, handleScroll, scrollToIndex, scrollToOffset, scrollToTop } =
  useVirtualScroll(containerRef, {
    itemCount: computed(() => props.items.length),
    itemSize: computed(() => props.itemSize),
    overscan: props.overscan,
    direction: props.direction
  })

const visibleItems = computed<Item[]>(() => {
  if (range.value.end < range.value.start) return []
  return props.items.slice(range.value.start, range.value.end + 1)
})

function onScroll(e: Event) {
  const el = e.target as HTMLElement
  handleScroll()
  emit('scroll', { scrollTop: el.scrollTop, scrollLeft: el.scrollLeft, scrollOffset: scrollOffset.value })
}

watch(range, (next, prev) => {
  if (!prev || next.start !== prev.start || next.end !== prev.end) {
    emit('range-change', next)
  }
})

watch([atStart, atEnd], ([s, e]) => {
  if (s) emit('reach-start')
  if (e) emit('reach-end')
})

watch(viewportSize, () => {
  const el = containerRef.value
  if (!el) return
  emit('resize', { width: el.clientWidth, height: el.clientHeight })
})

function keyFor(item: Item, index: number) {
  if (typeof props.keyField === 'function') return props.keyField(item, index)
  if (typeof props.keyField === 'string' && (item as Record<string, unknown>) && (item as Record<string, unknown>)[props.keyField] != null) {
    return (item as Record<string, unknown>)[props.keyField] as string | number
  }
  return index
}

function onItemClick(item: Item, index: number, event: MouseEvent) {
  emit('item-click', { item, index, event })
}

const containerStyles = computed<CSSProperties>(() => {
  const base: CSSProperties = {
    overflow: 'auto',
    willChange: 'transform',
    position: 'relative'
  }
  if (props.height != null) {
    base.height = typeof props.height === 'number' ? `${props.height}px` : props.height
  }
  return { ...base, ...(props.containerStyle || {}) }
})

const innerStyles = computed<CSSProperties>(() => {
  const isVertical = props.direction === 'vertical'
  return {
    position: 'relative',
    width: isVertical ? '100%' : `${totalSize.value}px`,
    height: isVertical ? `${totalSize.value}px` : '100%',
    ...(props.innerStyle || {})
  }
})

const transformStyles = computed<CSSProperties>(() => {
  const isVertical = props.direction === 'vertical'
  const translate = isVertical ? `translateY(${offset.value}px)` : `translateX(${offset.value}px)`
  return { transform: translate, willChange: 'transform' }
})

const itemStyles = computed<CSSProperties>(() => {
  const isVertical = props.direction === 'vertical'
  const base: CSSProperties = isVertical
    ? { height: `${props.itemSize}px`, boxSizing: 'border-box' }
    : { width: `${props.itemSize}px`, display: 'inline-block', boxSizing: 'border-box' }
  return { ...base, ...(props.itemStyle || {}) }
})

// expose methods
defineExpose({
  scrollToIndex,
  scrollToOffset,
  scrollToTop,
  getVisibleRange: () => range.value
})
</script>