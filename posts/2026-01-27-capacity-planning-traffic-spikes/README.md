# How to Plan for Traffic Spikes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Capacity Planning, Traffic Spikes, Scaling, Performance, Auto-scaling, Caching, Rate Limiting, Load Testing, Site Reliability Engineering

Description: A practical guide to preparing your infrastructure for sudden traffic surges through auto-scaling, caching, rate limiting, and proactive load testing.

---

> The best time to prepare for a traffic spike is before it happens. The second best time is right now.

Traffic spikes are inevitable. Whether it is a viral social media post, a product launch, a seasonal sale, or an unexpected news mention, your system will eventually face a surge that tests its limits. The difference between graceful scaling and catastrophic failure lies entirely in preparation.

---

## Identifying Spike Patterns

Before you can plan for traffic spikes, you need to understand when and why they occur. Most spikes fall into predictable categories.

### Types of Traffic Spikes

**Scheduled events** are the easiest to plan for. Product launches, marketing campaigns, sales events, and scheduled broadcasts all have known start times. Plan capacity 2-4x your expected peak and have additional headroom on standby.

**Recurring patterns** emerge from your historical data. Analyze traffic by hour, day, and season. E-commerce sites spike during holidays; B2B SaaS peaks on weekday mornings; media sites surge during breaking news.

**Unpredictable surges** are the hardest. A viral post, an influencer mention, or a competitor outage can send traffic your way without warning. These require always-on elasticity.

### Analyzing Historical Data

Use your observability platform to identify patterns. This query finds your highest traffic hours over the past 90 days.

```sql
-- Find peak traffic hours from the last 90 days
-- Group requests by hour and day of week to spot patterns
SELECT
  EXTRACT(HOUR FROM timestamp) AS hour_of_day,
  EXTRACT(DOW FROM timestamp) AS day_of_week,
  COUNT(*) AS request_count,
  PERCENTILE_CONT(0.99) WITHIN GROUP (ORDER BY response_time) AS p99_latency
FROM requests
WHERE timestamp > NOW() - INTERVAL '90 days'
GROUP BY hour_of_day, day_of_week
ORDER BY request_count DESC
LIMIT 20;
```

Track the ratio between your normal baseline and peak traffic. If your peak is 10x your baseline, your auto-scaling strategy needs to handle that multiplier within minutes.

---

## Auto-scaling Strategies

Auto-scaling is your first line of defense against traffic spikes. The goal is to add capacity automatically before users experience degradation.

### Horizontal Pod Autoscaler (HPA)

For Kubernetes workloads, the HPA adjusts replica counts based on metrics. Configure it to scale on CPU, memory, or custom metrics like requests per second.

```yaml
# hpa-web.yaml
# Scales the web deployment based on CPU utilization
# Targets 60% CPU to leave headroom for spike absorption
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: web-hpa
  namespace: production
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: web
  minReplicas: 3              # Always keep at least 3 pods for availability
  maxReplicas: 50             # Cap to control costs during extreme spikes
  metrics:
    - type: Resource
      resource:
        name: cpu
        target:
          type: Utilization
          averageUtilization: 60    # Scale up before hitting capacity
  behavior:
    scaleUp:
      stabilizationWindowSeconds: 0      # Scale up immediately
      policies:
        - type: Percent
          value: 100                     # Double capacity if needed
          periodSeconds: 15              # Check every 15 seconds
    scaleDown:
      stabilizationWindowSeconds: 300    # Wait 5 minutes before scaling down
      policies:
        - type: Pods
          value: 2                       # Remove at most 2 pods at a time
          periodSeconds: 60              # Check every minute
```

### Scaling on Custom Metrics

CPU alone may not reflect user demand. Scale on requests per second or queue depth for more responsive scaling.

```yaml
# hpa-custom-metrics.yaml
# Scales based on requests per second from Prometheus
# More responsive than CPU for web traffic patterns
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: web-hpa-rps
  namespace: production
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: web
  minReplicas: 3
  maxReplicas: 50
  metrics:
    - type: Pods
      pods:
        metric:
          name: http_requests_per_second    # Custom metric from Prometheus adapter
        target:
          type: AverageValue
          averageValue: 1000                # Target 1000 RPS per pod
```

