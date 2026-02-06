# How to Instrument Feature Usage Analytics with OpenTelemetry Custom Metrics for Product-Led Growth

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Product Analytics, Custom Metrics, Product-Led Growth

Description: Instrument feature usage analytics using OpenTelemetry custom metrics to drive product-led growth decisions with real telemetry data.

Product-led growth depends on understanding which features drive adoption, retention, and expansion. Instead of bolting on a separate analytics SDK, you can use OpenTelemetry custom metrics to track feature usage alongside your operational telemetry. This gives you a single pipeline for both operational and product data.

## Why Use OpenTelemetry for Product Analytics

Most teams use separate tools for product analytics (Mixpanel, Amplitude) and observability (Datadog, OneUptime). This creates a gap: product data tells you what users did, but not how the system performed when they did it. With OpenTelemetry, feature usage events carry the same trace context as your infrastructure data. When a user says "the export feature is slow," you can see both the product event and the backend trace in one view.

## Defining Feature Usage Metrics

Start by creating metrics that capture feature engagement:

```python
# feature_metrics.py
from opentelemetry import metrics

meter = metrics.get_meter("product.features")

# Count how many times each feature is used
feature_usage_counter = meter.create_counter(
    "product.feature.usage",
    description="Number of times a feature is used",
    unit="1",
)

# Track feature load time as users experience it
feature_latency = meter.create_histogram(
    "product.feature.latency",
    description="Time to complete a feature action",
    unit="ms",
)

# Gauge for currently active users per feature
active_users_gauge = meter.create_up_down_counter(
    "product.feature.active_users",
    description="Users currently engaged with a feature",
    unit="1",
)

def track_feature_used(feature_name: str, user_id: str, tenant_id: str,
                       plan: str, duration_ms: float = None):
    """Record a feature usage event with context."""
    attributes = {
        "feature.name": feature_name,
        "tenant.id": tenant_id,
        "user.plan": plan,
        "feature.category": get_feature_category(feature_name),
    }

    feature_usage_counter.add(1, attributes)

    if duration_ms is not None:
        feature_latency.record(duration_ms, attributes)
```

## Instrumenting Feature Endpoints

Wrap your feature endpoints with a decorator that automatically tracks usage:

```python
# feature_tracking_decorator.py
import functools
import time
from opentelemetry import trace
from feature_metrics import track_feature_used

tracer = trace.get_tracer("product.features")

def track_feature(feature_name: str):
    """Decorator to automatically track feature usage with timing."""
    def decorator(func):
        @functools.wraps(func)
        async def wrapper(*args, **kwargs):
            request = kwargs.get("request") or args[0]
            user = request.state.user

            start = time.time()
            with tracer.start_as_current_span(
                f"feature.{feature_name}",
                attributes={
                    "feature.name": feature_name,
                    "user.id": user.id,
                    "tenant.id": user.tenant_id,
                }
            ):
                result = await func(*args, **kwargs)
                duration_ms = (time.time() - start) * 1000

                track_feature_used(
                    feature_name=feature_name,
                    user_id=user.id,
                    tenant_id=user.tenant_id,
                    plan=user.plan,
                    duration_ms=duration_ms,
                )

                return result
        return wrapper
    return decorator

# Usage in your API routes
@router.post("/api/reports/export")
@track_feature("report_export")
async def export_report(request: Request, report_id: str):
    return await generate_report_export(report_id)

@router.post("/api/dashboards/create")
@track_feature("dashboard_create")
async def create_dashboard(request: Request, dashboard_config: dict):
    return await create_new_dashboard(dashboard_config)
```

## Tracking Feature Adoption Stages

For product-led growth, you want to know not just if a feature was used, but where users are in their adoption journey:

```python
# adoption_tracker.py
from opentelemetry import metrics

meter = metrics.get_meter("product.adoption")

adoption_counter = meter.create_counter(
    "product.adoption.stage",
    description="Feature adoption stage transitions",
    unit="1",
)

ADOPTION_THRESHOLDS = {
    "discovered": 1,    # Used the feature once
    "activated": 3,     # Used it a few times
    "adopted": 10,      # Regular usage
    "power_user": 50,   # Heavy usage
}

def check_adoption_stage(user_id: str, feature_name: str, usage_count: int):
    """Emit metrics when a user crosses an adoption threshold."""
    for stage, threshold in ADOPTION_THRESHOLDS.items():
        if usage_count == threshold:
            adoption_counter.add(1, {
                "feature.name": feature_name,
                "adoption.stage": stage,
            })
            # This is also a good trigger for in-app messages
            # or to notify the customer success team
            break
```

## Frontend Feature Tracking with the Browser SDK

Feature usage often starts in the browser. Use the OpenTelemetry JS SDK to capture frontend interactions:

```javascript
// feature-tracker.js
import { metrics } from '@opentelemetry/api';

const meter = metrics.getMeter('product.features.frontend');

const featureClickCounter = meter.createCounter('product.feature.click', {
  description: 'User clicks on feature elements',
  unit: '1',
});

const featureTimeSpent = meter.createHistogram('product.feature.time_spent', {
  description: 'Time spent interacting with a feature',
  unit: 'ms',
});

// Track feature interactions
export function trackFeatureClick(featureName, elementId) {
  featureClickCounter.add(1, {
    'feature.name': featureName,
    'ui.element': elementId,
    'user.plan': window.__userPlan || 'unknown',
  });
}

// Track time spent in a feature area
export function createFeatureSession(featureName) {
  const startTime = performance.now();

  return {
    end() {
      const duration = performance.now() - startTime;
      featureTimeSpent.record(duration, {
        'feature.name': featureName,
      });
    },
  };
}
```

## Connecting Feature Usage to Revenue

The real power of product analytics through OpenTelemetry comes when you correlate feature usage with business outcomes. By adding plan and tenant attributes to every feature metric, you can answer questions like "which features do customers on the Pro plan use most before upgrading to Enterprise?" or "which features have the strongest correlation with retention?"

These queries become straightforward when your product analytics and infrastructure telemetry share the same pipeline and attribute schema. You do not need a separate data warehouse join to connect the dots.

## Summary

Using OpenTelemetry for feature analytics eliminates the gap between product data and operational data. You get a single source of truth for "what are users doing" and "how is the system performing when they do it." For product-led growth, this unified view is what lets you invest engineering effort in the features that actually drive business outcomes.
