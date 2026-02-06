# How to Monitor E-Commerce Session Replay Correlation with OpenTelemetry Trace Context for Conversion Debugging

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Session Replay, Trace Context, Conversion Debugging

Description: Correlate e-commerce session replays with OpenTelemetry trace context to debug conversion failures with full frontend and backend visibility.

When a customer contacts support saying "I tried to buy something but it did not work," you usually get a vague description and no technical details. Session replay tools show you what happened on the screen, and OpenTelemetry traces show you what happened on the server. But by themselves, each tells only half the story. Connecting the two through shared trace context lets you pull up a customer's session replay and immediately jump to the exact backend traces for every click, every API call, and every error they encountered.

## The Correlation Strategy

The idea is simple: every frontend action that triggers a backend request should carry a trace context that is also recorded in the session replay metadata. When you watch a replay and see the moment a user clicks "Place Order" and gets an error, you can click through to the exact backend trace for that request.

## Setting Up Frontend Trace Context Injection

First, set up the OpenTelemetry Web SDK alongside your session replay tool. The key is injecting the trace ID into session replay events.

```javascript
// otel-session-bridge.js
import { WebTracerProvider } from '@opentelemetry/sdk-trace-web';
import { ZoneContextManager } from '@opentelemetry/context-zone';
import { W3CTraceContextPropagator } from '@opentelemetry/core';
import { registerInstrumentations } from '@opentelemetry/instrumentation';
import { FetchInstrumentation } from '@opentelemetry/instrumentation-fetch';
import { trace, context } from '@opentelemetry/api';

const provider = new WebTracerProvider({
  resource: {
    'service.name': 'storefront-web',
    'service.version': '3.1.0'
  }
});

provider.register({
  contextManager: new ZoneContextManager(),
  propagator: new W3CTraceContextPropagator()
});

// Instrument fetch to automatically propagate trace context
registerInstrumentations({
  instrumentations: [
    new FetchInstrumentation({
      propagateTraceHeaderCorsUrls: [
        /api\.yourstore\.com/,
        /checkout\.yourstore\.com/
      ],
      // Hook into each request to record trace ID in session replay
      applyCustomAttributesOnSpan: (span, request, response) => {
        const spanContext = span.spanContext();
        // Record this trace in the session replay timeline
        recordTraceInReplay(spanContext.traceId, spanContext.spanId, {
          url: request.url || request,
          method: request.method || 'GET',
          status: response ? response.status : 0
        });
      }
    })
  ]
});

const tracer = trace.getTracer('storefront.interactions');
```

## Bridging Session Replay and Traces

Create a bridge module that tags session replay events with trace IDs and vice versa.

```javascript
// replay-trace-bridge.js

// This assumes you are using a session replay tool that supports custom events
// Adapt the API calls to your specific replay tool (e.g., LogRocket, FullStory, etc.)

class ReplayTraceBridge {
  constructor(replayClient) {
    this.replayClient = replayClient;
    this.sessionId = replayClient.getSessionId();
  }

  // Record a trace reference in the session replay timeline
  recordTraceInReplay(traceId, spanId, metadata) {
    this.replayClient.addCustomEvent('backend_trace', {
      traceId: traceId,
      spanId: spanId,
      url: metadata.url,
      method: metadata.method,
      status: metadata.status,
      timestamp: Date.now()
    });
  }

  // Instrument a user action that triggers backend calls
  trackUserAction(actionName, actionFn) {
    const span = tracer.startSpan(`user.action.${actionName}`);
    const spanContext = span.spanContext();

    // Tag the session replay with this action
    this.replayClient.addCustomEvent('user_action', {
      action: actionName,
      traceId: spanContext.traceId,
      timestamp: Date.now()
    });

    // Tag the span with the session replay ID
    span.setAttribute('session.replay_id', this.sessionId);
    span.setAttribute('session.replay_url', this.getReplayUrl());
    span.setAttribute('user.action', actionName);

    return context.with(trace.setSpan(context.active(), span), async () => {
      try {
        const result = await actionFn();
        span.setAttribute('action.success', true);
        span.end();
        return result;
      } catch (error) {
        span.setAttribute('action.success', false);
        span.setAttribute('action.error', error.message);
        span.recordException(error);
        span.end();
        throw error;
      }
    });
  }

  getReplayUrl() {
    // Construct a direct link to this session in your replay tool
    return `https://replay.yourstore.com/sessions/${this.sessionId}`;
  }
}

