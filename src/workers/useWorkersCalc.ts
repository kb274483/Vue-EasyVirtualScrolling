/// <reference lib="webworker" />

type Direction = 'vertical' | 'horizontal'

type InitMsg = {
  type: 'init'
  payload: {
    direction : Direction
    itemCount: number
    estimatedSize: number
    overscan: number
    dynamic: boolean
    viewportSize: number
    scrollOffset: number
  }
}

type ViewportMsg = {
  type : 'viewport'
  payload:{
    viewportSize: number
  }
}

type ScrollMsg = {
  type : 'scroll'
  payload:{
    scrollOffset: number
  }
}

type OptionMsg = {
  type : 'option'
  payload:{
    direction? : Direction
    itemCount? : number
    estimatedSize? : number
    overscan?: number
    dynamic?: boolean
  }
}

type UpdateSizeMsg = {
  type : 'updateSize'
  payload:{
    entries: Array<[number, number]>
  }
}

type ResetSizeMsg = {type : 'resetSize'}

type fromMainMsg = InitMsg | ViewportMsg | ScrollMsg | OptionMsg | UpdateSizeMsg | ResetSizeMsg

type toMainCalcMsg = {
  type: 'calculated'
  payload: {
    range: {start: number, end: number}
    offset: number
    totalSize: number
    atStart: boolean
    atEnd: boolean
  }
}

let itemCount = 0
let estimatedSize = 0
let overscan = 5
let dynamic = false
let viewportSize = 0
let scrollOffset = 0

const sizeCache: Record<number, number> = {}
let positionCache: number[] = []

function getItemSize(index: number): number{
  return sizeCache[index] ?? estimatedSize
}

function clearPositionCache(index: number){
  positionCache = positionCache.slice(0, index+1)
}

function setItemSize(index: number, size: number){
  if(sizeCache[index] !== size){
    sizeCache[index] = size
    clearPositionCache(index)
  }
}

function getItemOffset(index: number): number{
  if(index <= 0) return 0
  if(positionCache[index] != null) return positionCache[index]

  let offset = positionCache[positionCache.length - 1] ?? 0
  const startIdx = positionCache.length

  for(let i = startIdx; i <= index; i++){
    positionCache[i] = offset
    offset += getItemSize(i)
  }

  return positionCache[index]
}

function calcTotalSize(): number{
  if(!dynamic) return itemCount * estimatedSize
  const lastIdx = itemCount - 1
  if(lastIdx < 0) return 0

  return getItemOffset(lastIdx) + getItemSize(lastIdx)
}

function findStartIndex(scrollOffset: number): number{
  if(!dynamic) return Math.floor(scrollOffset / Math.max(1, estimatedSize))
  
  if(scrollOffset <= 0) return 0

  let left = 0
  let right = itemCount - 1

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

function calcRange(){
  let start: number
  let end: number

  if(dynamic){
    start = findStartIndex(scrollOffset)
    let accSize = 0
    end = start
    while(end < itemCount && accSize < viewportSize + overscan * estimatedSize){
      accSize += getItemSize(end)
      end++
    }
    end = Math.min(end - 1, itemCount - 1)
    if(end < start) end = start
  }else{
    start = Math.floor(scrollOffset / Math.max(1, estimatedSize))
    end = Math.min(itemCount - 1, start + Math.max(0, viewportSize) + overscan - 1)
  }
  
  const range = {start: Math.max(0, start - overscan), end}
  const offset = dynamic ? getItemOffset(start) : start * estimatedSize
  const totalSize = calcTotalSize()
  const atStart = scrollOffset <= 0
  const atEnd = viewportSize > 0 ? scrollOffset + viewportSize >= totalSize - 1 : false

  const out: toMainCalcMsg = {
    type: 'calculated',
    payload: {range, offset, totalSize, atStart, atEnd}
  }

  postMessage(out)
}

self.onmessage = (e: MessageEvent<fromMainMsg>) => {
  const msg = e.data
  switch(msg.type){
    case 'init': {
      const p = msg.payload
      itemCount = p.itemCount
      estimatedSize = p.estimatedSize
      overscan = p.overscan
      dynamic = p.dynamic
      viewportSize = p.viewportSize
      scrollOffset = p.scrollOffset
      calcRange()
      break
    }
    case 'viewport': {
      viewportSize = msg.payload.viewportSize
      calcRange()
      break
    }
    case 'scroll': {
      scrollOffset = msg.payload.scrollOffset
      calcRange()
      break
    }
    case 'option': {
      const p = msg.payload
      if(p.itemCount != null) itemCount = p.itemCount
      if(p.estimatedSize != null) estimatedSize = p.estimatedSize
      if(p.overscan != null) overscan = p.overscan
      if(p.dynamic != null) dynamic = p.dynamic
      calcRange()
      break
    }
    case 'updateSize': {
      const p = msg.payload
      for(const [index, size] of p.entries){
        setItemSize(index, size)
      }
      calcRange()
      break
    }
    case 'resetSize': {
      for(const k in sizeCache) delete (sizeCache as Record<string, number>)[k]
      positionCache = []
      calcRange()
      break
    }
  }
}