# How to Create Synthetic Monitoring Scripts for API Endpoints

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, CloudWatch, Synthetics, API, Monitoring

Description: Detailed guide to writing CloudWatch Synthetics canary scripts that test API endpoints with authentication, response validation, multi-step workflows, and error handling.

---

API synthetic monitoring goes beyond simple uptime checks. A good API canary validates that your endpoints return correct data, respond within acceptable timeframes, handle authentication properly, and maintain data integrity across multi-step workflows. It's essentially automated integration testing that runs continuously in production.

In this post, we'll build progressively more sophisticated API canary scripts using CloudWatch Synthetics. We'll cover authentication flows, response schema validation, multi-step API workflows, and error handling patterns that make your canaries reliable and informative.

## The Basic API Check

Let's start with the foundation. Every API canary uses `synthetics.executeHttpStep()` to make HTTP requests:

```javascript
const synthetics = require('Synthetics');
const log = require('SyntheticsLogger');

exports.handler = async () => {
  // Simple GET request with response validation
  await synthetics.executeHttpStep('GET /health', {
    hostname: 'api.example.com',
    path: '/health',
    port: 443,
    protocol: 'https:',
    method: 'GET',
    headers: {
      'Accept': 'application/json',
      'User-Agent': 'CloudWatch-Synthetics',
    },
  }, validateSuccessResponse);
};

// Reusable validation function
async function validateSuccessResponse(response) {
  const responseBody = await readResponseBody(response);

  // Check status code
  if (response.statusCode < 200 || response.statusCode >= 300) {
    throw new Error(`Expected 2xx, got ${response.statusCode}: ${responseBody}`);
  }

  // Check content type
  const contentType = response.headers['content-type'] || '';
  if (!contentType.includes('application/json')) {
    throw new Error(`Expected JSON content type, got: ${contentType}`);
  }

  // Parse and validate body
  let body;
  try {
    body = JSON.parse(responseBody);
  } catch (e) {
    throw new Error(`Invalid JSON response: ${responseBody.substring(0, 200)}`);
  }

  log.info(`Health check response: ${JSON.stringify(body)}`);
  return true;
}

function readResponseBody(response) {
  return new Promise((resolve) => {
    let responseBody = '';
    response.on('data', (chunk) => {
      responseBody += chunk;
    });
    response.on('end', () => resolve(responseBody));
  });
}
```

## Authentication Patterns

Most APIs require authentication. Here are common patterns for canary scripts.

### API Key Authentication

```javascript
const synthetics = require('Synthetics');
const log = require('SyntheticsLogger');
const { SecretsManagerClient, GetSecretValueCommand } = require('@aws-sdk/client-secrets-manager');

const secretsManager = new SecretsManagerClient({});

// Fetch API key from Secrets Manager (don't hardcode secrets)
async function getApiKey() {
  const secret = await secretsManager.send(new GetSecretValueCommand({
    SecretId: 'canary/api-key',
  }));
  return JSON.parse(secret.SecretString).apiKey;
}

exports.handler = async () => {
  const apiKey = await getApiKey();

  await synthetics.executeHttpStep('API Key Auth Test', {
    hostname: 'api.example.com',
    path: '/v1/orders',
    port: 443,
    protocol: 'https:',
    method: 'GET',
    headers: {
      'X-API-Key': apiKey,
      'Accept': 'application/json',
    },
  }, async (response) => {
    if (response.statusCode === 401 || response.statusCode === 403) {
      throw new Error('Authentication failed - check API key');
    }
    if (response.statusCode !== 200) {
      throw new Error(`Unexpected status: ${response.statusCode}`);
    }
  });
};
```

### OAuth2 / JWT Token Flow