### Cluster Autoscaler

Your pods can only scale if nodes are available. Configure the cluster autoscaler to provision new nodes when pods are pending.

```yaml
# cluster-autoscaler-config.yaml
# Configures node pool scaling for GKE, EKS, or AKS
# Adjust node pool sizes based on your cloud provider
apiVersion: v1
kind: ConfigMap
metadata:
  name: cluster-autoscaler-config
  namespace: kube-system
data:
  # Scale up quickly, scale down conservatively
  scale-down-delay-after-add: "10m"
  scale-down-unneeded-time: "10m"
  scan-interval: "10s"
  # Leave buffer capacity for sudden spikes
  expendable-pods-priority-cutoff: "-10"
```

---

## Pre-warming: Getting Ahead of Known Spikes

For scheduled events, do not wait for auto-scaling to react. Pre-warm your infrastructure before traffic arrives.

### Pre-warming Checklist

Before a major event, scale up proactively.

```bash
#!/bin/bash
# pre-warm.sh
# Run this script 30-60 minutes before a scheduled traffic event
# Scales up infrastructure and validates readiness

set -e

echo "Starting pre-warm sequence for traffic event..."

# Scale deployments to expected peak capacity
# Adjust replica counts based on your expected traffic multiplier
kubectl scale deployment web --replicas=20 -n production
kubectl scale deployment api --replicas=15 -n production
kubectl scale deployment worker --replicas=10 -n production

# Wait for all pods to be ready
echo "Waiting for pods to reach ready state..."
kubectl rollout status deployment/web -n production --timeout=300s
kubectl rollout status deployment/api -n production --timeout=300s
kubectl rollout status deployment/worker -n production --timeout=300s

# Warm up caches by hitting key endpoints
echo "Warming caches..."
curl -s https://api.example.com/health > /dev/null
curl -s https://api.example.com/v1/products?limit=100 > /dev/null
curl -s https://api.example.com/v1/categories > /dev/null

# Verify database connection pool is sized appropriately
echo "Checking database connections..."
kubectl exec -it deploy/api -n production -- \
  psql $DATABASE_URL -c "SHOW max_connections;"

echo "Pre-warm complete. Ready for traffic."
```

### Database Connection Pool Sizing

Your application may scale, but your database connection pool must keep pace. Size it based on your maximum pod count.

```javascript
// db-config.js
// Configure connection pool based on expected pod count
// Total connections = pool_size * max_pods
// Ensure this does not exceed your database max_connections

const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,

  // Pool sizing for traffic spikes
  min: 5,                    // Minimum connections per pod
  max: 20,                   // Maximum connections per pod

  // Connection lifecycle
  idleTimeoutMillis: 30000,  // Close idle connections after 30 seconds
  connectionTimeoutMillis: 5000,  // Fail fast if no connection available

  // Statement timeout to prevent long-running queries during spikes
  statement_timeout: 10000,  // 10 second query timeout
});

// Monitor pool health
pool.on('error', (err) => {
  console.error('Unexpected database pool error:', err);
});

module.exports = pool;
```

---

## Caching Strategies for Spike Absorption

Caching is your shock absorber. A well-designed cache can handle 10x traffic without touching your origin servers.

### Multi-layer Caching Architecture

Implement caching at every layer: CDN, application, and database.

