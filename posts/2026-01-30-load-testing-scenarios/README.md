# How to Build Load Testing Scenarios

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Testing, Performance, k6, Load Testing

Description: Design effective load testing scenarios with k6 covering ramp-up patterns, virtual user modeling, and realistic traffic simulation.

---

Load testing reveals how your system behaves under stress before your users discover it the hard way. The difference between a useful load test and a waste of time comes down to scenario design. A well-crafted scenario simulates real user behavior, applies appropriate load patterns, and validates meaningful thresholds.

This guide covers how to build load testing scenarios with k6, from basic executor configuration to advanced techniques like data parameterization and realistic user modeling.

## Understanding k6 Executors

k6 provides several executors that control how virtual users (VUs) are spawned and how iterations are scheduled. Choosing the right executor depends on what you want to measure.

| Executor | Use Case | Load Control | Best For |
|----------|----------|--------------|----------|
| `constant-vus` | Steady load testing | Fixed VU count | Baseline performance |
| `ramping-vus` | Stress testing | VU count over stages | Finding breaking points |
| `constant-arrival-rate` | API throughput testing | Fixed request rate | SLA validation |
| `ramping-arrival-rate` | Spike testing | Request rate over stages | Capacity planning |
| `per-vu-iterations` | Functional load testing | Fixed iterations per VU | Data processing jobs |
| `shared-iterations` | Quick smoke tests | Total iterations shared | CI/CD pipelines |
| `externally-controlled` | Manual testing | External control | Debugging |

## Constant VUs: Steady State Testing

The `constant-vus` executor maintains a fixed number of virtual users for a specified duration. Each VU runs your test function in a loop until time expires. This is the simplest executor and works well for establishing baseline performance.

This script creates 50 concurrent users hitting your API for 5 minutes. Each VU runs the default function repeatedly, sleeping 1 second between requests to simulate think time.

```javascript
import http from 'k6/http';
import { check, sleep } from 'k6';

// Configuration for constant virtual user load
export const options = {
  scenarios: {
    // Name your scenario descriptively
    steady_load: {
      executor: 'constant-vus',
      // Number of concurrent virtual users
      vus: 50,
      // How long to run the test
      duration: '5m',
    },
  },
  // Define pass/fail thresholds
  thresholds: {
    // 95% of requests must complete under 500ms
    http_req_duration: ['p(95)<500'],
    // Less than 1% of requests can fail
    http_req_failed: ['rate<0.01'],
  },
};

export default function () {
  // Each VU executes this function in a loop
  const response = http.get('https://api.example.com/products');

  // Validate response
  check(response, {
    'status is 200': (r) => r.status === 200,
    'response time OK': (r) => r.timings.duration < 500,
  });

  // Think time - simulates user reading/processing
  // Without this, you'd be hammering the server unrealistically
  sleep(1);
}
```

## Ramping VUs: Stress and Soak Testing

The `ramping-vus` executor changes the VU count over defined stages. This lets you gradually increase load to find breaking points, hold steady to detect memory leaks, or simulate traffic patterns.

### Stress Test Pattern

A stress test gradually increases load until the system breaks. You want to find the point where response times degrade or errors spike.

The stages array defines load transitions. Each stage specifies a target VU count and how long to ramp to that target. Start low, ramp up aggressively, hold at peak, then ramp down to see recovery behavior.

```javascript
import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  scenarios: {
    stress_test: {
      executor: 'ramping-vus',
      // Start with 0 VUs
      startVUs: 0,
      stages: [
        // Ramp up to 100 VUs over 2 minutes
        { duration: '2m', target: 100 },
        // Ramp up to 200 VUs over 3 minutes
        { duration: '3m', target: 200 },
        // Push to 300 VUs over 2 minutes - looking for breaking point
        { duration: '2m', target: 300 },
        // Hold at 300 VUs for 5 minutes - sustained stress
        { duration: '5m', target: 300 },
        // Ramp down to 0 over 2 minutes - observe recovery
        { duration: '2m', target: 0 },
      ],
      // Allow VUs to finish current iteration before stopping
      gracefulStop: '30s',
      // Allow VUs to finish during ramp down
      gracefulRampDown: '30s',
    },
  },
  thresholds: {
    // Under stress, accept slightly higher latency
    http_req_duration: ['p(95)<1000', 'p(99)<2000'],
    // Error rate threshold
    http_req_failed: ['rate<0.05'],
  },
};

export default function () {
  const response = http.get('https://api.example.com/checkout');

  check(response, {
    'status is 200': (r) => r.status === 200,
    'no server errors': (r) => r.status < 500,
  });

  // Shorter think time during stress test to maximize pressure
  sleep(0.5);
}
```

