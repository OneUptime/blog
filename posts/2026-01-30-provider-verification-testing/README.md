# How to Create Provider Verification

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Testing, Contract Testing, Pact, Verification

Description: A practical guide to implementing provider verification with Pact, covering contract verification, provider states, and pending pacts for reliable microservices testing.

---

Contract testing flips traditional API testing on its head. Instead of consumers hoping providers don't break them, providers verify they meet the expectations consumers have recorded. This guide walks through setting up provider verification with Pact, handling provider states, and managing the evolution of contracts over time.

## Why Provider Verification Matters

| Traditional API Testing | Contract Testing with Provider Verification |
|------------------------|---------------------------------------------|
| Consumer hopes API doesn't change | Provider proves it meets consumer expectations |
| Integration tests catch issues late | Verification catches issues at build time |
| Requires running all services | Runs against recorded contracts |
| Slow feedback loop | Fast, isolated verification |
| Unclear who broke what | Clear ownership and accountability |

## The Verification Workflow

Provider verification runs on the provider's CI pipeline. The provider fetches contracts published by consumers and verifies its implementation satisfies each interaction.

```mermaid
sequenceDiagram
    participant Consumer
    participant Broker as Pact Broker
    participant Provider

    Consumer->>Broker: Publish contract (pact file)
    Note over Consumer,Broker: Consumer defines expectations

    Provider->>Broker: Fetch contracts for verification
    Broker->>Provider: Return consumer contracts

    loop Each interaction
        Provider->>Provider: Set up provider state
        Provider->>Provider: Replay request
        Provider->>Provider: Compare response
    end

    Provider->>Broker: Publish verification result
    Note over Broker: Tracks which versions are compatible
```

## Setting Up Provider Verification

Install the Pact provider verification library:

```bash
npm install @pact-foundation/pact --save-dev
```

### Basic Provider Verification

The simplest verification setup fetches pacts from a broker and runs them against your provider:

```javascript
// tests/provider.pact.test.js
const { Verifier } = require('@pact-foundation/pact');
const { app } = require('../src/app');

describe('Provider Verification', () => {
  let server;

  // Start your actual provider service before verification
  beforeAll(async () => {
    server = app.listen(3000);
  });

  afterAll(async () => {
    server.close();
  });

  it('validates the expectations of the order-service consumer', async () => {
    const verifier = new Verifier({
      // URL where your provider is running
      providerBaseUrl: 'http://localhost:3000',

      // Provider name must match what consumers use
      provider: 'inventory-service',

      // Pact Broker configuration
      pactBrokerUrl: process.env.PACT_BROKER_URL,
      pactBrokerToken: process.env.PACT_BROKER_TOKEN,

      // Only verify pacts from specific consumers
      consumerVersionSelectors: [
        { mainBranch: true },           // Main branch of consumers
        { deployedOrReleased: true },   // Currently deployed versions
      ],

      // Publish verification results back to broker
      publishVerificationResult: true,
      providerVersion: process.env.GIT_COMMIT_SHA,
      providerVersionBranch: process.env.GIT_BRANCH,
    });

    await verifier.verifyProvider();
  });
});
```

### Running Verification

```bash
# Set environment variables
export PACT_BROKER_URL=https://your-broker.pactflow.io
export PACT_BROKER_TOKEN=your-token
export GIT_COMMIT_SHA=$(git rev-parse HEAD)
export GIT_BRANCH=$(git branch --show-current)

# Run verification
npm test -- tests/provider.pact.test.js
```

## Provider States

Provider states let consumers specify preconditions for interactions. The consumer says "given a user exists with ID 123" and the provider sets up that state before replaying the request.

```mermaid
flowchart TD
    A[Pact Interaction] --> B{Has Provider State?}
    B -->|Yes| C[Call State Handler]
    B -->|No| D[Skip State Setup]
    C --> E[Set Up Test Data]
    E --> F[Execute Request]
    D --> F
    F --> G[Verify Response]
    G --> H{Has Teardown?}
    H -->|Yes| I[Clean Up Test Data]
    H -->|No| J[Complete]
    I --> J
```

### Consumer Defines Provider States

When writing consumer tests, specify what state the provider should be in:

```javascript
// Consumer side (order-service)
const { pactWith } = require('jest-pact');

pactWith({ consumer: 'order-service', provider: 'inventory-service' }, (interaction) => {
  interaction('a request to check inventory', ({ provider, execute }) => {
    beforeEach(() => {
      provider
        // This string is passed to the provider's state handler
        .given('product SKU-123 has 50 units in stock')
        .uponReceiving('a request to check inventory for SKU-123')
        .withRequest({
          method: 'GET',
          path: '/inventory/SKU-123',
        })
        .willRespondWith({
          status: 200,
          headers: { 'Content-Type': 'application/json' },
          body: {
            sku: 'SKU-123',
            quantity: 50,
            available: true,
          },
        });
    });

    execute('returns inventory status', async (mockServer) => {
      const response = await fetch(`${mockServer.url}/inventory/SKU-123`);
      const data = await response.json();
      expect(data.available).toBe(true);
    });
  });
});
```

### Provider Implements State Handlers

The provider must handle each state that consumers define:

```javascript
// tests/provider.pact.test.js
const { Verifier } = require('@pact-foundation/pact');
const { app } = require('../src/app');
const { db } = require('../src/database');

describe('Provider Verification', () => {
  let server;

  beforeAll(async () => {
    server = app.listen(3000);
  });

  afterAll(async () => {
    server.close();
  });

  it('validates consumer expectations', async () => {
    const verifier = new Verifier({
      providerBaseUrl: 'http://localhost:3000',
      provider: 'inventory-service',
      pactBrokerUrl: process.env.PACT_BROKER_URL,
      pactBrokerToken: process.env.PACT_BROKER_TOKEN,

      // State handlers map consumer states to setup functions
      stateHandlers: {
        'product SKU-123 has 50 units in stock': async () => {
          // Insert test data into database
          await db.inventory.upsert({
            sku: 'SKU-123',
            quantity: 50,
            reserved: 0,
          });

          // Return value is ignored, this is for setup only
        },

        'product SKU-456 is out of stock': async () => {
          await db.inventory.upsert({
            sku: 'SKU-456',
            quantity: 0,
            reserved: 0,
          });
        },

        'user auth-user-1 has admin permissions': async () => {
          await db.users.upsert({
            id: 'auth-user-1',
            role: 'admin',
            permissions: ['read', 'write', 'delete'],
          });
        },

        // Default handler for unknown states
        default: async (state) => {
          console.warn(`No handler for state: ${state}`);
        },
      },

      // Clean up after each interaction
      afterEach: async () => {
        await db.inventory.deleteMany({});
        await db.users.deleteMany({});
      },

      publishVerificationResult: true,
      providerVersion: process.env.GIT_COMMIT_SHA,
    });

    await verifier.verifyProvider();
  });
});
```

### State Handlers with Parameters

Provider states can include parameters for more flexible setup:

```javascript
// Consumer side with parameters
provider
  .given('a user exists', { userId: 'user-123', name: 'John Doe' })
  .uponReceiving('a request to get user details')
  .withRequest({
    method: 'GET',
    path: '/users/user-123',
  })
  .willRespondWith({
    status: 200,
    body: { id: 'user-123', name: 'John Doe' },
  });
```

```javascript
// Provider side handling parameters
stateHandlers: {
  'a user exists': async (parameters) => {
    // Parameters from consumer are passed to the handler
    const { userId, name } = parameters;

    await db.users.create({
      id: userId,
      name: name,
      createdAt: new Date(),
    });
  },
}
```

## Pending Pacts

Pending pacts prevent new consumer expectations from breaking provider builds. When a consumer adds a new interaction, the provider verification won't fail until the provider explicitly supports it.

```mermaid
flowchart LR
    subgraph Consumer
        A[Write new interaction] --> B[Publish pact]
    end

    subgraph Broker
        B --> C{First time seen?}
        C -->|Yes| D[Mark as pending]
        C -->|No| E[Normal pact]
    end

    subgraph Provider
        D --> F[Verify pending pact]
        E --> G[Verify normal pact]
        F -->|Fail| H[Warning only]
        F -->|Pass| I[Mark as verified]
        G -->|Fail| J[Build fails]
        G -->|Pass| K[Build passes]
        I --> L[No longer pending]
    end
```

### Enabling Pending Pacts

