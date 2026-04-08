# How to Implement Circuit Breaker Pattern for MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Circuit Breaker, Resilience, Pattern, Node.js

Description: Learn how to implement the circuit breaker pattern for MongoDB connections to prevent cascade failures and enable fast recovery when the database is unavailable.

---

## Why Circuit Breakers Matter for MongoDB

When MongoDB is slow or unavailable, application threads block waiting for responses. Without a circuit breaker, every request queues up, exhausting the connection pool, thread pool, and memory - cascading the MongoDB failure into a full application outage. The circuit breaker pattern detects the failure and "opens" the circuit, causing requests to fail fast (without attempting a MongoDB connection) until the database recovers.

## Circuit Breaker States

```text
CLOSED  --> (failures exceed threshold)  --> OPEN
OPEN    --> (timeout elapsed)            --> HALF-OPEN
HALF-OPEN --> (probe request succeeds)   --> CLOSED
HALF-OPEN --> (probe request fails)      --> OPEN
```

## Implementing a MongoDB Circuit Breaker

```javascript
// lib/MongoCircuitBreaker.js
class MongoCircuitBreaker {
  constructor(options = {}) {
    this.failureThreshold = options.failureThreshold || 5;
    this.successThreshold = options.successThreshold || 2;
    this.timeout = options.timeout || 60000;       // 60s before trying again
    this.callTimeout = options.callTimeout || 5000; // max wait per DB call

    this.state = 'CLOSED';
    this.failureCount = 0;
    this.successCount = 0;
    this.nextAttempt = Date.now();
    this.lastError = null;
  }

  async execute(dbOperation) {
    if (this.state === 'OPEN') {
      if (Date.now() < this.nextAttempt) {
        throw new Error(
          `Circuit breaker OPEN. MongoDB unavailable. Last error: ${this.lastError}. Retry after ${new Date(this.nextAttempt).toISOString()}`
        );
      }
      // Transition to HALF-OPEN for a probe
      this.state = 'HALF-OPEN';
      console.log('Circuit breaker entering HALF-OPEN state');
    }

    try {
      // Wrap with a timeout
      const result = await Promise.race([
        dbOperation(),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('MongoDB operation timed out')), this.callTimeout)
        )
      ]);

      this._onSuccess();
      return result;
    } catch (err) {
      this._onFailure(err);
      throw err;
    }
  }

  _onSuccess() {
    this.failureCount = 0;
    if (this.state === 'HALF-OPEN') {
      this.successCount++;
      if (this.successCount >= this.successThreshold) {
        this.state = 'CLOSED';
        this.successCount = 0;
        console.log('Circuit breaker CLOSED - MongoDB recovered');
      }
    }
  }

  _onFailure(err) {
    this.lastError = err.message;
    this.failureCount++;
    this.successCount = 0;

    if (this.state === 'HALF-OPEN' || this.failureCount >= this.failureThreshold) {
      this.state = 'OPEN';
      this.nextAttempt = Date.now() + this.timeout;
      console.error(
        `Circuit breaker OPEN after ${this.failureCount} failures. Next attempt: ${new Date(this.nextAttempt).toISOString()}`
      );
    }
  }

  getStatus() {
    return {
      state: this.state,
      failureCount: this.failureCount,
      nextAttempt: this.state === 'OPEN' ? new Date(this.nextAttempt) : null,
      lastError: this.lastError
    };
  }
}

module.exports = MongoCircuitBreaker;
```

## Integrating with Your MongoDB Client

```javascript
// services/db.js
const { MongoClient } = require('mongodb');
const MongoCircuitBreaker = require('../lib/MongoCircuitBreaker');

const client = new MongoClient(process.env.MONGODB_URI);
const breaker = new MongoCircuitBreaker({
  failureThreshold: 5,
  timeout: 30000,      // 30s open
  callTimeout: 3000    // 3s per call
});

async function dbQuery(operation) {
  return await breaker.execute(() => operation(client.db('myapp')));
}

module.exports = { dbQuery, breaker };
```

## Usage in Application Code

```javascript
const { dbQuery, breaker } = require('./services/db');

// Normal usage - circuit breaker is transparent
async function getUserById(id) {
  try {
    return await dbQuery(db =>
      db.collection('users').findOne({ _id: id })
    );
  } catch (err) {
    if (err.message.includes('Circuit breaker OPEN')) {
      // Return cached/default response instead of failing
      return getCachedUser(id) || null;
    }
    throw err;
  }
}

// Expose circuit breaker status in health endpoint
app.get('/health', (req, res) => {
  const status = breaker.getStatus();
  const healthy = status.state === 'CLOSED';
  res.status(healthy ? 200 : 503).json({
    status: healthy ? 'healthy' : 'degraded',
    mongodb: status
  });
});
```

## Using opossum (Production-Ready Circuit Breaker)

For production, use the `opossum` library which provides metrics, events, and Prometheus integration:

```bash
npm install opossum
```

```javascript
const CircuitBreaker = require('opossum');

const options = {
  timeout: 3000,
  errorThresholdPercentage: 50,
  resetTimeout: 30000
};

const mongoBreaker = new CircuitBreaker(
  (operation) => operation(db),
  options
);

mongoBreaker.on('open', () => console.error('MongoDB circuit breaker OPENED'));
mongoBreaker.on('close', () => console.log('MongoDB circuit breaker CLOSED'));
mongoBreaker.on('halfOpen', () => console.log('MongoDB circuit breaker HALF-OPEN'));
```

## Summary

Implementing a circuit breaker for MongoDB prevents cascade failures by detecting repeated errors and short-circuiting database calls until recovery. A three-state machine (CLOSED/OPEN/HALF-OPEN) controls flow: normal operation in CLOSED, fast-fail in OPEN, and a probe period in HALF-OPEN. Expose circuit breaker state in your health endpoint and fall back to cached data when the circuit is open to maintain partial functionality during MongoDB outages.