### Soak Test Pattern

A soak test runs moderate load for an extended period to detect memory leaks, connection pool exhaustion, or gradual performance degradation.

This pattern holds steady load for 2 hours. Watch for increasing response times, growing memory usage, or connection count creeping up.

```javascript
import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  scenarios: {
    soak_test: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        // Ramp up over 5 minutes
        { duration: '5m', target: 100 },
        // Hold steady for 2 hours - the actual soak period
        { duration: '2h', target: 100 },
        // Ramp down over 5 minutes
        { duration: '5m', target: 0 },
      ],
      gracefulStop: '1m',
    },
  },
  thresholds: {
    // Stricter thresholds for soak - performance should not degrade
    http_req_duration: ['p(95)<400'],
    http_req_failed: ['rate<0.01'],
  },
};

export default function () {
  const response = http.get('https://api.example.com/user/profile');

  check(response, {
    'status is 200': (r) => r.status === 200,
  });

  // Realistic think time for soak testing
  sleep(Math.random() * 3 + 1); // 1-4 seconds
}
```

## Constant Arrival Rate: Throughput Testing

The `constant-arrival-rate` executor starts a fixed number of iterations per time unit, regardless of response time. If responses slow down, k6 spawns more VUs to maintain the target rate. This is ideal for validating SLAs or testing how your system handles a specific request rate.

This scenario attempts 100 requests per second. If the server responds quickly, fewer VUs are needed. If it slows down, k6 adds VUs up to the maximum to maintain throughput.

```javascript
import http from 'k6/http';
import { check } from 'k6';

export const options = {
  scenarios: {
    constant_throughput: {
      executor: 'constant-arrival-rate',
      // Target 100 iterations per second
      rate: 100,
      // Time unit for the rate
      timeUnit: '1s',
      // How long to run
      duration: '10m',
      // Pre-allocate VUs to avoid cold start
      preAllocatedVUs: 50,
      // Maximum VUs if responses slow down
      maxVUs: 200,
    },
  },
  thresholds: {
    // At 100 RPS, 95th percentile should be under 300ms
    http_req_duration: ['p(95)<300'],
    // Track iteration duration separately
    iteration_duration: ['p(95)<1000'],
    http_req_failed: ['rate<0.01'],
  },
};

export default function () {
  // No sleep - arrival rate controls request timing
  // Each iteration starts immediately when scheduled
  const response = http.post(
    'https://api.example.com/orders',
    JSON.stringify({ product_id: 123, quantity: 1 }),
    { headers: { 'Content-Type': 'application/json' } }
  );

  check(response, {
    'order created': (r) => r.status === 201,
    'has order id': (r) => r.json('order_id') !== undefined,
  });
}
```

## Ramping Arrival Rate: Spike Testing

The `ramping-arrival-rate` executor changes the request rate over stages. Use this to simulate traffic spikes or validate auto-scaling behavior.

This pattern simulates a sudden traffic spike - perhaps from a marketing campaign going live or a viral moment. Start with baseline traffic, spike to 10x normal, hold briefly, then return to normal.