```javascript
// cache-middleware.js
// Multi-layer caching strategy for Express.js
// Checks Redis first, then computes and caches the result

const Redis = require('ioredis');

const redis = new Redis({
  host: process.env.REDIS_HOST,
  port: 6379,
  // Connection pool for high throughput
  maxRetriesPerRequest: 3,
  retryDelayOnFailover: 100,
});

// Cache middleware with stale-while-revalidate pattern
const cacheMiddleware = (options = {}) => {
  const {
    ttl = 60,           // Cache TTL in seconds
    staleTtl = 300,     // Stale content TTL (serve while revalidating)
    keyPrefix = 'cache:',
  } = options;

  return async (req, res, next) => {
    // Skip caching for authenticated or non-GET requests
    if (req.method !== 'GET' || req.headers.authorization) {
      return next();
    }

    const cacheKey = `${keyPrefix}${req.originalUrl}`;

    try {
      // Check cache first
      const cached = await redis.get(cacheKey);

      if (cached) {
        const { data, timestamp } = JSON.parse(cached);
        const age = Date.now() - timestamp;

        // Return cached data immediately
        res.set('X-Cache', age < ttl * 1000 ? 'HIT' : 'STALE');
        res.set('Age', Math.floor(age / 1000));

        // If stale, trigger background refresh
        if (age > ttl * 1000) {
          setImmediate(() => refreshCache(req, cacheKey, ttl, staleTtl));
        }

        return res.json(data);
      }

      // Cache miss - compute and store
      res.set('X-Cache', 'MISS');

      // Intercept response to cache it
      const originalJson = res.json.bind(res);
      res.json = (data) => {
        // Cache the response asynchronously
        redis.setex(
          cacheKey,
          staleTtl,
          JSON.stringify({ data, timestamp: Date.now() })
        ).catch(console.error);

        return originalJson(data);
      };

      next();
    } catch (err) {
      // Cache failure should not break the request
      console.error('Cache error:', err);
      next();
    }
  };
};

module.exports = { cacheMiddleware, redis };
```

### Cache Warming Script

Pre-populate your cache before traffic spikes hit.

```python
# cache_warmer.py
# Pre-populates cache with frequently accessed data
# Run before scheduled traffic events

import asyncio
import aiohttp
import redis.asyncio as redis
from typing import List

class CacheWarmer:
    def __init__(self, base_url: str, redis_url: str):
        self.base_url = base_url
        self.redis = redis.from_url(redis_url)

    async def warm_endpoints(self, endpoints: List[str], concurrency: int = 10):
        """
        Warm cache by hitting endpoints concurrently.
        Concurrency limits prevent overwhelming the origin.
        """
        semaphore = asyncio.Semaphore(concurrency)

        async with aiohttp.ClientSession() as session:
            tasks = [
                self._warm_single(session, semaphore, endpoint)
                for endpoint in endpoints
            ]
            results = await asyncio.gather(*tasks, return_exceptions=True)

        success = sum(1 for r in results if r is True)
        print(f"Warmed {success}/{len(endpoints)} endpoints")

    async def _warm_single(self, session, semaphore, endpoint):
        """Warm a single endpoint with rate limiting."""
        async with semaphore:
            try:
                url = f"{self.base_url}{endpoint}"
                async with session.get(url, timeout=30) as resp:
                    if resp.status == 200:
                        return True
                    print(f"Warning: {endpoint} returned {resp.status}")
                    return False
            except Exception as e:
                print(f"Error warming {endpoint}: {e}")
                return False

# Endpoints to warm before a traffic event
CRITICAL_ENDPOINTS = [
    "/api/v1/products",
    "/api/v1/categories",
    "/api/v1/featured",
    "/api/v1/homepage",
]

# Add pagination for large datasets
PAGINATED_ENDPOINTS = [
    f"/api/v1/products?page={i}&limit=50"
    for i in range(1, 21)  # First 20 pages
]

if __name__ == "__main__":
    warmer = CacheWarmer(
        base_url="https://api.example.com",
        redis_url="redis://localhost:6379"
    )
    asyncio.run(warmer.warm_endpoints(
        CRITICAL_ENDPOINTS + PAGINATED_ENDPOINTS
    ))
```

---

## Rate Limiting: Protecting Your Services

Rate limiting prevents a traffic spike from becoming a denial of service. Implement limits at multiple layers.

### Token Bucket Rate Limiter

The token bucket algorithm provides smooth rate limiting with burst capacity.

