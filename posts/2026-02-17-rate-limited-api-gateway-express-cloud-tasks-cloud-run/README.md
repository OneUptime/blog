# How to Build a Rate-Limited API Gateway with Express.js and Cloud Tasks on Cloud Run

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Cloud Run, Cloud Tasks, Express, Rate Limiting, API Gateway, Google Cloud

Description: Build a rate-limited API gateway using Express.js and Cloud Tasks on Cloud Run to control request throughput and protect downstream services.

---

Rate limiting is essential for any production API. Without it, a single misbehaving client can overwhelm your backend, a burst of traffic can cascade into downstream failures, and your costs can spike unexpectedly. While there are many approaches to rate limiting, combining Express.js with Google Cloud Tasks on Cloud Run gives you a particularly elegant solution - you can accept requests immediately and use Cloud Tasks queues to control the rate at which they are actually processed.

In this post, I will show you two complementary patterns: traditional per-client rate limiting at the API gateway level, and queue-based rate limiting using Cloud Tasks for backend processing.

## Pattern 1: In-Memory Rate Limiting

For basic request-level rate limiting, an in-memory sliding window approach works well on Cloud Run as long as you understand that each instance maintains its own counter. This means the effective rate limit is per-instance, not global.

```javascript
// rate-limiter.js - Sliding window rate limiter
class RateLimiter {
  constructor(options = {}) {
    this.windowMs = options.windowMs || 60 * 1000; // 1 minute window
    this.maxRequests = options.maxRequests || 100;   // 100 requests per window
    this.clients = new Map();

    // Clean up expired entries periodically
    setInterval(() => this.cleanup(), this.windowMs);
  }

  // Check if a request should be allowed
  isAllowed(clientId) {
    const now = Date.now();
    const windowStart = now - this.windowMs;

    // Get or create the client's request log
    if (!this.clients.has(clientId)) {
      this.clients.set(clientId, []);
    }

    const requests = this.clients.get(clientId);

    // Remove requests outside the current window
    const validRequests = requests.filter((ts) => ts > windowStart);
    this.clients.set(clientId, validRequests);

    // Check if under the limit
    if (validRequests.length >= this.maxRequests) {
      return {
        allowed: false,
        remaining: 0,
        retryAfter: Math.ceil((validRequests[0] - windowStart) / 1000),
      };
    }

    // Record this request
    validRequests.push(now);

    return {
      allowed: true,
      remaining: this.maxRequests - validRequests.length,
      retryAfter: 0,
    };
  }

  cleanup() {
    const windowStart = Date.now() - this.windowMs;
    for (const [clientId, requests] of this.clients) {
      const valid = requests.filter((ts) => ts > windowStart);
      if (valid.length === 0) {
        this.clients.delete(clientId);
      } else {
        this.clients.set(clientId, valid);
      }
    }
  }
}

module.exports = { RateLimiter };
```

## Express Middleware for Rate Limiting

```javascript
// middleware/rate-limit.js - Express rate limiting middleware
const { RateLimiter } = require('../rate-limiter');

// Create limiters for different tiers
const defaultLimiter = new RateLimiter({ windowMs: 60000, maxRequests: 60 });
const strictLimiter = new RateLimiter({ windowMs: 60000, maxRequests: 10 });

function rateLimit(limiter = defaultLimiter) {
  return (req, res, next) => {
    // Use API key or IP as the client identifier
    const clientId = req.headers['x-api-key'] || req.ip;

    const result = limiter.isAllowed(clientId);

    // Set rate limit headers
    res.set({
      'X-RateLimit-Limit': limiter.maxRequests,
      'X-RateLimit-Remaining': result.remaining,
      'X-RateLimit-Reset': new Date(Date.now() + limiter.windowMs).toISOString(),
    });

    if (!result.allowed) {
      res.set('Retry-After', result.retryAfter);
      return res.status(429).json({
        error: 'Too many requests',
        retryAfter: result.retryAfter,
      });
    }

    next();
  };
}

module.exports = { rateLimit, defaultLimiter, strictLimiter };
```

## Pattern 2: Queue-Based Rate Limiting with Cloud Tasks

The more powerful pattern uses Cloud Tasks to control the processing rate. Instead of rejecting excess requests, you accept them all and process them at a controlled rate.

