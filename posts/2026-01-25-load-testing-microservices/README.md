# How to Configure Load Testing for Microservices

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Load Testing, k6, Performance, Microservices, DevOps

Description: Learn to implement comprehensive load testing for microservices using k6, including distributed testing, realistic traffic patterns, and performance threshold validation.

---

Load testing microservices differs from monolithic applications because you need to understand how services interact under pressure. A slow database can cascade into timeout failures across multiple downstream services. This guide covers load testing strategies specifically designed for distributed systems using k6.

## k6 Installation and Setup

Install k6 on your system:

```bash
# macOS
brew install k6

# Linux (Debian/Ubuntu)
sudo gpg -k
sudo gpg --no-default-keyring --keyring /usr/share/keyrings/k6-archive-keyring.gpg \
    --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69
echo "deb [signed-by=/usr/share/keyrings/k6-archive-keyring.gpg] https://dl.k6.io/deb stable main" | \
    sudo tee /etc/apt/sources.list.d/k6.list
sudo apt-get update
sudo apt-get install k6

# Docker
docker pull grafana/k6
```

## Basic Load Test Structure

Start with a simple test to verify your setup:

```javascript
// load-test.js
import http from 'k6/http';
import { check, sleep } from 'k6';

// Test configuration
// stages define how virtual users (VUs) ramp up and down
export const options = {
    stages: [
        { duration: '1m', target: 10 },   // Ramp up to 10 users over 1 minute
        { duration: '3m', target: 10 },   // Stay at 10 users for 3 minutes
        { duration: '1m', target: 50 },   // Ramp up to 50 users
        { duration: '3m', target: 50 },   // Stay at 50 users
        { duration: '1m', target: 0 },    // Ramp down to 0
    ],
    // Performance thresholds - test fails if these are exceeded
    thresholds: {
        http_req_duration: ['p(95)<500'],    // 95% of requests under 500ms
        http_req_failed: ['rate<0.01'],      // Less than 1% failure rate
    },
};

// Main test function runs once per iteration per VU
export default function () {
    // Make HTTP request
    const response = http.get('http://api.example.com/products');

    // Verify response
    check(response, {
        'status is 200': (r) => r.status === 200,
        'response time OK': (r) => r.timings.duration < 500,
        'has products': (r) => JSON.parse(r.body).length > 0,
    });

    // Wait between iterations to simulate think time
    sleep(1);
}
```

Run the test:

```bash
k6 run load-test.js
```

## Multi-Service Test Scenario

Test realistic user flows that span multiple microservices:

