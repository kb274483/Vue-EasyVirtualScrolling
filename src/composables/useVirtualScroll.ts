import { ref, computed, onMounted, onBeforeUnmount, watch, type Ref} from 'vue'
import type { VScrollOptions, VirtualRange, Direction } from '@/types'

export function useVirtualScroll(
  containerRef: Ref<HTMLElement | null>,
  options: VScrollOptions
){
  // 建立預設值
  const overscan  = computed(() => options.overscan ?? 5)
  const direction = computed<Direction>(
    () => typeof options.direction === 'string' ? options.direction : options.direction.value)
  const itemSize  = computed(() => typeof options.itemSize  === 'number' ? options.itemSize  : options.itemSize.value)
  const itemCount = computed(() => typeof options.itemCount === 'number' ? options.itemCount : options.itemCount.value)


  const viewportSize = ref(0)
  const scrollOffset = ref(0)
  
  // 計算可見的項目數
  const visibleCount = computed(()=>{
    if (itemSize.value <= 0 || viewportSize.value <= 0) return 0
    return Math.ceil(viewportSize.value / itemSize.value)
  }) 

  const range = ref<VirtualRange>({start: 0, end: -1})
  const totalSize = computed(()=>{
    return itemCount.value * itemSize.value
  })
  const offset = computed(()=> range.value.start * itemSize.value)
  
  // 觀察器
  let resizeObserver: ResizeObserver | null = null
  // rAF ID 控制更新
  let rafId: number | null = null

  function readViewportSize(el: HTMLElement) {
    viewportSize.value = direction.value === 'vertical' ? el.clientHeight : el.clientWidth
  }

  function updateRange(el: HTMLElement){
    const current = direction.value === 'vertical' ? el.scrollTop : el.scrollLeft
    scrollOffset.value = current
    // 計算首尾索引
    const start = Math.floor(current / Math.max(1, itemSize.value))
    const end = Math.min(
      itemCount.value - 1,
      start + Math.max(0, visibleCount.value) + overscan.value - 1
    )
    // 更新範圍 start 需要再減掉 overscan
    const next: VirtualRange = {start: Math.max(0, start - overscan.value), end}
    if (next.start !== range.value.start || next.end !== range.value.end) {
      range.value = next
    }
  }

  function handleScroll(){
    if (rafId != null) return

    rafId = requestAnimationFrame(()=>{
      if (!containerRef.value) return
      rafId = null
      updateRange(containerRef.value)
    })
  }

  function scrollToOffset(value: number){
    if (!containerRef.value) return
    if (direction.value === 'vertical') containerRef.value.scrollTop = value
    else containerRef.value.scrollLeft = value
    updateRange(containerRef.value)
  }

  function scrollToIndex(index: number, align: 'start' | 'center' | 'end' = 'start'){
    index = Math.max(0, Math.min(index, itemCount.value - 1))
    let target = index * itemSize.value
    if(align !== 'start' && viewportSize.value > 0){
      if (align === 'center') target = target - viewportSize.value / 2 + itemSize.value / 2
      if (align === 'end') target = target - viewportSize.value + itemSize.value
    }
    scrollToOffset(Math.max(0, Math.min(totalSize.value - viewportSize.value, target)))
  }

  function scrollToTop(){
    scrollToOffset(0)
  }

  onMounted(()=>{
    const el = containerRef.value
    if(!el) return 
    readViewportSize(el)
    updateRange(el)

    resizeObserver = new ResizeObserver(()=>{
      readViewportSize(el)
      updateRange(el)
    })
    
    resizeObserver.observe(el)
  })
  
  onBeforeUnmount(()=>{
    if (resizeObserver) {
      resizeObserver.disconnect()
      resizeObserver = null
    }
    if (rafId != null) {
      cancelAnimationFrame(rafId)
      rafId = null
    }
  })

  watch([itemCount, itemSize], () => {
    const el = containerRef.value
    if (!el) return
    updateRange(el)
  })

  const atStart = computed(() => scrollOffset.value <= 0)
  const atEnd = computed(() => {
    if (viewportSize.value <= 0) return false
    return scrollOffset.value + viewportSize.value >= totalSize.value - 1
  })

  return {
    // state
    range,
    offset,
    totalSize,
    viewportSize,
    scrollOffset,
    atStart,
    atEnd,
    // actions
    handleScroll,
    scrollToOffset,
    scrollToIndex,
    scrollToTop,
  }
}
