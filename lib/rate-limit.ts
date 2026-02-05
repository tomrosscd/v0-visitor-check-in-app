/**
 * Simple In-Memory Rate Limiter
 * 
 * Basic IP-based rate limiting for the check-in API.
 * Limits requests per IP address over a sliding window.
 * 
 * Note: This is a simple in-memory implementation suitable for
 * single-server deployments. For distributed deployments,
 * consider using Redis or a similar external store.
 */

// =============================================================================
// Types
// =============================================================================

interface RateLimitEntry {
  count: number
  resetAt: number
}

interface RateLimitConfig {
  windowMs: number  // Time window in milliseconds
  maxRequests: number  // Max requests per window
}

interface RateLimitResult {
  allowed: boolean
  remaining: number
  resetAt: number
}

// =============================================================================
// Store
// =============================================================================

const store = new Map<string, RateLimitEntry>()

// Default configuration: 10 requests per minute
const DEFAULT_CONFIG: RateLimitConfig = {
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 10,
}

// Cleanup interval (every 5 minutes)
const CLEANUP_INTERVAL = 5 * 60 * 1000

// Periodic cleanup of expired entries
let cleanupTimer: ReturnType<typeof setInterval> | null = null

function startCleanup(): void {
  if (cleanupTimer) return
  
  cleanupTimer = setInterval(() => {
    const now = Date.now()
    for (const [key, entry] of store.entries()) {
      if (entry.resetAt < now) {
        store.delete(key)
      }
    }
  }, CLEANUP_INTERVAL)
}

// Start cleanup on module load
if (typeof window === 'undefined') {
  startCleanup()
}

// =============================================================================
// Public API
// =============================================================================

/**
 * Check rate limit for an identifier (typically IP address)
 */
export function checkRateLimit(
  identifier: string,
  config: RateLimitConfig = DEFAULT_CONFIG
): RateLimitResult {
  const now = Date.now()
  const entry = store.get(identifier)

  // No existing entry or expired - create new
  if (!entry || entry.resetAt < now) {
    const newEntry: RateLimitEntry = {
      count: 1,
      resetAt: now + config.windowMs,
    }
    store.set(identifier, newEntry)

    return {
      allowed: true,
      remaining: config.maxRequests - 1,
      resetAt: newEntry.resetAt,
    }
  }

  // Check if over limit
  if (entry.count >= config.maxRequests) {
    return {
      allowed: false,
      remaining: 0,
      resetAt: entry.resetAt,
    }
  }

  // Increment count
  entry.count++
  
  return {
    allowed: true,
    remaining: config.maxRequests - entry.count,
    resetAt: entry.resetAt,
  }
}

/**
 * Get client IP from request headers
 */
export function getClientIP(request: Request): string {
  // Check common headers for proxied requests
  const forwarded = request.headers.get('x-forwarded-for')
  if (forwarded) {
    return forwarded.split(',')[0].trim()
  }

  const realIP = request.headers.get('x-real-ip')
  if (realIP) {
    return realIP
  }

  // Vercel-specific header
  const vercelIP = request.headers.get('x-vercel-forwarded-for')
  if (vercelIP) {
    return vercelIP.split(',')[0].trim()
  }

  // Fallback
  return 'unknown'
}

/**
 * Reset rate limit for an identifier (for testing)
 */
export function resetRateLimit(identifier: string): void {
  store.delete(identifier)
}

/**
 * Clear all rate limit entries (for testing)
 */
export function clearAllRateLimits(): void {
  store.clear()
}