```javascript
const verifier = new Verifier({
  providerBaseUrl: 'http://localhost:3000',
  provider: 'inventory-service',
  pactBrokerUrl: process.env.PACT_BROKER_URL,
  pactBrokerToken: process.env.PACT_BROKER_TOKEN,

  // Enable pending pacts
  enablePending: true,

  // Include WIP (work in progress) pacts from feature branches
  includeWipPactsSince: '2024-01-01',

  consumerVersionSelectors: [
    { mainBranch: true },
    { deployedOrReleased: true },
    // Include pacts from matching branches (for feature branch testing)
    { matchingBranch: true },
  ],

  publishVerificationResult: true,
  providerVersion: process.env.GIT_COMMIT_SHA,
});
```

### How Pending Pacts Work

1. Consumer publishes a new pact with interactions the provider hasn't verified
2. Broker marks these interactions as "pending"
3. Provider verification runs but failures on pending pacts don't break the build
4. Provider team implements the new endpoint
5. Once verification passes, the pact is no longer pending
6. Future failures will break the build as expected

## Verifying Against Local Pact Files

During development, you might want to verify against local pact files instead of the broker:

```javascript
const verifier = new Verifier({
  providerBaseUrl: 'http://localhost:3000',
  provider: 'inventory-service',

  // Verify against local pact files
  pactUrls: [
    './pacts/order-service-inventory-service.json',
    './pacts/shipping-service-inventory-service.json',
  ],

  stateHandlers: {
    // ... state handlers
  },
});
```

## Handling Breaking Changes

When a provider needs to make breaking changes, use these strategies:

### Strategy 1: Versioned Endpoints

```javascript
// Support both old and new versions
app.get('/v1/inventory/:sku', oldInventoryHandler);
app.get('/v2/inventory/:sku', newInventoryHandler);

// State handlers for version-specific tests
stateHandlers: {
  'using v1 API': async () => {
    // Test data for v1 format
  },
  'using v2 API': async () => {
    // Test data for v2 format
  },
}
```

### Strategy 2: Feature Flags

```javascript
stateHandlers: {
  'new response format is enabled': async () => {
    process.env.USE_NEW_FORMAT = 'true';
  },
  'new response format is disabled': async () => {
    process.env.USE_NEW_FORMAT = 'false';
  },
}
```

### Strategy 3: Can-I-Deploy

Before deploying, check if your version is compatible with deployed consumers:

```bash
# Check if provider version can be deployed to production
pact-broker can-i-deploy \
  --pacticipant inventory-service \
  --version $(git rev-parse HEAD) \
  --to-environment production

# Output shows compatibility matrix
# Computer says yes/no based on verification results
```

## Complete Provider Verification Setup

Here's a full example bringing everything together:

```javascript
// tests/provider-verification.test.js
const path = require('path');
const { Verifier } = require('@pact-foundation/pact');
const { app } = require('../src/app');
const { db } = require('../src/database');
const { seedTestData, clearTestData } = require('./helpers/test-data');

describe('Inventory Service Provider Verification', () => {
  let server;
  const port = 3001;
  const providerBaseUrl = `http://localhost:${port}`;

  beforeAll(async () => {
    // Connect to test database
    await db.connect(process.env.TEST_DATABASE_URL);

    // Start the provider service
    server = app.listen(port);
    console.log(`Provider running on ${providerBaseUrl}`);
  });

  afterAll(async () => {
    server.close();
    await db.disconnect();
  });

  describe('with Pact Broker', () => {
    it('verifies pacts from all consumers', async () => {
      const verifier = new Verifier({
        providerBaseUrl,
        provider: 'inventory-service',

        // Broker configuration
        pactBrokerUrl: process.env.PACT_BROKER_URL,
        pactBrokerToken: process.env.PACT_BROKER_TOKEN,

        // Consumer version selectors
        consumerVersionSelectors: [
          { mainBranch: true },
          { deployedOrReleased: true },
          { matchingBranch: true },
        ],

        // Enable pending pacts for safer evolution
        enablePending: true,
        includeWipPactsSince: '2024-01-01',

        // Logging
        logLevel: 'info',

        // Provider state handlers
        stateHandlers: {
          'no products exist': async () => {
            await clearTestData(db);
          },

          'product SKU-123 exists with quantity 50': async () => {
            await clearTestData(db);
            await db.inventory.create({
              sku: 'SKU-123',
              name: 'Test Product',
              quantity: 50,
              reserved: 0,
              warehouseId: 'WH-001',
            });
          },

          'product SKU-123 is out of stock': async () => {
            await clearTestData(db);
            await db.inventory.create({
              sku: 'SKU-123',
              name: 'Test Product',
              quantity: 0,
              reserved: 0,
              warehouseId: 'WH-001',
            });
          },

          'product SKU-123 has 5 units reserved': async () => {
            await clearTestData(db);
            await db.inventory.create({
              sku: 'SKU-123',
              name: 'Test Product',
              quantity: 10,
              reserved: 5,
              warehouseId: 'WH-001',
            });
          },

          'multiple products exist': async () => {
            await clearTestData(db);
            await seedTestData(db, 'multiple-products');
          },

          'authentication is required': async () => {
            // Enable auth middleware for this test
            process.env.REQUIRE_AUTH = 'true';
          },

          default: async (stateName) => {
            console.warn(`Unhandled provider state: "${stateName}"`);
            console.warn('Add a handler for this state to fix the test');
          },
        },

        // Request filters for authentication
        requestFilter: (req, res, next) => {
          // Add auth header if state requires it
          if (process.env.REQUIRE_AUTH === 'true') {
            if (!req.headers.authorization) {
              return res.status(401).json({ error: 'Unauthorized' });
            }
          }
          next();
        },

        // Clean up after each interaction
        afterEach: async () => {
          process.env.REQUIRE_AUTH = 'false';
        },

        // Publish results to broker
        publishVerificationResult: process.env.CI === 'true',
        providerVersion: process.env.GIT_COMMIT_SHA || 'local',
        providerVersionBranch: process.env.GIT_BRANCH || 'local',
        providerVersionTags: [process.env.GIT_BRANCH || 'local'],
      });

      // Run verification
      await verifier.verifyProvider();
    });
  });
});
```

## CI/CD Integration

Add provider verification to your CI pipeline:

```yaml
# .github/workflows/provider-verification.yml
name: Provider Verification

