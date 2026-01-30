# How to Implement Consumer Driven Contracts

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Testing, Contracts, Microservices, API

Description: Implement consumer-driven contract testing to ensure API compatibility between services with Pact framework examples.

---

Microservices break when APIs change unexpectedly. A provider team refactors an endpoint, and suddenly three consumer services fail in production. End-to-end tests catch this too late. Contract testing catches it immediately, at the unit test level, without spinning up actual services.

Consumer Driven Contracts (CDC) flip the traditional testing model. Instead of providers defining what consumers get, consumers define what they need. The provider then verifies it can meet those needs.

## What is Consumer Driven Contract Testing?

| Traditional Testing | Consumer Driven Contracts |
|---------------------|---------------------------|
| Provider defines API first | Consumer defines expectations |
| Integration tests catch breaks late | Contract tests catch breaks early |
| All services must run together | Services tested in isolation |
| Slow feedback loops | Fast, unit-test level feedback |
| Breaks found in staging or production | Breaks found during build |

The workflow:

1. Consumer writes a test defining what it expects from the provider
2. Consumer test generates a contract file (Pact file)
3. Contract file is shared with the provider (via Pact Broker or filesystem)
4. Provider runs verification against the contract
5. If verification fails, the provider knows they would break that consumer

## Setting Up Pact for JavaScript

Pact is the most widely used CDC framework. It supports JavaScript, Java, Python, Go, Ruby, .NET, and more.

```bash
npm install @pact-foundation/pact --save-dev
```

## Writing Consumer Tests

Consumer tests define what your service expects from its dependencies. The test creates a mock server, defines expected interactions, and generates a Pact file when tests pass.

This example shows an order service (consumer) that depends on a user service (provider):

```javascript
// order-service/tests/pact/user-service.consumer.pact.test.js
const { Pact } = require('@pact-foundation/pact');
const { UserClient } = require('../../src/clients/user-client');
const path = require('path');

// Configure the mock provider - creates a local server simulating user service
const provider = new Pact({
  consumer: 'OrderService',
  provider: 'UserService',
  port: 1234,
  dir: path.resolve(__dirname, '..', '..', 'pacts'),
  logLevel: 'warn',
});

describe('User Service Contract', () => {
  beforeAll(async () => await provider.setup());
  afterEach(async () => await provider.verify());
  afterAll(async () => await provider.finalize());

  it('should return user details for existing user', async () => {
    // Define the contract - request we send and response we expect
    await provider.addInteraction({
      state: 'user with id 123 exists',           // Provider state precondition
      uponReceiving: 'a request for user 123',
      withRequest: {
        method: 'GET',
        path: '/users/123',
        headers: { 'Accept': 'application/json' },
      },
      willRespondWith: {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
        body: {
          id: 123,
          email: 'user@example.com',
          name: 'Test User',
          active: true,
        },
      },
    });

    // Make actual request to mock server
    const client = new UserClient(`http://localhost:${provider.port}`);
    const user = await client.getUser(123);

    expect(user.id).toBe(123);
    expect(user.email).toBe('user@example.com');
  });
});
```

### Using Matchers for Flexible Contracts

Exact value matching is too rigid. Pact matchers let you define the shape and type of data without exact values:

```javascript
const { Matchers } = require('@pact-foundation/pact');
const { like, eachLike, term, integer, uuid } = Matchers;

it('should return user list with flexible matching', async () => {
  await provider.addInteraction({
    state: 'users exist in the system',
    uponReceiving: 'a request to list users',
    withRequest: {
      method: 'GET',
      path: '/users',
      query: { page: '1', limit: '10' },
    },
    willRespondWith: {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
      body: {
        total: like(150),              // Matches any value of same type
        users: eachLike({              // Matches array where each element matches
          id: integer(123),            // Matches any integer
          externalId: uuid(),          // Matches UUID format
          email: like('user@example.com'),
          status: term({               // Matches regex pattern
            matcher: 'active|inactive|pending',
            generate: 'active',
          }),
        }),
      },
    },
  });

  const client = new UserClient(`http://localhost:${provider.port}`);
  const response = await client.listUsers({ page: 1, limit: 10 });
  expect(response.users.length).toBeGreaterThan(0);
});
```

### Testing Error Scenarios

Contracts should cover error cases too:

```javascript
it('should return 404 for non-existent user', async () => {
  await provider.addInteraction({
    state: 'user with id 999 does not exist',
    uponReceiving: 'a request for non-existent user',
    withRequest: {
      method: 'GET',
      path: '/users/999',
      headers: { 'Accept': 'application/json' },
    },
    willRespondWith: {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
      body: {
        error: 'UserNotFound',
        message: like('User with id 999 not found'),
        code: 'USER_NOT_FOUND',
      },
    },
  });

  const client = new UserClient(`http://localhost:${provider.port}`);
  await expect(client.getUser(999)).rejects.toThrow('User not found');
});
```

## Provider Verification

The provider runs verification tests against the Pact file. If verification fails, the provider knows they would break the consumer.

```javascript
// user-service/tests/pact/provider.pact.test.js
const { Verifier } = require('@pact-foundation/pact');
const path = require('path');
const { startServer, stopServer } = require('../../src/server');