```javascript
// checkout-flow.js
import http from 'k6/http';
import { check, group, sleep } from 'k6';
import { SharedArray } from 'k6/data';

// Load test data from file
// SharedArray shares data between VUs to reduce memory
const users = new SharedArray('users', function () {
    return JSON.parse(open('./test-users.json'));
});

const products = new SharedArray('products', function () {
    return JSON.parse(open('./test-products.json'));
});

export const options = {
    scenarios: {
        // Simulate different user behaviors concurrently
        browse_users: {
            executor: 'ramping-vus',
            startVUs: 0,
            stages: [
                { duration: '2m', target: 100 },
                { duration: '5m', target: 100 },
                { duration: '2m', target: 0 },
            ],
            exec: 'browseProducts',
        },
        checkout_users: {
            executor: 'ramping-vus',
            startVUs: 0,
            stages: [
                { duration: '2m', target: 20 },
                { duration: '5m', target: 20 },
                { duration: '2m', target: 0 },
            ],
            exec: 'completeCheckout',
        },
    },
    thresholds: {
        // Per-endpoint thresholds
        'http_req_duration{name:get_products}': ['p(95)<200'],
        'http_req_duration{name:get_cart}': ['p(95)<150'],
        'http_req_duration{name:checkout}': ['p(95)<1000'],
        'http_req_failed': ['rate<0.01'],
    },
};

const BASE_URL = 'http://api.example.com';

// Helper to get auth token
function authenticate(user) {
    const response = http.post(`${BASE_URL}/auth/login`, JSON.stringify({
        email: user.email,
        password: user.password,
    }), {
        headers: { 'Content-Type': 'application/json' },
    });

    if (response.status === 200) {
        return JSON.parse(response.body).token;
    }
    return null;
}

// Scenario: Users browsing products
export function browseProducts() {
    group('Browse Products', function () {
        // Get product listing
        const listResponse = http.get(`${BASE_URL}/products`, {
            tags: { name: 'get_products' },
        });

        check(listResponse, {
            'products loaded': (r) => r.status === 200,
        });

        // View random product detail
        const productList = JSON.parse(listResponse.body);
        if (productList.length > 0) {
            const randomProduct = productList[Math.floor(Math.random() * productList.length)];

            const detailResponse = http.get(`${BASE_URL}/products/${randomProduct.id}`, {
                tags: { name: 'get_product_detail' },
            });

            check(detailResponse, {
                'product detail loaded': (r) => r.status === 200,
            });
        }
    });

    sleep(Math.random() * 3 + 1); // 1-4 second think time
}

// Scenario: Users completing checkout
export function completeCheckout() {
    // Select random test user
    const user = users[Math.floor(Math.random() * users.length)];
    const token = authenticate(user);

    if (!token) {
        console.error('Authentication failed');
        return;
    }

    const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
    };

    group('Checkout Flow', function () {
        // Add items to cart
        const product = products[Math.floor(Math.random() * products.length)];

        const addResponse = http.post(`${BASE_URL}/cart/items`, JSON.stringify({
            productId: product.id,
            quantity: 1,
        }), { headers, tags: { name: 'add_to_cart' } });

        check(addResponse, {
            'item added to cart': (r) => r.status === 201,
        });

        sleep(0.5);

        // Get cart
        const cartResponse = http.get(`${BASE_URL}/cart`, {
            headers,
            tags: { name: 'get_cart' },
        });

        check(cartResponse, {
            'cart retrieved': (r) => r.status === 200,
        });

        sleep(1);

        // Complete checkout
        const checkoutResponse = http.post(`${BASE_URL}/checkout`, JSON.stringify({
            paymentMethod: 'test_card',
            shippingAddress: user.address,
        }), { headers, tags: { name: 'checkout' } });

        check(checkoutResponse, {
            'checkout completed': (r) => r.status === 200 || r.status === 201,
            'order created': (r) => JSON.parse(r.body).orderId !== undefined,
        });
    });

    sleep(2);
}
```

## Stress Testing Configuration

Find breaking points with gradually increasing load:

```javascript
// stress-test.js
import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
    stages: [
        // Gradual ramp up to find breaking point
        { duration: '2m', target: 50 },
        { duration: '2m', target: 100 },
        { duration: '2m', target: 200 },
        { duration: '2m', target: 300 },
        { duration: '2m', target: 400 },
        { duration: '2m', target: 500 },
        // Hold at peak
        { duration: '5m', target: 500 },
        // Ramp down to see recovery
        { duration: '2m', target: 0 },
    ],
    thresholds: {
        // More lenient thresholds for stress testing
        http_req_duration: ['p(95)<2000'],
        http_req_failed: ['rate<0.05'],
    },
};

export default function () {
    const responses = http.batch([
        ['GET', 'http://api.example.com/products'],
        ['GET', 'http://api.example.com/categories'],
        ['GET', 'http://api.example.com/promotions'],
    ]);

    for (const response of responses) {
        check(response, {
            'status is 200': (r) => r.status === 200,
        });
    }

    sleep(1);
}
```

## Spike Testing

Test sudden traffic bursts:

```javascript
// spike-test.js
export const options = {
    stages: [
        // Normal load
        { duration: '1m', target: 50 },
        { duration: '2m', target: 50 },
        // Sudden spike to 10x normal
        { duration: '10s', target: 500 },
        { duration: '1m', target: 500 },
        // Return to normal
        { duration: '10s', target: 50 },
        { duration: '2m', target: 50 },
        // Second spike
        { duration: '10s', target: 500 },
        { duration: '1m', target: 500 },
        // Ramp down
        { duration: '1m', target: 0 },
    ],
};
```

## Service-Level Testing

Test individual services in isolation to identify bottlenecks:

```javascript
// service-tests/user-service.js
import http from 'k6/http';
import { check } from 'k6';

const USER_SERVICE = 'http://user-service.internal:8080';

export const options = {
    scenarios: {
        constant_load: {
            executor: 'constant-arrival-rate',
            rate: 100,           // 100 requests per second
            timeUnit: '1s',
            duration: '5m',
            preAllocatedVUs: 50,
            maxVUs: 200,
        },
    },
    thresholds: {
        'http_req_duration{endpoint:get_user}': ['p(99)<100'],
        'http_req_duration{endpoint:create_user}': ['p(99)<200'],
        'http_req_duration{endpoint:update_user}': ['p(99)<150'],
    },
};

export default function () {
    // Test different endpoints with weighted distribution
    const rand = Math.random();

    if (rand < 0.7) {
        // 70% read operations
        const userId = Math.floor(Math.random() * 10000);
        const response = http.get(`${USER_SERVICE}/users/${userId}`, {
            tags: { endpoint: 'get_user' },
        });
        check(response, { 'user retrieved': (r) => r.status === 200 });
    } else if (rand < 0.9) {
        // 20% update operations
        const userId = Math.floor(Math.random() * 10000);
        const response = http.put(`${USER_SERVICE}/users/${userId}`,
            JSON.stringify({ name: 'Updated Name' }),
            {
                headers: { 'Content-Type': 'application/json' },
                tags: { endpoint: 'update_user' },
            }
        );
        check(response, { 'user updated': (r) => r.status === 200 });
    } else {
        // 10% create operations
        const response = http.post(`${USER_SERVICE}/users`,
            JSON.stringify({
                name: `Test User ${Date.now()}`,
                email: `test${Date.now()}@example.com`,
            }),
            {
                headers: { 'Content-Type': 'application/json' },
                tags: { endpoint: 'create_user' },
            }
        );
        check(response, { 'user created': (r) => r.status === 201 });
    }
}
```

## Distributed Load Testing

Run k6 in distributed mode for higher load:

```yaml
# k6-distributed.yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: k6-load-test
  namespace: testing
spec:
  parallelism: 10  # Run 10 k6 instances in parallel
  template:
    spec:
      containers:
        - name: k6
          image: grafana/k6:latest
          command: ['k6', 'run', '--out', 'influxdb=http://influxdb:8086/k6', '/scripts/load-test.js']
          env:
            - name: K6_VUS
              value: "100"
            - name: K6_DURATION
              value: "10m"
          volumeMounts:
            - name: scripts
              mountPath: /scripts
          resources:
            requests:
              cpu: 500m
              memory: 512Mi
            limits:
              cpu: 1000m
              memory: 1Gi
      volumes:
        - name: scripts
          configMap:
            name: k6-scripts
      restartPolicy: Never
```

## Metrics and Reporting

Export metrics to InfluxDB and visualize in Grafana:

```javascript
// Run with InfluxDB output
// k6 run --out influxdb=http://localhost:8086/k6 load-test.js

export const options = {
    // Custom metrics
    tags: {
        environment: 'staging',
        test_type: 'load',
    },
};

import { Trend, Rate, Counter } from 'k6/metrics';

// Custom metrics for business logic
const orderLatency = new Trend('order_latency');
const orderSuccess = new Rate('order_success_rate');
const ordersCreated = new Counter('orders_created');

export default function () {
    const start = Date.now();

    const response = http.post('http://api.example.com/orders', orderData);

    const duration = Date.now() - start;

    // Record custom metrics
    orderLatency.add(duration);
    orderSuccess.add(response.status === 201);

    if (response.status === 201) {
        ordersCreated.add(1);
    }
}
```

## CI/CD Integration

Run load tests in your pipeline:

```yaml
# .github/workflows/load-test.yaml
name: Load Test

on:
  push:
    branches: [main]
  schedule:
    - cron: '0 2 * * *'  # Daily at 2 AM

jobs:
  load-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Install k6
        run: |
          sudo gpg -k
          sudo gpg --no-default-keyring --keyring /usr/share/keyrings/k6-archive-keyring.gpg \
              --keyserver hkp://keyserver.ubuntu.com:80 \
              --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69
          echo "deb [signed-by=/usr/share/keyrings/k6-archive-keyring.gpg] https://dl.k6.io/deb stable main" | \
              sudo tee /etc/apt/sources.list.d/k6.list
          sudo apt-get update
          sudo apt-get install k6

      - name: Run load test
        run: k6 run --out json=results.json load-tests/staging.js
        env:
          TARGET_URL: ${{ secrets.STAGING_URL }}

      - name: Upload results
        uses: actions/upload-artifact@v4
        with:
          name: load-test-results
          path: results.json
```

## Summary

| Test Type | Purpose | When to Run |
|-----------|---------|-------------|
| **Load test** | Verify normal capacity | Every deployment |
| **Stress test** | Find breaking points | Weekly or after changes |
| **Spike test** | Test sudden traffic | Before marketing events |
| **Soak test** | Find memory leaks | Weekly overnight |

Start with conservative load levels and gradually increase while monitoring service metrics. Pay attention to cascading failures where one slow service impacts others.