```javascript
import http from 'k6/http';
import { check } from 'k6';

export const options = {
  scenarios: {
    spike_test: {
      executor: 'ramping-arrival-rate',
      // Start at 10 requests per second
      startRate: 10,
      timeUnit: '1s',
      // Pre-allocate enough VUs for the spike
      preAllocatedVUs: 100,
      maxVUs: 500,
      stages: [
        // Normal traffic for 1 minute
        { duration: '1m', target: 10 },
        // Sudden spike to 100 RPS over 10 seconds
        { duration: '10s', target: 100 },
        // Hold the spike for 2 minutes
        { duration: '2m', target: 100 },
        // Return to normal over 10 seconds
        { duration: '10s', target: 10 },
        // Continue normal traffic for 1 minute
        { duration: '1m', target: 10 },
      ],
    },
  },
  thresholds: {
    // During spike, some degradation is acceptable
    http_req_duration: ['p(90)<500', 'p(99)<2000'],
    // But errors should stay low
    http_req_failed: ['rate<0.05'],
  },
};

export default function () {
  const response = http.get('https://api.example.com/trending');

  check(response, {
    'status is 200': (r) => r.status === 200,
  });
}
```

## Combining Multiple Scenarios

Real applications have different traffic patterns for different endpoints. The homepage might see 10x the traffic of the checkout flow. k6 lets you define multiple scenarios that run in parallel with different configurations.

This configuration runs three scenarios simultaneously: browse traffic with many users doing light reads, search traffic with moderate users and heavier computation, and purchase traffic with fewer users but higher value transactions.

```javascript
import http from 'k6/http';
import { check, sleep, group } from 'k6';

export const options = {
  scenarios: {
    // Heavy read traffic - most users just browse
    browse: {
      executor: 'constant-vus',
      vus: 100,
      duration: '10m',
      exec: 'browseProducts', // Function to execute
    },
    // Moderate search traffic
    search: {
      executor: 'constant-vus',
      vus: 30,
      duration: '10m',
      exec: 'searchProducts',
    },
    // Lower purchase traffic but critical path
    purchase: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '2m', target: 10 },
        { duration: '6m', target: 10 },
        { duration: '2m', target: 0 },
      ],
      exec: 'completePurchase',
    },
  },
  thresholds: {
    // Global thresholds
    http_req_failed: ['rate<0.01'],

    // Scenario-specific thresholds using tags
    'http_req_duration{scenario:browse}': ['p(95)<200'],
    'http_req_duration{scenario:search}': ['p(95)<500'],
    'http_req_duration{scenario:purchase}': ['p(95)<1000'],
  },
};

// Browse scenario - lightweight page views
export function browseProducts() {
  group('browse', () => {
    http.get('https://api.example.com/products');
    sleep(2);
    http.get('https://api.example.com/products/featured');
    sleep(3);
  });
}

// Search scenario - heavier backend processing
export function searchProducts() {
  group('search', () => {
    const query = ['laptop', 'phone', 'tablet', 'headphones'][Math.floor(Math.random() * 4)];
    const response = http.get(`https://api.example.com/search?q=${query}`);

    check(response, {
      'search returned results': (r) => r.json('results').length > 0,
    });

    sleep(5);
  });
}