```javascript
const synthetics = require('Synthetics');
const log = require('SyntheticsLogger');
const { SecretsManagerClient, GetSecretValueCommand } = require('@aws-sdk/client-secrets-manager');

const secretsManager = new SecretsManagerClient({});

let cachedToken = null;

async function getCredentials() {
  const secret = await secretsManager.send(new GetSecretValueCommand({
    SecretId: 'canary/oauth-credentials',
  }));
  return JSON.parse(secret.SecretString);
}

async function getAccessToken() {
  const creds = await getCredentials();
  const requestBody = new URLSearchParams({
    grant_type: 'client_credentials',
    client_id: creds.clientId,
    client_secret: creds.clientSecret,
  }).toString();

  // Step 1: Get an access token
  await synthetics.executeHttpStep('Get OAuth Token', {
    hostname: 'auth.example.com',
    path: '/oauth/token',
    port: 443,
    protocol: 'https:',
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: requestBody,
  }, async (response) => {
    const responseBody = await readResponseBody(response);
    if (response.statusCode !== 200) {
      throw new Error(`Token request failed: ${response.statusCode} ${responseBody}`);
    }
    const body = JSON.parse(responseBody);
    if (!body.access_token) {
      throw new Error('No access_token in response');
    }
    cachedToken = body.access_token;
    log.info('Successfully obtained access token');
  });

  return cachedToken;
}

exports.handler = async () => {
  const token = await getAccessToken();

  // Step 2: Use the token to call a protected endpoint
  await synthetics.executeHttpStep('Get Protected Resource', {
    hostname: 'api.example.com',
    path: '/v1/account/profile',
    port: 443,
    protocol: 'https:',
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/json',
    },
  }, async (response) => {
    const responseBody = await readResponseBody(response);
    if (response.statusCode !== 200) {
      throw new Error(`Protected endpoint failed: ${response.statusCode}`);
    }
    const body = JSON.parse(responseBody);
    if (!body.accountId) {
      throw new Error('Missing accountId in profile response');
    }
    log.info(`Profile retrieved for account: ${body.accountId}`);
  });
};

function readResponseBody(response) {
  return new Promise((resolve) => {
    let responseBody = '';
    response.on('data', (chunk) => {
      responseBody += chunk;
    });
    response.on('end', () => resolve(responseBody));
  });
}
```

## Response Schema Validation

Simply checking the status code isn't enough. Validate the response structure to catch breaking API changes:

```javascript
const synthetics = require('Synthetics');
const log = require('SyntheticsLogger');

// Simple schema validator (no external dependencies needed)
function validateSchema(data, schema, path = '') {
  for (const [key, rules] of Object.entries(schema)) {
    const fullPath = path ? `${path}.${key}` : key;
    const value = data[key];

    // Check required fields
    if (rules.required && (value === undefined || value === null)) {
      throw new Error(`Missing required field: ${fullPath}`);
    }

    if (value === undefined || value === null) continue;

    // Check type
    if (rules.type) {
      const actualType = Array.isArray(value) ? 'array' : typeof value;
      if (actualType !== rules.type) {
        throw new Error(`${fullPath}: expected ${rules.type}, got ${actualType}`);
      }
    }

    // Check minimum length for strings
    if (rules.minLength && typeof value === 'string' && value.length < rules.minLength) {
      throw new Error(`${fullPath}: string too short (${value.length} < ${rules.minLength})`);
    }

    // Check array item type
    if (rules.type === 'array' && rules.items && value.length > 0) {
      for (let i = 0; i < Math.min(value.length, 3); i++) {
        validateSchema(value[i], rules.items, `${fullPath}[${i}]`);
      }
    }
  }
}

exports.handler = async () => {
  await synthetics.executeHttpStep('Get Orders', {
    hostname: 'api.example.com',
    path: '/v1/orders?limit=5',
    port: 443,
    protocol: 'https:',
    method: 'GET',
    headers: { 'Accept': 'application/json' },
  }, async (response) => {
    if (response.statusCode !== 200) {
      throw new Error(`Expected 200, got ${response.statusCode}`);
    }

    const responseBody = await readResponseBody(response);
    const body = JSON.parse(responseBody);

    // Validate the response schema
    validateSchema(body, {
      orders: { required: true, type: 'array', items: {
        id: { required: true, type: 'string', minLength: 1 },
        status: { required: true, type: 'string' },
        total: { required: true, type: 'number' },
        createdAt: { required: true, type: 'string' },
      }},
      pagination: { required: true, type: 'object' },
    });

    log.info(`Schema validation passed. ${body.orders.length} orders returned.`);
  });
};

function readResponseBody(response) {
  return new Promise((resolve) => {
    let responseBody = '';
    response.on('data', (chunk) => {
      responseBody += chunk;
    });
    response.on('end', () => resolve(responseBody));
  });
}
```

