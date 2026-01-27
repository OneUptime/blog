# How to Use k6 Thresholds for SLOs

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: k6, Load Testing, Performance Testing, SLOs, Thresholds, CI/CD, Site Reliability Engineering, DevOps

Description: Learn how to define and enforce Service Level Objectives in your load tests using k6 thresholds with practical examples and CI integration patterns.

---

> "Thresholds turn load tests from informational reports into automated quality gates. They answer the question: did this release meet our SLO or not?"

## What Are k6 Thresholds?

Thresholds in k6 are pass/fail criteria that you define for your metrics. They allow you to codify your Service Level Objectives (SLOs) directly into your load tests. When a threshold is breached, k6 exits with a non-zero code, making it perfect for CI/CD pipelines.

Think of thresholds as assertions for performance. Just like unit tests assert correctness, thresholds assert that your system meets its performance contracts.

## Threshold Syntax

The basic threshold syntax follows a simple pattern: metric name, operator, and target value. Here is how to define thresholds in your k6 script:

```javascript
// basic-threshold.js
// Demonstrates fundamental threshold syntax in k6

import http from 'k6/http';
import { sleep } from 'k6';

export const options = {
  // Define virtual users and duration
  vus: 50,
  duration: '2m',

  // Thresholds define pass/fail criteria
  thresholds: {
    // HTTP request duration must be less than 500ms
    http_req_duration: ['p(95)<500'],

    // Error rate must be below 1%
    http_req_failed: ['rate<0.01'],

    // At least 100 requests per second
    http_reqs: ['rate>100'],
  },
};

export default function () {
  // Make a request to your API endpoint
  http.get('https://api.example.com/health');
  sleep(1);
}
```

The threshold string uses a simple expression format:
- `p(N)<value` - Percentile N must be less than value
- `avg<value` - Average must be less than value
- `rate<value` - Rate must be less than value
- `count>value` - Count must be greater than value

## Aggregation Methods

k6 supports several aggregation methods for thresholds. Each method suits different SLO requirements:

```javascript
// aggregation-methods.js
// Shows all available aggregation methods for thresholds

import http from 'k6/http';
import { check } from 'k6';

export const options = {
  stages: [
    { duration: '1m', target: 20 },   // Ramp up
    { duration: '3m', target: 20 },   // Sustained load
    { duration: '1m', target: 0 },    // Ramp down
  ],

  thresholds: {
    // COUNTER metrics - use count or rate
    http_reqs: [
      'count>1000',        // Total requests must exceed 1000
      'rate>10',           // Must maintain >10 requests/second
    ],

    // GAUGE metrics - use value
    vus: ['value>10'],     // Always have more than 10 VUs active

    // RATE metrics - use rate
    http_req_failed: [
      'rate<0.01',         // Less than 1% failure rate
    ],

    // TREND metrics - use avg, min, max, med, p(N)
    http_req_duration: [
      'avg<200',           // Average response time under 200ms
      'min<100',           // Fastest response under 100ms
      'max<2000',          // No response over 2 seconds
      'med<150',           // Median under 150ms (p50)
      'p(90)<300',         // 90th percentile under 300ms
      'p(95)<500',         // 95th percentile under 500ms
      'p(99)<1000',        // 99th percentile under 1 second
    ],
  },
};

export default function () {
  const response = http.get('https://api.example.com/users');

  // Check adds to the checks metric
  check(response, {
    'status is 200': (r) => r.status === 200,
    'body is not empty': (r) => r.body.length > 0,
  });
}
```

Choose aggregation methods that match your SLO definitions:
- Use `p(95)` or `p(99)` for latency SLOs (most common)
- Use `rate` for availability/error rate SLOs
- Use `avg` sparingly - it hides tail latency issues

## Percentile Thresholds

Percentile thresholds are the gold standard for latency SLOs. They ensure that the vast majority of your users experience acceptable performance, not just the average case.