// Purchase scenario - critical business path
export function completePurchase() {
  group('purchase', () => {
    // Add to cart
    let response = http.post(
      'https://api.example.com/cart',
      JSON.stringify({ product_id: 123, quantity: 1 }),
      { headers: { 'Content-Type': 'application/json' } }
    );

    check(response, { 'item added to cart': (r) => r.status === 200 });
    sleep(1);

    // Checkout
    response = http.post(
      'https://api.example.com/checkout',
      JSON.stringify({ payment_method: 'card' }),
      { headers: { 'Content-Type': 'application/json' } }
    );

    check(response, {
      'checkout successful': (r) => r.status === 200,
      'order confirmed': (r) => r.json('status') === 'confirmed',
    });

    sleep(2);
  });
}
```

## Threshold Configuration

Thresholds define pass/fail criteria for your load test. A threshold that fails will cause k6 to exit with a non-zero code, making it suitable for CI/CD pipelines.

### Threshold Types

| Metric Type | Examples | Common Thresholds |
|-------------|----------|-------------------|
| Counter | `http_reqs`, `iterations` | `count>1000` |
| Rate | `http_req_failed`, `checks` | `rate<0.01` |
| Trend | `http_req_duration`, `iteration_duration` | `p(95)<500`, `avg<200` |
| Gauge | `vus`, `vus_max` | `value<100` |

### Comprehensive Threshold Example

This configuration shows various threshold patterns: percentile-based latency requirements, error rate limits, minimum throughput, and scenario-specific thresholds.

```javascript
export const options = {
  scenarios: {
    api_test: {
      executor: 'constant-arrival-rate',
      rate: 50,
      timeUnit: '1s',
      duration: '5m',
      preAllocatedVUs: 20,
      maxVUs: 100,
    },
  },
  thresholds: {
    // Response time thresholds using percentiles
    // p(N) returns the Nth percentile value
    http_req_duration: [
      'p(50)<100',   // Median under 100ms
      'p(90)<250',   // 90th percentile under 250ms
      'p(95)<500',   // 95th percentile under 500ms
      'p(99)<1000',  // 99th percentile under 1 second
      'max<3000',    // No request over 3 seconds
    ],

    // Error rate threshold
    // rate is the ratio of failed to total
    http_req_failed: [
      'rate<0.01',   // Less than 1% errors
    ],

    // Check pass rate
    // checks is a rate metric tracking check() success
    checks: [
      'rate>0.99',   // 99% of checks must pass
    ],

    // Throughput threshold - ensure we hit target
    http_reqs: [
      'rate>45',     // At least 45 requests per second
    ],

    // Threshold with abort condition
    // abortOnFail stops the test immediately if threshold fails
    // delayAbortEval waits before checking (allow warm-up)
    http_req_duration: [
      {
        threshold: 'p(99)<2000',
        abortOnFail: true,
        delayAbortEval: '30s',
      },
    ],

    // Endpoint-specific thresholds using URL tags
    'http_req_duration{url:https://api.example.com/health}': ['p(99)<50'],
    'http_req_duration{url:https://api.example.com/search}': ['p(95)<1000'],

    // Custom metric thresholds
    'my_custom_metric': ['avg<100', 'max<500'],
  },
};
```

## Realistic User Behavior

Real users do not request pages instantly one after another. They read content, fill forms, and make decisions. Modeling realistic behavior produces more accurate load test results.

### Think Time Patterns

Think time is the pause between user actions. Different actions warrant different pause durations. Reading a product page takes longer than clicking a navigation link.

```javascript
import { sleep } from 'k6';

// Fixed think time - simple but unrealistic
function fixedThinkTime() {
  sleep(2);
}

// Random think time - better distribution
// Users vary in how long they take
function randomThinkTime(min, max) {
  sleep(Math.random() * (max - min) + min);
}

// Normal distribution think time - most realistic
// Most users cluster around the mean
function normalThinkTime(mean, stdDev) {
  // Box-Muller transform for normal distribution
  const u1 = Math.random();
  const u2 = Math.random();
  const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  const value = mean + z * stdDev;
  // Clamp to reasonable bounds
  sleep(Math.max(0.5, Math.min(value, mean * 3)));
}

// Action-based think time
const THINK_TIMES = {
  page_view: { mean: 5, stdDev: 2 },      // Reading a page
  form_fill: { mean: 30, stdDev: 10 },    // Filling a form
  quick_action: { mean: 1, stdDev: 0.5 }, // Clicking a button
  decision: { mean: 15, stdDev: 5 },      // Deciding to purchase
};

function thinkTime(action) {
  const { mean, stdDev } = THINK_TIMES[action];
  normalThinkTime(mean, stdDev);
}
```

### Session-Based Testing

Real users follow session patterns: they log in, perform multiple actions, then leave. Model complete user sessions rather than isolated requests.

```javascript
import http from 'k6/http';
import { check, sleep, group } from 'k6';

export const options = {
  scenarios: {
    user_sessions: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '2m', target: 50 },
        { duration: '5m', target: 50 },
        { duration: '2m', target: 0 },
      ],
    },
  },
};