describe('User Service Provider Verification', () => {
  let server;
  beforeAll(async () => { server = await startServer(3001); });
  afterAll(async () => { await stopServer(server); });

  it('should validate the expectations of OrderService', async () => {
    const verifier = new Verifier({
      provider: 'UserService',
      providerBaseUrl: 'http://localhost:3001',
      pactUrls: [
        path.resolve(__dirname, '../../../order-service/pacts/orderservice-userservice.json'),
      ],
      // State handlers set up preconditions for each interaction
      stateHandlers: {
        'user with id 123 exists': async () => {
          await db.users.create({
            id: 123,
            email: 'user@example.com',
            name: 'Test User',
            active: true,
          });
        },
        'user with id 999 does not exist': async () => {
          await db.users.deleteById(999);
        },
      },
      afterEach: async () => { await db.users.deleteAll(); },
    });

    await verifier.verifyProvider();
  });
});
```

## Setting Up the Pact Broker

The Pact Broker stores and shares contracts between consumers and providers. It provides central storage, version management, dependency visualization, webhooks, and can-i-deploy verification.

```yaml
# docker-compose.yml
version: '3'
services:
  postgres:
    image: postgres:14
    environment:
      POSTGRES_USER: pact
      POSTGRES_PASSWORD: pact
      POSTGRES_DB: pact

  pact-broker:
    image: pactfoundation/pact-broker:latest
    depends_on:
      - postgres
    ports:
      - "9292:9292"
    environment:
      PACT_BROKER_DATABASE_URL: postgres://pact:pact@postgres/pact
      PACT_BROKER_BASIC_AUTH_USERNAME: admin
      PACT_BROKER_BASIC_AUTH_PASSWORD: admin
```

### Publishing Pacts to the Broker

After consumer tests pass, publish the generated Pact file:

```javascript
// scripts/publish-pacts.js
const { Publisher } = require('@pact-foundation/pact');
const path = require('path');

const publisher = new Publisher({
  pactBroker: process.env.PACT_BROKER_URL || 'http://localhost:9292',
  pactBrokerUsername: process.env.PACT_BROKER_USERNAME,
  pactBrokerPassword: process.env.PACT_BROKER_PASSWORD,
  pactFilesOrDirs: [path.resolve(__dirname, '..', 'pacts')],
  consumerVersion: process.env.GIT_COMMIT || '1.0.0',
  tags: [process.env.GIT_BRANCH || 'main'],
});

publisher.publishPacts()
  .then(() => console.log('Pacts published successfully'))
  .catch((error) => {
    console.error('Failed to publish pacts:', error);
    process.exit(1);
  });
```

### Verifying Against the Broker

Provider verification can fetch contracts directly from the broker:

```javascript
const verifier = new Verifier({
  provider: 'UserService',
  providerBaseUrl: 'http://localhost:3001',
  pactBrokerUrl: process.env.PACT_BROKER_URL,
  pactBrokerUsername: process.env.PACT_BROKER_USERNAME,
  pactBrokerPassword: process.env.PACT_BROKER_PASSWORD,
  providerVersion: process.env.GIT_COMMIT,
  publishVerificationResult: true,
  consumerVersionSelectors: [
    { tag: 'main', latest: true },
    { deployed: true },
  ],
  stateHandlers: { /* ... */ },
});
```

## Pending Pacts

When a consumer publishes a new contract, it might include interactions the provider does not support yet. Pending pacts treat new, unverified interactions as pending - they will not fail the provider build until successfully verified at least once.

```javascript
const verifier = new Verifier({
  provider: 'UserService',
  providerBaseUrl: 'http://localhost:3001',
  pactBrokerUrl: process.env.PACT_BROKER_URL,
  enablePending: true,
  includeWipPactsSince: '2024-01-01',
  consumerVersionSelectors: [
    { tag: 'main', latest: true },
    { deployed: true },
  ],
  publishVerificationResult: true,
  providerVersion: process.env.GIT_COMMIT,
});
```

| Scenario | Result |
|----------|--------|
| New pact, never verified | Pending - failure does not break build |
| Pact verified successfully before | Not pending - failure breaks build |
| Consumer deploys pending pact | Risk - pact may not work with provider |

## The can-i-deploy Tool

Before deploying a service, check if it is compatible with other services in that environment:

```bash
# Check if OrderService can be deployed to production
pact-broker can-i-deploy \
  --pacticipant OrderService \
  --version $(git rev-parse HEAD) \
  --to-environment production \
  --broker-base-url $PACT_BROKER_URL
```

After successful deployment, record it:

```bash
pact-broker record-deployment \
  --pacticipant OrderService \
  --version $(git rev-parse HEAD) \
  --environment production \
  --broker-base-url $PACT_BROKER_URL