```javascript
// rate-limiter.js
// Token bucket rate limiter using Redis for distributed limiting
// Allows bursts while enforcing average rate

const Redis = require('ioredis');

class TokenBucketRateLimiter {
  constructor(redis, options = {}) {
    this.redis = redis;
    this.bucketSize = options.bucketSize || 100;      // Max burst capacity
    this.refillRate = options.refillRate || 10;       // Tokens per second
    this.keyPrefix = options.keyPrefix || 'ratelimit:';
  }

  async isAllowed(identifier, cost = 1) {
    const key = `${this.keyPrefix}${identifier}`;
    const now = Date.now();

    // Lua script for atomic token bucket operation
    // This ensures accurate limiting even under high concurrency
    const script = `
      local key = KEYS[1]
      local bucket_size = tonumber(ARGV[1])
      local refill_rate = tonumber(ARGV[2])
      local now = tonumber(ARGV[3])
      local cost = tonumber(ARGV[4])

      local bucket = redis.call('HMGET', key, 'tokens', 'last_refill')
      local tokens = tonumber(bucket[1]) or bucket_size
      local last_refill = tonumber(bucket[2]) or now

      -- Calculate tokens to add based on time elapsed
      local elapsed = (now - last_refill) / 1000
      local refill = elapsed * refill_rate
      tokens = math.min(bucket_size, tokens + refill)

      -- Check if request can proceed
      local allowed = 0
      if tokens >= cost then
        tokens = tokens - cost
        allowed = 1
      end

      -- Update bucket state
      redis.call('HMSET', key, 'tokens', tokens, 'last_refill', now)
      redis.call('EXPIRE', key, 3600)

      return {allowed, tokens}
    `;

    const result = await this.redis.eval(
      script, 1, key,
      this.bucketSize, this.refillRate, now, cost
    );

    return {
      allowed: result[0] === 1,
      remaining: Math.floor(result[1]),
      resetAt: now + ((this.bucketSize - result[1]) / this.refillRate * 1000),
    };
  }
}

// Express middleware
const rateLimitMiddleware = (limiter, options = {}) => {
  const { keyGenerator = (req) => req.ip } = options;

  return async (req, res, next) => {
    const identifier = keyGenerator(req);
    const result = await limiter.isAllowed(identifier);

    // Set rate limit headers
    res.set('X-RateLimit-Remaining', result.remaining);
    res.set('X-RateLimit-Reset', Math.ceil(result.resetAt / 1000));

    if (!result.allowed) {
      res.status(429).json({
        error: 'Too Many Requests',
        retryAfter: Math.ceil((result.resetAt - Date.now()) / 1000),
      });
      return;
    }

    next();
  };
};

module.exports = { TokenBucketRateLimiter, rateLimitMiddleware };
```

### Tiered Rate Limits

Apply different limits based on endpoint criticality and user tier.

```javascript
// tiered-limits.js
// Configure different rate limits per endpoint and user tier
// Critical endpoints get tighter limits to protect backend services

const rateLimitConfig = {
  // Default limits for unauthenticated users
  anonymous: {
    '/api/v1/search': { bucketSize: 20, refillRate: 2 },
    '/api/v1/products': { bucketSize: 100, refillRate: 20 },
    '/api/v1/checkout': { bucketSize: 5, refillRate: 1 },
    default: { bucketSize: 60, refillRate: 10 },
  },

  // Authenticated users get higher limits
  authenticated: {
    '/api/v1/search': { bucketSize: 100, refillRate: 10 },
    '/api/v1/products': { bucketSize: 500, refillRate: 100 },
    '/api/v1/checkout': { bucketSize: 20, refillRate: 5 },
    default: { bucketSize: 300, refillRate: 50 },
  },

  // Premium tier for high-volume partners
  premium: {
    '/api/v1/search': { bucketSize: 500, refillRate: 50 },
    '/api/v1/products': { bucketSize: 2000, refillRate: 500 },
    '/api/v1/checkout': { bucketSize: 100, refillRate: 20 },
    default: { bucketSize: 1000, refillRate: 200 },
  },
};

function getLimitConfig(req) {
  const tier = req.user?.tier || 'anonymous';
  const path = req.path;

  const tierConfig = rateLimitConfig[tier] || rateLimitConfig.anonymous;
  return tierConfig[path] || tierConfig.default;
}

module.exports = { rateLimitConfig, getLimitConfig };
```

---

## Circuit Breakers: Failing Gracefully

When downstream services fail under load, circuit breakers prevent cascade failures and allow graceful degradation.

### Implementing a Circuit Breaker

