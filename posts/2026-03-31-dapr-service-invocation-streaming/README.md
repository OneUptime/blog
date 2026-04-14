# How to Use Dapr Service Invocation with Streaming Responses

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Streaming, HTTP, Service Invocation, Server-Sent Event

Description: Learn how to stream responses through Dapr service invocation using chunked transfer encoding and server-sent events for real-time data delivery.

---

## Streaming Support in Dapr

Dapr supports streaming HTTP responses through service invocation. When a target service sends a chunked or streaming response, Dapr forwards each chunk to the client as it arrives rather than buffering the entire response.

## HTTP Streaming Behavior

Since Dapr v1.12, HTTP streaming through service invocation is enabled by default. Dapr automatically detects streaming requests — those using chunked transfer encoding or without a known `Content-Length` header — and forwards response chunks directly to the caller without buffering them in memory.

No special annotations or configuration are required to enable streaming. Note that retry policies are bypassed for streaming requests because the request body is consumed as it is read and cannot be replayed.

## Implementing a Chunked Streaming Endpoint

```javascript
const express = require('express');
const app = express();

app.get('/stream/events', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  let counter = 0;
  const interval = setInterval(() => {
    counter++;
    res.write(`data: ${JSON.stringify({ event: counter, time: new Date().toISOString() })}\n\n`);

    if (counter >= 10) {
      clearInterval(interval);
      res.end();
    }
  }, 500);

  req.on('close', () => clearInterval(interval));
});

app.listen(3000);
```

## Consuming Streaming Response via Dapr

```javascript
const axios = require('axios');

const response = await axios.get(
  'http://localhost:3500/v1.0/invoke/event-service/method/stream/events',
  { responseType: 'stream' }
);

response.data.on('data', (chunk) => {
  const lines = chunk.toString().split('\n');
  lines.forEach(line => {
    if (line.startsWith('data: ')) {
      const event = JSON.parse(line.slice(6));
      console.log('Received event:', event);
    }
  });
});

response.data.on('end', () => {
  console.log('Stream complete');
});
```

## Streaming JSON Lines (NDJSON)

```javascript
// Service - stream NDJSON
app.get('/orders/export', async (req, res) => {
  res.setHeader('Content-Type', 'application/x-ndjson');
  const cursor = await db.getOrdersCursor();

  for await (const order of cursor) {
    res.write(JSON.stringify(order) + '\n');
  }
  res.end();
});
```

```bash
# Consume via curl
curl http://localhost:3500/v1.0/invoke/order-service/method/orders/export \
  --no-buffer | jq .
```

## gRPC Streaming

For gRPC server streaming, Dapr supports it natively when the app is configured with `dapr.io/app-protocol: grpc`. Clients must set the `dapr-stream` metadata to `true` when making streaming RPCs. Note that resiliency policies only apply to the initial handshake — if a stream is interrupted after establishment, the application must recreate it.

```go
func (s *OrderServer) WatchOrders(req *pb.WatchRequest, stream pb.OrderService_WatchOrdersServer) error {
    for {
        order := <-s.orderChannel
        if err := stream.Send(order); err != nil {
            return err
        }
    }
}
```

## Summary

Dapr supports HTTP chunked transfer streaming and server-sent events through service invocation. Implement streaming endpoints in your service using chunked responses or SSE, and consume them by setting `responseType: 'stream'` in your HTTP client. For high-throughput streaming scenarios, consider using Dapr pub/sub instead of service invocation.
