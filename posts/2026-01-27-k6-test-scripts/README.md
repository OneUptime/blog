# How to Write k6 Test Scripts

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Performance Testing, k6, Load Testing, JavaScript, API Testing, Stress Testing, Observability, DevOps

Description: A comprehensive guide to writing k6 test scripts for load testing your applications, covering script structure, HTTP requests, checks, groups, custom metrics, and best practices.

---

> Performance testing is not about finding out how fast your system can go. It is about understanding how your system behaves under stress and where it breaks.

k6 is a modern, developer-centric load testing tool built for testing the performance of APIs, microservices, and websites. Written in Go with test scripts in JavaScript, k6 offers an excellent developer experience with powerful features for realistic load testing.

This guide walks you through everything you need to know to write effective k6 test scripts, from basic structure to advanced patterns.

---

## Script Structure

Every k6 script follows a consistent structure with specific lifecycle stages. Understanding this structure is fundamental to writing effective tests.

```javascript
// Import necessary k6 modules
import http from 'k6/http';
import { check, sleep } from 'k6';

// Configuration options for the test
export const options = {
  // Define virtual users (VUs) and duration
  vus: 10,              // Number of virtual users
  duration: '30s',      // Test duration

  // Or use stages for ramping patterns
  stages: [
    { duration: '1m', target: 20 },   // Ramp up to 20 users over 1 minute
    { duration: '3m', target: 20 },   // Stay at 20 users for 3 minutes
    { duration: '1m', target: 0 },    // Ramp down to 0 users
  ],

  // Define thresholds for pass/fail criteria
  thresholds: {
    http_req_duration: ['p(95)<500'],  // 95% of requests must complete under 500ms
    http_req_failed: ['rate<0.01'],    // Less than 1% of requests can fail
  },
};

// Setup function runs once before the test starts
export function setup() {
  // Perform setup tasks like authentication or data preparation
  const loginRes = http.post('https://api.example.com/auth/login', {
    username: 'testuser',
    password: 'testpass',
  });

  // Return data to be used by default function
  return { token: loginRes.json('token') };
}

// Default function runs repeatedly for each VU during the test
export default function (data) {
  // Use the token from setup
  const headers = {
    'Authorization': `Bearer ${data.token}`,
    'Content-Type': 'application/json',
  };

  // Make HTTP requests
  const response = http.get('https://api.example.com/users', { headers });

  // Validate responses
  check(response, {
    'status is 200': (r) => r.status === 200,
    'response time OK': (r) => r.timings.duration < 500,
  });

  // Add realistic think time between requests
  sleep(1);
}

// Teardown function runs once after the test completes
export function teardown(data) {
  // Clean up resources, logout, or generate reports
  http.post('https://api.example.com/auth/logout', null, {
    headers: { 'Authorization': `Bearer ${data.token}` },
  });
}
```

---

## HTTP Requests

k6 provides a comprehensive HTTP module for making all types of requests. Here are examples of common request patterns.

```javascript
import http from 'k6/http';
import { check } from 'k6';

export default function () {
  // GET request with query parameters
  const getResponse = http.get('https://api.example.com/users?page=1&limit=10');

  // POST request with JSON body
  const postPayload = JSON.stringify({
    name: 'John Doe',
    email: 'john@example.com',
    role: 'developer',
  });

  const postParams = {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer token123',
    },
  };

  const postResponse = http.post(
    'https://api.example.com/users',
    postPayload,
    postParams
  );

  // PUT request for updating resources
  const putPayload = JSON.stringify({
    name: 'John Updated',
    email: 'john.updated@example.com',
  });

  const putResponse = http.put(
    'https://api.example.com/users/123',
    putPayload,
    postParams
  );

  // DELETE request
  const deleteResponse = http.del('https://api.example.com/users/123', null, postParams);

  // PATCH request for partial updates
  const patchPayload = JSON.stringify({ status: 'active' });
  const patchResponse = http.patch(
    'https://api.example.com/users/123',
    patchPayload,
    postParams
  );

  // Batch multiple requests for efficiency
  const batchResponses = http.batch([
    ['GET', 'https://api.example.com/users'],
    ['GET', 'https://api.example.com/products'],
    ['GET', 'https://api.example.com/orders'],
  ]);

  // Access individual responses from batch
  check(batchResponses[0], {
    'users endpoint OK': (r) => r.status === 200,
  });
}
```

