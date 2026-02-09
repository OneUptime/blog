# How to Trace WebSocket Message Flows with Per-Message OpenTelemetry Context Propagation

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, WebSocket, Context Propagation, Tracing

Description: Implement per-message OpenTelemetry context propagation in WebSocket connections to trace individual message flows end-to-end.

WebSocket connections are long-lived, and that creates a tracing problem. With HTTP, each request-response pair naturally maps to one trace. With WebSockets, a single connection carries hundreds of messages over its lifetime. If you create one span for the entire connection, you lose all granularity. If you create a span per message, you need a way to propagate trace context with each individual message.

This post shows how to implement per-message context propagation for WebSocket communication using OpenTelemetry.

## The Context Propagation Challenge

In HTTP, trace context travels in headers (typically `traceparent` and `tracestate`). The client injects context, the server extracts it, and the trace continues. WebSocket messages do not have headers. You need to embed trace context inside the message payload itself.

## Designing the Message Envelope

Wrap every WebSocket message in an envelope that carries trace context:

```typescript
// message-envelope.ts
interface TracedMessage<T> {
  // The actual message payload
  payload: T;
  // OpenTelemetry trace context
  traceContext: {
    traceparent: string;
    tracestate?: string;
  };
  // Message metadata
  meta: {
    type: string;
    timestamp: number;
    messageId: string;
  };
}
```

## Client-Side: Injecting Context into Messages

On the sending side, inject the current trace context into each message:

```typescript
// ws-client.ts
import { trace, context, propagation } from '@opentelemetry/api';
import { v4 as uuidv4 } from 'uuid';

const tracer = trace.getTracer('ws-client');

class TracedWebSocket {
  private ws: WebSocket;

  constructor(url: string) {
    this.ws = new WebSocket(url);
  }

  send<T>(type: string, payload: T): void {
    // Start a new span for this outgoing message
    tracer.startActiveSpan(`ws.send: ${type}`, (span) => {
      span.setAttribute('ws.message.type', type);
      span.setAttribute('ws.direction', 'outgoing');

      // Extract the trace context from the current span
      const traceContext: Record<string, string> = {};
      propagation.inject(context.active(), traceContext);

      const message: TracedMessage<T> = {
        payload,
        traceContext: {
          traceparent: traceContext['traceparent'],
          tracestate: traceContext['tracestate'],
        },
        meta: {
          type,
          timestamp: Date.now(),
          messageId: uuidv4(),
        },
      };

      span.setAttribute('ws.message.id', message.meta.messageId);
      this.ws.send(JSON.stringify(message));
      span.end();
    });
  }
}
```

## Server-Side: Extracting Context from Messages

On the receiving side, extract the trace context and create a child span:

```typescript
// ws-server.ts
import { trace, context, propagation, SpanKind } from '@opentelemetry/api';
import { WebSocketServer } from 'ws';

const tracer = trace.getTracer('ws-server');

const wss = new WebSocketServer({ port: 8080 });

wss.on('connection', (ws) => {
  ws.on('message', (raw: string) => {
    const message: TracedMessage<any> = JSON.parse(raw);

    // Extract trace context from the message envelope
    const extractedContext = propagation.extract(
      context.active(),
      message.traceContext
    );

    // Create a span that continues the trace from the client
    context.with(extractedContext, () => {
      tracer.startActiveSpan(
        `ws.receive: ${message.meta.type}`,
        { kind: SpanKind.SERVER },
        (span) => {
          span.setAttribute('ws.message.type', message.meta.type);
          span.setAttribute('ws.message.id', message.meta.messageId);
          span.setAttribute('ws.direction', 'incoming');

          try {
            // Route to the appropriate handler
            handleMessage(message.meta.type, message.payload);
          } catch (error: any) {
            span.recordException(error);
          } finally {
            span.end();
          }
        }
      );
    });
  });
});

function handleMessage(type: string, payload: any) {
  // Your message handling logic here
  // Any spans created inside this function will be children
  // of the ws.receive span, continuing the trace
}
```

## Bidirectional: Tracing Request-Response Patterns

Many WebSocket protocols use a request-response pattern where the client sends a message and expects a reply. Link them together with span links:

```typescript
// On the server, when sending a response to a specific incoming message
function sendResponse<T>(ws: WebSocket, requestMessageId: string, type: string, payload: T) {
  tracer.startActiveSpan(`ws.reply: ${type}`, (span) => {
    span.setAttribute('ws.message.type', type);
    span.setAttribute('ws.reply_to', requestMessageId);
    span.setAttribute('ws.direction', 'outgoing');

    const traceContext: Record<string, string> = {};
    propagation.inject(context.active(), traceContext);

    const response: TracedMessage<T> = {
      payload,
      traceContext: {
        traceparent: traceContext['traceparent'],
        tracestate: traceContext['tracestate'],
      },
      meta: {
        type,
        timestamp: Date.now(),
        messageId: uuidv4(),
      },
    };

    ws.send(JSON.stringify(response));
    span.end();
  });
}
```

## Handling Binary Messages

If your WebSocket messages are binary (like Protocol Buffers), you can prepend the trace context as a header:

```typescript
// Binary message format:
// [2 bytes: context length][context bytes][payload bytes]

function packBinaryMessage(payload: Buffer, traceContext: Record<string, string>): Buffer {
  const contextBytes = Buffer.from(JSON.stringify(traceContext));
  const header = Buffer.alloc(2);
  header.writeUInt16BE(contextBytes.length, 0);
  return Buffer.concat([header, contextBytes, payload]);
}

function unpackBinaryMessage(data: Buffer): { context: Record<string, string>; payload: Buffer } {
  const contextLength = data.readUInt16BE(0);
  const contextBytes = data.subarray(2, 2 + contextLength);
  const payload = data.subarray(2 + contextLength);
  return {
    context: JSON.parse(contextBytes.toString()),
    payload,
  };
}
```

## Performance Considerations

Adding trace context to every message adds some overhead. The `traceparent` header is only 55 bytes, so the payload size increase is negligible for most applications. The bigger concern is the span creation overhead.

For high-frequency messages (like real-time game state updates at 60fps), you probably do not want a span per message. Instead, sample them:

```typescript
// Only trace every Nth message for high-frequency streams
let messageCounter = 0;
const SAMPLE_RATE = 100;

ws.on('message', (raw: string) => {
  messageCounter++;
  const shouldTrace = messageCounter % SAMPLE_RATE === 0;

  if (shouldTrace) {
    // Create span and process with tracing
  } else {
    // Process without creating a span
  }
});
```

Per-message context propagation turns opaque WebSocket connections into fully traced communication channels. You can follow a message from the client through the server and into any downstream services, just like you would with HTTP requests.
