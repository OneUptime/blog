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

```javascript
const nock = require('nock');
const { StripeClient } = require('../src/stripe-client');

describe('StripeClient', () => {
  afterEach(() => {
    nock.cleanAll();
  });

  it('should create a customer', async () => {
    // Mock the Stripe API
    nock('https://api.stripe.com')
      .post('/v1/customers')
      .reply(200, {
        id: 'cus_test123',
        email: 'test@example.com',
        created: Date.now(),
      });

    const client = new StripeClient('sk_test_xxx');
    const customer = await client.createCustomer({ email: 'test@example.com' });

    expect(customer.id).toBe('cus_test123');
  });

  it('should handle API errors', async () => {
    nock('https://api.stripe.com')
      .post('/v1/customers')
      .reply(400, {
        error: {
          type: 'invalid_request_error',
          message: 'Invalid email address',
        },
      });

    const client = new StripeClient('sk_test_xxx');

    await expect(client.createCustomer({ email: 'invalid' }))
      .rejects.toThrow('Invalid email address');
  });
});
```

### Request Matching

```javascript
// Match specific request body
nock('https://api.example.com')
  .post('/users', {
    email: 'test@example.com',
    name: 'Test User',
  })
  .reply(201, { id: 1 });

// Match with function
nock('https://api.example.com')
  .post('/users', (body) => {
    return body.email && body.email.includes('@');
  })
  .reply(201, { id: 1 });

// Match headers
nock('https://api.example.com', {
  reqheaders: {
    'Authorization': 'Bearer token123',
    'Content-Type': 'application/json',
  },
})
  .get('/protected')
  .reply(200, { data: 'secret' });

// Match query parameters
nock('https://api.example.com')
  .get('/users')
  .query({ page: 1, limit: 10 })
  .reply(200, { users: [] });
```

### Dynamic Responses

```javascript
// Response based on request
nock('https://api.example.com')
  .post('/echo')
  .reply((uri, requestBody) => {
    return [200, { received: requestBody }];
  });

// Delayed response
nock('https://api.example.com')
  .get('/slow')
  .delay(2000)
  .reply(200, { data: 'slow response' });

// Sequential responses
nock('https://api.example.com')
  .get('/counter')
  .reply(200, { count: 1 })
  .get('/counter')
  .reply(200, { count: 2 })
  .get('/counter')
  .reply(200, { count: 3 });

// Persist mock (don't consume after first match)
nock('https://api.example.com')
  .persist()
  .get('/always')
  .reply(200, { always: true });
```

## MSW (Mock Service Worker)

MSW provides a more modern approach with better TypeScript support:

```bash
npm install msw --save-dev
```

### Setup

```javascript
// tests/mocks/server.js
const { setupServer } = require('msw/node');
const { rest } = require('msw');

// Define handlers
const handlers = [
  rest.post('https://api.stripe.com/v1/customers', (req, res, ctx) => {
    return res(
      ctx.json({
        id: 'cus_test123',
        email: req.body.email,
        created: Date.now(),
      })
    );
  }),

  rest.get('https://api.github.com/users/:username', (req, res, ctx) => {
    const { username } = req.params;
    return res(
      ctx.json({
        login: username,
        id: 12345,
        name: 'Test User',
      })
    );
  }),
];

const server = setupServer(...handlers);

module.exports = { server, rest };
```

```javascript
// tests/setup.js
const { server } = require('./mocks/server');

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
```

### Test-Specific Overrides

```javascript
const { server, rest } = require('./mocks/server');

describe('GitHub API', () => {
  it('should fetch user profile', async () => {
    const user = await fetchGitHubUser('octocat');
    expect(user.login).toBe('octocat');
  });

  it('should handle not found', async () => {
    // Override for this test only
    server.use(
      rest.get('https://api.github.com/users/:username', (req, res, ctx) => {
        return res(ctx.status(404), ctx.json({ message: 'Not Found' }));
      })
    );

    await expect(fetchGitHubUser('nonexistent'))
      .rejects.toThrow('User not found');
  });

  it('should handle rate limiting', async () => {
    server.use(
      rest.get('https://api.github.com/users/:username', (req, res, ctx) => {
        return res(
          ctx.status(429),
          ctx.set('Retry-After', '60'),
          ctx.json({ message: 'API rate limit exceeded' })
        );
      })
    );

    await expect(fetchGitHubUser('octocat'))
      .rejects.toThrow('Rate limited');
  });
});
```

## Recording and Replaying API Calls

Record real API responses for use in tests:

```javascript
// Record mode
const nock = require('nock');

// Start recording
nock.recorder.rec({
  output_objects: true,
  dont_print: true,
});

// Make real API calls
await realApiCall();

// Get recorded calls
const recordings = nock.recorder.play();
console.log(JSON.stringify(recordings, null, 2));

// Save to file
require('fs').writeFileSync(
  'tests/fixtures/api-recordings.json',
  JSON.stringify(recordings, null, 2)
);
```

```javascript
// Replay recorded calls
const recordings = require('./fixtures/api-recordings.json');

beforeEach(() => {
  nock.define(recordings);
});

afterEach(() => {
  nock.cleanAll();
});
```

## Dependency Injection Pattern

For better testability, inject API clients:

```javascript
// src/services/payment-service.js
class PaymentService {
  constructor(stripeClient) {
    this.stripe = stripeClient;
  }

  async processPayment(amount, customerId) {
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

```javascript
// tests/payment-service.test.js
const { PaymentService } = require('../src/services/payment-service');

describe('PaymentService', () => {
  it('should process payment', async () => {
    // Create mock client
    const mockStripe = {
      charges: {
        create: jest.fn().mockResolvedValue({
          id: 'ch_test123',
          amount: 1000,
          status: 'succeeded',
        }),
      },
    };

    const service = new PaymentService(mockStripe);
    const result = await service.processPayment(1000, 'cus_123');

    expect(result.chargeId).toBe('ch_test123');
    expect(result.status).toBe('succeeded');
    expect(mockStripe.charges.create).toHaveBeenCalledWith({
      amount: 1000,
      currency: 'usd',
      customer: 'cus_123',
    });
  });

  it('should handle payment failure', async () => {
    const mockStripe = {
      charges: {
        create: jest.fn().mockRejectedValue(new Error('Card declined')),
      },
    };

    const service = new PaymentService(mockStripe);

    await expect(service.processPayment(1000, 'cus_123'))
      .rejects.toThrow('Card declined');
  });
});
```

## Creating Realistic Mock Data

```javascript
// tests/fixtures/stripe.js
const { faker } = require('@faker-js/faker');

function createStripeCustomer(overrides = {}) {
  return {
    id: `cus_${faker.string.alphanumeric(14)}`,
    object: 'customer',
    email: faker.internet.email(),
    name: faker.person.fullName(),
    created: Math.floor(Date.now() / 1000),
    livemode: false,
    metadata: {},
    ...overrides,
  };
}

function createStripeCharge(overrides = {}) {
  return {
    id: `ch_${faker.string.alphanumeric(24)}`,
    object: 'charge',
    amount: faker.number.int({ min: 100, max: 100000 }),
    currency: 'usd',
    status: 'succeeded',
    paid: true,
    created: Math.floor(Date.now() / 1000),
    ...overrides,
  };
}

function createStripeError(type, message, code = null) {
  return {
    error: {
      type,
      message,
      code,
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

```javascript
const crypto = require('crypto');

function createStripeWebhookSignature(payload, secret) {
  const timestamp = Math.floor(Date.now() / 1000);
  const signedPayload = `${timestamp}.${payload}`;
  const signature = crypto
    .createHmac('sha256', secret)
    .update(signedPayload)
    .digest('hex');

  return `t=${timestamp},v1=${signature}`;
}

describe('Stripe Webhook Handler', () => {
  const webhookSecret = 'whsec_test123';

  it('should handle payment_intent.succeeded', async () => {
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

    const payload = JSON.stringify(event);
    const signature = createStripeWebhookSignature(payload, webhookSecret);

    const response = await request(app)
      .post('/webhooks/stripe')
      .set('Stripe-Signature', signature)
      .send(payload)
      .expect(200);

    expect(response.body.received).toBe(true);
  });

  it('should reject invalid signature', async () => {
    const event = { type: 'fake.event' };

    await request(app)
      .post('/webhooks/stripe')
      .set('Stripe-Signature', 'invalid')
      .send(event)
      .expect(400);
  });
});
```

## Snapshot Testing for API Responses

```javascript
describe('API Response Shapes', () => {
  it('should match expected customer shape', async () => {
    nock('https://api.stripe.com')
      .get('/v1/customers/cus_123')
      .reply(200, createStripeCustomer({ id: 'cus_123' }));

    const customer = await stripeClient.customers.retrieve('cus_123');

    // Compare against saved snapshot
    expect(customer).toMatchSnapshot({
      id: expect.any(String),
      created: expect.any(Number),
      email: expect.any(String),
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

```javascript
afterEach(() => {
  // Verify all mocks were used
  if (!nock.isDone()) {
    const pending = nock.pendingMocks();
    nock.cleanAll();
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
