
type RateLimitStore = Map<string, number[]>;

const rateLimitMap: RateLimitStore = new Map();

// Simple sliding window rate limiter
// Limit: max requests per windowMs
export function checkRateLimit(ip: string, limit: number = 5, windowMs: number = 60 * 1000): boolean {
  const now = Date.now();
  const timestamps = rateLimitMap.get(ip) || [];
  
  // Filter out timestamps older than window
  const validTimestamps = timestamps.filter(ts => now - ts < windowMs);
  
  if (validTimestamps.length >= limit) {
    return false;
  }
  
  validTimestamps.push(now);
  rateLimitMap.set(ip, validTimestamps);
  
  // Cleanup periodically (optional, but good for memory)
  if (rateLimitMap.size > 1000) {
      for (const [key, ts] of rateLimitMap.entries()) {
          if (ts.every(t => now - t > windowMs)) {
              rateLimitMap.delete(key);
          }
      }
  }
  
  return true;
}