```javascript
// circuit-breaker.js
// Circuit breaker pattern to prevent cascade failures
// States: CLOSED (normal), OPEN (failing fast), HALF_OPEN (testing recovery)

class CircuitBreaker {
  constructor(options = {}) {
    this.failureThreshold = options.failureThreshold || 5;
    this.resetTimeout = options.resetTimeout || 30000;   // 30 seconds
    this.halfOpenRequests = options.halfOpenRequests || 3;

    this.state = 'CLOSED';
    this.failures = 0;
    this.successes = 0;
    this.lastFailureTime = null;
    this.halfOpenAttempts = 0;
  }

  async execute(fn, fallback) {
    // Check if circuit should transition from OPEN to HALF_OPEN
    if (this.state === 'OPEN') {
      if (Date.now() - this.lastFailureTime >= this.resetTimeout) {
        this.state = 'HALF_OPEN';
        this.halfOpenAttempts = 0;
      } else {
        // Circuit is open - execute fallback immediately
        return this._executeFallback(fallback, new Error('Circuit is OPEN'));
      }
    }

    try {
      const result = await fn();
      this._onSuccess();
      return result;
    } catch (error) {
      this._onFailure();
      return this._executeFallback(fallback, error);
    }
  }

  _onSuccess() {
    if (this.state === 'HALF_OPEN') {
      this.halfOpenAttempts++;
      if (this.halfOpenAttempts >= this.halfOpenRequests) {
        // Enough successful requests - close the circuit
        this.state = 'CLOSED';
        this.failures = 0;
        console.log('Circuit breaker CLOSED - service recovered');
      }
    } else {
      this.failures = 0;
    }
  }

  _onFailure() {
    this.failures++;
    this.lastFailureTime = Date.now();

    if (this.state === 'HALF_OPEN') {
      // Failed during recovery test - reopen circuit
      this.state = 'OPEN';
      console.log('Circuit breaker OPEN - service still failing');
    } else if (this.failures >= this.failureThreshold) {
      // Too many failures - open circuit
      this.state = 'OPEN';
      console.log('Circuit breaker OPEN - failure threshold reached');
    }
  }

  async _executeFallback(fallback, error) {
    if (typeof fallback === 'function') {
      return fallback(error);
    }
    throw error;
  }

  getState() {
    return {
      state: this.state,
      failures: this.failures,
      lastFailureTime: this.lastFailureTime,
    };
  }
}

// Usage example
const paymentCircuit = new CircuitBreaker({
  failureThreshold: 3,
  resetTimeout: 60000,
});

async function processPayment(order) {
  return paymentCircuit.execute(
    // Primary function
    async () => {
      const response = await fetch('https://payments.example.com/charge', {
        method: 'POST',
        body: JSON.stringify(order),
        timeout: 5000,
      });
      if (!response.ok) throw new Error('Payment failed');
      return response.json();
    },
    // Fallback function
    async (error) => {
      console.log('Payment circuit open, queueing for retry:', error.message);
      await queueForRetry(order);
      return { status: 'queued', message: 'Payment will be processed shortly' };
    }
  );
}

module.exports = { CircuitBreaker };
```

### Bulkhead Pattern

Isolate resources to prevent one failing component from exhausting all capacity.

```javascript
// bulkhead.js
// Bulkhead pattern isolates resources per service
// Prevents one slow service from consuming all threads/connections

class Bulkhead {
  constructor(options = {}) {
    this.maxConcurrent = options.maxConcurrent || 10;
    this.maxQueue = options.maxQueue || 100;
    this.timeout = options.timeout || 30000;

    this.running = 0;
    this.queue = [];
  }

  async execute(fn) {
    // Check if we can run immediately
    if (this.running < this.maxConcurrent) {
      return this._run(fn);
    }

    // Check if queue has space
    if (this.queue.length >= this.maxQueue) {
      throw new Error('Bulkhead queue full - request rejected');
    }

    // Queue the request
    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        const index = this.queue.findIndex(item => item.resolve === resolve);
        if (index !== -1) {
          this.queue.splice(index, 1);
          reject(new Error('Bulkhead timeout - request expired in queue'));
        }
      }, this.timeout);

      this.queue.push({ fn, resolve, reject, timeoutId });
    });
  }

  async _run(fn) {
    this.running++;
    try {
      return await fn();
    } finally {
      this.running--;
      this._processQueue();
    }
  }

  _processQueue() {
    if (this.queue.length > 0 && this.running < this.maxConcurrent) {
      const { fn, resolve, reject, timeoutId } = this.queue.shift();
      clearTimeout(timeoutId);
      this._run(fn).then(resolve).catch(reject);
    }
  }

  getStats() {
    return {
      running: this.running,
      queued: this.queue.length,
      available: this.maxConcurrent - this.running,
    };
  }
}

// Create separate bulkheads for different services
const bulkheads = {
  database: new Bulkhead({ maxConcurrent: 20, maxQueue: 50 }),
  externalApi: new Bulkhead({ maxConcurrent: 10, maxQueue: 20 }),
  cache: new Bulkhead({ maxConcurrent: 50, maxQueue: 200 }),
};

module.exports = { Bulkhead, bulkheads };
```