```

## CI/CD Integration

### Consumer CI Pipeline (GitHub Actions)

```yaml
name: Consumer CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

env:
  PACT_BROKER_URL: ${{ secrets.PACT_BROKER_URL }}
  PACT_BROKER_USERNAME: ${{ secrets.PACT_BROKER_USERNAME }}
  PACT_BROKER_PASSWORD: ${{ secrets.PACT_BROKER_PASSWORD }}

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - run: npm ci
      - run: npm test
      - run: npm run test:pact

      - name: Publish Pacts to broker
        if: github.ref == 'refs/heads/main'
        env:
          GIT_COMMIT: ${{ github.sha }}
          GIT_BRANCH: ${{ github.ref_name }}
        run: npm run pact:publish

  can-i-deploy:
    needs: test
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    steps:
      - name: Install Pact CLI
        run: |
          curl -fsSL https://raw.githubusercontent.com/pact-foundation/pact-ruby-standalone/master/install.sh | bash
          echo "$HOME/pact/bin" >> $GITHUB_PATH

      - name: Check if can deploy
        run: |
          pact-broker can-i-deploy \
            --pacticipant OrderService \
            --version ${{ github.sha }} \
            --to-environment production \
            --broker-base-url $PACT_BROKER_URL

  deploy:
    needs: can-i-deploy
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    steps:
      - name: Deploy to production
        run: echo "Deploying..."

      - name: Record deployment
        run: |
          pact-broker record-deployment \
            --pacticipant OrderService \
            --version ${{ github.sha }} \
            --environment production \
            --broker-base-url $PACT_BROKER_URL
```

### Provider CI Pipeline

```yaml
name: Provider CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  test:
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
      - uses: actions/setup-node@v4
        with:
          node-version: '20'

      - run: npm ci
      - run: npm test

      - name: Run Pact verification
        env:
          GIT_COMMIT: ${{ github.sha }}
          DATABASE_URL: postgres://postgres:test@localhost:5432/test
        run: npm run test:pact:verify

  can-i-deploy:
    needs: test
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    steps:
      - name: Check if can deploy
        run: |
          pact-broker can-i-deploy \
            --pacticipant UserService \
            --version ${{ github.sha }} \
            --to-environment production \
            --broker-base-url ${{ secrets.PACT_BROKER_URL }}
```

### Webhook for Provider Verification

Configure the Pact Broker to trigger provider verification when new pacts are published:

```bash
pact-broker create-webhook \
  --request POST https://api.github.com/repos/myorg/user-service/dispatches \
  --header "Authorization: token $GITHUB_TOKEN" \
  --header "Accept: application/vnd.github.v3+json" \
  --data '{"event_type": "pact_changed", "client_payload": {"pact_url": "${pactbroker.pactUrl}"}}' \
  --provider UserService \
  --contract-content-changed \
  --broker-base-url $PACT_BROKER_URL
```

## Best Practices

| Practice | Rationale |
|----------|-----------|
| Test the contract, not the provider | Contracts define interface, not implementation |
| Use matchers over exact values | Allows flexibility in responses |
| Include error scenarios | Consumers must handle failures |
| Keep contracts minimal | Only include fields you actually use |
| Version your contracts | Track changes over time |

### State Handler Patterns

Keep state handlers simple and focused on minimum required preconditions:

```javascript
const stateHandlers = {
  // Good - specific and minimal
  'user with id 123 exists': async () => {
    await db.users.create({ id: 123, email: 'test@example.com' });
  },

  // Good - parameterized state
  'user with id {id} exists': async (params) => {
    await db.users.create({ id: params.id, email: `user${params.id}@example.com` });
  },

  // Avoid - too broad, creates unnecessary data
  'database is seeded': async () => {
    await db.seed();  // Too much data, hard to debug
  },
};
```

## Comparison with Other Testing Approaches

| Approach | Speed | Confidence | Isolation | Maintenance |
|----------|-------|------------|-----------|-------------|
| Unit tests | Fast | Low | Complete | Low |
| Contract tests | Fast | Medium | Complete | Medium |
| Integration tests | Slow | High | None | High |
| E2E tests | Very slow | Very high | None | Very high |

Contract tests fill the gap between unit tests and integration tests. They run as fast as unit tests but verify service compatibility.

## Summary

Consumer Driven Contracts shift API compatibility testing left, catching breaking changes at build time rather than in integration tests or production. The workflow:

1. Consumer writes tests defining expected interactions
2. Tests generate contract files (Pact)
3. Contracts are shared via Pact Broker
4. Provider verifies it can meet consumer expectations
5. can-i-deploy gates deployments on verification status
6. CI webhooks keep contracts verified continuously

This approach works best when teams own both consumers and providers, or when providers want to ensure they do not break their consumers. It does not replace integration tests entirely but reduces the need for slow, flaky cross-service tests.
