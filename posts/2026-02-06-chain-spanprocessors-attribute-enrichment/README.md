# How to Chain Custom SpanProcessors for Attribute Enrichment Before BatchSpanProcessor Export

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, SpanProcessor, Attribute Enrichment, SDK

Description: Chain custom SpanProcessors to enrich span attributes with contextual data before the BatchSpanProcessor exports them.

Adding contextual attributes to spans at export time is a common requirement. You might want to add the current user ID, request correlation headers, feature flag states, or infrastructure metadata that is only available at runtime. Custom SpanProcessors that run before the BatchSpanProcessor can inject these attributes into every span before it leaves the SDK.

## The SpanProcessor Lifecycle

When a span starts, `on_start` is called with a mutable span reference. When a span ends, `on_end` is called with a read-only span reference. The key insight is that `on_start` gives you a writable span, so you can add attributes there.

```python
# on_start: span is writable - you can set attributes
def on_start(self, span, parent_context=None):
    span.set_attribute("my.key", "my.value")  # Works

# on_end: span is read-only in most SDKs
def on_end(self, span):
    # span.set_attribute("my.key", "value")  # Does NOT work
    pass
```

## Building an Enrichment Chain

Here is a practical example with three enrichment processors that add different types of context:

```python
# enrichment_processors.py
import os
import threading
from opentelemetry.context import get_current
from opentelemetry.sdk.trace import SpanProcessor


class InfrastructureEnricher(SpanProcessor):
    """Adds infrastructure metadata to every span.

    These attributes are static for the lifetime of the process,
    so we compute them once at init time.
    """

    def __init__(self):
        self._attrs = {
            "infra.node_name": os.getenv("NODE_NAME", "unknown"),
            "infra.pod_name": os.getenv("HOSTNAME", "unknown"),
            "infra.namespace": os.getenv("POD_NAMESPACE", "default"),
            "infra.container_name": os.getenv("CONTAINER_NAME", "app"),
        }

    def on_start(self, span, parent_context=None):
        for key, value in self._attrs.items():
            span.set_attribute(key, value)

    def on_end(self, span):
        pass

    def shutdown(self):
        pass

    def force_flush(self, timeout_millis=None):
        return True


class RequestContextEnricher(SpanProcessor):
    """Adds request-scoped context from thread-local storage.

    Your web framework middleware should set these values
    on the thread-local before span creation.
    """

    # Thread-local storage for request context
    _local = threading.local()

    @classmethod
    def set_request_context(cls, user_id=None, tenant_id=None, request_id=None):
        """Called by middleware to set context for the current request."""
        cls._local.user_id = user_id
        cls._local.tenant_id = tenant_id
        cls._local.request_id = request_id

    @classmethod
    def clear_request_context(cls):
        """Called by middleware after the request completes."""
        cls._local.user_id = None
        cls._local.tenant_id = None
        cls._local.request_id = None

    def on_start(self, span, parent_context=None):
        user_id = getattr(self._local, 'user_id', None)
        if user_id:
            span.set_attribute("user.id", user_id)

        tenant_id = getattr(self._local, 'tenant_id', None)
        if tenant_id:
            span.set_attribute("tenant.id", tenant_id)

        request_id = getattr(self._local, 'request_id', None)
        if request_id:
            span.set_attribute("request.id", request_id)

    def on_end(self, span):
        pass

    def shutdown(self):
        pass

    def force_flush(self, timeout_millis=None):
        return True


class FeatureFlagEnricher(SpanProcessor):
    """Adds active feature flag states to spans.

    Useful for correlating performance changes with feature rollouts.
    """

    def __init__(self, flag_provider):
        self._flag_provider = flag_provider

    def on_start(self, span, parent_context=None):
        # Get current feature flag values
        flags = self._flag_provider.get_all_flags()
        for flag_name, flag_value in flags.items():
            span.set_attribute(f"feature_flag.{flag_name}", str(flag_value))

    def on_end(self, span):
        pass

    def shutdown(self):
        pass

    def force_flush(self, timeout_millis=None):
        return True
```

## Wiring the Chain

```python
# setup.py
from opentelemetry import trace
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor
from opentelemetry.exporter.otlp.proto.grpc.trace_exporter import OTLPSpanExporter
from opentelemetry.sdk.resources import Resource
from enrichment_processors import (
    InfrastructureEnricher,
    RequestContextEnricher,
    FeatureFlagEnricher,
)

resource = Resource.create({"service.name": "order-service"})
provider = TracerProvider(resource=resource)

# Chain order matters: enrichers run before the batch exporter
# Step 1: Add infrastructure context
provider.add_span_processor(InfrastructureEnricher())

# Step 2: Add request context
provider.add_span_processor(RequestContextEnricher())

# Step 3: Add feature flags
# provider.add_span_processor(FeatureFlagEnricher(flag_provider))

# Step 4: Export enriched spans in batches
exporter = OTLPSpanExporter(endpoint="http://collector:4317", insecure=True)
provider.add_span_processor(BatchSpanProcessor(exporter))

trace.set_tracer_provider(provider)
```

## Middleware Integration

```python
# middleware.py
from flask import Flask, request, g
from enrichment_processors import RequestContextEnricher

app = Flask(__name__)

@app.before_request
def set_request_context():
    """Set request context before any spans are created."""
    RequestContextEnricher.set_request_context(
        user_id=request.headers.get("X-User-ID"),
        tenant_id=request.headers.get("X-Tenant-ID"),
        request_id=request.headers.get("X-Request-ID"),
    )

@app.after_request
def clear_request_context(response):
    """Clean up after the request."""
    RequestContextEnricher.clear_request_context()
    return response
```

## Java: Enrichment Processor Chain

```java
import io.opentelemetry.sdk.trace.SpanProcessor;
import io.opentelemetry.sdk.trace.ReadWriteSpan;
import io.opentelemetry.sdk.trace.ReadableSpan;
import io.opentelemetry.context.Context;

public class TenantEnricher implements SpanProcessor {

    @Override
    public void onStart(Context parentContext, ReadWriteSpan span) {
        // Read tenant from context (set by middleware)
        String tenantId = TenantContext.getCurrentTenantId();
        if (tenantId != null) {
            span.setAttribute("tenant.id", tenantId);
        }
    }

    @Override
    public boolean isStartRequired() {
        return true;  // We need on_start to add attributes
    }

    @Override
    public void onEnd(ReadableSpan span) {
        // Nothing to do on end
    }

    @Override
    public boolean isEndRequired() {
        return false;  // Skip on_end for performance
    }

    @Override
    public io.opentelemetry.sdk.common.CompletableResultCode shutdown() {
        return io.opentelemetry.sdk.common.CompletableResultCode.ofSuccess();
    }

    @Override
    public io.opentelemetry.sdk.common.CompletableResultCode forceFlush() {
        return io.opentelemetry.sdk.common.CompletableResultCode.ofSuccess();
    }
}
```

## Performance Tips

Enrichment processors should be lightweight since they run on the application's hot path:

1. **Cache static values** in the constructor instead of computing them on every span
2. **Avoid I/O** in `on_start` and `on_end` - no HTTP calls, no disk reads
3. **Use `isStartRequired` and `isEndRequired`** in Java to skip unnecessary callbacks
4. **Keep the number of added attributes small** - each attribute adds memory and serialization cost

The enrichment chain pattern keeps your instrumentation code clean. Your business logic creates spans with domain-specific attributes, and the enrichment processors automatically add the infrastructure and request context that every span needs.
