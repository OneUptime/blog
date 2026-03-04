# How to Set Up k6 for Performance Testing APIs on RHEL

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: RHEL, k6, Performance Testing, API Testing, Load Testing, Linux

Description: Learn how to install and set up k6 on RHEL for performance testing APIs, including test script creation, load profiles, thresholds, checks, and CI/CD integration.

---

k6 is a developer-centric load testing tool built in Go that uses JavaScript for test scripts. It is designed specifically for testing APIs and microservices, with built-in support for HTTP/1.1, HTTP/2, WebSockets, and gRPC. k6 runs efficiently on a single machine and provides detailed metrics out of the box. This guide covers setting it up on RHEL.

## Why k6

k6 is popular for API performance testing because:

- Scripts are written in JavaScript (ES6), which most developers already know
- It runs as a single binary with no external dependencies
- Built-in checks and thresholds let you define pass/fail criteria
- Output integrates with Prometheus, Grafana, Datadog, and more
- Scenarios let you model complex traffic patterns

## Prerequisites

- RHEL with root or sudo access
- An API or web service to test

## Installing k6

```bash
# Add the k6 repository
sudo dnf install -y https://dl.k6.io/rpm/repo.rpm
```

```bash
# Install k6
sudo dnf install -y k6
```

Verify the installation:

```bash
# Check the version
k6 version
```

If the repository method does not work, install from the binary:

```bash
# Download the k6 binary
curl -LO https://github.com/grafana/k6/releases/latest/download/k6-linux-amd64.tar.gz
tar xzf k6-linux-amd64.tar.gz
sudo mv k6-linux-amd64/k6 /usr/local/bin/
```

## Writing Your First k6 Test

```javascript
// test.js
import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  vus: 10,
  duration: '30s',
};

export default function () {
  const res = http.get('http://your-api.example.com/api/health');

  check(res, {
    'status is 200': (r) => r.status === 200,
    'response time < 500ms': (r) => r.timings.duration < 500,
  });

  sleep(1);
}
```

Run the test:

```bash
# Execute the test
k6 run test.js
```

## Understanding k6 Output

k6 outputs metrics including:

- **http_req_duration** - total request time
- **http_req_waiting** - time waiting for server response (TTFB)
- **http_reqs** - total number of requests made
- **checks** - pass/fail rate of your check assertions
- **vus** - number of concurrent virtual users

## Load Profiles with Stages

Ramp users up and down to simulate realistic traffic patterns:

```javascript
// staged-test.js
import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '1m', target: 20 },   // Ramp up to 20 users over 1 minute
    { duration: '3m', target: 20 },   // Stay at 20 users for 3 minutes
    { duration: '1m', target: 50 },   // Ramp up to 50 users
    { duration: '3m', target: 50 },   // Stay at 50 users for 3 minutes
    { duration: '1m', target: 0 },    // Ramp down to 0
  ],
};

export default function () {
  const res = http.get('http://your-api.example.com/api/products');

  check(res, {
    'status is 200': (r) => r.status === 200,
    'body is not empty': (r) => r.body.length > 0,
  });

  sleep(1);
}
```

## Setting Thresholds

Define performance budgets that fail the test if not met:

```javascript
// threshold-test.js
import http from 'k6/http';
import { check } from 'k6';

export const options = {
  vus: 50,
  duration: '2m',
  thresholds: {
    http_req_duration: ['p(95)<500', 'p(99)<1000'],
    http_req_failed: ['rate<0.01'],
    checks: ['rate>0.99'],
    http_reqs: ['rate>100'],
  },
};

export default function () {
  const res = http.get('http://your-api.example.com/api/data');

  check(res, {
    'status is 200': (r) => r.status === 200,
    'response time OK': (r) => r.timings.duration < 500,
    'content type is JSON': (r) => r.headers['Content-Type'].includes('application/json'),
  });
}
```

This test fails if:

- 95th percentile response time exceeds 500ms
- 99th percentile exceeds 1000ms
- More than 1% of requests fail
- Check pass rate drops below 99%

## Testing POST Requests

```javascript
// post-test.js
import http from 'k6/http';
import { check } from 'k6';

export const options = {
  vus: 20,
  duration: '1m',
};

export default function () {
  const payload = JSON.stringify({
    name: 'Test User',
    email: `user${__VU}_${__ITER}@example.com`,
  });

  const params = {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer your-token-here',
    },
  };

  const res = http.post('http://your-api.example.com/api/users', payload, params);

  check(res, {
    'status is 201': (r) => r.status === 201,
    'user was created': (r) => r.json('id') !== undefined,
  });
}
```

## Using Scenarios

Scenarios let you model multiple user types simultaneously:

```javascript
// scenario-test.js
import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  scenarios: {
    browse: {
      executor: 'constant-vus',
      vus: 30,
      duration: '5m',
      exec: 'browseProducts',
    },
    purchase: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '2m', target: 10 },
        { duration: '3m', target: 10 },
      ],
      exec: 'purchaseFlow',
    },
    api_check: {
      executor: 'constant-arrival-rate',
      rate: 50,
      timeUnit: '1s',
      duration: '5m',
      preAllocatedVUs: 50,
      exec: 'apiHealthCheck',
    },
  },
};

export function browseProducts() {
  http.get('http://your-api.example.com/api/products');
  sleep(2);
}

export function purchaseFlow() {
  http.get('http://your-api.example.com/api/products/1');
  sleep(1);
  http.post('http://your-api.example.com/api/cart', JSON.stringify({ product_id: 1 }), {
    headers: { 'Content-Type': 'application/json' },
  });
  sleep(1);
}

export function apiHealthCheck() {
  const res = http.get('http://your-api.example.com/api/health');
  check(res, { 'healthy': (r) => r.status === 200 });
}
```

## Loading Data from Files

```javascript
// data-driven-test.js
import http from 'k6/http';
import { SharedArray } from 'k6/data';

const users = new SharedArray('users', function () {
  return JSON.parse(open('./users.json'));
});

export default function () {
  const user = users[__VU % users.length];
  http.post('http://your-api.example.com/api/login', JSON.stringify(user), {
    headers: { 'Content-Type': 'application/json' },
  });
}
```

## Outputting Results

### JSON Output

```bash
# Save results as JSON
k6 run --out json=results.json test.js
```

### CSV Output

```bash
# Save results as CSV
k6 run --out csv=results.csv test.js
```

### Prometheus Output

```bash
# Send metrics to Prometheus via Remote Write
k6 run --out experimental-prometheus-rw test.js
```

## CI/CD Integration

```yaml
# .github/workflows/performance.yml
name: Performance Tests
on:
  pull_request:
    branches: [main]
jobs:
  k6:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: grafana/k6-action@v0.3.1
        with:
          filename: test.js
```

```bash
# In a shell-based CI pipeline
k6 run --out json=results.json test.js
# Exit code is non-zero if thresholds fail
echo "Exit code: $?"
```

## Conclusion

k6 on RHEL provides a powerful, developer-friendly tool for performance testing APIs. By writing tests in JavaScript with built-in checks, thresholds, and scenarios, you can model complex traffic patterns, set clear performance budgets, and integrate load testing directly into your CI/CD pipeline. The single-binary deployment and efficient Go runtime mean you can generate significant load from a single RHEL machine.
