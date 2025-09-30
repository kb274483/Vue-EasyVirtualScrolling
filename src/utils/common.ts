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