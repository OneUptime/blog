# How to Write Unit Tests for Lambda Functions

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, Lambda, Testing, Jest, Unit Testing

Description: A practical guide to writing effective unit tests for AWS Lambda functions, including mocking AWS services, testing handlers, and achieving meaningful code coverage.

---

Lambda functions that aren't tested are ticking time bombs. You push a change, it passes a quick manual test, and three weeks later you discover it broke an edge case that's been silently dropping orders. Unit tests catch these issues before they reach production. But testing Lambda functions has a unique challenge: they're deeply intertwined with AWS services. You need to mock DynamoDB, SQS, S3, and whatever else your function touches.

Let's build a solid testing approach for Lambda functions using Jest and proper mocking strategies.

## Project Structure for Testable Lambda Functions

The key to testable Lambda functions is separating your business logic from the AWS SDK interactions.

```
my-function/
  src/
    handlers/
      order-handler.js      # Lambda handler - thin wrapper
    services/
      order-service.js       # Business logic
    clients/
      dynamo-client.js       # AWS SDK wrapper
  tests/
    unit/
      order-handler.test.js
      order-service.test.js
    fixtures/
      events/
        api-gateway-get.json
        sqs-message.json
  jest.config.js
  package.json
```

The handler should be thin - it parses the event, calls a service, and formats the response. The service contains the business logic. The client wraps AWS SDK calls. This separation makes each layer independently testable.

## Setting Up Jest

Install Jest and the testing utilities you'll need.

```bash
npm install --save-dev jest @aws-sdk/client-dynamodb @aws-sdk/lib-dynamodb
```

This Jest configuration sets up the test environment:

```javascript
// jest.config.js
module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/tests/**/*.test.js'],
  collectCoverageFrom: ['src/**/*.js'],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },
};
```

## Writing Testable Handlers

First, let's write a Lambda handler that's easy to test.

This handler processes API Gateway requests and delegates to a service layer:

```javascript
// src/handlers/order-handler.js
const OrderService = require('../services/order-service');

const orderService = new OrderService();

exports.handler = async (event) => {
  console.log('Event:', JSON.stringify(event));

  try {
    const { httpMethod, pathParameters, body, queryStringParameters } = event;

    switch (httpMethod) {
      case 'GET': {
        if (pathParameters?.orderId) {
          const order = await orderService.getOrder(pathParameters.orderId);
          if (!order) {
            return response(404, { message: 'Order not found' });
          }
          return response(200, order);
        }
        const orders = await orderService.listOrders(queryStringParameters);
        return response(200, orders);
      }

      case 'POST': {
        const orderData = JSON.parse(body || '{}');
        const newOrder = await orderService.createOrder(orderData);
        return response(201, newOrder);
      }

      default:
        return response(405, { message: 'Method not allowed' });
    }
  } catch (error) {
    console.error('Handler error:', error);

    if (error.name === 'ValidationError') {
      return response(400, { message: error.message });
    }

    return response(500, { message: 'Internal server error' });
  }
};

function response(statusCode, body) {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    },
    body: JSON.stringify(body),
  };
}
```

## Testing the Handler

Now let's test the handler. We mock the service layer so we're only testing the handler's routing and response formatting logic.

This test suite covers the handler's HTTP method routing and error handling:

```javascript
// tests/unit/order-handler.test.js
const { handler } = require('../../src/handlers/order-handler');
const OrderService = require('../../src/services/order-service');

// Mock the entire service module
jest.mock('../../src/services/order-service');

describe('Order Handler', () => {
  let mockOrderService;

  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();
    mockOrderService = OrderService.prototype;
  });

  describe('GET /orders', () => {
    it('returns a list of orders', async () => {
      const mockOrders = [
        { orderId: 'ORD-001', status: 'active', total: 99.99 },
        { orderId: 'ORD-002', status: 'shipped', total: 49.99 },
      ];
      mockOrderService.listOrders = jest.fn().mockResolvedValue(mockOrders);

      const event = {
        httpMethod: 'GET',
        pathParameters: null,
        queryStringParameters: { status: 'active' },
        body: null,
      };

      const result = await handler(event);

      expect(result.statusCode).toBe(200);
      expect(JSON.parse(result.body)).toEqual(mockOrders);
      expect(mockOrderService.listOrders).toHaveBeenCalledWith({ status: 'active' });
    });
  });

  describe('GET /orders/:orderId', () => {
    it('returns a single order', async () => {
      const mockOrder = { orderId: 'ORD-001', status: 'active', total: 99.99 };
      mockOrderService.getOrder = jest.fn().mockResolvedValue(mockOrder);

      const event = {
        httpMethod: 'GET',
        pathParameters: { orderId: 'ORD-001' },
        queryStringParameters: null,
        body: null,
      };

      const result = await handler(event);

      expect(result.statusCode).toBe(200);
      expect(JSON.parse(result.body)).toEqual(mockOrder);
      expect(mockOrderService.getOrder).toHaveBeenCalledWith('ORD-001');
    });

    it('returns 404 when order not found', async () => {
      mockOrderService.getOrder = jest.fn().mockResolvedValue(null);

      const event = {
        httpMethod: 'GET',
        pathParameters: { orderId: 'NONEXISTENT' },
        queryStringParameters: null,
        body: null,
      };

      const result = await handler(event);

      expect(result.statusCode).toBe(404);
      expect(JSON.parse(result.body).message).toBe('Order not found');
    });
  });

  describe('POST /orders', () => {
    it('creates an order and returns 201', async () => {
      const newOrder = { orderId: 'ORD-003', status: 'pending', total: 29.99 };
      mockOrderService.createOrder = jest.fn().mockResolvedValue(newOrder);

      const event = {
        httpMethod: 'POST',
        pathParameters: null,
        queryStringParameters: null,
        body: JSON.stringify({ item: 'Widget', quantity: 3, price: 9.99 }),
      };

      const result = await handler(event);

      expect(result.statusCode).toBe(201);
      expect(JSON.parse(result.body)).toEqual(newOrder);
    });

    it('returns 400 for validation errors', async () => {
      const validationError = new Error('Item name is required');
      validationError.name = 'ValidationError';
      mockOrderService.createOrder = jest.fn().mockRejectedValue(validationError);

      const event = {
        httpMethod: 'POST',
        pathParameters: null,
        queryStringParameters: null,
        body: JSON.stringify({}),
      };

      const result = await handler(event);

      expect(result.statusCode).toBe(400);
      expect(JSON.parse(result.body).message).toBe('Item name is required');
    });
  });

  describe('unsupported methods', () => {
    it('returns 405 for PATCH', async () => {
      const event = { httpMethod: 'PATCH', body: null };
      const result = await handler(event);
      expect(result.statusCode).toBe(405);
    });
  });

  describe('error handling', () => {
    it('returns 500 for unexpected errors', async () => {
      mockOrderService.listOrders = jest.fn().mockRejectedValue(new Error('DB connection failed'));

      const event = {
        httpMethod: 'GET',
        pathParameters: null,
        queryStringParameters: null,
        body: null,
      };

      const result = await handler(event);

      expect(result.statusCode).toBe(500);
      expect(JSON.parse(result.body).message).toBe('Internal server error');
    });
  });
});
```

## Testing the Service Layer

The service layer contains your business logic. Mock the AWS SDK at this level.

This service class handles order operations:

```javascript
// src/services/order-service.js
const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, GetCommand, PutCommand, QueryCommand } = require('@aws-sdk/lib-dynamodb');
const { v4: uuidv4 } = require('uuid');

class OrderService {
  constructor() {
    const client = new DynamoDBClient({});
    this.docClient = DynamoDBDocumentClient.from(client);
    this.tableName = process.env.TABLE_NAME || 'orders';
  }

  async getOrder(orderId) {
    const result = await this.docClient.send(new GetCommand({
      TableName: this.tableName,
      Key: { orderId },
    }));
    return result.Item || null;
  }

  async createOrder(orderData) {
    this.validateOrder(orderData);

    const order = {
      orderId: `ORD-${uuidv4().slice(0, 8)}`,
      ...orderData,
      status: 'pending',
      total: orderData.quantity * orderData.price,
      createdAt: new Date().toISOString(),
    };

    await this.docClient.send(new PutCommand({
      TableName: this.tableName,
      Item: order,
    }));

    return order;
  }

  validateOrder(data) {
    if (!data.item) {
      const error = new Error('Item name is required');
      error.name = 'ValidationError';
      throw error;
    }
    if (!data.quantity || data.quantity < 1) {
      const error = new Error('Quantity must be at least 1');
      error.name = 'ValidationError';
      throw error;
    }
    if (!data.price || data.price <= 0) {
      const error = new Error('Price must be positive');
      error.name = 'ValidationError';
      throw error;
    }
  }
}

module.exports = OrderService;
```

Now test it with mocked DynamoDB:

```javascript
// tests/unit/order-service.test.js
const { DynamoDBDocumentClient, GetCommand, PutCommand } = require('@aws-sdk/lib-dynamodb');
const { mockClient } = require('aws-sdk-client-mock');
const OrderService = require('../../src/services/order-service');

// Create a mock for the DynamoDB Document Client
const ddbMock = mockClient(DynamoDBDocumentClient);

describe('OrderService', () => {
  let service;

  beforeEach(() => {
    ddbMock.reset();
    process.env.TABLE_NAME = 'test-orders';
    service = new OrderService();
  });

  describe('getOrder', () => {
    it('returns an order when found', async () => {
      const mockOrder = { orderId: 'ORD-001', status: 'active', total: 99.99 };
      ddbMock.on(GetCommand).resolves({ Item: mockOrder });

      const result = await service.getOrder('ORD-001');

      expect(result).toEqual(mockOrder);
      expect(ddbMock.calls()).toHaveLength(1);
      expect(ddbMock.call(0).args[0].input).toEqual({
        TableName: 'test-orders',
        Key: { orderId: 'ORD-001' },
      });
    });

    it('returns null when order not found', async () => {
      ddbMock.on(GetCommand).resolves({});

      const result = await service.getOrder('NONEXISTENT');

      expect(result).toBeNull();
    });
  });

  describe('createOrder', () => {
    it('creates an order with correct fields', async () => {
      ddbMock.on(PutCommand).resolves({});

      const result = await service.createOrder({
        item: 'Widget',
        quantity: 3,
        price: 9.99,
      });

      expect(result.orderId).toMatch(/^ORD-/);
      expect(result.item).toBe('Widget');
      expect(result.quantity).toBe(3);
      expect(result.total).toBeCloseTo(29.97);
      expect(result.status).toBe('pending');
      expect(result.createdAt).toBeDefined();
    });

    it('throws ValidationError for missing item', async () => {
      await expect(
        service.createOrder({ quantity: 1, price: 10 })
      ).rejects.toThrow('Item name is required');
    });

    it('throws ValidationError for zero quantity', async () => {
      await expect(
        service.createOrder({ item: 'Widget', quantity: 0, price: 10 })
      ).rejects.toThrow('Quantity must be at least 1');
    });

    it('throws ValidationError for negative price', async () => {
      await expect(
        service.createOrder({ item: 'Widget', quantity: 1, price: -5 })
      ).rejects.toThrow('Price must be positive');
    });
  });
});
```

Install the AWS SDK mock library:

```bash
npm install --save-dev aws-sdk-client-mock
```

## Testing SQS-Triggered Functions

For functions triggered by SQS, you test with SQS event fixtures.

This test validates SQS message processing with batch item failures:

```javascript
// tests/unit/sqs-handler.test.js
const { handler } = require('../../src/handlers/sqs-handler');
const OrderService = require('../../src/services/order-service');

jest.mock('../../src/services/order-service');

describe('SQS Handler', () => {
  beforeEach(() => jest.clearAllMocks());

  it('processes all messages successfully', async () => {
    OrderService.prototype.processOrder = jest.fn().mockResolvedValue(true);

    const event = {
      Records: [
        { messageId: 'msg-1', body: '{"orderId":"ORD-001"}' },
        { messageId: 'msg-2', body: '{"orderId":"ORD-002"}' },
      ],
    };

    const result = await handler(event);

    expect(result.batchItemFailures).toHaveLength(0);
    expect(OrderService.prototype.processOrder).toHaveBeenCalledTimes(2);
  });

  it('reports partial batch failures', async () => {
    OrderService.prototype.processOrder = jest.fn()
      .mockResolvedValueOnce(true)
      .mockRejectedValueOnce(new Error('Processing failed'));

    const event = {
      Records: [
        { messageId: 'msg-1', body: '{"orderId":"ORD-001"}' },
        { messageId: 'msg-2', body: '{"orderId":"ORD-002"}' },
      ],
    };

    const result = await handler(event);

    expect(result.batchItemFailures).toHaveLength(1);
    expect(result.batchItemFailures[0].itemIdentifier).toBe('msg-2');
  });
});
```

## Testing Event Fixtures

Create reusable event fixtures for consistent testing.

```javascript
// tests/fixtures/events.js
module.exports = {
  apiGatewayGet: (path, pathParams = {}, queryParams = null) => ({
    httpMethod: 'GET',
    path,
    pathParameters: Object.keys(pathParams).length ? pathParams : null,
    queryStringParameters: queryParams,
    headers: { 'Content-Type': 'application/json' },
    body: null,
  }),

  apiGatewayPost: (path, body) => ({
    httpMethod: 'POST',
    path,
    pathParameters: null,
    queryStringParameters: null,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }),

  sqsEvent: (messages) => ({
    Records: messages.map((msg, i) => ({
      messageId: `msg-${i}`,
      body: typeof msg === 'string' ? msg : JSON.stringify(msg),
      attributes: { ApproximateReceiveCount: '1' },
    })),
  }),

  s3Event: (bucket, key) => ({
    Records: [{
      s3: {
        bucket: { name: bucket },
        object: { key, size: 1024 },
      },
      eventName: 'ObjectCreated:Put',
    }],
  }),
};
```

## Running Tests

Add test scripts to your package.json:

```json
{
  "scripts": {
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage",
    "test:verbose": "jest --verbose"
  }
}
```

```bash
# Run all tests
npm test

# Run with coverage report
npm run test:coverage

# Run in watch mode during development
npm run test:watch

# Run specific test file
npx jest tests/unit/order-handler.test.js
```

## Best Practices

**Keep handlers thin.** The handler should parse input, call a service, and format output. That's it. All business logic goes in the service layer.

**Mock at the right level.** Mock AWS SDK calls for service tests, mock services for handler tests. Don't mock everything - that defeats the purpose of testing.

**Test error paths.** Lambda functions encounter more error conditions than happy paths. Test for missing fields, invalid data, service timeouts, and permission errors.

**Use environment variables.** Make configuration injectable through environment variables, so tests can override them.

**Test idempotency.** If your function processes SQS or Kinesis messages, test that processing the same message twice produces the same result.

For integration testing with SAM CLI, see our guide on [testing Lambda functions locally with SAM CLI](https://oneuptime.com/blog/post/test-lambda-functions-locally-sam-cli/view).

## Wrapping Up

Unit testing Lambda functions boils down to good architecture: separate your handler from your business logic, mock at the right boundaries, and test both happy and error paths. The aws-sdk-client-mock library makes mocking AWS SDK v3 straightforward, and Jest provides all the tooling you need. Make testing a habit, and you'll catch bugs before they cost you money or reputation.
