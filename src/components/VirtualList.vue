<template>
  <component
    :is="tag"
    ref="containerRef"
    :class="[containerClass]"
    :style="containerStyles"
    @scroll.passive="onScroll"
  >
    <component
      :is="innerTag"
      :class="[innerClass]"
      :style="innerStyles"
    >
      <div
        :style="transformStyles"
      >
        <component
          v-for="(item, i) in visibleItems"
          :ref="(el: HTMLElement | null)=> handleMeasure(el, i)"
          :is="itemTag"
          :key="keyFor(item, range.start + i)"
          :class="[itemClass]"
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
  import { rafThrottle } from '@/utils/common'

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
    dynamic?: boolean
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
    dynamic: false,
    tag: 'div',
    innerTag: 'div',
    itemTag: 'div'
  })

  const emit = defineEmits<{
    (e: 'scroll', payload: ScrollPayload): void
    (e: 'range-change', payload: VirtualRange): void
    (e: 'reach-start', payload: boolean): void
    (e: 'reach-end', payload: boolean): void
    (e: 'item-click', payload: { item: Item; index: number; event: MouseEvent }): void
    (e: 'resize', payload: ResizePayload): void
  }>()

  const emitScroll = rafThrottle(()=>{
    const el = containerRef.value
    if(!el) return
    const scrollOffset = props.direction === 'vertical' ? el.scrollTop : el.scrollLeft
    emit('scroll', { scrollTop: el.scrollTop, scrollLeft: el.scrollLeft, scrollOffset: scrollOffset })
  })

  const emitRangeChange = rafThrottle((...args: unknown[]) => {
    const [next] = args as [VirtualRange]
    emit('range-change', next)
  })

  const emitItemClick = rafThrottle((...args: unknown[]) => {
    const [item, index, event] = args as [Item, number, MouseEvent]
    emit('item-click', { item, index, event })
  })

  const emitResize = rafThrottle(()=>{
    const el = containerRef.value
    if(!el) return
    emit('resize', { width: el.clientWidth, height: el.clientHeight })
  })

  const containerRef = ref<HTMLElement | null>(null)

  const { range, offset, totalSize, viewportSize, atStart, atEnd, handleScroll, scrollToIndex, scrollToOffset, scrollToTop, measure, unmeasure
  } = useVirtualScroll(containerRef, {
        itemCount: computed(() => props.items.length),
        itemSize: computed(() => props.itemSize),
        overscan: props.overscan,
        direction: props.direction,
        dynamic: props.dynamic
      })

  const visibleItems = computed<Item[]>(() => {
    if (range.value.end < range.value.start) return []
    return props.items.slice(range.value.start, range.value.end + 1)
  })

  function onScroll() {
    handleScroll()
    emitScroll()
  }

  watch(range, (next, prev) => {
    if (!prev || next.start !== prev.start || next.end !== prev.end) {
      emitRangeChange(next)
    }
  })

  watch([atStart, atEnd], ([s, e]) => {
    if (s) emit('reach-start', true)
    if (e) emit('reach-end', true)
  },{immediate: true})

  watch(viewportSize, () => {
    emitResize()
  })

  function keyFor(item: Item, index: number) {
    if (typeof props.keyField === 'function') return props.keyField(item, index)
    if (typeof props.keyField === 'string' && (item as Record<string, unknown>) && (item as Record<string, unknown>)[props.keyField] != null) {
      return (item as Record<string, unknown>)[props.keyField] as string | number
    }
    return index
  }

  function onItemClick(item: Item, index: number, event: MouseEvent) {
    emitItemClick(item, index, event)
  }

  const containerStyles = computed<CSSProperties>(() => {
    const base: CSSProperties = {
      overflow: 'auto',
      position: 'relative',
      overflowAnchor: 'none'
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
      contain: 'layout paint style',
      ...(props.innerStyle || {})
    }
  })

  const transformStyles = computed<CSSProperties>(() => {
    const isVertical = props.direction === 'vertical'
    const translate = isVertical 
      ? `translate3d(0, ${offset.value}px, 0)` 
      : `translate3d(${offset.value}px, 0, 0)`
    return { transform: translate, willChange: 'transform' }
  })

  const itemStyles = computed<CSSProperties>(() => {
    if(props.dynamic){
      const isVertical = props.direction === 'vertical'
      const base: CSSProperties = {
        boxSizing: 'border-box'
      }
      if(!isVertical){
        base.display = 'inline-block'
      }
      return { ...base, ...(props.itemStyle || {}) }
    }
    const isVertical = props.direction === 'vertical'
    const base: CSSProperties = isVertical
      ? { height: `${props.itemSize}px`, boxSizing: 'border-box' }
      : { width: `${props.itemSize}px`, display: 'inline-block', boxSizing: 'border-box' }
    return { ...base, ...(props.itemStyle || {}) }
  })

  function handleMeasure(el: HTMLElement | null, index: number){
    if(!props.dynamic) return

    const ele = el as HTMLElement | null
    if(ele) measure(range.value.start + index, ele)
    else unmeasure(range.value.start + index)
  }
  defineExpose({
    scrollToIndex,
    scrollToOffset,
    scrollToTop,
    getVisibleRange: () => range.value,
  })
</script>