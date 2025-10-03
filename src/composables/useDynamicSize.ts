import { ref, onBeforeUnmount, type Ref } from 'vue'
import type { SizeCache, Direction } from '@/types'

export function useDynamicSize(
  direction: Ref<Direction>,
  estimatedSize: Ref<number>,
  itemCount: Ref<number>,
){
  const sizeCache = ref<SizeCache>({})
  const itemObservers = new Map<number, ResizeObserver>()
  const positionCache = ref<number[]>([])

  // 取得Cache或是預估高度
  function getItemSize(index: number): number{
    return sizeCache.value[index] ?? estimatedSize.value
  }

  // 更新item高度
  function setItemSize(index: number, size: number){
    if(sizeCache.value[index] !== size){
      sizeCache.value[index] = size
      clearPositionCache(index)
    }
  }

  // 移除高度改變後的Cache
  function clearPositionCache(index: number){
    positionCache.value = positionCache.value.slice(0, index+1)
  }

  function getItemOffset(index: number): number{
    if(index <= 0) return 0
    if(positionCache.value[index] != null) return positionCache.value[index]
  
    let offset = positionCache.value[positionCache.value.length - 1] ?? 0
    const startIdx = positionCache.value.length

    for(let i = startIdx; i <= index; i++){
      positionCache.value[i] = offset
      offset += getItemSize(i)
    }

    return positionCache.value[index]
  }

  function caleTotalSize():number{
    const lastIdx = itemCount.value -1 
    if(lastIdx < 0) return 0

    return getItemOffset(lastIdx) + getItemSize(lastIdx)
  }

  function findStartIndex(scrollOffset: number):number{
    if(scrollOffset <= 0) return 0
    
    let left = 0
    let right = itemCount.value - 1

    while(left <= right){
      const mid = Math.floor((left + right) / 2)
      const midOffset = getItemOffset(mid)
      const midSize = getItemSize(mid)

      if(scrollOffset >= midOffset && scrollOffset < midOffset + midSize){
        return mid
      }else if(scrollOffset < midOffset){
        right = mid - 1
      }else{
        left = mid + 1
      }
    }

    return Math.min(left, right)
  }

  function observerItem(index: number, ele: HTMLElement){
    if(itemObservers.has(index)) return

    const observer = new ResizeObserver((entries)=>{
      for(const entry of entries){
        const measured = direction.value === 'vertical' 
          ? (entry.borderBoxSize?.[0]?.blockSize ?? entry.target.getBoundingClientRect().height)
          : (entry.borderBoxSize?.[0]?.inlineSize ?? entry.target.getBoundingClientRect().width)

        // 忽略非數值或小於等於 0，避免尺寸覆寫為 0
        if (Number.isFinite(measured) && measured > 0) {
          setItemSize(index, measured)
        }
      }
    })

    observer.observe(ele)
    itemObservers.set(index, observer)
  }

  function unObserverItem(index: number){
    const observer = itemObservers.get(index)
    if(observer){
      observer.disconnect()
      itemObservers.delete(index)
    }
  }

  function clearAll(){
    itemObservers.forEach(observer => observer.disconnect())
    itemObservers.clear()
    sizeCache.value = {}
    positionCache.value = []
  }

  onBeforeUnmount(()=>{
    clearAll()
  })

  return {
    sizeCache,
    getItemSize,
    setItemSize,
    getItemOffset,
    caleTotalSize,
    findStartIndex,
    observerItem,
    unObserverItem,
    clearAll,
  }
}