## Multi-Step API Workflow

Test a complete workflow that spans multiple API calls:

```javascript
const synthetics = require('Synthetics');
const log = require('SyntheticsLogger');

exports.handler = async () => {
  let productId, orderId;

  // Step 1: List available products
  await synthetics.executeHttpStep('List Products', {
    hostname: 'api.example.com',
    path: '/v1/products?available=true&limit=1',
    port: 443,
    protocol: 'https:',
    method: 'GET',
    headers: { 'Accept': 'application/json' },
  }, async (response) => {
    if (response.statusCode !== 200) throw new Error(`List products failed: ${response.statusCode}`);
    const responseBody = await readResponseBody(response);
    const body = JSON.parse(responseBody);
    if (!body.products || body.products.length === 0) {
      throw new Error('No available products found');
    }
    productId = body.products[0].id;
    log.info(`Found product: ${productId}`);
  });

  // Step 2: Create a test order
  await synthetics.executeHttpStep('Create Order', {
    hostname: 'api.example.com',
    path: '/v1/orders',
    port: 443,
    protocol: 'https:',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'X-Test-Order': 'true',  // Flag so your system knows this is synthetic
    },
    body: JSON.stringify({
      items: [{ productId: productId, quantity: 1 }],
      testMode: true,
    }),
  }, async (response) => {
    const responseBody = await readResponseBody(response);
    if (response.statusCode !== 201) {
      throw new Error(`Create order failed: ${response.statusCode} - ${responseBody}`);
    }
    const body = JSON.parse(responseBody);
    orderId = body.orderId;
    log.info(`Created test order: ${orderId}`);
  });

  // Step 3: Verify the order was created correctly
  await synthetics.executeHttpStep('Get Order Details', {
    hostname: 'api.example.com',
    path: `/v1/orders/${orderId}`,
    port: 443,
    protocol: 'https:',
    method: 'GET',
    headers: { 'Accept': 'application/json' },
  }, async (response) => {
    if (response.statusCode !== 200) {
      throw new Error(`Get order failed: ${response.statusCode}`);
    }
    const responseBody = await readResponseBody(response);
    const body = JSON.parse(responseBody);
    if (body.orderId !== orderId) {
      throw new Error(`Order ID mismatch: ${body.orderId} vs ${orderId}`);
    }
    if (body.status !== 'pending' && body.status !== 'created') {
      throw new Error(`Unexpected order status: ${body.status}`);
    }
    log.info(`Order ${orderId} verified: status=${body.status}`);
  });

  // Step 4: Cancel the test order (cleanup)
  await synthetics.executeHttpStep('Cancel Test Order', {
    hostname: 'api.example.com',
    path: `/v1/orders/${orderId}/cancel`,
    port: 443,
    protocol: 'https:',
    method: 'POST',
    headers: { 'Accept': 'application/json' },
  }, async (response) => {
    if (response.statusCode !== 200 && response.statusCode !== 204) {
      log.warn(`Cleanup failed - order ${orderId} may need manual cancellation`);
    } else {
      log.info(`Test order ${orderId} cancelled successfully`);
    }
  });
};

function readResponseBody(response) {
  return new Promise((resolve) => {
    let responseBody = '';
    response.on('data', (chunk) => {
      responseBody += chunk;
    });
    response.on('end', () => resolve(responseBody));
  });
}
```

## Performance Validation

Add latency thresholds to catch performance regressions:

```javascript
const synthetics = require('Synthetics');
const log = require('SyntheticsLogger');

const LATENCY_THRESHOLDS = {
  '/health': 500,            // 500ms max for health check
  '/v1/orders': 2000,        // 2s max for orders list
  '/v1/search': 3000,        // 3s max for search
};

async function testEndpointPerformance(name, path, maxLatencyMs) {
  const startTime = Date.now();

  await synthetics.executeHttpStep(name, {
    hostname: 'api.example.com',
    path: path,
    port: 443,
    protocol: 'https:',
    method: 'GET',
    headers: { 'Accept': 'application/json' },
  }, async (response) => {
    const latency = Date.now() - startTime;

    if (response.statusCode !== 200) {
      throw new Error(`${name} returned ${response.statusCode}`);
    }

    if (latency > maxLatencyMs) {
      throw new Error(`${name} too slow: ${latency}ms (max: ${maxLatencyMs}ms)`);
    }

    log.info(`${name}: ${latency}ms (limit: ${maxLatencyMs}ms) - PASS`);
  });
}

exports.handler = async () => {
  for (const [path, threshold] of Object.entries(LATENCY_THRESHOLDS)) {
    await testEndpointPerformance(`GET ${path}`, path, threshold);
  }
};
```

## Python API Canary

If you prefer Python, CloudWatch Synthetics supports it too:

```python
from aws_synthetics.common import synthetics_logger as logger
import json
import time
import urllib.error
import urllib.parse
import urllib.request

def api_canary():
    base_url = "https://api.example.com"

    # Step 1: Health check
    logger.info("Step 1: Health check")
    start = time.time()
    response = http_get(f"{base_url}/health")
    latency = (time.time() - start) * 1000

    assert response["status"] == 200, f"Health check failed: {response['status']}"
    body = json.loads(response["body"])
    assert body.get("status") == "healthy", f"Service unhealthy: {body}"
    logger.info(f"Health check passed in {latency:.0f}ms")

    # Step 2: API endpoint test
    logger.info("Step 2: Get products")
    query = urllib.parse.urlencode({"limit": 5})
    response = http_get(f"{base_url}/v1/products?{query}", headers={"Accept": "application/json"})
    assert response["status"] == 200, f"Products endpoint failed: {response['status']}"
    products = json.loads(response["body"])
    assert "products" in products, "Missing products key in response"
    assert len(products["products"]) > 0, "No products returned"
    logger.info(f"Retrieved {len(products['products'])} products")

def http_get(url, headers=None):
    request = urllib.request.Request(url, headers=headers or {}, method="GET")
    try:
        response = urllib.request.urlopen(request, timeout=10)
    except urllib.error.HTTPError as response:
        pass
    with response:
        return {
            "status": response.status,
            "body": response.read().decode("utf-8"),
        }

def handler(event, context):
    api_canary()
```

## Canary Best Practices

A few things to keep in mind when writing API canaries:

**Use a dedicated test account**: Don't use your personal credentials. Create a service account specifically for synthetic monitoring with minimal permissions.

**Flag synthetic traffic**: Add a header like `X-Synthetic-Test: true` or `User-Agent: CloudWatch-Synthetics` so you can filter this traffic out of your analytics.

**Clean up after yourself**: If your canary creates resources (test orders, test users), make sure it deletes them. Accumulating test data is a common problem.

**Don't test everything**: A canary should test critical paths, not every endpoint. If you have 50 API endpoints, pick the 5-10 most important ones.

**Keep secrets in Secrets Manager**: Never hardcode API keys, tokens, or passwords in canary scripts. Use AWS Secrets Manager and fetch them at runtime.

**Set appropriate timeouts**: If you don't specify a timeout, CloudWatch Synthetics chooses one based on the canary's frequency. For API canaries testing multiple endpoints, configure enough time for all steps and keep the timeout at least 15 seconds to allow for Lambda cold starts and canary instrumentation startup.

## Wrapping Up

API synthetic monitoring is your early warning system for production issues. A well-designed canary catches problems in minutes, not hours. Start with health checks, add response validation, then build up to multi-step workflow tests. Keep your canaries focused, fast, and reliable - a flaky canary that triggers false alarms is worse than no canary at all. For the fundamentals of setting up canaries, see our [CloudWatch Synthetics setup guide](https://oneuptime.com/blog/post/2026-02-12-cloudwatch-synthetics-canaries/view). For browser-based testing, check out [synthetic monitoring scripts for website flows](https://oneuptime.com/blog/post/2026-02-12-synthetic-monitoring-scripts-website-flows/view).