### Handling Form Data and File Uploads

```javascript
import http from 'k6/http';
import { FormData } from 'https://jslib.k6.io/formdata/0.0.2/index.js';

export default function () {
  // URL-encoded form data
  const formResponse = http.post('https://api.example.com/login', {
    username: 'testuser',
    password: 'testpass',
  });

  // Multipart form data with file upload
  const fd = new FormData();
  fd.append('name', 'test-file');
  fd.append('file', http.file(open('./test-file.pdf', 'b'), 'document.pdf'));

  const uploadResponse = http.post('https://api.example.com/upload', fd.body(), {
    headers: { 'Content-Type': 'multipart/form-data; boundary=' + fd.boundary },
  });
}
```

---

## Checks

Checks are assertions that validate response data. They do not stop test execution on failure but record pass/fail metrics.

```javascript
import http from 'k6/http';
import { check } from 'k6';

export default function () {
  const response = http.get('https://api.example.com/users/1');

  // Basic status code check
  check(response, {
    'status is 200': (r) => r.status === 200,
  });

  // Multiple checks on the same response
  check(response, {
    'status is 200': (r) => r.status === 200,
    'response time < 500ms': (r) => r.timings.duration < 500,
    'content-type is JSON': (r) => r.headers['Content-Type'].includes('application/json'),
    'body is not empty': (r) => r.body.length > 0,
  });

  // Check JSON response content
  const jsonResponse = response.json();

  check(jsonResponse, {
    'user has id': (data) => data.id !== undefined,
    'user has valid email': (data) => data.email.includes('@'),
    'user is active': (data) => data.status === 'active',
  });

  // Check array responses
  const listResponse = http.get('https://api.example.com/users');
  const users = listResponse.json();

  check(users, {
    'returns array': (data) => Array.isArray(data),
    'has at least one user': (data) => data.length > 0,
    'all users have emails': (data) => data.every(user => user.email),
  });

  // Check response headers
  check(response, {
    'has cache-control header': (r) => r.headers['Cache-Control'] !== undefined,
    'uses gzip compression': (r) => r.headers['Content-Encoding'] === 'gzip',
  });
}
```

---

## Groups

Groups organize your test logic into logical sections, making it easier to analyze results and identify bottlenecks.

```javascript
import http from 'k6/http';
import { check, group, sleep } from 'k6';

export default function () {
  // Group for user authentication flow
  group('Authentication', function () {
    const loginPayload = JSON.stringify({
      username: 'testuser',
      password: 'testpass',
    });

    const loginResponse = http.post('https://api.example.com/auth/login', loginPayload, {
      headers: { 'Content-Type': 'application/json' },
    });

    check(loginResponse, {
      'login successful': (r) => r.status === 200,
      'received token': (r) => r.json('token') !== undefined,
    });

    sleep(1);
  });

  // Group for user profile operations
  group('User Profile', function () {
    const profileResponse = http.get('https://api.example.com/users/me');

    check(profileResponse, {
      'profile loaded': (r) => r.status === 200,
      'has user data': (r) => r.json('id') !== undefined,
    });

    // Nested group for profile updates
    group('Update Profile', function () {
      const updatePayload = JSON.stringify({ bio: 'Updated bio' });
      const updateResponse = http.patch('https://api.example.com/users/me', updatePayload, {
        headers: { 'Content-Type': 'application/json' },
      });

      check(updateResponse, {
        'update successful': (r) => r.status === 200,
      });
    });

    sleep(1);
  });

  // Group for product browsing
  group('Product Catalog', function () {
    const productsResponse = http.get('https://api.example.com/products?category=electronics');

    check(productsResponse, {
      'products loaded': (r) => r.status === 200,
      'has products': (r) => r.json().length > 0,
    });

    // Get product details
    const productId = productsResponse.json()[0].id;
    const detailResponse = http.get(`https://api.example.com/products/${productId}`);

    check(detailResponse, {
      'product details loaded': (r) => r.status === 200,
    });

    sleep(2);
  });
}
```

---

## Custom Metrics

k6 allows you to create custom metrics to track application-specific measurements beyond the built-in metrics.

```javascript
import http from 'k6/http';
import { check, sleep } from 'k6';
import { Counter, Gauge, Rate, Trend } from 'k6/metrics';

