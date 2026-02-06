# How to Use OpenTelemetry Baggage to Pass Debug Session IDs Across Services for Targeted Tracing

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Baggage, Debugging, Distributed Tracing, Session IDs

Description: Pass debug session IDs across service boundaries using OpenTelemetry baggage to enable targeted tracing in production systems.

When debugging a specific user's issue in production, you often need to increase tracing verbosity for just that user's requests without drowning in data from everyone else. OpenTelemetry baggage lets you attach arbitrary key-value pairs to a request context that propagate across every service in the call chain. By attaching a debug session ID as baggage, you can tell every downstream service to capture extra detail for that specific request.

## What Is OpenTelemetry Baggage?

Baggage is a set of key-value pairs that travels alongside the trace context through HTTP headers. Unlike span attributes, which are local to a single span, baggage propagates across process boundaries. When Service A sets a baggage entry, Service B, C, and D all receive it automatically through the W3C Baggage header.

## Setting Up Debug Session Baggage

Here is how to attach a debug session ID at the edge of your system, typically in an API gateway or the first service that receives the request:

```python
from opentelemetry import baggage, context, trace
from opentelemetry.baggage.propagation import W3CBaggagePropagator

tracer = trace.get_tracer("api-gateway")

def handle_request(request):
    """API gateway handler that injects debug baggage when requested."""

    # Check if the request includes a debug header
    debug_session = request.headers.get("X-Debug-Session")

    if debug_session:
        # Attach the debug session ID as baggage
        ctx = baggage.set_baggage("debug.session_id", debug_session)
        ctx = baggage.set_baggage(
            "debug.verbosity", "high", context=ctx
        )
        context.attach(ctx)

    with tracer.start_as_current_span("gateway.handle_request") as span:
        span.set_attribute("debug.session_active", debug_session is not None)
        if debug_session:
            span.set_attribute("debug.session_id", debug_session)

        # Forward the request to the appropriate backend service
        response = route_request(request)
        return response
```

## Reading Baggage in Downstream Services

Every downstream service can read the baggage and adjust its behavior:

```python
from opentelemetry import baggage, trace

tracer = trace.get_tracer("order-service")

def process_order(order):
    with tracer.start_as_current_span("process_order") as span:
        # Check if this request is part of a debug session
        debug_session = baggage.get_baggage("debug.session_id")
        verbosity = baggage.get_baggage("debug.verbosity")

        if debug_session:
            # Add extra attributes that we normally skip for performance
            span.set_attribute("debug.session_id", debug_session)
            span.set_attribute("order.items", str(order.items))
            span.set_attribute("order.shipping_address", order.address)
            span.set_attribute("order.payment_method", order.payment_type)
            span.set_attribute("order.discount_codes", str(order.discounts))

            # Log the full order object for debugging
            span.add_event("order.full_details", attributes={
                "order.raw_json": order.to_json(),
            })
        else:
            # Normal operation: only record essential attributes
            span.set_attribute("order.id", order.id)
            span.set_attribute("order.total", order.total)

        return execute_order(order)
```

## Configuring the Collector for Baggage-Based Sampling

The OpenTelemetry Collector can use baggage to make sampling decisions. This lets you always capture traces for debug sessions while sampling normally for everything else:

```yaml
receivers:
  otlp:
    protocols:
      grpc:
        endpoint: 0.0.0.0:4317

processors:
  # Use tail-based sampling to keep all debug session traces
  tail_sampling:
    decision_wait: 10s
    policies:
      # Always keep traces with a debug session
      - name: debug-session-keep
        type: string_attribute
        string_attribute:
          key: debug.session_id
          values: []
          enabled_regex_matching: true
          # Match any non-empty value
          invert_match: false

      # Sample 10% of normal traffic
      - name: normal-traffic
        type: probabilistic
        probabilistic:
          sampling_percentage: 10

exporters:
  otlp:
    endpoint: "https://otel.oneuptime.com:4317"

service:
  pipelines:
    traces:
      receivers: [otlp]
      processors: [tail_sampling]
      exporters: [otlp]
```

## Building a Debug Session Manager

To make this workflow practical, build a simple session manager that your support team can use:

```python
import uuid
import time
import redis

class DebugSessionManager:
    def __init__(self, redis_client):
        self.redis = redis_client

    def create_session(self, user_id, duration_minutes=30):
        """Create a debug session for a specific user."""
        session_id = str(uuid.uuid4())[:8]
        session_data = {
            "user_id": user_id,
            "created_at": time.time(),
            "verbosity": "high",
        }

        # Store session with TTL so it auto-expires
        key = f"debug:session:{session_id}"
        self.redis.hset(key, mapping=session_data)
        self.redis.expire(key, duration_minutes * 60)

        # Also index by user ID for the gateway lookup
        self.redis.setex(
            f"debug:user:{user_id}",
            duration_minutes * 60,
            session_id,
        )

        return session_id

    def get_session_for_user(self, user_id):
        """Check if a user has an active debug session."""
        return self.redis.get(f"debug:user:{user_id}")
```

Then in your API gateway middleware:

```python
async def debug_session_middleware(request, call_next):
    user_id = request.headers.get("X-User-ID")
    if user_id:
        session_id = debug_manager.get_session_for_user(user_id)
        if session_id:
            ctx = baggage.set_baggage("debug.session_id", session_id)
            context.attach(ctx)

    response = await call_next(request)
    return response
```

## Security Considerations

Baggage propagates to every service in the call chain, including third-party services. Be careful about what you put in baggage:

- Never put sensitive data (tokens, passwords, PII) in baggage. It travels in plain-text HTTP headers.
- Validate baggage values at service boundaries. A malicious client could inject arbitrary baggage.
- Use the `debug.session_id` to look up session details from your own store, rather than putting the details directly in baggage.

## Summary

OpenTelemetry baggage turns targeted production debugging from a pipe dream into a practical workflow. Set a debug session ID at the edge, let it propagate through every service via W3C Baggage headers, and have each service add extra instrumentation when it detects the debug flag. Combine this with tail-based sampling in your collector to guarantee that debug session traces are never dropped. The result is on-demand, targeted, high-verbosity tracing for specific requests without impacting the rest of your traffic.
