# How to Mock External APIs in Node.js Tests Without Flaky Network Calls

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: NodeJS, Tests, API, DevOps

Description: Learn to mock external APIs in Node.js tests using nock and MSW patterns to eliminate flaky network calls while maintaining realistic test scenarios.

---

External API calls make tests slow, flaky, and dependent on third-party availability. Your tests shouldn't fail because Stripe is having an outage or because your CI runner has network issues. This guide covers techniques for mocking external APIs while keeping tests realistic and maintainable.

## The Problem with Real API Calls in Tests

| Issue | Impact |
|-------|--------|
| **Network latency** | Slow tests |
| **Rate limits** | CI failures |
| **Service outages** | False negatives |
| **Cost** | API charges |
| **Data pollution** | Test data in production |
| **Non-deterministic** | Flaky results |

## Nock: HTTP Request Interception

Nock intercepts HTTP requests at the Node.js level:

```bash
npm install nock --save-dev
```

### Basic Usage

This example shows how to mock the Stripe API to test customer creation without making real HTTP requests. The mock intercepts requests to the specified URL and returns the predefined response.

```javascript
const nock = require('nock');
const { StripeClient } = require('../src/stripe-client');

describe('StripeClient', () => {
  // Clean up mocks after each test to prevent test pollution
  afterEach(() => {
    nock.cleanAll();
  });

  it('should create a customer', async () => {
    // Set up mock BEFORE making the request
    // Nock intercepts HTTP requests at the Node.js level
    nock('https://api.stripe.com')
      .post('/v1/customers')       // Match POST requests to this path
      .reply(200, {                // Return this response
        id: 'cus_test123',
        email: 'test@example.com',
        created: Date.now(),
      });

    // Now make the actual call - it will hit our mock, not Stripe
    const client = new StripeClient('sk_test_xxx');
    const customer = await client.createCustomer({ email: 'test@example.com' });

    // Assert against the mocked response
    expect(customer.id).toBe('cus_test123');
  });

  it('should handle API errors', async () => {
    // Mock an error response to test error handling
    nock('https://api.stripe.com')
      .post('/v1/customers')
      .reply(400, {                // 400 Bad Request
        error: {
          type: 'invalid_request_error',
          message: 'Invalid email address',
        },
      });

    const client = new StripeClient('sk_test_xxx');

    // Verify our code properly handles API errors
    await expect(client.createCustomer({ email: 'invalid' }))
      .rejects.toThrow('Invalid email address');
  });
});
```

### Request Matching

Nock can match requests based on body, headers, and query parameters. This ensures your mocks only respond when the request matches expected criteria, catching bugs where your code sends incorrect data.

```javascript
// Match specific request body - only matches if body exactly matches
nock('https://api.example.com')
  .post('/users', {
    email: 'test@example.com',
    name: 'Test User',
  })
  .reply(201, { id: 1 });

// Match with function for flexible validation
// Useful when you only care about certain fields
nock('https://api.example.com')
  .post('/users', (body) => {
    // Return true if request should match, false otherwise
    return body.email && body.email.includes('@');
  })
  .reply(201, { id: 1 });

// Match headers - verify auth tokens and content types
nock('https://api.example.com', {
  reqheaders: {
    'Authorization': 'Bearer token123',   // Must have correct auth
    'Content-Type': 'application/json',   // Must send JSON
  },
})
  .get('/protected')
  .reply(200, { data: 'secret' });

// Match query parameters - verify pagination, filters
nock('https://api.example.com')
  .get('/users')
  .query({ page: 1, limit: 10 })  // Match ?page=1&limit=10
  .reply(200, { users: [] });
```

### Dynamic Responses

Sometimes you need responses that vary based on the request, simulate delays, or return different values on successive calls. These patterns help test retry logic, pagination, and timeout handling.

