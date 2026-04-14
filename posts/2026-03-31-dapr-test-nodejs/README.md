# How to Test Dapr Node.js Applications

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Testing, Node.js, Jest, Integration Test

Description: Learn how to write unit and integration tests for Dapr Node.js applications using Jest mocks and Testcontainers for reliable test coverage.

---

## Introduction

Testing Dapr Node.js applications requires two levels of testing: unit tests that mock the Dapr client, and integration tests that run against a real Dapr sidecar. This guide covers both approaches using Jest and Testcontainers.

## Installing Test Dependencies

```bash
npm install --save-dev jest supertest testcontainers
```

## Unit Testing with Jest Mocks

Mock the `DaprClient` to test service logic in isolation:

```javascript
// orderService.test.js
const { DaprClient } = require("@dapr/dapr");
const { OrderService } = require("./orderService");

jest.mock("@dapr/dapr");

describe("OrderService", () => {
  let mockClient;
  let orderService;

  beforeEach(() => {
    mockClient = {
      state: {
        save: jest.fn().mockResolvedValue(undefined),
        get: jest.fn(),
        delete: jest.fn().mockResolvedValue(undefined),
      },
      pubsub: {
        publish: jest.fn().mockResolvedValue(undefined),
      },
    };
    orderService = new OrderService(mockClient);
  });

  test("createOrder saves state and publishes event", async () => {
    const order = { productId: "prod-1", quantity: 2 };
    const created = await orderService.createOrder(order);

    expect(mockClient.state.save).toHaveBeenCalledWith(
      "statestore",
      expect.arrayContaining([
        expect.objectContaining({ key: expect.stringContaining("order-") }),
      ])
    );
    expect(mockClient.pubsub.publish).toHaveBeenCalledWith(
      "pubsub",
      "order-created",
      expect.objectContaining({ productId: "prod-1" })
    );
    expect(created.status).toBe("pending");
  });

  test("getOrder returns null for missing order", async () => {
    mockClient.state.get.mockResolvedValue(null);
    const result = await orderService.getOrder("nonexistent");
    expect(result).toBeNull();
  });
});
```

## Testing HTTP Handlers with Supertest

Test Express routes with mocked Dapr:

```javascript
const request = require("supertest");

jest.mock("@dapr/dapr", () => ({
  DaprClient: jest.fn().mockImplementation(() => ({
    state: { save: jest.fn(), get: jest.fn() },
    pubsub: { publish: jest.fn() },
  })),
}));

const { app, daprClient } = require("./app");

describe("POST /orders", () => {
  test("returns 201 with created order", async () => {
    daprClient.state.save.mockResolvedValue(undefined);
    daprClient.pubsub.publish.mockResolvedValue(undefined);

    const response = await request(app)
      .post("/orders")
      .send({ productId: "prod-1", quantity: 3 });

    expect(response.status).toBe(201);
    expect(response.body.productId).toBe("prod-1");
  });
});
```

## Integration Testing with a Real Dapr Sidecar

Run integration tests against a real sidecar using Testcontainers:

```javascript
const { GenericContainer, Wait } = require("testcontainers");
const { DaprClient } = require("@dapr/dapr");

describe("State store integration", () => {
  let daprContainer;
  let client;

  beforeAll(async () => {
    daprContainer = await new GenericContainer("daprio/daprd:1.14.0")
      .withExposedPorts(3500)
      .withWaitStrategy(Wait.forHttp("/v1.0/healthz", 3500))
      .start();

    client = new DaprClient({
      daprHost: "http://localhost",
      daprPort: String(daprContainer.getMappedPort(3500)),
    });
  }, 60000);

  afterAll(async () => {
    await daprContainer?.stop();
  });

  test("saves and retrieves state", async () => {
    await client.state.save("statestore", [{ key: "test-key", value: "test-value" }]);
    const value = await client.state.get("statestore", "test-key");
    expect(value).toBe("test-value");
  });
});
```

## Summary

Testing Dapr Node.js applications involves mocking `DaprClient` with Jest for fast unit tests and using Testcontainers for integration tests against a real Dapr sidecar. This two-layer approach catches both logic bugs and integration issues before reaching production.
