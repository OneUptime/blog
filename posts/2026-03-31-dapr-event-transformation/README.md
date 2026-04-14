# How to Implement Event Transformation with Dapr

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Event Transformation, Pub/Sub, Schema, Pipeline

Description: Transform Dapr pub/sub events between formats and schemas using middleware components and application-level transformation pipelines for data compatibility.

---

## Overview

Event transformation converts incoming events from one format or schema to another before processing or forwarding. Dapr supports transformation at the middleware level via the HTTP pipeline and at the application level through subscriber logic.

## Application-Level Transformation

Transform events as they arrive in your subscriber:

```javascript
const { DaprServer, DaprClient, DaprPubSubStatusEnum } = require('@dapr/dapr');
const server = new DaprServer();
const client = new DaprClient();

// Transform legacy v1 order format to v2
function transformOrderV1ToV2(v1Order) {
  return {
    orderId: v1Order.order_id,
    customerId: v1Order.customer_id,
    lineItems: v1Order.items.map(item => ({
      productId: item.product_id,
      quantity: item.qty,
      unitPrice: item.price,
      totalPrice: item.qty * item.price
    })),
    totalAmount: v1Order.items.reduce((sum, i) => sum + i.qty * i.price, 0),
    currency: v1Order.currency || 'USD',
    createdAt: new Date(v1Order.timestamp).toISOString(),
    schemaVersion: '2.0'
  };
}

await server.pubsub.subscribe('pubsub', 'orders-v1', async (v1Order) => {
  const v2Order = transformOrderV1ToV2(v1Order);
  await client.pubsub.publish('pubsub', 'orders-v2', v2Order);
  console.log(`Transformed order ${v2Order.orderId} from v1 to v2`);
});
```

## Dapr Middleware for Request Transformation

Use Dapr's HTTP middleware pipeline for transforming incoming requests:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: uppercase-transformer
spec:
  type: middleware.http.routeralias
  version: v1
  metadata:
  - name: routes
    value: |
      {
        "/orders-legacy": "/orders"
      }
```

## Field Mapping Transformation

Transform nested event structures with field mapping:

```javascript
function transformSensorReading(rawReading) {
  return {
    id: rawReading.deviceId + '-' + rawReading.ts,
    deviceId: rawReading.deviceId,
    readings: {
      temperature: {
        value: rawReading.temp_c,
        unit: 'celsius',
        fahrenheit: rawReading.temp_c * 9/5 + 32
      },
      humidity: {
        value: rawReading.hum_pct,
        unit: 'percent'
      }
    },
    location: {
      lat: rawReading.gps[0],
      lng: rawReading.gps[1]
    },
    receivedAt: new Date().toISOString()
  };
}

await server.pubsub.subscribe('pubsub', 'raw-sensors', async (raw) => {
  const transformed = transformSensorReading(raw);
  await client.pubsub.publish('pubsub', 'normalized-sensors', transformed);
});
```

## Format Transformation: JSON to Protocol Buffers

Serialize events to protobuf before publishing for compact wire format:

```javascript
const protobuf = require('protobufjs');

const root = await protobuf.load('order.proto');
const OrderMessage = root.lookupType('order.Order');

async function transformAndPublishProto(orderJson) {
  const message = OrderMessage.create(orderJson);
  const buffer = OrderMessage.encode(message).finish();
  const base64 = buffer.toString('base64');

  await client.pubsub.publish('pubsub', 'orders-proto', {
    encoding: 'protobuf',
    payload: base64
  });
}
```

## Dead-Letter Topic for Transformation Failures

Route untransformable events to a dead-letter topic:

```javascript
await server.pubsub.subscribe('pubsub', 'orders-v1', async (event) => {
  try {
    const transformed = transformOrderV1ToV2(event);
    await client.pubsub.publish('pubsub', 'orders-v2', transformed);
    return DaprPubSubStatusEnum.SUCCESS;
  } catch (err) {
    console.error('Transformation failed:', err.message);
    await client.pubsub.publish('pubsub', 'transform-failures', {
      originalEvent: event,
      error: err.message,
      timestamp: Date.now()
    });
    return DaprPubSubStatusEnum.DROP;
  }
});
```

## Summary

Event transformation with Dapr is best implemented at the application level within subscriber handlers, allowing full control over schema mapping, format conversion, and validation. Use transformation pipelines to maintain backward compatibility when evolving event schemas, always route untransformable events to dead-letter topics for investigation, and consider caching transformation templates for performance when processing high volumes.