---

## Load Testing for Spikes

You cannot be confident in your spike handling until you have tested it. Load testing validates your auto-scaling, caching, and circuit breakers under realistic conditions.

### Load Test Script with k6

k6 provides a developer-friendly way to write and run load tests.

```javascript
// spike-test.js
// k6 load test simulating a traffic spike
// Run with: k6 run spike-test.js

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';

// Custom metrics for spike analysis
const errorRate = new Rate('errors');
const responseTime = new Trend('response_time');

export const options = {
  // Spike test profile
  // Simulates sudden traffic increase, sustained load, then drop
  stages: [
    { duration: '2m', target: 100 },    // Warm up to baseline
    { duration: '1m', target: 100 },    // Hold baseline
    { duration: '30s', target: 1000 },  // Spike! 10x traffic in 30 seconds
    { duration: '5m', target: 1000 },   // Sustain spike
    { duration: '2m', target: 100 },    // Scale back down
    { duration: '2m', target: 0 },      // Cool down
  ],

  // Success criteria
  thresholds: {
    http_req_duration: ['p95<500', 'p99<1000'],  // Latency targets
    errors: ['rate<0.01'],                        // Less than 1% errors
    http_req_failed: ['rate<0.01'],               // Less than 1% HTTP failures
  },
};

const BASE_URL = __ENV.BASE_URL || 'https://api.example.com';

// Simulate realistic user behavior
export default function() {
  // Browse products (most common action)
  const browseResponse = http.get(`${BASE_URL}/api/v1/products?limit=20`);
  check(browseResponse, {
    'browse status is 200': (r) => r.status === 200,
  });
  errorRate.add(browseResponse.status !== 200);
  responseTime.add(browseResponse.timings.duration);

  sleep(Math.random() * 2);  // Random think time

  // View product detail (common action)
  const productId = Math.floor(Math.random() * 1000) + 1;
  const detailResponse = http.get(`${BASE_URL}/api/v1/products/${productId}`);
  check(detailResponse, {
    'detail status is 200 or 404': (r) => [200, 404].includes(r.status),
  });
  errorRate.add(![200, 404].includes(detailResponse.status));
  responseTime.add(detailResponse.timings.duration);

  sleep(Math.random() * 3);

  // Search (less frequent but expensive)
  if (Math.random() < 0.3) {
    const searchTerms = ['laptop', 'phone', 'headphones', 'camera', 'tablet'];
    const term = searchTerms[Math.floor(Math.random() * searchTerms.length)];
    const searchResponse = http.get(`${BASE_URL}/api/v1/search?q=${term}`);
    check(searchResponse, {
      'search status is 200': (r) => r.status === 200,
    });
    errorRate.add(searchResponse.status !== 200);
    responseTime.add(searchResponse.timings.duration);
  }

  sleep(Math.random() * 2);
}

// Report results after test
export function handleSummary(data) {
  return {
    'spike-test-summary.json': JSON.stringify(data, null, 2),
  };
}
```

### Chaos Testing for Spikes

Combine load testing with chaos engineering to test resilience.