// Define custom metrics
const orderSuccessRate = new Rate('order_success_rate');       // Tracks success percentage
const orderProcessingTime = new Trend('order_processing_time'); // Tracks timing distribution
const activeUsers = new Gauge('active_users');                  // Tracks current value
const totalOrders = new Counter('total_orders');                // Tracks cumulative count

export const options = {
  vus: 10,
  duration: '1m',
  thresholds: {
    // Set thresholds on custom metrics
    'order_success_rate': ['rate>0.95'],           // 95% of orders must succeed
    'order_processing_time': ['p(95)<2000'],       // 95% of orders under 2 seconds
    'total_orders': ['count>100'],                  // Must process at least 100 orders
  },
};

export default function () {
  // Track active users
  activeUsers.add(__VU);

  // Simulate order creation
  const orderPayload = JSON.stringify({
    items: [
      { productId: 'prod-001', quantity: 2 },
      { productId: 'prod-002', quantity: 1 },
    ],
    shippingAddress: {
      street: '123 Main St',
      city: 'Test City',
      zip: '12345',
    },
  });

  const startTime = Date.now();

  const response = http.post('https://api.example.com/orders', orderPayload, {
    headers: { 'Content-Type': 'application/json' },
  });

  const processingTime = Date.now() - startTime;

  // Record custom metrics
  const success = response.status === 201;
  orderSuccessRate.add(success);
  orderProcessingTime.add(processingTime);
  totalOrders.add(1);

  check(response, {
    'order created': (r) => r.status === 201,
  });

  sleep(1);
}
```

### Tagging Custom Metrics

```javascript
import http from 'k6/http';
import { Trend } from 'k6/metrics';

// Create tagged metrics for different endpoints
const apiLatency = new Trend('api_latency');

export default function () {
  // Tag metrics by endpoint for granular analysis
  const usersResponse = http.get('https://api.example.com/users');
  apiLatency.add(usersResponse.timings.duration, { endpoint: '/users', method: 'GET' });

  const productsResponse = http.get('https://api.example.com/products');
  apiLatency.add(productsResponse.timings.duration, { endpoint: '/products', method: 'GET' });

  const orderResponse = http.post('https://api.example.com/orders', '{}', {
    headers: { 'Content-Type': 'application/json' },
  });
  apiLatency.add(orderResponse.timings.duration, { endpoint: '/orders', method: 'POST' });
}
```

---

## Data Parameterization

Real load tests need varied data. k6 provides several ways to parameterize your tests with realistic data.

### Using Shared Arrays for Large Datasets

```javascript
import http from 'k6/http';
import { check, sleep } from 'k6';
import { SharedArray } from 'k6/data';

// Load user data from JSON file (loaded once, shared across VUs)
const users = new SharedArray('users', function () {
  return JSON.parse(open('./test-users.json'));
});

// Load CSV data
const products = new SharedArray('products', function () {
  const data = open('./products.csv');
  return data.split('\n').slice(1).map(line => {
    const [id, name, price, category] = line.split(',');
    return { id, name, price: parseFloat(price), category };
  });
});