```javascript
// Response based on request - echo the request body back
nock('https://api.example.com')
  .post('/echo')
  .reply((uri, requestBody) => {
    // Return [statusCode, responseBody]
    return [200, { received: requestBody }];
  });

// Delayed response - test timeout handling
nock('https://api.example.com')
  .get('/slow')
  .delay(2000)  // Wait 2 seconds before responding
  .reply(200, { data: 'slow response' });

// Sequential responses - each call returns next response in sequence
// Useful for testing pagination or retry logic
nock('https://api.example.com')
  .get('/counter')
  .reply(200, { count: 1 })  // First call
  .get('/counter')
  .reply(200, { count: 2 })  // Second call
  .get('/counter')
  .reply(200, { count: 3 }); // Third call

// Persist mock - responds to unlimited requests (doesn't consume)
// Useful when multiple parts of your code call the same endpoint
nock('https://api.example.com')
  .persist()                   // Don't remove after first match
  .get('/always')
  .reply(200, { always: true });
```

## MSW (Mock Service Worker)

MSW provides a more modern approach with better TypeScript support:

```bash
npm install msw --save-dev
```

### Setup

MSW uses a centralized handler configuration. Define your default mocks in one place, then override them in specific tests as needed.

```javascript
// tests/mocks/server.js
const { setupServer } = require('msw/node');
const { rest } = require('msw');

// Define default handlers for all tests
// These simulate "happy path" responses
const handlers = [
  // Stripe customer creation
  rest.post('https://api.stripe.com/v1/customers', (req, res, ctx) => {
    return res(
      ctx.json({
        id: 'cus_test123',
        email: req.body.email,
        created: Date.now(),
      })
    );
  }),

  // GitHub user lookup - :username is a URL parameter
  rest.get('https://api.github.com/users/:username', (req, res, ctx) => {
    const { username } = req.params;  // Extract from URL
    return res(
      ctx.json({
        login: username,
        id: 12345,
        name: 'Test User',
      })
    );
  }),
];

// Create server instance with default handlers
const server = setupServer(...handlers);

module.exports = { server, rest };
```

Configure Jest to start/stop the MSW server for all tests:

```javascript
// tests/setup.js
const { server } = require('./mocks/server');

// Start server before all tests
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));  // Error on unmocked requests

// Reset handlers after each test (removes test-specific overrides)
afterEach(() => server.resetHandlers());

// Stop server after all tests complete
afterAll(() => server.close());
```

### Test-Specific Overrides

Use `server.use()` to override default handlers for specific tests. This pattern lets you test error conditions and edge cases without modifying your default handlers. Overrides are automatically reset after each test.

```javascript
const { server, rest } = require('./mocks/server');

describe('GitHub API', () => {
  // Uses default handler - returns successful response
  it('should fetch user profile', async () => {
    const user = await fetchGitHubUser('octocat');
    expect(user.login).toBe('octocat');
  });

  // Override default handler to simulate 404 error
  it('should handle not found', async () => {
    // This handler takes precedence over the default
    server.use(
      rest.get('https://api.github.com/users/:username', (req, res, ctx) => {
        return res(ctx.status(404), ctx.json({ message: 'Not Found' }));
      })
    );

    // Test that our code handles 404 correctly
    await expect(fetchGitHubUser('nonexistent'))
      .rejects.toThrow('User not found');
  });

  // Override to test rate limiting behavior
  it('should handle rate limiting', async () => {
    server.use(
      rest.get('https://api.github.com/users/:username', (req, res, ctx) => {
        return res(
          ctx.status(429),                        // 429 Too Many Requests
          ctx.set('Retry-After', '60'),           // Header indicating retry time
          ctx.json({ message: 'API rate limit exceeded' })
        );
      })
    );

    // Verify our code detects and handles rate limiting
    await expect(fetchGitHubUser('octocat'))
      .rejects.toThrow('Rate limited');
  });
});
```

## Recording and Replaying API Calls

Instead of manually creating mock responses, record real API responses once and replay them in tests. This ensures your mocks accurately reflect the real API's response format.

```javascript
// Record mode - run this once to capture real responses
const nock = require('nock');

// Enable recording mode
nock.recorder.rec({
  output_objects: true,  // Output as nock-compatible objects
  dont_print: true,      // Don't log to console
});

// Make real API calls (this hits the actual API)
await realApiCall();

// Get recorded calls as nock-compatible objects
const recordings = nock.recorder.play();
console.log(JSON.stringify(recordings, null, 2));

// Save recordings to a fixture file for future tests
require('fs').writeFileSync(
  'tests/fixtures/api-recordings.json',
  JSON.stringify(recordings, null, 2)
);
```