```yaml
# chaos-spike-experiment.yaml
# Chaos Mesh experiment to test behavior during traffic spike
# Introduces pod failures while load test is running

apiVersion: chaos-mesh.org/v1alpha1
kind: Workflow
metadata:
  name: spike-resilience-test
  namespace: chaos-testing
spec:
  entry: spike-test-sequence
  templates:
    - name: spike-test-sequence
      templateType: Serial
      children:
        - baseline-load
        - inject-failures
        - verify-recovery

    # Step 1: Establish baseline under load
    - name: baseline-load
      templateType: Suspend
      deadline: 5m    # Run load test for 5 minutes

    # Step 2: Inject pod failures during spike
    - name: inject-failures
      templateType: PodChaos
      deadline: 3m
      podChaos:
        action: pod-kill
        mode: fixed-percent
        value: "30"           # Kill 30% of pods
        selector:
          namespaces:
            - production
          labelSelectors:
            app: web
        scheduler:
          cron: "*/30 * * * * *"    # Kill pods every 30 seconds

    # Step 3: Verify system recovers
    - name: verify-recovery
      templateType: Suspend
      deadline: 5m    # Monitor recovery for 5 minutes
```

### What to Measure During Spike Tests

Track these metrics during load testing to validate your spike readiness.

```yaml
# spike-test-dashboard.yaml
# Grafana dashboard queries for spike test analysis

panels:
  # Request rate and error rate
  - title: "Request Rate vs Errors"
    queries:
      - expr: sum(rate(http_requests_total[1m]))
        legend: "Requests/sec"
      - expr: sum(rate(http_requests_total{status=~"5.."}[1m]))
        legend: "5xx Errors/sec"

  # Latency percentiles
  - title: "Response Time Percentiles"
    queries:
      - expr: histogram_quantile(0.50, rate(http_request_duration_seconds_bucket[1m]))
        legend: "p50"
      - expr: histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[1m]))
        legend: "p95"
      - expr: histogram_quantile(0.99, rate(http_request_duration_seconds_bucket[1m]))
        legend: "p99"

  # Auto-scaling response
  - title: "Pod Count vs Target"
    queries:
      - expr: kube_deployment_status_replicas{deployment="web"}
        legend: "Current Replicas"
      - expr: kube_hpa_status_desired_replicas{hpa="web-hpa"}
        legend: "Desired Replicas"

  # Resource utilization
  - title: "CPU Utilization"
    queries:
      - expr: avg(rate(container_cpu_usage_seconds_total{pod=~"web-.*"}[1m])) * 100
        legend: "Avg CPU %"

  # Circuit breaker state
  - title: "Circuit Breaker Status"
    queries:
      - expr: circuit_breaker_state{service="payments"}
        legend: "Payment Circuit"
```

---

## Best Practices Summary

Preparing for traffic spikes requires a multi-layered approach. Here are the key practices to implement.

**Know your patterns.** Analyze historical data to understand baseline traffic, peak multipliers, and timing patterns. Use this data to set scaling thresholds and pre-warming schedules.

**Scale proactively, not reactively.** Configure auto-scaling to trigger before users experience degradation. Target 60% CPU utilization, not 90%. For known events, pre-warm infrastructure 30-60 minutes in advance.

**Cache aggressively.** Implement caching at every layer: CDN, application, and database. Use stale-while-revalidate patterns to serve cached content while refreshing in the background.

**Protect with rate limits.** Apply rate limiting at the edge and application layers. Use token bucket algorithms for smooth limiting with burst capacity. Implement tiered limits for different user types.

**Fail gracefully.** Circuit breakers prevent cascade failures when downstream services struggle. Combine with bulkheads to isolate resource pools. Always have a fallback path.

**Test under realistic conditions.** Run spike load tests that simulate your worst-case scenarios. Combine with chaos engineering to validate resilience. Test auto-scaling end-to-end, including cluster autoscaler.

**Monitor everything.** Track request rates, error rates, latency percentiles, and auto-scaling metrics. Set up alerts for approaching capacity limits. Review metrics after every traffic event.

---

## Conclusion

Traffic spikes do not have to mean downtime or degraded user experience. With proper preparation through auto-scaling, caching, rate limiting, and circuit breakers, your system can handle sudden surges gracefully.

The key is preparation. Build these patterns into your architecture before you need them. Test regularly to validate they work. And when the spike comes, your system will scale smoothly while you watch from your monitoring dashboard.

For comprehensive observability during traffic spikes and beyond, [OneUptime](https://oneuptime.com) provides unified monitoring, alerting, and incident management to keep your services reliable under any load.