export default function () {
  // Get random user for this iteration
  const user = users[Math.floor(Math.random() * users.length)];

  // Login with parameterized credentials
  const loginPayload = JSON.stringify({
    email: user.email,
    password: user.password,
  });

  const loginResponse = http.post('https://api.example.com/auth/login', loginPayload, {
    headers: { 'Content-Type': 'application/json' },
  });

  check(loginResponse, {
    'login successful': (r) => r.status === 200,
  });

  // Browse random products
  const product = products[Math.floor(Math.random() * products.length)];
  const productResponse = http.get(`https://api.example.com/products/${product.id}`);

  check(productResponse, {
    'product found': (r) => r.status === 200,
  });

  sleep(1);
}
```

### Using Environment Variables

```javascript
import http from 'k6/http';
import { check } from 'k6';

// Read environment variables
const BASE_URL = __ENV.BASE_URL || 'https://api.example.com';
const API_KEY = __ENV.API_KEY;

export const options = {
  vus: __ENV.VUS ? parseInt(__ENV.VUS) : 10,
  duration: __ENV.DURATION || '30s',
};

export default function () {
  const response = http.get(`${BASE_URL}/users`, {
    headers: {
      'Authorization': `Bearer ${API_KEY}`,
    },
  });

  check(response, {
    'status is 200': (r) => r.status === 200,
  });
}
```

Run with environment variables:
```bash
k6 run -e BASE_URL=https://staging.example.com -e API_KEY=secret123 -e VUS=50 script.js
```

### Sequential Data Iteration

```javascript
import http from 'k6/http';
import { SharedArray } from 'k6/data';
import exec from 'k6/execution';

const testData = new SharedArray('testData', function () {
  return JSON.parse(open('./test-scenarios.json'));
});

export const options = {
  vus: 10,
  iterations: 100,
};

export default function () {
  // Each VU iterates through data sequentially
  const dataIndex = exec.scenario.iterationInTest % testData.length;
  const scenario = testData[dataIndex];

  const response = http.post(
    `https://api.example.com${scenario.endpoint}`,
    JSON.stringify(scenario.payload),
    { headers: { 'Content-Type': 'application/json' } }
  );

  // Validate against expected response
  check(response, {
    'correct status': (r) => r.status === scenario.expectedStatus,
  });
}
```

---

## Lifecycle Hooks

k6 provides lifecycle hooks for setup, teardown, and scenario-specific initialization.

```javascript
import http from 'k6/http';
import { check, sleep } from 'k6';
import exec from 'k6/execution';

export const options = {
  scenarios: {
    // Scenario with per-VU setup/teardown
    load_test: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '1m', target: 50 },
        { duration: '3m', target: 50 },
        { duration: '1m', target: 0 },
      ],
    },
  },
};

// Global setup - runs once at the start
export function setup() {
  console.log('Setting up test environment...');

  // Create test data
  const response = http.post('https://api.example.com/test/setup', JSON.stringify({
    testRunId: `test-${Date.now()}`,
    environment: 'staging',
  }), {
    headers: { 'Content-Type': 'application/json' },
  });

  if (response.status !== 200) {
    throw new Error('Setup failed: ' + response.body);
  }

  const setupData = response.json();

  // Authenticate and get token
  const authResponse = http.post('https://api.example.com/auth/login', JSON.stringify({
    username: 'loadtest-user',
    password: 'loadtest-pass',
  }), {
    headers: { 'Content-Type': 'application/json' },
  });

  return {
    testRunId: setupData.testRunId,
    token: authResponse.json('token'),
    startTime: Date.now(),
  };
}

// Main test function - receives setup data
export default function (data) {
  const headers = {
    'Authorization': `Bearer ${data.token}`,
    'Content-Type': 'application/json',
    'X-Test-Run-Id': data.testRunId,
  };

  // Track VU and iteration info
  const vuId = exec.vu.idInTest;
  const iteration = exec.vu.iterationInScenario;

  // Perform test operations
  const response = http.get('https://api.example.com/users', { headers });

  check(response, {
    'users loaded': (r) => r.status === 200,
  });

  sleep(1);
}