on:
  push:
    branches: [main, 'feature/**']
  pull_request:
    branches: [main]

jobs:
  verify:
    runs-on: ubuntu-latest

    services:
      postgres:
        image: postgres:14
        env:
          POSTGRES_PASSWORD: test
          POSTGRES_DB: test
        ports:
          - 5432:5432

    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Run provider verification
        env:
          TEST_DATABASE_URL: postgres://postgres:test@localhost:5432/test
          PACT_BROKER_URL: ${{ secrets.PACT_BROKER_URL }}
          PACT_BROKER_TOKEN: ${{ secrets.PACT_BROKER_TOKEN }}
          GIT_COMMIT_SHA: ${{ github.sha }}
          GIT_BRANCH: ${{ github.ref_name }}
          CI: true
        run: npm run test:pact:provider

      - name: Can I Deploy?
        if: github.ref == 'refs/heads/main'
        run: |
          npx pact-broker can-i-deploy \
            --pacticipant inventory-service \
            --version ${{ github.sha }} \
            --to-environment production
```

## Debugging Failed Verifications

When verification fails, check these common issues:

### 1. Missing Provider State

```
Error: No handler found for state "user exists with ID 123"
```

Solution: Add the missing state handler:

```javascript
stateHandlers: {
  'user exists with ID 123': async () => {
    await db.users.create({ id: '123', name: 'Test User' });
  },
}
```

### 2. Response Mismatch

```
Expected: { "quantity": 50 }
Actual:   { "quantity": "50" }
```

Solution: Check data types. The consumer expects a number, but the provider returns a string.

### 3. Missing Fields

```
Expected body to contain: { "sku": "SKU-123", "available": true }
Actual body: { "sku": "SKU-123" }
```

Solution: Update the provider to include the `available` field, or update the consumer contract if the field isn't needed.

### 4. Verbose Logging

Enable detailed logs to debug issues:

```javascript
const verifier = new Verifier({
  // ... other config
  logLevel: 'debug',
  verbose: true,
});
```

## Summary

| Concept | Purpose |
|---------|---------|
| **Provider Verification** | Proves provider meets consumer expectations |
| **Provider States** | Sets up preconditions for each interaction |
| **Pending Pacts** | Prevents new contracts from breaking builds |
| **Can-I-Deploy** | Checks compatibility before deployment |
| **Consumer Version Selectors** | Controls which pacts to verify |

Provider verification shifts the responsibility of API compatibility to the provider, where it belongs. Combined with pending pacts and can-i-deploy checks, you get a safety net that catches breaking changes before they reach production.
