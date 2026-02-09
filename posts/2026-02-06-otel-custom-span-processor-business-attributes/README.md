# How to Create a Custom SpanProcessor That Enriches Spans with Business-Specific Attributes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, SpanProcessor, Custom SDK, Business Logic, Enrichment

Description: Create a custom OpenTelemetry SpanProcessor that enriches every span with business-specific attributes like user tier, feature flags, and request cost.

The built-in SpanProcessors (BatchSpanProcessor, SimpleSpanProcessor) handle batching and exporting. But what if you want to add business-specific attributes to every span before it is exported? Maybe you want to tag every span with the current user's subscription tier, active feature flags, or the estimated cost of the operation. A custom SpanProcessor is the clean way to do this.

## The SpanProcessor Interface

In OpenTelemetry, SpanProcessors are called at two points in a span's lifecycle:

- `on_start`: Called when a span is created (you can read and write attributes)
- `on_end`: Called when a span is finished (you can only read attributes)

You also need to implement `shutdown` and `force_flush` for graceful cleanup.

## Python: Business Attribute Enrichment Processor

```python
# business_span_processor.py
from opentelemetry.sdk.trace import SpanProcessor, ReadableSpan
from opentelemetry.trace import Span
from opentelemetry.context import get_current
import threading
import logging

logger = logging.getLogger(__name__)


class BusinessAttributeProcessor(SpanProcessor):
    """
    Enriches spans with business-specific attributes at creation time.
    This processor reads from thread-local context and external services
    to add attributes that help with business analytics.
    """

    def __init__(self, feature_flag_client=None, pricing_service=None):
        self._feature_flag_client = feature_flag_client
        self._pricing_service = pricing_service
        self._local = threading.local()

    def set_user_context(self, user_id, user_tier, org_id):
        """
        Call this at the start of each request to set the user context.
        The processor will add these attributes to every span created
        in this thread.
        """
        self._local.user_id = user_id
        self._local.user_tier = user_tier
        self._local.org_id = org_id

    def clear_user_context(self):
        """Call this at the end of each request."""
        self._local.user_id = None
        self._local.user_tier = None
        self._local.org_id = None

    def on_start(self, span: Span, parent_context=None):
        """Called when a span is started. Add business attributes here."""

        # Add user context if available
        user_id = getattr(self._local, "user_id", None)
        if user_id:
            span.set_attribute("user.id", user_id)
            span.set_attribute("user.tier", getattr(self._local, "user_tier", "free"))
            span.set_attribute("org.id", getattr(self._local, "org_id", "unknown"))

        # Add feature flag state
        if self._feature_flag_client:
            try:
                flags = self._feature_flag_client.get_active_flags(user_id)
                # Store as a comma-separated string for easy filtering
                span.set_attribute("feature_flags.active", ",".join(flags))
                # Also set individual flags as booleans for precise queries
                for flag in ["new_checkout", "dark_mode", "beta_api"]:
                    span.set_attribute(
                        f"feature_flag.{flag}",
                        flag in flags
                    )
            except Exception as e:
                # Never let enrichment break the application
                logger.debug(f"Failed to get feature flags: {e}")

        # Add deployment info
        span.set_attribute("deploy.version", self._get_deploy_version())
        span.set_attribute("deploy.canary", self._is_canary())

    def on_end(self, span: ReadableSpan):
        """
        Called when a span is finished. At this point the span is read-only,
        so we cannot add attributes. But we can use it for metrics or logging.
        """
        # Calculate request cost for billing purposes
        if self._pricing_service and span.attributes:
            duration_ns = span.end_time - span.start_time
            duration_ms = duration_ns / 1_000_000

            user_tier = span.attributes.get("user.tier", "free")
            cost = self._pricing_service.calculate_cost(
                tier=user_tier,
                duration_ms=duration_ms,
                span_name=span.name,
            )
            # Note: cannot set attributes on a finished span
            # Instead, emit this as a separate metric
            logger.debug(f"Span {span.name} cost: ${cost:.6f}")

    def shutdown(self):
        """Called when the TracerProvider is shutting down."""
        pass

    def force_flush(self, timeout_millis=None):
        """Force any pending data to be processed."""
        return True

    def _get_deploy_version(self):
        """Read the deployed version from environment or file."""
        import os
        return os.environ.get("DEPLOY_VERSION", "unknown")

    def _is_canary(self):
        """Check if this instance is a canary deployment."""
        import os
        return os.environ.get("CANARY", "false").lower() == "true"
```

## Registering the Processor

The custom processor is added to the TracerProvider alongside the standard BatchSpanProcessor:

```python
# main.py
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor
from opentelemetry.exporter.otlp.proto.grpc.trace_exporter import OTLPSpanExporter
from opentelemetry import trace

from business_span_processor import BusinessAttributeProcessor
from myapp.feature_flags import FeatureFlagClient
from myapp.pricing import PricingService

# Create the tracer provider
provider = TracerProvider()

# Add the business enrichment processor (runs on_start first)
business_processor = BusinessAttributeProcessor(
    feature_flag_client=FeatureFlagClient(),
    pricing_service=PricingService(),
)
provider.add_span_processor(business_processor)

# Add the export processor (handles batching and sending)
provider.add_span_processor(
    BatchSpanProcessor(
        OTLPSpanExporter(endpoint="http://localhost:4317")
    )
)

trace.set_tracer_provider(provider)
```

## Using with a Web Framework

Here is how to integrate the processor with a Flask app:

```python
# flask_app.py
from flask import Flask, request, g
from business_span_processor import BusinessAttributeProcessor

app = Flask(__name__)

# Global reference to the processor so middleware can set context
business_processor = BusinessAttributeProcessor(...)

@app.before_request
def set_business_context():
    """Extract user info from the request and set it on the processor."""
    user = get_authenticated_user(request)
    if user:
        business_processor.set_user_context(
            user_id=user.id,
            user_tier=user.subscription_tier,
            org_id=user.organization_id,
        )

@app.after_request
def clear_business_context(response):
    """Clean up the thread-local context."""
    business_processor.clear_user_context()
    return response

@app.route("/api/checkout", methods=["POST"])
def checkout():
    # Every span created during this request will automatically have
    # user.id, user.tier, org.id, and feature flag attributes
    process_checkout(request.json)
    return {"status": "ok"}
```

## Java Equivalent

The same pattern works in Java:

```java
// BusinessSpanProcessor.java
public class BusinessSpanProcessor implements SpanProcessor {

    private final ThreadLocal<UserContext> userContext = new ThreadLocal<>();

    @Override
    public void onStart(Context parentContext, ReadWriteSpan span) {
        UserContext ctx = userContext.get();
        if (ctx != null) {
            span.setAttribute("user.id", ctx.getUserId());
            span.setAttribute("user.tier", ctx.getTier());
            span.setAttribute("org.id", ctx.getOrgId());
        }
    }

    @Override
    public boolean isStartRequired() {
        return true;  // We need on_start to set attributes
    }

    @Override
    public void onEnd(ReadableSpan span) {
        // Read-only at this point
    }

    @Override
    public boolean isEndRequired() {
        return false;  // We don't need on_end
    }

    public void setUserContext(UserContext ctx) {
        userContext.set(ctx);
    }

    public void clearUserContext() {
        userContext.remove();
    }
}
```

## Wrapping Up

Custom SpanProcessors are the SDK-level equivalent of collector processors, but they run inside your application. They are perfect for adding context that only the application knows about: user identity, feature flags, business logic, and deployment state. The key rule is to never let enrichment failures break the application. Wrap everything in try/catch and log failures at debug level.
