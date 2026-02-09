# How to Monitor API Gateway Throttling and Rate Limit Responses (HTTP 429) with OpenTelemetry Metrics

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, API Gateway, Rate Limiting, HTTP 429

Description: Monitor API gateway throttling and HTTP 429 rate limit responses with OpenTelemetry metrics to protect your services and inform consumers.

Rate limiting is your API's safety valve. When consumers exceed their quota, the gateway returns HTTP 429 (Too Many Requests) and protects your backend from overload. But without monitoring, you do not know whether rate limits are set correctly, which consumers are hitting limits, or whether legitimate traffic is being blocked.

OpenTelemetry metrics give you full visibility into your rate limiting behavior.

## Instrumenting the Rate Limiter

Here is a rate limiting middleware for Express that records metrics on every decision:

```typescript
// rate-limit-middleware.ts
import { trace, metrics, SpanStatusCode } from '@opentelemetry/api';

const meter = metrics.getMeter('rate-limiter');

// Counter for rate limit decisions
const rateLimitDecisions = meter.createCounter('api.rate_limit.decisions', {
  description: 'Rate limit decisions (allowed or rejected)',
});

// Histogram for remaining quota at decision time
const remainingQuota = meter.createHistogram('api.rate_limit.remaining_quota', {
  description: 'Remaining rate limit quota when request arrives',
});

// Counter specifically for 429 responses
const throttledRequests = meter.createCounter('api.rate_limit.throttled', {
  description: 'Requests rejected due to rate limiting',
});

interface RateLimitState {
  remaining: number;
  limit: number;
  resetAt: number;
  consumerId: string;
}

export function rateLimitMiddleware(limiter: RateLimiter) {
  return async (req: any, res: any, next: any) => {
    const consumerId = extractConsumerId(req);
    const route = req.route?.path || req.path;
    const span = trace.getActiveSpan();

    const result = await limiter.check(consumerId, route);

    // Always set rate limit response headers
    res.setHeader('X-RateLimit-Limit', result.limit);
    res.setHeader('X-RateLimit-Remaining', result.remaining);
    res.setHeader('X-RateLimit-Reset', result.resetAt);

    // Record span attributes for trace-level visibility
    span?.setAttribute('rate_limit.consumer_id', consumerId);
    span?.setAttribute('rate_limit.limit', result.limit);
    span?.setAttribute('rate_limit.remaining', result.remaining);
    span?.setAttribute('rate_limit.reset_at', result.resetAt);

    // Record the remaining quota as a metric
    remainingQuota.record(result.remaining, {
      'api.consumer.id': consumerId,
      'http.route': route,
    });

    if (result.remaining <= 0) {
      // Request is throttled
      span?.setAttribute('rate_limit.throttled', true);
      span?.setStatus({
        code: SpanStatusCode.ERROR,
        message: 'Rate limit exceeded',
      });
      span?.addEvent('rate_limit.exceeded', {
        'api.consumer.id': consumerId,
        'rate_limit.limit': result.limit,
        'rate_limit.reset_at': result.resetAt,
      });

      rateLimitDecisions.add(1, {
        'decision': 'rejected',
        'http.route': route,
        'api.consumer.id': consumerId,
      });

      throttledRequests.add(1, {
        'http.route': route,
        'api.consumer.id': consumerId,
      });

      // Include Retry-After header
      const retryAfter = Math.ceil((result.resetAt - Date.now()) / 1000);
      res.setHeader('Retry-After', retryAfter);

      return res.status(429).json({
        error: 'Too Many Requests',
        retryAfter,
        limit: result.limit,
      });
    }

    // Request is allowed
    span?.setAttribute('rate_limit.throttled', false);
    rateLimitDecisions.add(1, {
      'decision': 'allowed',
      'http.route': route,
      'api.consumer.id': consumerId,
    });

    next();
  };
}

function extractConsumerId(req: any): string {
  // Try API key first, fall back to IP
  return req.headers['x-api-key']?.substring(0, 8)
    || req.ip
    || 'unknown';
}
```

## Implementing a Sliding Window Rate Limiter with Metrics

Here is a Redis-based sliding window implementation that reports its internal state:

```typescript
// sliding-window-limiter.ts
import Redis from 'ioredis';
import { trace } from '@opentelemetry/api';

const tracer = trace.getTracer('rate-limiter');

export class SlidingWindowLimiter {
  private redis: Redis;
  private windowMs: number;
  private maxRequests: number;

  constructor(redis: Redis, windowMs: number, maxRequests: number) {
    this.redis = redis;
    this.windowMs = windowMs;
    this.maxRequests = maxRequests;
  }

  async check(consumerId: string, route: string): Promise<RateLimitState> {
    return tracer.startActiveSpan('rate_limit.check', async (span) => {
      const now = Date.now();
      const windowStart = now - this.windowMs;
      const key = `ratelimit:${consumerId}:${route}`;

      // Remove expired entries and count current window
      const pipeline = this.redis.pipeline();
      pipeline.zremrangebyscore(key, 0, windowStart);
      pipeline.zcard(key);
      pipeline.zadd(key, now.toString(), `${now}:${Math.random()}`);
      pipeline.expire(key, Math.ceil(this.windowMs / 1000));

      const results = await pipeline.exec();
      const currentCount = (results?.[1]?.[1] as number) || 0;

      const remaining = Math.max(0, this.maxRequests - currentCount);
      const resetAt = now + this.windowMs;

      span.setAttribute('rate_limit.current_count', currentCount);
      span.setAttribute('rate_limit.window_ms', this.windowMs);
      span.end();

      return { remaining, limit: this.maxRequests, resetAt, consumerId };
    });
  }
}
```

## Monitoring Across API Gateway Providers

If you use a managed API gateway (AWS API Gateway, Kong, Apigee), instrument the client side to detect 429 responses:

```typescript
// gateway-429-detector.ts
import { trace, metrics, SpanStatusCode } from '@opentelemetry/api';

const meter = metrics.getMeter('api-client');

const gatewayThrottles = meter.createCounter('api.client.throttled', {
  description: 'Requests throttled by the API gateway',
});

const retryAttempts = meter.createCounter('api.client.retry_attempts', {
  description: 'Number of retry attempts after 429',
});

async function fetchWithRetry(url: string, options: RequestInit, maxRetries = 3) {
  const span = trace.getActiveSpan();

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const response = await fetch(url, options);

    if (response.status === 429) {
      gatewayThrottles.add(1, {
        'http.url': url,
        'attempt': attempt,
      });

      span?.addEvent('rate_limit.hit', {
        'attempt': attempt,
        'retry_after': response.headers.get('Retry-After') || 'unknown',
      });

      if (attempt < maxRetries) {
        const retryAfter = parseInt(response.headers.get('Retry-After') || '1', 10);
        retryAttempts.add(1, { 'http.url': url });

        // Wait before retrying with exponential backoff
        const delay = retryAfter * 1000 * Math.pow(2, attempt);
        await new Promise((resolve) => setTimeout(resolve, delay));
        continue;
      }
    }

    return response;
  }
}
```

## Key Metrics for Your Dashboard

Build a rate limiting dashboard with these panels:

```
# Throttle rate by consumer
sum(rate(api_rate_limit_throttled_total[5m])) by (api_consumer_id)

# Percentage of requests throttled per route
sum(rate(api_rate_limit_decisions_total{decision="rejected"}[5m])) by (http_route)
/
sum(rate(api_rate_limit_decisions_total[5m])) by (http_route)
* 100

# Consumers closest to their limits
# (low remaining quota = about to be throttled)
avg(api_rate_limit_remaining_quota) by (api_consumer_id) < 10

# Throttle events over time (to spot traffic spikes)
sum(rate(api_rate_limit_throttled_total[1m]))
```

## Alerting Strategy

Set up two levels of alerts:

1. **Warning**: When a consumer is consistently using more than 80% of their quota, reach out proactively to discuss upgrading their plan or optimizing their usage.

2. **Critical**: When legitimate traffic is being throttled (e.g., your own frontend is getting 429s from your own API gateway), that indicates your rate limits need tuning.

The distinction between "consumer hitting their limit" and "limit is set too low" is critical. Both show up as 429 responses, but they require opposite actions. Per-consumer metrics let you tell them apart.

Rate limiting without monitoring is like having a fire alarm with no sound. OpenTelemetry metrics ensure that when your rate limiter activates, you know exactly what happened and why.