// Handle VU initialization (runs once per VU)
export function handleSummary(data) {
  // Generate custom summary report
  const duration = Date.now() - data.setup_data.startTime;

  return {
    'stdout': textSummary(data, { indent: ' ', enableColors: true }),
    './summary.json': JSON.stringify({
      testRunId: data.setup_data.testRunId,
      duration: duration,
      metrics: {
        http_reqs: data.metrics.http_reqs.values.count,
        http_req_duration_p95: data.metrics.http_req_duration.values['p(95)'],
        http_req_failed_rate: data.metrics.http_req_failed.values.rate,
      },
      thresholds: data.root_group.checks,
    }, null, 2),
  };
}

import { textSummary } from 'https://jslib.k6.io/k6-summary/0.0.1/index.js';

// Global teardown - runs once at the end
export function teardown(data) {
  console.log('Cleaning up test environment...');
  console.log(`Test run ${data.testRunId} completed`);

  // Clean up test data
  http.post('https://api.example.com/test/cleanup', JSON.stringify({
    testRunId: data.testRunId,
  }), {
    headers: {
      'Authorization': `Bearer ${data.token}`,
      'Content-Type': 'application/json',
    },
  });

  // Logout
  http.post('https://api.example.com/auth/logout', null, {
    headers: { 'Authorization': `Bearer ${data.token}` },
  });
}
```

---

## Modules

Organize your k6 tests using modules for reusability and maintainability.

### Creating Reusable API Client Module

```javascript
// lib/api-client.js
import http from 'k6/http';
import { check } from 'k6';

const BASE_URL = __ENV.BASE_URL || 'https://api.example.com';

export class APIClient {
  constructor(token = null) {
    this.token = token;
    this.baseHeaders = {
      'Content-Type': 'application/json',
    };
  }

  // Set authentication token
  setToken(token) {
    this.token = token;
  }

  // Get headers with optional auth
  getHeaders() {
    const headers = { ...this.baseHeaders };
    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }
    return headers;
  }

  // Generic request method
  request(method, endpoint, body = null) {
    const url = `${BASE_URL}${endpoint}`;
    const options = { headers: this.getHeaders() };

    switch (method.toUpperCase()) {
      case 'GET':
        return http.get(url, options);
      case 'POST':
        return http.post(url, body ? JSON.stringify(body) : null, options);
      case 'PUT':
        return http.put(url, body ? JSON.stringify(body) : null, options);
      case 'PATCH':
        return http.patch(url, body ? JSON.stringify(body) : null, options);
      case 'DELETE':
        return http.del(url, null, options);
      default:
        throw new Error(`Unsupported method: ${method}`);
    }
  }

  // Convenience methods
  get(endpoint) {
    return this.request('GET', endpoint);
  }

  post(endpoint, body) {
    return this.request('POST', endpoint, body);
  }

  put(endpoint, body) {
    return this.request('PUT', endpoint, body);
  }

  patch(endpoint, body) {
    return this.request('PATCH', endpoint, body);
  }

  delete(endpoint) {
    return this.request('DELETE', endpoint);
  }
}

// Authentication helper
export function authenticate(username, password) {
  const response = http.post(`${BASE_URL}/auth/login`, JSON.stringify({
    username,
    password,
  }), {
    headers: { 'Content-Type': 'application/json' },
  });

  const success = check(response, {
    'authentication successful': (r) => r.status === 200,
    'received token': (r) => r.json('token') !== undefined,
  });

  if (!success) {
    throw new Error('Authentication failed');
  }

  return response.json('token');
}
```

### Creating Check Helpers Module

```javascript
// lib/checks.js
import { check } from 'k6';

// Standard response checks
export function checkStatus(response, expectedStatus, name = 'status check') {
  return check(response, {
    [name]: (r) => r.status === expectedStatus,
  });
}

// Check for successful response (2xx)
export function checkSuccess(response) {
  return check(response, {
    'is successful (2xx)': (r) => r.status >= 200 && r.status < 300,
  });
}

// Check response time
export function checkResponseTime(response, maxDuration, name = 'response time') {
  return check(response, {
    [`${name} < ${maxDuration}ms`]: (r) => r.timings.duration < maxDuration,
  });
}

