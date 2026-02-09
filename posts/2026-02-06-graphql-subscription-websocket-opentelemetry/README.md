# How to Trace GraphQL Subscription WebSocket Connections with OpenTelemetry Custom Spans

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, GraphQL, WebSocket, Subscriptions

Description: Trace GraphQL subscription lifecycle events over WebSocket connections using OpenTelemetry custom spans and events.

GraphQL subscriptions are long-lived connections that push data to clients in real time. Unlike queries and mutations, subscriptions do not follow the standard request-response pattern, which makes them tricky to observe. A subscription might stay open for minutes or hours, receiving dozens of events. Standard HTTP instrumentation does not cover this well.

This post shows how to build custom OpenTelemetry instrumentation for GraphQL subscriptions running over WebSocket connections.

## The Challenge with Subscription Tracing

A typical GraphQL subscription flow looks like this:

1. Client opens a WebSocket connection
2. Client sends a `subscribe` message with the GraphQL operation
3. Server starts listening for events
4. Server pushes `next` messages whenever data is available
5. Client or server sends `complete` to end the subscription

Each of these steps is worth tracing, but they happen asynchronously over a long period. You need a span structure that captures the full lifecycle without creating a single span that runs for hours.

## Span Strategy for Subscriptions

The approach that works best is to create a parent span for the subscription lifecycle and child spans for each individual event delivery:

```typescript
// subscription-tracing.ts
import { trace, SpanKind, context, SpanStatusCode } from '@opentelemetry/api';

const tracer = trace.getTracer('graphql-subscriptions');

interface SubscriptionContext {
  parentSpan: any;
  parentContext: any;
  eventCount: number;
  subscriptionId: string;
}

// Map to track active subscriptions
const activeSubscriptions = new Map<string, SubscriptionContext>();

export function onSubscriptionStart(subscriptionId: string, operationName: string) {
  const span = tracer.startSpan('graphql.subscription', {
    kind: SpanKind.SERVER,
    attributes: {
      'graphql.operation.type': 'subscription',
      'graphql.operation.name': operationName,
      'subscription.id': subscriptionId,
    },
  });

  // Store the span and its context for later use
  activeSubscriptions.set(subscriptionId, {
    parentSpan: span,
    parentContext: trace.setSpan(context.active(), span),
    eventCount: 0,
    subscriptionId,
  });

  return span;
}
```

## Tracing Individual Event Deliveries

Each time the server pushes data to the subscriber, create a child span:

```typescript
export function onSubscriptionEvent(subscriptionId: string, eventData: any) {
  const sub = activeSubscriptions.get(subscriptionId);
  if (!sub) return;

  sub.eventCount += 1;

  // Create a child span under the subscription parent
  const eventSpan = tracer.startSpan(
    'graphql.subscription.event',
    {
      kind: SpanKind.PRODUCER,
      attributes: {
        'subscription.id': subscriptionId,
        'subscription.event.sequence': sub.eventCount,
        'subscription.event.payload_size': JSON.stringify(eventData).length,
      },
    },
    sub.parentContext // Link this span to the subscription parent
  );

  // Update the parent span with running totals
  sub.parentSpan.setAttribute('subscription.total_events', sub.eventCount);

  eventSpan.end();
}

export function onSubscriptionEnd(subscriptionId: string, reason: string) {
  const sub = activeSubscriptions.get(subscriptionId);
  if (!sub) return;

  sub.parentSpan.setAttribute('subscription.end_reason', reason);
  sub.parentSpan.setAttribute('subscription.total_events', sub.eventCount);
  sub.parentSpan.end();

  activeSubscriptions.delete(subscriptionId);
}
```

## Integrating with graphql-ws

The `graphql-ws` library is the standard for GraphQL over WebSocket. Here is how to hook in the tracing:

```typescript
import { useServer } from 'graphql-ws/lib/use/ws';
import { WebSocketServer } from 'ws';

const wsServer = new WebSocketServer({ port: 4000, path: '/graphql' });

useServer(
  {
    schema,
    onSubscribe(ctx, message) {
      // Called when a client starts a subscription
      const operationName = message.payload.operationName || 'anonymous';
      const subscriptionId = message.id;

      onSubscriptionStart(subscriptionId, operationName);

      // Add a span event for the subscribe message
      const sub = activeSubscriptions.get(subscriptionId);
      sub?.parentSpan.addEvent('subscription.started', {
        'graphql.query': message.payload.query,
      });
    },

    onNext(ctx, message, args, result) {
      // Called for each event pushed to the client
      onSubscriptionEvent(message.id, result);
    },

    onComplete(ctx, message) {
      // Called when subscription ends normally
      onSubscriptionEnd(message.id, 'completed');
    },

    onClose(ctx, code, reason) {
      // WebSocket closed - end all subscriptions for this connection
      // In practice, you would track which subscriptions belong to which connection
    },
  },
  wsServer
);
```

## Tracking Connection-Level Metrics

Beyond individual subscriptions, you want metrics on WebSocket connections:

```typescript
import { metrics } from '@opentelemetry/api';

const meter = metrics.getMeter('ws-subscriptions');

const activeConnectionsGauge = meter.createUpDownCounter('ws.connections.active', {
  description: 'Number of active WebSocket connections',
});

const subscriptionDuration = meter.createHistogram('graphql.subscription.duration', {
  description: 'How long subscriptions stay open in seconds',
  unit: 's',
});

// When a connection opens
activeConnectionsGauge.add(1);

// When a connection closes
activeConnectionsGauge.add(-1);

// When a subscription ends, record its duration
const durationSeconds = (Date.now() - startTime) / 1000;
subscriptionDuration.record(durationSeconds, {
  'graphql.operation.name': operationName,
});
```

## What to Look For in Your Traces

Once this instrumentation is in place, your traces will show the full subscription lifecycle. The parent span duration tells you how long subscribers stay connected. The child span count tells you how many events were delivered. Gaps between child spans show you the interval between events.

If you see subscriptions that open and immediately close, that often indicates an authentication problem or a schema mismatch. If you see subscriptions that receive thousands of events, you might have a subscriber that is not filtering properly.

The event sequence number attribute is particularly useful for detecting dropped messages. If a client reports missing data, you can check the trace to see whether the server actually sent the event.

Long-lived connections are hard to debug without proper observability. OpenTelemetry custom spans give you the visibility you need to understand what is happening inside your subscription pipeline.