```javascript
// percentile-thresholds.js
// Demonstrates percentile-based SLO thresholds

import http from 'k6/http';
import { check, group } from 'k6';
import { Trend } from 'k6/metrics';

// Custom metrics for specific endpoints
const loginDuration = new Trend('login_duration');
const searchDuration = new Trend('search_duration');
const checkoutDuration = new Trend('checkout_duration');

export const options = {
  vus: 100,
  duration: '5m',

  thresholds: {
    // Global latency SLO: 95% of requests under 500ms
    http_req_duration: ['p(95)<500'],

    // Endpoint-specific SLOs with different targets
    // Login is critical - must be fast
    login_duration: [
      'p(50)<100',         // Half of logins under 100ms
      'p(95)<300',         // 95% under 300ms
      'p(99)<500',         // 99% under 500ms
    ],

    // Search can be slightly slower
    search_duration: [
      'p(50)<200',
      'p(95)<800',
      'p(99)<1500',
    ],

    // Checkout is complex but still needs limits
    checkout_duration: [
      'p(50)<500',
      'p(95)<2000',
      'p(99)<3000',
    ],

    // Checks SLO: 99% of all checks must pass
    checks: ['rate>0.99'],
  },
};

export default function () {
  // Track login endpoint separately
  group('login', function () {
    const start = Date.now();
    const res = http.post('https://api.example.com/login', {
      username: 'testuser',
      password: 'testpass',
    });
    loginDuration.add(Date.now() - start);

    check(res, {
      'login successful': (r) => r.status === 200,
    });
  });

  // Track search endpoint
  group('search', function () {
    const start = Date.now();
    const res = http.get('https://api.example.com/search?q=test');
    searchDuration.add(Date.now() - start);

    check(res, {
      'search returns results': (r) => r.status === 200,
    });
  });

  // Track checkout endpoint
  group('checkout', function () {
    const start = Date.now();
    const res = http.post('https://api.example.com/checkout', {
      items: ['item1', 'item2'],
    });
    checkoutDuration.add(Date.now() - start);

    check(res, {
      'checkout completed': (r) => r.status === 200,
    });
  });
}
```

Why percentiles matter:
- P50 (median) shows typical user experience
- P95 catches most edge cases without outlier noise
- P99 reveals worst-case scenarios for most users
- Avoid P100 (max) in SLOs - single outliers will fail your tests

## Abort on Failure

Sometimes you want to stop a test early when thresholds are breached. This saves CI time and prevents wasting resources on a clearly failing build.

```javascript
// abort-on-failure.js
// Demonstrates early test termination when SLOs are breached

import http from 'k6/http';
import { sleep } from 'k6';

export const options = {
  stages: [
    { duration: '2m', target: 100 },  // Ramp up
    { duration: '5m', target: 100 },  // Sustained load
    { duration: '2m', target: 0 },    // Ramp down
  ],

  thresholds: {
    // Standard threshold - evaluated at end
    http_req_duration: ['p(95)<500'],

    // Threshold with abortOnFail - stops test immediately
    http_req_failed: [
      {
        threshold: 'rate<0.10',        // 10% error rate limit
        abortOnFail: true,             // Stop test if breached
        delayAbortEval: '30s',         // Wait 30s before checking
      },
    ],

    // Another abort condition for severe latency issues
    http_req_duration: [
      {
        threshold: 'p(99)<5000',       // P99 under 5 seconds
        abortOnFail: true,
        delayAbortEval: '1m',          // Allow 1 minute warmup
      },
    ],
  },
};

export default function () {
  http.get('https://api.example.com/data');
  sleep(0.5);
}
```

Configuration options for abort thresholds:
- `abortOnFail: true` - Enable early termination
- `delayAbortEval: 'duration'` - Grace period before enforcing (allows warmup)

Use abort on failure for:
- Catastrophic error rates that indicate broken deployments
- Extreme latency that suggests infrastructure problems
- Resource exhaustion scenarios

## Multiple Thresholds

Real-world SLOs often require multiple conditions on the same metric. k6 handles this elegantly with threshold arrays.

