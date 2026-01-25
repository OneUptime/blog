# How to Implement Load Testing with k6

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: k6, Load Testing, Performance Testing, JavaScript, DevOps, Testing Tools

Description: A practical guide to implementing load testing with k6, covering script creation, virtual users, thresholds, and CI/CD integration for reliable performance validation.

---

Load testing helps you understand how your application behaves under stress. k6 is a modern load testing tool built for developers. It uses JavaScript for test scripts, runs efficiently on local machines, and integrates smoothly into CI/CD pipelines. Unlike older tools that require complex XML configurations, k6 lets you write tests as code.

## Why k6?

k6 stands out for several reasons. It is written in Go, which means low resource consumption and high performance. You can run thousands of virtual users on a single machine. The scripting language is JavaScript (ES6), so most developers can start writing tests immediately. The tool also provides excellent metrics out of the box and supports extensions for specific protocols.

## Installing k6

On macOS with Homebrew:

```bash
# Install k6 using Homebrew
brew install k6
```

On Linux:

```bash
# Add the k6 repository and install
sudo gpg -k
sudo gpg --no-default-keyring --keyring /usr/share/keyrings/k6-archive-keyring.gpg --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69
echo "deb [signed-by=/usr/share/keyrings/k6-archive-keyring.gpg] https://dl.k6.io/deb stable main" | sudo tee /etc/apt/sources.list.d/k6.list
sudo apt-get update
sudo apt-get install k6
```

Using Docker:

```bash
# Run k6 from the official Docker image
docker run --rm -i grafana/k6 run - <script.js
```

## Your First k6 Test

Create a file called `load-test.js`:

```javascript
// load-test.js - Basic load test example
import http from 'k6/http';
import { check, sleep } from 'k6';

// Test configuration
export const options = {
  // Number of virtual users
  vus: 10,
  // Test duration
  duration: '30s',
};

// Default function runs for each virtual user
export default function () {
  // Make a GET request to your API
  const response = http.get('https://api.example.com/users');

  // Validate the response
  check(response, {
    'status is 200': (r) => r.status === 200,
    'response time < 500ms': (r) => r.timings.duration < 500,
  });

  // Wait 1 second between requests (simulates user think time)
  sleep(1);
}
```

Run the test:

```bash
# Execute the load test
k6 run load-test.js
```

## Understanding Load Test Stages

Real traffic patterns vary over time. Use stages to simulate gradual ramp-up and ramp-down:

```javascript
// staged-load-test.js - Simulate realistic traffic patterns
import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    // Ramp up from 0 to 50 users over 2 minutes
    { duration: '2m', target: 50 },
    // Stay at 50 users for 5 minutes
    { duration: '5m', target: 50 },
    // Ramp up to 100 users over 2 minutes
    { duration: '2m', target: 100 },
    // Stay at 100 users for 5 minutes
    { duration: '5m', target: 100 },
    // Ramp down to 0 users over 2 minutes
    { duration: '2m', target: 0 },
  ],
};

export default function () {
  const response = http.get('https://api.example.com/products');

  check(response, {
    'status is 200': (r) => r.status === 200,
  });

  sleep(1);
}
```

## Setting Thresholds

Thresholds define pass/fail criteria for your tests. If thresholds are not met, k6 exits with a non-zero code, which is useful for CI/CD:

```javascript
// threshold-test.js - Define performance requirements
import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  vus: 50,
  duration: '5m',
  thresholds: {
    // 95% of requests must complete within 500ms
    http_req_duration: ['p(95)<500'],
    // Request failure rate must be less than 1%
    http_req_failed: ['rate<0.01'],
    // 99% of requests must complete within 1000ms
    'http_req_duration{expected_response:true}': ['p(99)<1000'],
  },
};

export default function () {
  const response = http.get('https://api.example.com/health');

  check(response, {
    'status is 200': (r) => r.status === 200,
    'body contains ok': (r) => r.body.includes('ok'),
  });

  sleep(0.5);
}
```

## Testing API Endpoints with Different Methods

Most applications need tests for various HTTP methods:

```javascript
// api-test.js - Test multiple endpoints and methods
import http from 'k6/http';
import { check, group, sleep } from 'k6';

const BASE_URL = 'https://api.example.com';

export const options = {
  vus: 20,
  duration: '3m',
  thresholds: {
    http_req_duration: ['p(95)<600'],
  },
};

export default function () {
  // Group related requests together for better reporting
  group('User API', function () {
    // GET request
    const listResponse = http.get(`${BASE_URL}/users`);
    check(listResponse, {
      'list users status 200': (r) => r.status === 200,
    });

    // POST request with JSON body
    const createPayload = JSON.stringify({
      name: 'Test User',
      email: `test${Date.now()}@example.com`,
    });

    const createParams = {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer your-token-here',
      },
    };

    const createResponse = http.post(
      `${BASE_URL}/users`,
      createPayload,
      createParams
    );

    check(createResponse, {
      'create user status 201': (r) => r.status === 201,
    });

    // Extract user ID from response for subsequent requests
    if (createResponse.status === 201) {
      const userId = JSON.parse(createResponse.body).id;

      // PUT request to update user
      const updatePayload = JSON.stringify({
        name: 'Updated User',
      });

      const updateResponse = http.put(
        `${BASE_URL}/users/${userId}`,
        updatePayload,
        createParams
      );

      check(updateResponse, {
        'update user status 200': (r) => r.status === 200,
      });

      // DELETE request
      const deleteResponse = http.del(
        `${BASE_URL}/users/${userId}`,
        null,
        createParams
      );

      check(deleteResponse, {
        'delete user status 204': (r) => r.status === 204,
      });
    }
  });

  sleep(1);
}
```

## Load Test Scenarios

k6 supports multiple scenarios running concurrently:

```javascript
// scenarios-test.js - Run multiple test scenarios
import http from 'k6/http';
import { sleep } from 'k6';

export const options = {
  scenarios: {
    // Scenario 1: Constant load for browsing users
    browse_users: {
      executor: 'constant-vus',
      vus: 10,
      duration: '5m',
      exec: 'browseProducts',
    },
    // Scenario 2: Ramping load for checkout process
    checkout: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '2m', target: 20 },
        { duration: '3m', target: 20 },
        { duration: '1m', target: 0 },
      ],
      exec: 'checkout',
    },
    // Scenario 3: Spike test for search
    search_spike: {
      executor: 'constant-arrival-rate',
      rate: 100,
      timeUnit: '1s',
      duration: '1m',
      preAllocatedVUs: 50,
      exec: 'search',
    },
  },
};

export function browseProducts() {
  http.get('https://api.example.com/products');
  sleep(2);
}

export function checkout() {
  http.post('https://api.example.com/cart/checkout', JSON.stringify({
    items: [{ id: 1, quantity: 2 }],
  }), {
    headers: { 'Content-Type': 'application/json' },
  });
  sleep(3);
}

export function search() {
  http.get('https://api.example.com/search?q=test');
}
```

## CI/CD Integration

Add k6 to your GitHub Actions workflow:

```yaml
# .github/workflows/load-test.yml
name: Load Test

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  load-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Install k6
        run: |
          sudo gpg -k
          sudo gpg --no-default-keyring --keyring /usr/share/keyrings/k6-archive-keyring.gpg --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69
          echo "deb [signed-by=/usr/share/keyrings/k6-archive-keyring.gpg] https://dl.k6.io/deb stable main" | sudo tee /etc/apt/sources.list.d/k6.list
          sudo apt-get update
          sudo apt-get install k6

      - name: Run load test
        run: k6 run --out json=results.json tests/load-test.js

      - name: Upload results
        uses: actions/upload-artifact@v4
        with:
          name: k6-results
          path: results.json
```

## Outputting Results to External Systems

Send results to Prometheus, InfluxDB, or other systems:

```bash
# Output to InfluxDB
k6 run --out influxdb=http://localhost:8086/k6 load-test.js

# Output to JSON file
k6 run --out json=results.json load-test.js

# Output to multiple destinations
k6 run --out influxdb=http://localhost:8086/k6 --out json=results.json load-test.js
```

## Best Practices

When writing k6 tests, keep these principles in mind:

1. Start small and increase load gradually
2. Set realistic think times between requests
3. Use thresholds to define acceptable performance
4. Group related requests for cleaner reports
5. Run tests from locations similar to your users
6. Include authentication flows in your tests
7. Test during off-peak hours to avoid impacting production users

---

Load testing with k6 gives you confidence that your application handles traffic spikes. Start with simple tests and gradually add complexity as you learn more about your system's behavior under load.