```javascript
// queue-gateway.js - Accept requests and queue for controlled processing
const express = require('express');
const { CloudTasksClient } = require('@google-cloud/tasks');

const app = express();
app.use(express.json());

const tasksClient = new CloudTasksClient();

const PROJECT_ID = process.env.PROJECT_ID || 'your-project-id';
const LOCATION = 'us-central1';
const SERVICE_URL = process.env.SERVICE_URL || 'https://your-service.run.app';

// Create queues with different rate limits for different API tiers
const QUEUES = {
  free: {
    name: 'api-free-tier',
    maxDispatchesPerSecond: 1,    // 1 request per second
    maxConcurrentDispatches: 1,
  },
  pro: {
    name: 'api-pro-tier',
    maxDispatchesPerSecond: 10,   // 10 requests per second
    maxConcurrentDispatches: 5,
  },
  enterprise: {
    name: 'api-enterprise-tier',
    maxDispatchesPerSecond: 100,  // 100 requests per second
    maxConcurrentDispatches: 50,
  },
};

// Accept a request and queue it for processing
app.post('/api/process', async (req, res) => {
  const apiKey = req.headers['x-api-key'];
  const tier = getTierForApiKey(apiKey) || 'free';
  const queue = QUEUES[tier];

  const queuePath = tasksClient.queuePath(PROJECT_ID, LOCATION, queue.name);

  try {
    // Create a task that will be processed at the controlled rate
    const task = {
      httpRequest: {
        httpMethod: 'POST',
        url: `${SERVICE_URL}/internal/process`,
        headers: {
          'Content-Type': 'application/json',
        },
        body: Buffer.from(JSON.stringify({
          requestId: `req-${Date.now()}`,
          apiKey,
          payload: req.body,
          receivedAt: new Date().toISOString(),
        })).toString('base64'),
      },
    };

    const [response] = await tasksClient.createTask({
      parent: queuePath,
      task,
    });

    // Respond immediately with a job ID
    res.status(202).json({
      jobId: response.name.split('/').pop(),
      status: 'queued',
      tier,
      estimatedProcessingRate: `${queue.maxDispatchesPerSecond} requests/second`,
    });
  } catch (error) {
    console.error('Failed to queue task:', error);
    res.status(500).json({ error: 'Failed to queue request' });
  }
});

// Internal endpoint that Cloud Tasks calls at the controlled rate
app.post('/internal/process', async (req, res) => {
  const { requestId, apiKey, payload, receivedAt } = req.body;
  const queueLatency = Date.now() - new Date(receivedAt).getTime();

  console.log(`Processing ${requestId}, queue latency: ${queueLatency}ms`);

  try {
    // Do the actual work here
    const result = await processRequest(payload);

    // Store the result somewhere the client can retrieve it
    await storeResult(requestId, result);

    res.status(200).json({ requestId, status: 'processed' });
  } catch (error) {
    console.error(`Processing failed for ${requestId}:`, error);
    res.status(500).json({ error: 'Processing failed' });
  }
});

function getTierForApiKey(apiKey) {
  // Look up the tier for this API key
  // In production, use a database or cache
  const tiers = {
    'key-free-123': 'free',
    'key-pro-456': 'pro',
    'key-ent-789': 'enterprise',
  };
  return tiers[apiKey] || 'free';
}
```

## Setting Up the Rate-Limited Queues

```bash
# Create queues with different rate limits for each tier
gcloud tasks queues create api-free-tier \
  --location=us-central1 \
  --max-dispatches-per-second=1 \
  --max-concurrent-dispatches=1 \
  --max-attempts=3

gcloud tasks queues create api-pro-tier \
  --location=us-central1 \
  --max-dispatches-per-second=10 \
  --max-concurrent-dispatches=5 \
  --max-attempts=3

gcloud tasks queues create api-enterprise-tier \
  --location=us-central1 \
  --max-dispatches-per-second=100 \
  --max-concurrent-dispatches=50 \
  --max-attempts=3
```

## Combining Both Patterns

In practice, you want both patterns - request-level rate limiting to prevent abuse, and queue-based rate limiting to protect downstream services.

```javascript
// Combined rate limiting approach
const { rateLimit, strictLimiter } = require('./middleware/rate-limit');

// Request-level rate limiting on the gateway
app.post('/api/process',
  rateLimit(), // Default: 60 requests per minute per client
  async (req, res) => {
    // If we get here, the client has not exceeded their request rate
    // Now queue the work for controlled backend processing
    await queueForProcessing(req, res);
  }
);

// Strict rate limiting for sensitive endpoints
app.post('/api/auth/login',
  rateLimit(strictLimiter), // 10 attempts per minute
  async (req, res) => {
    // Handle login
  }
);
```

## Polling for Results

Since the queue-based pattern is asynchronous, clients need a way to check if their request has been processed.

```javascript
// Result storage (use Redis or Firestore in production)
const results = new Map();

async function storeResult(requestId, result) {
  results.set(requestId, {
    result,
    completedAt: new Date().toISOString(),
  });

  // Clean up after 1 hour
  setTimeout(() => results.delete(requestId), 3600000);
}

// Polling endpoint for clients to check results
app.get('/api/jobs/:jobId', (req, res) => {
  const result = results.get(req.params.jobId);

  if (!result) {
    return res.json({
      status: 'pending',
      message: 'Still processing',
    });
  }

  res.json({
    status: 'completed',
    ...result,
  });
});
```

## Global Rate Limiting with Redis

For accurate global rate limiting across all Cloud Run instances, use Redis (Memorystore).

```javascript
// redis-rate-limiter.js - Global rate limiting with Redis
const Redis = require('ioredis');

const redis = new Redis(process.env.REDIS_URL);

async function globalRateLimit(clientId, maxRequests, windowSeconds) {
  const key = `ratelimit:${clientId}`;

  // Use a Lua script for atomic increment and expire
  const script = `
    local current = redis.call('incr', KEYS[1])
    if current == 1 then
      redis.call('expire', KEYS[1], ARGV[1])
    end
    return current
  `;

  const count = await redis.eval(script, 1, key, windowSeconds);

  return {
    allowed: count <= maxRequests,
    remaining: Math.max(0, maxRequests - count),
    current: count,
  };
}

module.exports = { globalRateLimit };
```

## Deploying

```bash
# Deploy the API gateway
gcloud run deploy api-gateway \
  --source . \
  --region us-central1 \
  --platform managed \
  --allow-unauthenticated \
  --port 8080 \
  --memory 256Mi \
  --concurrency 100 \
  --min-instances 1 \
  --max-instances 20
```

## Starting the Server

```javascript
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`API Gateway running on port ${PORT}`);
});
```

Rate limiting is a spectrum. Simple in-memory rate limiting works for basic protection. Cloud Tasks queue-based rate limiting gives you precise control over processing throughput. And Redis-backed global rate limiting provides accurate counts across all instances. Choose the combination that matches your needs - most production APIs benefit from all three working together at different layers of the stack.