// Make it available globally
const bridge = new ReplayTraceBridge(window.sessionReplayClient);

function recordTraceInReplay(traceId, spanId, metadata) {
  bridge.recordTraceInReplay(traceId, spanId, metadata);
}
```

## Instrumenting Critical Checkout Interactions

Wrap each checkout step so you get both a trace and a session replay annotation.

```javascript
// checkout-instrumentation.js

class InstrumentedCheckout {
  constructor(bridge) {
    this.bridge = bridge;
  }

  async addToCart(productId, quantity) {
    return this.bridge.trackUserAction('add_to_cart', async () => {
      const span = trace.getActiveSpan();
      span.setAttribute('product.id', productId);
      span.setAttribute('cart.quantity', quantity);

      const response = await fetch('/api/cart/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId, quantity })
      });

      if (!response.ok) {
        throw new Error(`Add to cart failed: ${response.status}`);
      }

      return response.json();
    });
  }

  async placeOrder(orderData) {
    return this.bridge.trackUserAction('place_order', async () => {
      const span = trace.getActiveSpan();
      span.setAttribute('order.item_count', orderData.items.length);
      span.setAttribute('order.total', orderData.total);
      span.setAttribute('payment.method', orderData.paymentMethod);

      const response = await fetch('/api/checkout/place-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(orderData)
      });

      const result = await response.json();

      if (!response.ok) {
        span.setAttribute('order.error_code', result.errorCode || 'unknown');
        span.setAttribute('order.error_message', result.message || '');
        throw new Error(result.message || 'Order placement failed');
      }

      span.setAttribute('order.id', result.orderId);
      return result;
    });
  }

  async applyPromoCode(code) {
    return this.bridge.trackUserAction('apply_promo', async () => {
      const span = trace.getActiveSpan();
      span.setAttribute('promo.code', code);

      const response = await fetch('/api/cart/promo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code })
      });

      const result = await response.json();
      span.setAttribute('promo.valid', result.valid);
      if (result.valid) {
        span.setAttribute('promo.discount', result.discount);
      }

      return result;
    });
  }
}
```

## Backend: Adding Replay Links to Traces

On the backend, when you receive a request that includes the session replay ID (passed as a header or in the trace baggage), add it to your spans so you can navigate from traces back to replays.

```python
from opentelemetry import trace

tracer = trace.get_tracer("checkout.backend")

class CheckoutHandler:
    def place_order(self, request):
        with tracer.start_as_current_span("checkout.place_order") as span:
            # The session replay ID was propagated via baggage or custom header
            replay_id = request.headers.get("X-Session-Replay-Id")
            if replay_id:
                span.set_attribute("session.replay_id", replay_id)
                span.set_attribute("session.replay_url",
                    f"https://replay.yourstore.com/sessions/{replay_id}")

            # Process the order normally
            try:
                order = self.order_service.create(request.body)
                span.set_attribute("order.id", order["id"])
                return {"orderId": order["id"]}
            except PaymentDeclinedException as e:
                span.set_attribute("order.error_code", "payment_declined")
                span.set_status(trace.StatusCode.ERROR, "Payment declined")
                return {"error": True, "errorCode": "payment_declined",
                        "message": str(e)}, 400
```

## The Debugging Workflow

When investigating a conversion failure:

1. Search for the customer's session in your replay tool
2. Watch the replay until you see the failure moment
3. Click the custom event annotation that shows the trace ID
4. Jump directly to the backend trace in your observability tool
5. See exactly which service returned an error, what the error was, and how long each step took

This bidirectional linking between session replays and distributed traces eliminates the guesswork from conversion debugging. Instead of hypothesizing about what might have gone wrong, you see exactly what the user experienced on screen and what the backend did in response.