export default function () {
  // Each VU represents one complete user session
  const session = newSession();

  group('login', () => {
    const loginRes = http.post(
      'https://api.example.com/auth/login',
      JSON.stringify({
        email: session.email,
        password: session.password,
      }),
      { headers: { 'Content-Type': 'application/json' } }
    );

    check(loginRes, { 'logged in': (r) => r.status === 200 });

    // Store auth token for subsequent requests
    session.token = loginRes.json('token');
    sleep(2);
  });

  // Authenticated request helper
  const authHeaders = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${session.token}`,
  };

  group('browse products', () => {
    // User browses 3-7 products
    const productCount = Math.floor(Math.random() * 5) + 3;

    for (let i = 0; i < productCount; i++) {
      http.get('https://api.example.com/products/random', {
        headers: authHeaders,
      });
      // Think time varies - some products interest the user more
      sleep(Math.random() * 10 + 2);
    }
  });

  group('add to cart', () => {
    // 70% of users add something to cart
    if (Math.random() < 0.7) {
      const response = http.post(
        'https://api.example.com/cart',
        JSON.stringify({ product_id: randomProductId() }),
        { headers: authHeaders }
      );

      check(response, { 'added to cart': (r) => r.status === 200 });
      sleep(3);
    }
  });

  group('checkout', () => {
    // 30% of users with items actually checkout
    if (Math.random() < 0.3) {
      const response = http.post(
        'https://api.example.com/checkout',
        JSON.stringify({ payment_method: 'card' }),
        { headers: authHeaders }
      );

      check(response, { 'checkout complete': (r) => r.status === 200 });
    }
  });

  group('logout', () => {
    http.post('https://api.example.com/auth/logout', null, {
      headers: authHeaders,
    });
  });
}

// Generate unique session data per VU iteration
function newSession() {
  const id = `${__VU}-${__ITER}`;
  return {
    email: `user_${id}@loadtest.local`,
    password: 'testpassword123',
    token: null,
  };
}

function randomProductId() {
  return Math.floor(Math.random() * 1000) + 1;
}
```

## Data Parameterization

Hard-coded test data produces unrealistic cache hit rates and may not exercise all code paths. Parameterize your tests with varied data.

### Using Shared Arrays

SharedArray loads data once and shares it across all VUs, saving memory. Use this for large datasets.

```javascript
import http from 'k6/http';
import { SharedArray } from 'k6/data';

// Load user data once at init time, share across all VUs
// This runs only once, not per-VU
const users = new SharedArray('users', function () {
  // JSON file containing array of user objects
  return JSON.parse(open('./data/users.json'));
});

// Load product catalog
const products = new SharedArray('products', function () {
  return JSON.parse(open('./data/products.json'));
});

export const options = {
  scenarios: {
    parameterized_test: {
      executor: 'constant-vus',
      vus: 50,
      duration: '5m',
    },
  },
};

export default function () {
  // Each VU gets a different user based on VU number
  // Modulo ensures we wrap around if more VUs than users
  const user = users[__VU % users.length];

  // Random product for each iteration
  const product = products[Math.floor(Math.random() * products.length)];

  // Login as the assigned user
  const loginRes = http.post(
    'https://api.example.com/auth/login',
    JSON.stringify({
      email: user.email,
      password: user.password,
    }),
    { headers: { 'Content-Type': 'application/json' } }
  );

  const token = loginRes.json('token');

  // Purchase a random product
  http.post(
    'https://api.example.com/orders',
    JSON.stringify({
      product_id: product.id,
      quantity: Math.floor(Math.random() * 3) + 1,
    }),
    {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
    }
  );
}
```

### CSV Data Files

For simple tabular data, CSV files work well. k6 can parse CSV using the papaparse library.

```javascript
import http from 'k6/http';
import { SharedArray } from 'k6/data';
import papaparse from 'https://jslib.k6.io/papaparse/5.1.1/index.js';

// Parse CSV file into array of objects
const csvData = new SharedArray('test data', function () {
  // open() reads file at init time
  const csvFile = open('./data/test_users.csv');
  // Parse CSV with headers
  return papaparse.parse(csvFile, { header: true }).data;
});

export default function () {
  // Get row for this iteration
  const row = csvData[__ITER % csvData.length];

  http.post(
    'https://api.example.com/users',
    JSON.stringify({
      name: row.name,
      email: row.email,
      department: row.department,
    }),
    { headers: { 'Content-Type': 'application/json' } }
  );
}
```

### Dynamic Data Generation

For data that must be unique per request, generate it dynamically. This avoids duplicate key errors and tests insert paths.

```javascript
import http from 'k6/http';
import { randomString, randomIntBetween, uuidv4 } from 'https://jslib.k6.io/k6-utils/1.4.0/index.js';

export default function () {
  // Generate unique data for each request
  const uniqueUser = {
    id: uuidv4(),                              // Unique UUID
    username: `user_${randomString(8)}`,       // Random 8-char string
    email: `${randomString(10)}@loadtest.com`, // Random email
    age: randomIntBetween(18, 65),             // Random age
    created_at: new Date().toISOString(),      // Current timestamp
  };

  http.post(
    'https://api.example.com/users',
    JSON.stringify(uniqueUser),
    { headers: { 'Content-Type': 'application/json' } }
  );
}

// Custom random data generators
function randomPhoneNumber() {
  const areaCode = randomIntBetween(200, 999);
  const exchange = randomIntBetween(200, 999);
  const subscriber = randomIntBetween(1000, 9999);
  return `+1${areaCode}${exchange}${subscriber}`;
}

function randomCreditCard() {
  // Generate valid Luhn checksum test card
  const prefix = '4111111111111'; // Visa test prefix
  const partial = prefix + randomIntBetween(100, 999).toString();
  const checksum = luhnChecksum(partial);
  return partial + checksum;
}

function luhnChecksum(partial) {
  let sum = 0;
  for (let i = 0; i < partial.length; i++) {
    let digit = parseInt(partial[partial.length - 1 - i]);
    if (i % 2 === 0) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }
    sum += digit;
  }
  return ((10 - (sum % 10)) % 10).toString();
}
```

## Custom Metrics

k6 built-in metrics cover common cases, but you may need custom metrics for business-specific measurements.

```javascript
import http from 'k6/http';
import { Counter, Gauge, Rate, Trend } from 'k6/metrics';

// Custom metric definitions
// Counter: cumulative count
const ordersCreated = new Counter('orders_created');

// Gauge: current value (last value wins)
const cartSize = new Gauge('cart_size');

// Rate: percentage of non-zero values
const purchaseRate = new Rate('purchase_rate');

// Trend: statistical distribution (percentiles, avg, etc)
const orderValue = new Trend('order_value');

export const options = {
  thresholds: {
    // Threshold on custom metrics
    'orders_created': ['count>100'],
    'purchase_rate': ['rate>0.1'],
    'order_value': ['p(95)<500', 'avg<200'],
  },
};

export default function () {
  // Simulate shopping session
  const items = Math.floor(Math.random() * 5) + 1;
  cartSize.add(items);

  // Determine if user purchases (20% conversion)
  const purchased = Math.random() < 0.2;
  purchaseRate.add(purchased);

  if (purchased) {
    const value = items * (Math.random() * 100 + 10);
    orderValue.add(value);
    ordersCreated.add(1);

    http.post(
      'https://api.example.com/orders',
      JSON.stringify({
        items: items,
        total: value,
      }),
      { headers: { 'Content-Type': 'application/json' } }
    );
  }
}
```

## Environment Configuration

Externalize configuration to run the same test against different environments without code changes.

```javascript
import http from 'k6/http';

// Read environment variables with defaults
const BASE_URL = __ENV.BASE_URL || 'https://staging.example.com';
const API_KEY = __ENV.API_KEY || 'test-key';
const VU_COUNT = parseInt(__ENV.VUS) || 10;
const TEST_DURATION = __ENV.DURATION || '5m';

export const options = {
  scenarios: {
    configurable_test: {
      executor: 'constant-vus',
      vus: VU_COUNT,
      duration: TEST_DURATION,
    },
  },
};

export default function () {
  http.get(`${BASE_URL}/api/products`, {
    headers: {
      'X-API-Key': API_KEY,
    },
  });
}
```

Run with environment variables:

```bash
# Staging environment
k6 run -e BASE_URL=https://staging.example.com -e VUS=50 script.js

# Production environment with higher load
k6 run -e BASE_URL=https://api.example.com -e VUS=200 -e DURATION=30m script.js
```

## Complete Example: E-Commerce Load Test

This comprehensive example combines all concepts into a realistic e-commerce load test scenario.

```javascript
import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { SharedArray } from 'k6/data';
import { Counter, Rate, Trend } from 'k6/metrics';
import { randomIntBetween, uuidv4 } from 'https://jslib.k6.io/k6-utils/1.4.0/index.js';

// Custom metrics
const ordersPlaced = new Counter('orders_placed');
const conversionRate = new Rate('conversion_rate');
const orderProcessingTime = new Trend('order_processing_time');

// Test data
const users = new SharedArray('users', () => JSON.parse(open('./data/users.json')));
const products = new SharedArray('products', () => JSON.parse(open('./data/products.json')));

// Configuration
const BASE_URL = __ENV.BASE_URL || 'https://staging.example.com';

export const options = {
  scenarios: {
    // Scenario 1: Regular browsing traffic
    browsers: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '2m', target: 100 },
        { duration: '10m', target: 100 },
        { duration: '2m', target: 0 },
      ],
      exec: 'browsingJourney',
      tags: { journey: 'browse' },
    },

    // Scenario 2: Search traffic
    searchers: {
      executor: 'constant-arrival-rate',
      rate: 30,
      timeUnit: '1s',
      duration: '14m',
      preAllocatedVUs: 50,
      maxVUs: 150,
      exec: 'searchJourney',
      tags: { journey: 'search' },
    },

    // Scenario 3: Purchase flow
    buyers: {
      executor: 'ramping-arrival-rate',
      startRate: 1,
      timeUnit: '1s',
      preAllocatedVUs: 20,
      maxVUs: 100,
      stages: [
        { duration: '2m', target: 5 },
        { duration: '10m', target: 5 },
        { duration: '2m', target: 1 },
      ],
      exec: 'purchaseJourney',
      tags: { journey: 'purchase' },
    },
  },

  thresholds: {
    // Global thresholds
    http_req_failed: ['rate<0.01'],
    checks: ['rate>0.95'],

    // Journey-specific thresholds
    'http_req_duration{journey:browse}': ['p(95)<300'],
    'http_req_duration{journey:search}': ['p(95)<800'],
    'http_req_duration{journey:purchase}': ['p(95)<1500'],

    // Business metrics
    'orders_placed': ['count>50'],
    'conversion_rate': ['rate>0.05'],
    'order_processing_time': ['p(95)<3000'],
  },
};

// Setup: runs once before test
export function setup() {
  // Verify API is accessible
  const healthCheck = http.get(`${BASE_URL}/health`);
  check(healthCheck, { 'API is healthy': (r) => r.status === 200 });

  return {
    startTime: new Date().toISOString(),
  };
}

// Teardown: runs once after test
export function teardown(data) {
  console.log(`Test started at: ${data.startTime}`);
  console.log(`Test ended at: ${new Date().toISOString()}`);
}

// Journey 1: Browsing
export function browsingJourney() {
  group('homepage', () => {
    const res = http.get(`${BASE_URL}/`);
    check(res, { 'homepage loaded': (r) => r.status === 200 });
    sleep(randomIntBetween(2, 5));
  });

  group('category page', () => {
    const categories = ['electronics', 'clothing', 'home', 'sports'];
    const category = categories[randomIntBetween(0, categories.length - 1)];

    const res = http.get(`${BASE_URL}/category/${category}`);
    check(res, { 'category loaded': (r) => r.status === 200 });
    sleep(randomIntBetween(3, 8));
  });

  group('product detail', () => {
    const product = products[randomIntBetween(0, products.length - 1)];
    const res = http.get(`${BASE_URL}/products/${product.id}`);
    check(res, { 'product loaded': (r) => r.status === 200 });
    sleep(randomIntBetween(5, 15));
  });

  // Track that user did not convert
  conversionRate.add(false);
}

// Journey 2: Search
export function searchJourney() {
  const searchTerms = ['laptop', 'wireless headphones', 'running shoes', 'coffee maker', 'backpack'];
  const query = searchTerms[randomIntBetween(0, searchTerms.length - 1)];

  group('search', () => {
    const res = http.get(`${BASE_URL}/search?q=${encodeURIComponent(query)}`);

    check(res, {
      'search successful': (r) => r.status === 200,
      'results returned': (r) => {
        const body = r.json();
        return body.results && body.results.length > 0;
      },
    });
  });

  // Users who search but don't buy
  conversionRate.add(false);
}

// Journey 3: Purchase
export function purchaseJourney() {
  const user = users[__VU % users.length];
  let authToken = null;
  let cartId = null;
  const orderStartTime = Date.now();

  group('login', () => {
    const res = http.post(
      `${BASE_URL}/auth/login`,
      JSON.stringify({ email: user.email, password: user.password }),
      { headers: { 'Content-Type': 'application/json' } }
    );

    const success = check(res, {
      'login successful': (r) => r.status === 200,
      'token received': (r) => r.json('token') !== undefined,
    });

    if (success) {
      authToken = res.json('token');
    }

    sleep(1);
  });

  if (!authToken) {
    conversionRate.add(false);
    return;
  }

  const authHeaders = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${authToken}`,
  };

  group('add to cart', () => {
    const product = products[randomIntBetween(0, products.length - 1)];
    const quantity = randomIntBetween(1, 3);

    const res = http.post(
      `${BASE_URL}/cart`,
      JSON.stringify({ product_id: product.id, quantity }),
      { headers: authHeaders }
    );

    check(res, {
      'item added': (r) => r.status === 200 || r.status === 201,
    });

    cartId = res.json('cart_id');
    sleep(2);
  });

  group('checkout', () => {
    const res = http.post(
      `${BASE_URL}/checkout`,
      JSON.stringify({
        cart_id: cartId,
        payment_method: 'card',
        idempotency_key: uuidv4(),
      }),
      { headers: authHeaders }
    );

    const success = check(res, {
      'order created': (r) => r.status === 200 || r.status === 201,
      'order id present': (r) => r.json('order_id') !== undefined,
    });

    if (success) {
      ordersPlaced.add(1);
      conversionRate.add(true);
      orderProcessingTime.add(Date.now() - orderStartTime);
    } else {
      conversionRate.add(false);
    }
  });

  group('logout', () => {
    http.post(`${BASE_URL}/auth/logout`, null, { headers: authHeaders });
  });
}
```

## Running and Analyzing Results

Execute your load test and capture results for analysis.

```bash
# Basic run with console output
k6 run script.js

