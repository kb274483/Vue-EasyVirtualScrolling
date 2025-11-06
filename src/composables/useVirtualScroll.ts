import { ref, computed, onMounted, onBeforeUnmount, watch, type Ref} from 'vue'
import type { VScrollOptions, VirtualRange, Direction } from '@/types'
import { useDynamicSize } from '@/composables/useDynamicSize'

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
  const isDynamic = computed(() => options.dynamic ?? false)
  const useWorker = computed(() => options.useWorker ?? false)

  const viewportSize = ref(0)
  const scrollOffset = ref(0)

  const dynamicSize = useDynamicSize(direction, itemSize, itemCount)
  
  // 計算可見的項目數
  const visibleCount = computed(()=>{
    if (itemSize.value <= 0 || viewportSize.value <= 0) return 0
    return Math.ceil(viewportSize.value / itemSize.value)
  }) 

  const range = ref<VirtualRange>({start: 0, end: -1})

  // Worker State
  const offsetRef = ref(0)
  const totalSizeRef = ref(0)
  let worker: Worker | null = null

  // 計算高度
  const totalSize = computed(()=>{
    if(useWorker.value) return totalSizeRef.value
    if(isDynamic.value) return dynamicSize.caleTotalSize()
    return itemCount.value * itemSize.value
  })
  const offset = computed(()=> {
    if(useWorker.value) return offsetRef.value
    return isDynamic.value
    ? dynamicSize.getItemOffset(range.value.start)
    : range.value.start * itemSize.value 
  })
  
  // 觀察器
  let resizeObserver: ResizeObserver | null = null
  // rAF ID 控制更新
  let rafId: number | null = null

  // 初始化Worker
  function postToWorker(msg: unknown){
    if(worker) worker.postMessage(msg)
  }
  function initWorker(){
    if(worker) return

    worker = new Worker(new URL('@/workers/useWorkersCalc.ts', import.meta.url),{type: 'module'})
    worker.onmessage = (e: MessageEvent) => {
      const data = e.data
      if(data?.type === 'calculated'){
        const p = data.payload
        if(p?.range) range.value = p.range
        if(p?.offset) offsetRef.value = p.offset
        if(p?.totalSize) totalSizeRef.value = p.totalSize
      }
    }
  }

  function readViewportSize(el: HTMLElement) {
    viewportSize.value = direction.value === 'vertical' ? el.clientHeight : el.clientWidth
  }

  function updateRange(el: HTMLElement){
    const current = direction.value === 'vertical' ? el.scrollTop : el.scrollLeft
    scrollOffset.value = current
    
    let start: number
    let end: number

    if(isDynamic.value){
      // 動態累加計算 可視區域的範圍
      start = dynamicSize.findStartIndex(current)
      let accSize = 0
      end = start
      while( 
        end < itemCount.value && 
        accSize < viewportSize.value + overscan.value * itemSize.value
      ){
        accSize += dynamicSize.getItemSize(end)
        end++
      }
      end = Math.min(end - 1, itemCount.value - 1)
      //  確保end 不小於start，避免render空白
      if (end < start) end = start
    }else{
      // 計算首尾索引
      start = Math.floor(current / Math.max(1, itemSize.value))
      end = Math.min(
        itemCount.value - 1,
        start + Math.max(0, visibleCount.value) + overscan.value - 1
      )
    }
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

      const el = containerRef.value
      const current = direction.value === 'vertical' ? el.scrollTop : el.scrollLeft
      scrollOffset.value = current

      if(useWorker.value){
        postToWorker({type: 'scroll', payload: {scrollOffset: current}})
      }else{
        updateRange(el)
      }
    })
  }

  function scrollToOffset(value: number){
    if (!containerRef.value) return
    if (direction.value === 'vertical') containerRef.value.scrollTop = value
    else containerRef.value.scrollLeft = value

    if(useWorker.value){
      postToWorker({type: 'scroll', payload: {scrollOffset: value}})
    }else{
      updateRange(containerRef.value)
    }
  }

  function scrollToIndex(index: number, align: 'start' | 'center' | 'end' = 'start'){
    index = Math.max(0, Math.min(index, itemCount.value - 1))
    let target: number
    if(isDynamic.value){
      target = dynamicSize.getItemOffset(index)
      const size = dynamicSize.getItemSize(index)

      if(align !== 'start' && viewportSize.value > 0){
        if (align === 'center') target = target - viewportSize.value / 2 + size / 2
        if (align === 'end') target = target - viewportSize.value + size
      }
    }else{
      target = index * itemSize.value
      if(align !== 'start' && viewportSize.value > 0){
        if (align === 'center') target = target - viewportSize.value / 2 + itemSize.value / 2
        if (align === 'end') target = target - viewportSize.value + itemSize.value
      }
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
    
    if (useWorker.value) {
      initWorker()
      postToWorker({
        type: 'init',
        payload: {
          direction: direction.value,
          itemCount: itemCount.value,
          estimatedSize: itemSize.value,
          overscan: overscan.value,
          dynamic: isDynamic.value,
          viewportSize: viewportSize.value,
          scrollOffset: (direction.value === 'vertical' ? el.scrollTop : el.scrollLeft) || 0
        }
      })
      if (isDynamic.value) {
        const entries = Object.entries(dynamicSize.sizeCache.value).map(([k, v]) => [Number(k), v as number])
        if (entries.length) postToWorker({ type: 'updateSize', payload: { entries } })
      }
    } else {
      updateRange(el)
    }

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
    if(worker){
      worker.terminate()
      worker = null
    }
  })

  watch([itemCount, itemSize, overscan, direction, isDynamic], () => {
    if(isDynamic.value) dynamicSize.clearAll()
    const el = containerRef.value
    if (!el) return

    if (useWorker.value) {
      postToWorker({
        type: 'option',
        payload: {
          direction: direction.value,
          itemCount: itemCount.value,
          estimatedSize: itemSize.value,
          overscan: overscan.value,
          dynamic: isDynamic.value
        }
      })
      if (isDynamic.value) {
        postToWorker({ type: 'resetSize' })
        const entries = Object.entries(dynamicSize.sizeCache.value).map(([k, v]) => [Number(k), v as number])
        if (entries.length) postToWorker({ type: 'updateSize', payload: { entries } })
      }
      postToWorker({ type: 'viewport', payload: { viewportSize: viewportSize.value } })
    } else {
      updateRange(el)
    }
  })

  watch(dynamicSize.sizeCache, (cache) => {
    if (!useWorker.value || !isDynamic.value) return
    const entries = Object.entries(cache).map(([k, v]) => [Number(k), v as number])
    postToWorker({ type: 'updateSize', payload: { entries } })
  }, { deep: true })

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
    measure :dynamicSize.observerItem,
    unmeasure: dynamicSize.unObserverItem,
  }
}
