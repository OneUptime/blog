# How to Monitor Server-Sent Events (SSE) Stream Lifecycle and Delivery Latency with OpenTelemetry

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, SSE, Streaming, Latency Monitoring

Description: Monitor Server-Sent Events stream lifecycle, delivery latency, and connection health using OpenTelemetry spans and metrics.

Server-Sent Events (SSE) provide a simple way to push data from server to client over HTTP. Unlike WebSockets, SSE is unidirectional and runs over a standard HTTP connection. But monitoring SSE streams presents unique challenges: connections stay open for a long time, events arrive at irregular intervals, and reconnection behavior can mask delivery failures.

This post covers how to instrument SSE streams with OpenTelemetry to track the full lifecycle and measure delivery latency.

## Setting Up SSE with Instrumentation

Here is a basic SSE endpoint in Node.js with OpenTelemetry tracing built in:

```typescript
// sse-endpoint.ts
import express from 'express';
import { trace, metrics, SpanKind } from '@opentelemetry/api';

const tracer = trace.getTracer('sse-server');
const meter = metrics.getMeter('sse-server');

// Metrics for SSE monitoring
const activeStreams = meter.createUpDownCounter('sse.streams.active', {
  description: 'Number of currently active SSE connections',
});

const eventsSent = meter.createCounter('sse.events.sent', {
  description: 'Total SSE events sent to clients',
});

const eventDeliveryLatency = meter.createHistogram('sse.event.latency_ms', {
  description: 'Time from event creation to sending over SSE',
  unit: 'ms',
});

const app = express();

app.get('/events', (req, res) => {
  // Start a span for the SSE connection lifecycle
  const connectionSpan = tracer.startSpan('sse.connection', {
    kind: SpanKind.SERVER,
    attributes: {
      'sse.client.id': req.query.clientId as string || 'unknown',
      'sse.last_event_id': req.headers['last-event-id'] || 'none',
    },
  });

  // Set SSE headers
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
  });

  activeStreams.add(1);
  let eventCount = 0;

  // Track if client is reconnecting
  const lastEventId = req.headers['last-event-id'];
  if (lastEventId) {
    connectionSpan.addEvent('sse.reconnect', {
      'sse.last_event_id': lastEventId,
    });
  }

  // Function to send traced events
  function sendEvent(eventType: string, data: any, eventId: string) {
    const eventCreatedAt = Date.now();
    eventCount++;

    const eventSpan = tracer.startSpan('sse.event.send', {
      kind: SpanKind.PRODUCER,
      attributes: {
        'sse.event.type': eventType,
        'sse.event.id': eventId,
        'sse.event.sequence': eventCount,
        'sse.event.payload_size': JSON.stringify(data).length,
      },
    });

    const payload = `id: ${eventId}\nevent: ${eventType}\ndata: ${JSON.stringify(data)}\n\n`;
    res.write(payload);

    // Measure delivery latency
    const latency = Date.now() - eventCreatedAt;
    eventDeliveryLatency.record(latency, {
      'sse.event.type': eventType,
    });

    eventsSent.add(1, { 'sse.event.type': eventType });
    eventSpan.end();
  }

  // Send a heartbeat every 30 seconds to keep the connection alive
  const heartbeatInterval = setInterval(() => {
    res.write(': heartbeat\n\n');
    connectionSpan.addEvent('sse.heartbeat');
  }, 30000);

  // Subscribe to your event source
  const subscription = eventBus.subscribe((event: any) => {
    sendEvent(event.type, event.data, event.id);
  });

  // Handle client disconnect
  req.on('close', () => {
    clearInterval(heartbeatInterval);
    subscription.unsubscribe();
    activeStreams.add(-1);

    connectionSpan.setAttribute('sse.total_events', eventCount);
    connectionSpan.setAttribute('sse.connection.duration_ms', Date.now() - connectionSpan.startTime[0] * 1000);
    connectionSpan.end();
  });
});
```

## Measuring End-to-End Event Latency

The real delivery latency is not just the time to write to the response stream. It includes the time from when the event was produced (e.g., a database change) to when it reaches the client. Track this with timestamps in the event payload:

```typescript
// event-producer.ts
function produceEvent(type: string, data: any) {
  return {
    type,
    data,
    id: generateId(),
    producedAt: Date.now(), // Timestamp when the event was created
  };
}

// In your SSE endpoint
function sendEvent(event: ProducedEvent) {
  const deliveryLatency = Date.now() - event.producedAt;

  const span = tracer.startSpan('sse.event.deliver', {
    attributes: {
      'sse.event.type': event.type,
      'sse.event.produced_at': event.producedAt,
      'sse.event.delivery_latency_ms': deliveryLatency,
    },
  });

  eventDeliveryLatency.record(deliveryLatency, {
    'sse.event.type': event.type,
  });

  res.write(`id: ${event.id}\nevent: ${event.type}\ndata: ${JSON.stringify({
    ...event.data,
    _producedAt: event.producedAt,
  })}\n\n`);

  span.end();
}
```

## Tracking Reconnection Behavior

SSE clients automatically reconnect when a connection drops. The `Last-Event-ID` header tells the server which events the client has already received. Instrument this to detect connection instability:

```typescript
const reconnectionCounter = meter.createCounter('sse.reconnections', {
  description: 'Number of SSE client reconnections',
});

const missedEvents = meter.createCounter('sse.events.missed', {
  description: 'Events that occurred during a client disconnect',
});

app.get('/events', (req, res) => {
  const lastEventId = req.headers['last-event-id'];

  if (lastEventId) {
    reconnectionCounter.add(1, {
      'sse.client.id': req.query.clientId as string,
    });

    // Calculate how many events the client missed
    const missed = eventStore.countEventsSince(lastEventId);
    missedEvents.add(missed, {
      'sse.client.id': req.query.clientId as string,
    });

    // Replay missed events
    const replayEvents = eventStore.getEventsSince(lastEventId);
    for (const event of replayEvents) {
      sendEvent(event);
    }
  }
});
```

## Connection Health Monitoring

Watch for connections that are technically open but not receiving data:

```typescript
const staleConnectionGauge = meter.createObservableGauge('sse.connections.stale', {
  description: 'SSE connections that have not received an event recently',
});

// Track last activity per connection
const connectionActivity = new Map<string, number>();

staleConnectionGauge.addCallback((result) => {
  const now = Date.now();
  let staleCount = 0;

  for (const [connId, lastActivity] of connectionActivity) {
    // Consider a connection stale if no event was sent in 5 minutes
    if (now - lastActivity > 5 * 60 * 1000) {
      staleCount++;
    }
  }

  result.observe(staleCount);
});
```

## Key Metrics to Dashboard

With this instrumentation, build a dashboard that shows:

- **Active streams over time**: Spot connection leaks or sudden drops
- **Event delivery latency (P50, P95, P99)**: Know how fast events reach clients
- **Reconnection rate**: High reconnection rates indicate network instability or server issues
- **Missed events per reconnection**: If clients consistently miss events, your replay buffer might be too small
- **Events sent per second by type**: Understand your event throughput

SSE might be simpler than WebSockets, but it still needs proper monitoring. OpenTelemetry gives you the tools to understand the full lifecycle of your event streams.