// Check JSON response structure
export function checkJsonStructure(response, requiredFields) {
  const json = response.json();
  const checks = {};

  requiredFields.forEach(field => {
    checks[`has field: ${field}`] = () => json[field] !== undefined;
  });

  return check(json, checks);
}

// Combined checks for API responses
export function checkApiResponse(response, options = {}) {
  const {
    status = 200,
    maxDuration = 500,
    requiredFields = [],
  } = options;

  let allPassed = true;

  allPassed = checkStatus(response, status) && allPassed;
  allPassed = checkResponseTime(response, maxDuration) && allPassed;

  if (requiredFields.length > 0) {
    allPassed = checkJsonStructure(response, requiredFields) && allPassed;
  }

  return allPassed;
}
```

### Using Modules in Test Script

```javascript
// test-script.js
import { sleep } from 'k6';
import { APIClient, authenticate } from './lib/api-client.js';
import { checkApiResponse, checkSuccess } from './lib/checks.js';

export const options = {
  vus: 20,
  duration: '5m',
  thresholds: {
    http_req_duration: ['p(95)<1000'],
    http_req_failed: ['rate<0.05'],
  },
};

export function setup() {
  const token = authenticate('testuser', 'testpass');
  return { token };
}

export default function (data) {
  const api = new APIClient(data.token);

  // Get users with comprehensive checks
  const usersResponse = api.get('/users');
  checkApiResponse(usersResponse, {
    status: 200,
    maxDuration: 500,
    requiredFields: ['id', 'email', 'name'],
  });

  // Create order
  const orderResponse = api.post('/orders', {
    items: [{ productId: 'prod-001', quantity: 1 }],
  });
  checkApiResponse(orderResponse, {
    status: 201,
    maxDuration: 1000,
    requiredFields: ['orderId', 'status'],
  });

  // Update order
  const orderId = orderResponse.json('orderId');
  const updateResponse = api.patch(`/orders/${orderId}`, {
    status: 'confirmed',
  });
  checkSuccess(updateResponse);

  sleep(1);
}
```

---

## Best Practices Summary

Writing effective k6 tests requires attention to both technical correctness and realistic test design. Here are key best practices to follow:

**Script Organization**
- Use modules to separate concerns and promote reusability
- Keep test data in external files using SharedArray for memory efficiency
- Use meaningful names for checks, groups, and custom metrics
- Document test scenarios and expected behaviors with comments

**Realistic Load Patterns**
- Add think time (sleep) between requests to simulate real user behavior
- Use ramping stages instead of instant load to avoid overwhelming systems
- Parameterize data to avoid cache hits and test real database performance
- Mix different user scenarios using scenarios with different executors

**Validation and Thresholds**
- Always validate responses with checks, not just status codes
- Set meaningful thresholds based on SLOs, not arbitrary numbers
- Use custom metrics to track business-specific measurements
- Monitor both success rates and latency percentiles

**Performance and Efficiency**
- Use http.batch() for parallel requests when appropriate
- Avoid loading large files in the default function; use setup() instead
- Use SharedArray for test data to minimize memory usage
- Keep the default function lightweight; move heavy logic to setup

**Debugging and Maintenance**
- Use groups to organize test flow and improve result readability
- Tag requests and metrics for granular analysis
- Export results to JSON for integration with CI/CD and monitoring tools
- Version control your test scripts alongside application code

---

## Conclusion

k6 provides a powerful, developer-friendly approach to load testing. By understanding script structure, leveraging modules for organization, and following best practices, you can create maintainable and effective performance tests that integrate seamlessly into your development workflow.

Start with simple scripts and gradually add complexity as you learn the tool. Use the built-in metrics and checks to validate behavior, and create custom metrics for business-specific measurements.

For monitoring your application performance in production and correlating load test results with real-world behavior, check out [OneUptime](https://oneuptime.com). OneUptime provides comprehensive observability including metrics, traces, and logs that help you understand how your application performs under actual load conditions.