Load and replay the recorded responses in your tests:

```javascript
// Replay recorded calls - load fixtures and use as mocks
const recordings = require('./fixtures/api-recordings.json');

beforeEach(() => {
  // Load recorded responses as nock mocks
  nock.define(recordings);
});

afterEach(() => {
  nock.cleanAll();
});
```

## Dependency Injection Pattern

Dependency injection makes testing easier by allowing you to swap real API clients with mocks. Instead of importing the Stripe SDK directly, pass it as a constructor parameter.

```javascript
// src/services/payment-service.js
class PaymentService {
  // Accept API client as a dependency instead of creating it internally
  constructor(stripeClient) {
    this.stripe = stripeClient;
  }

  async processPayment(amount, customerId) {
    // Uses injected client - easy to mock in tests
    const charge = await this.stripe.charges.create({
      amount,
      currency: 'usd',
      customer: customerId,
    });

    return {
      chargeId: charge.id,
      amount: charge.amount,
      status: charge.status,
    };
  }
}

module.exports = { PaymentService };
```

Now testing is simple - just inject a mock object:

```javascript
// tests/payment-service.test.js
const { PaymentService } = require('../src/services/payment-service');

describe('PaymentService', () => {
  it('should process payment', async () => {
    // Create a mock that mimics Stripe's API structure
    const mockStripe = {
      charges: {
        // Mock the create method to return a successful charge
        create: jest.fn().mockResolvedValue({
          id: 'ch_test123',
          amount: 1000,
          status: 'succeeded',
        }),
      },
    };

    // Inject mock instead of real Stripe client
    const service = new PaymentService(mockStripe);
    const result = await service.processPayment(1000, 'cus_123');

    // Assert on result
    expect(result.chargeId).toBe('ch_test123');
    expect(result.status).toBe('succeeded');

    // Verify correct arguments were passed to Stripe
    expect(mockStripe.charges.create).toHaveBeenCalledWith({
      amount: 1000,
      currency: 'usd',
      customer: 'cus_123',
    });
  });

  it('should handle payment failure', async () => {
    // Mock a failed charge
    const mockStripe = {
      charges: {
        create: jest.fn().mockRejectedValue(new Error('Card declined')),
      },
    };

    const service = new PaymentService(mockStripe);

    // Verify error is propagated correctly
    await expect(service.processPayment(1000, 'cus_123'))
      .rejects.toThrow('Card declined');
  });
});
```

## Creating Realistic Mock Data

Use factory functions to generate realistic test data that matches the API's actual response format. This catches edge cases and ensures your code handles real data correctly.

```javascript
// tests/fixtures/stripe.js
const { faker } = require('@faker-js/faker');

// Factory function for Stripe customer objects
// Generates realistic data with proper ID format and structure
function createStripeCustomer(overrides = {}) {
  return {
    id: `cus_${faker.string.alphanumeric(14)}`,  // Matches Stripe ID format
    object: 'customer',
    email: faker.internet.email(),
    name: faker.person.fullName(),
    created: Math.floor(Date.now() / 1000),  // Unix timestamp
    livemode: false,                          // Always false in test mode
    metadata: {},
    ...overrides,  // Allow tests to override specific fields
  };
}

// Factory function for Stripe charge objects
function createStripeCharge(overrides = {}) {
  return {
    id: `ch_${faker.string.alphanumeric(24)}`,  // Charge IDs are longer
    object: 'charge',
    amount: faker.number.int({ min: 100, max: 100000 }),  // Amount in cents
    currency: 'usd',
    status: 'succeeded',
    paid: true,
    created: Math.floor(Date.now() / 1000),
    ...overrides,
  };
}

// Factory function for Stripe error responses
function createStripeError(type, message, code = null) {
  return {
    error: {
      type,      // e.g., 'card_error', 'invalid_request_error'
      message,   // Human-readable error message
      code,      // Machine-readable error code
      doc_url: `https://stripe.com/docs/error-codes/${code || 'generic'}`,
    },
  };
}

