export function rafThrottle<T extends (...args: unknown[]) => void>(func: T) {
  let scheduled = false
  let lastArgs: Parameters<T> | null = null

  return (...args: Parameters<T>) => {
    lastArgs = args
    if(scheduled) return
    scheduled = true

    requestAnimationFrame(()=>{
      scheduled = false
      if(lastArgs){
        func(...lastArgs)
        lastArgs = null
      }
    })
  }
}

export function throttle(func: (...args: unknown[]) => void, wait: number) {
  let now = Date.now()
  return (...args: unknown[]) => {
    const current = Date.now()
    if(current - now >= wait){
      now = current
      func(...args)
    }
  }
}