```javascript
// multiple-thresholds.js
// Shows how to combine multiple threshold conditions

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Counter, Rate, Trend } from 'k6/metrics';

// Custom metrics for granular SLO tracking
const apiErrors = new Counter('api_errors');
const apiSuccessRate = new Rate('api_success_rate');
const apiLatency = new Trend('api_latency');

export const options = {
  scenarios: {
    // Simulate steady traffic
    steady_traffic: {
      executor: 'constant-vus',
      vus: 50,
      duration: '5m',
    },
    // Simulate spike traffic
    spike_traffic: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '1m', target: 200 },
        { duration: '30s', target: 200 },
        { duration: '1m', target: 0 },
      ],
      startTime: '2m',  // Start spike at 2 minutes
    },
  },

  thresholds: {
    // Multiple conditions on built-in metric
    // ALL conditions must pass for threshold to pass
    http_req_duration: [
      'avg<300',           // Average under 300ms
      'p(90)<500',         // P90 under 500ms
      'p(95)<750',         // P95 under 750ms
      'p(99)<1500',        // P99 under 1.5 seconds
    ],

    // Multiple conditions with different severities
    http_req_failed: [
      'rate<0.05',         // Standard: under 5% errors
      {
        threshold: 'rate<0.20',
        abortOnFail: true,  // Critical: abort if over 20%
        delayAbortEval: '30s',
      },
    ],

    // Custom metric thresholds
    api_errors: ['count<100'],           // Max 100 total errors
    api_success_rate: ['rate>0.95'],     // 95% success rate
    api_latency: [
      'p(50)<200',
      'p(95)<600',
      'p(99)<1200',
    ],

    // Checks threshold - all checks combined
    checks: ['rate>0.98'],               // 98% of checks pass

    // Throughput threshold
    http_reqs: ['rate>50'],              // At least 50 RPS
  },
};

export default function () {
  const response = http.get('https://api.example.com/resource');
  const latency = response.timings.duration;

  // Track in custom metrics
  apiLatency.add(latency);

  const success = check(response, {
    'status is 2xx': (r) => r.status >= 200 && r.status < 300,
    'response has data': (r) => r.json() !== null,
  });

  if (success) {
    apiSuccessRate.add(1);
  } else {
    apiSuccessRate.add(0);
    apiErrors.add(1);
  }

  sleep(1);
}
```

Tips for multiple thresholds:
- Order thresholds from most lenient to most strict for readability
- Use custom metrics to track specific failure modes
- Combine built-in and custom metrics for comprehensive SLO coverage

## CI/CD Integration

Thresholds shine in CI/CD pipelines. Here is how to integrate k6 into your deployment workflow:

```javascript
// ci-thresholds.js
// Production-ready threshold configuration for CI pipelines

import http from 'k6/http';
import { check, sleep } from 'k6';
import { textSummary } from 'https://jslib.k6.io/k6-summary/0.0.2/index.js';

// Environment-aware configuration
const BASE_URL = __ENV.BASE_URL || 'https://staging.example.com';
const THRESHOLD_MULTIPLIER = __ENV.STRICT_MODE === 'true' ? 1.0 : 1.5;

export const options = {
  // CI-friendly execution settings
  scenarios: {
    smoke: {
      executor: 'constant-vus',
      vus: 5,
      duration: '1m',
      tags: { test_type: 'smoke' },
    },
    load: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '2m', target: 50 },
        { duration: '3m', target: 50 },
        { duration: '1m', target: 0 },
      ],
      startTime: '1m',
      tags: { test_type: 'load' },
    },
  },

  // SLO-based thresholds for CI gates
  thresholds: {
    // Availability SLO: 99.5% success rate
    http_req_failed: ['rate<0.005'],

    // Latency SLO: P95 under 500ms (adjusted by multiplier)
    http_req_duration: [
      `p(95)<${500 * THRESHOLD_MULTIPLIER}`,
      `p(99)<${1000 * THRESHOLD_MULTIPLIER}`,
    ],

    // Throughput SLO: sustain at least 100 RPS
    http_reqs: ['rate>100'],

    // Check pass rate: 99% of assertions pass
    checks: ['rate>0.99'],

    // Scenario-specific thresholds using tags
    'http_req_duration{test_type:smoke}': ['p(95)<300'],
    'http_req_duration{test_type:load}': ['p(95)<600'],
  },
};

export default function () {
  // Health check endpoint
  const healthRes = http.get(`${BASE_URL}/health`);
  check(healthRes, {
    'health check passes': (r) => r.status === 200,
  });

  // API endpoint under test
  const apiRes = http.get(`${BASE_URL}/api/v1/data`);
  check(apiRes, {
    'API returns 200': (r) => r.status === 200,
    'API response time OK': (r) => r.timings.duration < 500,
    'API returns valid JSON': (r) => {
      try {
        r.json();
        return true;
      } catch (e) {
        return false;
      }
    },
  });

  sleep(1);
}

// Custom summary for CI output
export function handleSummary(data) {
  // Check if thresholds passed
  const thresholdsPassed = Object.values(data.metrics)
    .filter(m => m.thresholds)
    .every(m => Object.values(m.thresholds).every(t => t.ok));

  console.log(`\n${'='.repeat(50)}`);
  console.log(`SLO CHECK: ${thresholdsPassed ? 'PASSED' : 'FAILED'}`);
  console.log(`${'='.repeat(50)}\n`);

  return {
    'stdout': textSummary(data, { indent: ' ', enableColors: true }),
    'results.json': JSON.stringify(data, null, 2),
  };
}
```

