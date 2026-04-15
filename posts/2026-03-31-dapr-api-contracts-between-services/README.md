# How to Implement API Contracts Between Dapr Services

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, API Contract, Service Invocation, OpenAPI, Design

Description: Learn how to define, enforce, and test API contracts between Dapr microservices using OpenAPI specifications and contract testing with Pact or similar tools.

---

## Overview

In a Dapr microservices architecture, API contracts define the expected request and response shapes between services. Without explicit contracts, incompatible changes cause runtime failures that are hard to detect before deployment. Implementing formal API contracts reduces integration failures and improves team autonomy.

## Defining Service Contracts with OpenAPI

Store OpenAPI specifications alongside each service:

```text
services/
  order-service/
    contracts/
      openapi.yaml        # This service's exposed API
      consumers/
        payment-service.yaml   # What payment-service expects from order-service
```

Example OpenAPI contract for the order service:

```yaml
openapi: "3.0.3"
info:
  title: Order Service API
  version: "1.0.0"
paths:
  /v1/orders:
    post:
      summary: Create a new order
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: "#/components/schemas/CreateOrderRequest"
      responses:
        "201":
          description: Order created
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/Order"
components:
  schemas:
    CreateOrderRequest:
      type: object
      required: [customerId, items]
      properties:
        customerId:
          type: string
        items:
          type: array
          items:
            $ref: "#/components/schemas/OrderItem"
    OrderItem:
      type: object
      required: [productId, quantity]
      properties:
        productId:
          type: string
        quantity:
          type: integer
    Order:
      type: object
      properties:
        orderId:
          type: string
        status:
          type: string
          enum: [pending, confirmed, shipped]
        createdAt:
          type: string
          format: date-time
```

## Validating Requests Against the Contract

Use express-openapi-validator to enforce the contract at runtime:

```javascript
const OpenApiValidator = require('express-openapi-validator');
const express = require('express');

const app = express();
app.use(express.json());

app.use(
  OpenApiValidator.middleware({
    apiSpec: './contracts/openapi.yaml',
    validateRequests: true,
    validateResponses: true
  })
);

app.post('/v1/orders', async (req, res) => {
  // Request is already validated against the OpenAPI spec
  const order = await createOrder(req.body);
  res.status(201).json(order);
});

// Contract violation returns 400 automatically
app.use((err, req, res, next) => {
  res.status(err.status || 500).json({
    message: err.message,
    errors: err.errors
  });
});
```

## Consumer-Driven Contract Testing with Pact

Pact verifies that service interactions match the agreed contract:

```javascript
// payment-service/tests/order-service.pact.spec.js
const { Pact, Matchers } = require('@pact-foundation/pact');
const axios = require('axios');

const provider = new Pact({
  consumer: 'payment-service',
  provider: 'order-service',
  port: 1234
});

describe('Order Service Contract', () => {
  beforeAll(() => provider.setup());
  afterEach(() => provider.verify());
  afterAll(() => provider.finalize());

  it('creates an order', async () => {
    await provider.addInteraction({
      state: 'order service is available',
      uponReceiving: 'a request to create an order',
      withRequest: {
        method: 'POST',
        path: '/v1/orders',
        body: {
          customerId: 'cust-123',
          items: [{ productId: 'prod-1', quantity: 2 }]
        }
      },
      willRespondWith: {
        status: 201,
        body: {
          orderId: Matchers.term({ generate: 'ord-12345', matcher: '^ord-' }),
          status: 'pending'
        }
      }
    });

    // Use a direct HTTP client instead of DaprClient because the Dapr SDK
    // routes requests through the sidecar, which is not running in this test.
    const response = await axios.post('http://localhost:1234/v1/orders', {
      customerId: 'cust-123',
      items: [{ productId: 'prod-1', quantity: 2 }]
    });

    expect(response.data.orderId).toMatch(/^ord-/);
  });
});
```

## Publishing and Verifying Pact Contracts

```bash
# Publish pact from consumer
npx pact-broker publish ./pacts \
  --broker-base-url https://pact-broker.example.com \
  --consumer-app-version $(git rev-parse --short HEAD)

# Verify pact on provider side (in order-service CI)
npx pact-provider-verifier \
  --provider order-service \
  --provider-base-url http://localhost:8080 \
  --pact-broker-base-url https://pact-broker.example.com \
  --provider-version $(git rev-parse --short HEAD) \
  --publish-verification-results
```

## Automating Contract Checks in CI

Add contract validation to your CI pipeline:

```yaml
# .github/workflows/contract-test.yml
name: Contract Tests
on: [push, pull_request]
jobs:
  contract-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npm install
      - name: Start Dapr
        run: dapr init --slim
      - name: Run contract tests
        run: npm run test:contract
```

## Summary

Implementing API contracts between Dapr services using OpenAPI specifications and Pact consumer-driven contract testing prevents integration failures before deployment. Define contracts alongside service code, enforce them at runtime with request validation middleware, and run automated contract tests in CI to catch breaking changes before they reach shared environments.