module.exports = {
  createStripeCustomer,
  createStripeCharge,
  createStripeError,
};
```

## Testing Webhooks

Webhooks require valid signatures for security. Create a helper function to generate valid signatures for test events, allowing you to test your webhook handler without relying on Stripe.

```javascript
const crypto = require('crypto');

// Generate a valid Stripe webhook signature
// Stripe uses HMAC-SHA256 with timestamp to prevent replay attacks
function createStripeWebhookSignature(payload, secret) {
  const timestamp = Math.floor(Date.now() / 1000);
  const signedPayload = `${timestamp}.${payload}`;  // Format: timestamp.payload

  // Generate HMAC signature using webhook secret
  const signature = crypto
    .createHmac('sha256', secret)
    .update(signedPayload)
    .digest('hex');

  // Return in Stripe's expected format
  return `t=${timestamp},v1=${signature}`;
}

describe('Stripe Webhook Handler', () => {
  const webhookSecret = 'whsec_test123';

  it('should handle payment_intent.succeeded', async () => {
    // Create a test webhook event
    const event = {
      id: 'evt_test123',
      type: 'payment_intent.succeeded',
      data: {
        object: {
          id: 'pi_test123',
          amount: 1000,
          status: 'succeeded',
        },
      },
    };

    // Generate valid signature for the payload
    const payload = JSON.stringify(event);
    const signature = createStripeWebhookSignature(payload, webhookSecret);

    // Send webhook request with valid signature
    const response = await request(app)
      .post('/webhooks/stripe')
      .set('Stripe-Signature', signature)  // Include signature header
      .send(payload)
      .expect(200);

    expect(response.body.received).toBe(true);
  });

  it('should reject invalid signature', async () => {
    // Webhooks without valid signatures should be rejected
    const event = { type: 'fake.event' };

    await request(app)
      .post('/webhooks/stripe')
      .set('Stripe-Signature', 'invalid')  // Invalid signature
      .send(event)
      .expect(400);  // Should reject with 400 Bad Request
  });
});
```

## Snapshot Testing for API Responses

Snapshot testing captures the structure of API responses and alerts you when it changes. Use property matchers for dynamic fields like IDs and timestamps.

```javascript
describe('API Response Shapes', () => {
  it('should match expected customer shape', async () => {
    // Set up mock with realistic data
    nock('https://api.stripe.com')
      .get('/v1/customers/cus_123')
      .reply(200, createStripeCustomer({ id: 'cus_123' }));

    const customer = await stripeClient.customers.retrieve('cus_123');

    // Snapshot with property matchers for dynamic values
    // Dynamic fields use matchers, static structure is captured in snapshot
    expect(customer).toMatchSnapshot({
      id: expect.any(String),       // ID format varies
      created: expect.any(Number),  // Timestamp varies
      email: expect.any(String),    // Email varies with faker
    });
  });
});
```

## Best Practices

| Practice | Why |
|----------|-----|
| **Clean up mocks** | Prevent test pollution |
| **Verify all mocks used** | Catch unused/wrong mocks |
| **Use realistic data** | Catch edge cases |
| **Test error paths** | Real APIs fail |
| **Mock at boundaries** | Not internal functions |
| **Timeout testing** | Verify timeout handling |

Add this to your test setup to catch common mocking mistakes:

```javascript
afterEach(() => {
  // Verify all mocks were actually called
  // Catches bugs where your code didn't make expected API calls
  if (!nock.isDone()) {
    const pending = nock.pendingMocks();
    nock.cleanAll();
    // Fail the test if mocks weren't used
    throw new Error(`Pending mocks: ${pending.join(', ')}`);
  }
});
```

## Summary

| Tool | Best For |
|------|----------|
| **nock** | HTTP request interception, recording |
| **MSW** | Modern API, browser/node support |
| **Jest mocks** | Injected dependencies |
| **Fixtures** | Realistic test data |

Mocking external APIs eliminates flakiness and speeds up your test suite dramatically. The key is finding the right balance between isolation (mocks) and realism (recorded responses, realistic fixtures).
