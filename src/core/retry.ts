/**
 * 已嘗試 attempt 次後是否該再試一次。第一次失敗時傳 1。
 */
export function shouldRetry(attempt: number, max: number): boolean {
  return attempt <= max
}