# Output to JSON for analysis
k6 run --out json=results.json script.js

# Output to InfluxDB for Grafana dashboards
k6 run --out influxdb=http://localhost:8086/k6 script.js

# Cloud execution for distributed load
k6 cloud script.js
```

## Summary

| Scenario Type | Executor | Key Configuration |
|---------------|----------|-------------------|
| Baseline | `constant-vus` | Fixed VUs, moderate duration |
| Stress | `ramping-vus` | Stages increasing to breaking point |
| Soak | `ramping-vus` | Moderate VUs, extended duration (hours) |
| Spike | `ramping-arrival-rate` | Sharp rate increase, brief hold |
| Throughput | `constant-arrival-rate` | Target RPS, adequate VU ceiling |

Building effective load tests requires understanding your system's traffic patterns and translating them into k6 scenarios. Start with simple constant-VU tests to establish baselines, then add complexity with multiple scenarios, realistic user journeys, and parameterized data. Always set meaningful thresholds that align with your SLAs and business requirements.

The best load test is one that finds problems before your users do. Run these scenarios regularly, especially before major releases or expected traffic increases.

---

*OneUptime provides comprehensive monitoring and observability for your applications. When your load tests reveal performance issues, OneUptime helps you track down the root cause with distributed tracing, metrics, and log analysis.*