Example GitHub Actions workflow:

```yaml
# .github/workflows/load-test.yml
name: Load Test

on:
  pull_request:
    branches: [main]
  push:
    branches: [main]

jobs:
  load-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Install k6
        run: |
          curl -L https://github.com/grafana/k6/releases/download/v0.47.0/k6-v0.47.0-linux-amd64.tar.gz | tar xz
          sudo mv k6-v0.47.0-linux-amd64/k6 /usr/local/bin/

      - name: Run load test
        run: |
          k6 run \
            --env BASE_URL=${{ secrets.STAGING_URL }} \
            --env STRICT_MODE=true \
            ./tests/load/ci-thresholds.js
        # k6 exits with code 99 if thresholds fail

      - name: Upload results
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: k6-results
          path: results.json
```

CI integration best practices:
- Use environment variables for URLs and threshold adjustments
- Set `STRICT_MODE` for production deployments
- Export results to JSON for artifact storage
- Let k6 exit code determine pipeline pass/fail (exit code 99 = threshold failure)

## Best Practices Summary

When implementing k6 thresholds for SLOs, follow these guidelines:

**Define Meaningful SLOs**
- Base thresholds on real user expectations, not arbitrary numbers
- Start with P95 latency and error rate - these cover most use cases
- Add P99 for critical paths where tail latency matters

**Structure Your Thresholds**
- Use custom metrics for endpoint-specific SLOs
- Tag requests to enable scenario-specific thresholds
- Keep global thresholds as a safety net

**Configure for CI/CD**
- Always export results to JSON for debugging failed runs
- Use `abortOnFail` for catastrophic conditions only
- Set appropriate `delayAbortEval` to allow system warmup

**Avoid Common Pitfalls**
- Do not use averages for latency SLOs - they hide tail problems
- Do not set thresholds too tight - allow for normal variance
- Do not skip the warmup period - cold starts skew results

**Iterate and Refine**
- Review threshold breaches in production incidents
- Tighten thresholds as your system improves
- Loosen thresholds if they cause too many false positives

## Conclusion

k6 thresholds transform load testing from a manual analysis task into an automated quality gate. By codifying your SLOs as thresholds, you catch performance regressions before they reach production.

Start simple with P95 latency and error rate thresholds. Add complexity only when you need finer-grained SLO enforcement. Integrate with CI/CD early to get continuous feedback on every change.

The goal is not perfect numbers but consistent enforcement. A slightly relaxed threshold that runs on every PR is far more valuable than a strict threshold that nobody runs.

---

If you are looking for a platform to monitor your SLOs, track incidents, and correlate performance data with real user impact, check out [OneUptime](https://oneuptime.com). It provides unified observability that complements your k6 threshold strategy with production monitoring and alerting.
