# How to Use Dapr AWS DynamoDB Output Binding

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, AWS, DynamoDB, Binding, NoSQL

Description: Learn how to configure and use the Dapr AWS DynamoDB output binding to write items to DynamoDB tables from microservices without using the AWS SDK directly.

---

## What Is the Dapr DynamoDB Output Binding?

The Dapr AWS DynamoDB output binding allows microservices to write items to an Amazon DynamoDB table using the Dapr binding API. This simplifies your code by removing direct dependencies on the AWS SDK and makes it easier to swap storage backends in development or testing.

## Setting Up the DynamoDB Binding Component

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: order-store
  namespace: default
spec:
  type: bindings.aws.dynamodb
  version: v1
  metadata:
    - name: table
      value: "orders"
    - name: region
      value: "us-east-1"
    - name: accessKey
      secretKeyRef:
        name: aws-secrets
        key: accessKey
    - name: secretKey
      secretKeyRef:
        name: aws-secrets
        key: secretKey
```

Create the DynamoDB table:

```bash
aws dynamodb create-table \
  --table-name orders \
  --attribute-definitions \
    AttributeName=orderId,AttributeType=S \
  --key-schema \
    AttributeName=orderId,KeyType=HASH \
  --billing-mode PAY_PER_REQUEST \
  --region us-east-1
```

## Writing an Item to DynamoDB

The DynamoDB binding supports the `create` operation, which performs a `PutItem`:

```javascript
const { DaprClient } = require("@dapr/dapr");
const client = new DaprClient();

async function saveOrder(order) {
  await client.binding.send("order-store", "create", {
    orderId: order.id,
    customerId: order.customerId,
    status: order.status,
    totalAmount: order.totalAmount,
    items: order.items,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });

  console.log(`Order ${order.id} saved to DynamoDB`);
}

await saveOrder({
  id: "ORD-2026-001",
  customerId: "CUST-42",
  status: "CONFIRMED",
  totalAmount: 149.99,
  items: [{ sku: "WIDGET-A", quantity: 2, price: 74.99 }],
});
```

## Handling Nested Attributes

DynamoDB's native format uses type descriptors. The Dapr binding serializes your JSON object automatically, so you can pass plain JavaScript or Python objects:

```javascript
await client.binding.send("order-store", "create", {
  orderId: "ORD-2026-002",
  shippingAddress: {
    street: "123 Main St",
    city: "Seattle",
    state: "WA",
    zipCode: "98101",
  },
  metadata: {
    source: "web",
    ipAddress: "203.0.113.42",
    userAgent: "Mozilla/5.0",
  },
});
```

## Testing Locally with LocalStack

```bash
docker run -d \
  --name localstack \
  -p 4566:4566 \
  -e SERVICES=dynamodb \
  localstack/localstack
```

Update your component for local testing:

```yaml
  metadata:
    - name: table
      value: "orders"
    - name: region
      value: "us-east-1"
    - name: endpoint
      value: "http://localhost:4566"
    - name: accessKey
      value: "test"
    - name: secretKey
      value: "test"
```

Create the table in LocalStack:

```bash
aws --endpoint-url=http://localhost:4566 dynamodb create-table \
  --table-name orders \
  --attribute-definitions AttributeName=orderId,AttributeType=S \
  --key-schema AttributeName=orderId,KeyType=HASH \
  --billing-mode PAY_PER_REQUEST
```

## Error Handling

```javascript
async function saveOrderSafely(order) {
  try {
    await client.binding.send("order-store", "create", order);
  } catch (err) {
    if (err.message.includes("ProvisionedThroughputExceededException")) {
      console.warn("DynamoDB throttled - will retry via Dapr resiliency");
    }
    throw err;
  }
}
```

## Summary

The Dapr AWS DynamoDB output binding provides a simple `create` operation to write items to DynamoDB without AWS SDK dependencies. By combining it with Dapr's secret references, resiliency policies, and local emulation via LocalStack, you can build reliable data persistence into your microservices with consistent patterns across all cloud targets.
