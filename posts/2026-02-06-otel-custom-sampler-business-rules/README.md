# How to Build a Custom Sampler in OpenTelemetry That Samples Based on Business Rules (Revenue, User Tier)

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Custom Sampler, Business Rules, Sampling, SDK

Description: Build a custom OpenTelemetry sampler that makes sampling decisions based on business rules like revenue impact, user tier, and operation criticality.

The built-in samplers (AlwaysOn, AlwaysOff, TraceIdRatio, ParentBased) make decisions based on statistical probability. But business logic is not random. A trace from a user on your enterprise plan spending $50,000/year should always be sampled. A trace from an internal health check should almost never be sampled. A custom sampler lets you encode these business rules directly into the sampling decision.

## The Sampler Interface

A sampler receives context about the span being created and returns a sampling decision:

- `RECORD_AND_SAMPLE`: The span is recorded and included in the exported trace
- `RECORD_ONLY`: The span is recorded (for metrics) but not exported
- `DROP`: The span is not recorded at all

## Python: Revenue-Based Sampler

```python
# business_sampler.py
from opentelemetry.sdk.trace.sampling import (
    Sampler,
    SamplingResult,
    Decision,
)
from opentelemetry.trace import SpanKind, Link
from opentelemetry.context import Context
from typing import Optional, Sequence
import hashlib


class BusinessRuleSampler(Sampler):
    """
    Sampler that makes decisions based on business rules:
    - Enterprise users: always sample
    - Pro users: sample 50%
    - Free users: sample 5%
    - Error spans: always sample
    - High-revenue operations: always sample
    """

    # Operations that involve revenue and should always be traced
    HIGH_VALUE_OPERATIONS = {
        "process_payment",
        "create_subscription",
        "upgrade_plan",
        "process_refund",
        "checkout",
    }

    # Noisy operations that should rarely be sampled
    LOW_VALUE_OPERATIONS = {
        "health_check",
        "readiness_probe",
        "liveness_probe",
        "metrics_scrape",
    }

    def __init__(self, default_rate=0.1):
        """
        Args:
            default_rate: Sampling rate for spans that match no specific rule
        """
        self._default_rate = default_rate

    def should_sample(
        self,
        parent_context: Optional[Context],
        trace_id: int,
        name: str,
        kind: SpanKind = None,
        attributes=None,
        links: Sequence[Link] = None,
    ) -> SamplingResult:
        """Make a sampling decision based on business rules."""

        attributes = dict(attributes) if attributes else {}

        # Rule 1: Always sample high-value operations
        if name in self.HIGH_VALUE_OPERATIONS:
            attributes["sampling.rule"] = "high_value_operation"
            return SamplingResult(
                Decision.RECORD_AND_SAMPLE,
                attributes=attributes,
            )

        # Rule 2: Drop low-value operations entirely
        if name in self.LOW_VALUE_OPERATIONS:
            return SamplingResult(
                Decision.DROP,
                attributes={},
            )

        # Rule 3: Sample based on user tier
        user_tier = attributes.get("user.tier", "unknown")
        tier_rates = {
            "enterprise": 1.0,   # 100% for enterprise
            "pro": 0.5,          # 50% for pro
            "free": 0.05,        # 5% for free
            "internal": 0.01,    # 1% for internal tools
            "unknown": self._default_rate,
        }

        rate = tier_rates.get(user_tier, self._default_rate)
        attributes["sampling.rule"] = f"tier_{user_tier}"
        attributes["sampling.rate"] = rate

        # Use trace_id for consistent sampling (same trace always gets same decision)
        if self._should_sample_by_rate(trace_id, rate):
            return SamplingResult(
                Decision.RECORD_AND_SAMPLE,
                attributes=attributes,
            )

        return SamplingResult(
            Decision.DROP,
            attributes={},
        )

    def _should_sample_by_rate(self, trace_id: int, rate: float) -> bool:
        """
        Deterministic sampling based on trace ID.
        The same trace_id always produces the same decision for a given rate.
        """
        if rate >= 1.0:
            return True
        if rate <= 0.0:
            return False

        # Use the trace_id to generate a deterministic value between 0 and 1
        hash_value = int(hashlib.md5(
            trace_id.to_bytes(16, byteorder="big")
        ).hexdigest()[:8], 16)

        threshold = int(rate * 0xFFFFFFFF)
        return hash_value < threshold

    def get_description(self) -> str:
        return f"BusinessRuleSampler(default_rate={self._default_rate})"
```

## Combining with Parent-Based Sampling

In distributed systems, you usually want to respect the parent span's sampling decision. Wrap your business sampler with ParentBased:

```python
# setup.py
from opentelemetry.sdk.trace.sampling import ParentBasedTraceIdRatio, ParentBased
from opentelemetry.sdk.trace import TracerProvider
from business_sampler import BusinessRuleSampler

# ParentBased will:
# - If parent is sampled, sample the child (respect parent decision)
# - If parent is not sampled, drop the child
# - If there is no parent (root span), use our business sampler
sampler = ParentBased(
    root=BusinessRuleSampler(default_rate=0.1),
)

provider = TracerProvider(sampler=sampler)
```

## Java: Revenue-Based Sampler

```java
// BusinessRuleSampler.java
import io.opentelemetry.sdk.trace.samplers.Sampler;
import io.opentelemetry.sdk.trace.samplers.SamplingResult;
import io.opentelemetry.sdk.trace.samplers.SamplingDecision;
import io.opentelemetry.api.common.Attributes;
import io.opentelemetry.api.common.AttributeKey;
import io.opentelemetry.api.trace.SpanKind;
import io.opentelemetry.context.Context;

import java.util.List;
import java.util.Set;

public class BusinessRuleSampler implements Sampler {

    private static final Set<String> HIGH_VALUE_OPS = Set.of(
        "process_payment", "create_subscription", "checkout"
    );

    private final double defaultRate;

    public BusinessRuleSampler(double defaultRate) {
        this.defaultRate = defaultRate;
    }

    @Override
    public SamplingResult shouldSample(
            Context parentContext,
            String traceId,
            String name,
            SpanKind spanKind,
            Attributes attributes,
            List<LinkData> parentLinks) {

        // Always sample high-value operations
        if (HIGH_VALUE_OPS.contains(name)) {
            return SamplingResult.create(
                SamplingDecision.RECORD_AND_SAMPLE,
                Attributes.of(
                    AttributeKey.stringKey("sampling.rule"),
                    "high_value_operation"
                )
            );
        }

        // Sample based on user tier
        String userTier = attributes.get(AttributeKey.stringKey("user.tier"));
        double rate = switch (userTier) {
            case "enterprise" -> 1.0;
            case "pro" -> 0.5;
            case "free" -> 0.05;
            default -> defaultRate;
        };

        if (shouldSampleByRate(traceId, rate)) {
            return SamplingResult.recordAndSample();
        }

        return SamplingResult.drop();
    }

    private boolean shouldSampleByRate(String traceId, double rate) {
        // Use last 8 chars of trace ID for deterministic hashing
        long hash = Long.parseUnsignedLong(
            traceId.substring(traceId.length() - 8), 16
        );
        long threshold = (long)(rate * 0xFFFFFFFFL);
        return Long.compareUnsigned(hash, threshold) < 0;
    }

    @Override
    public String getDescription() {
        return "BusinessRuleSampler{defaultRate=" + defaultRate + "}";
    }
}
```

## Setting Up User Context for Sampling

The sampler needs access to business attributes at span creation time. Set these attributes when starting the span:

```python
# In your request handler
from opentelemetry import trace

tracer = trace.get_tracer("my-service")

def handle_request(request):
    user = authenticate(request)

    # Pass business attributes when starting the span
    # The sampler sees these attributes and makes its decision
    with tracer.start_as_current_span(
        "process_order",
        attributes={
            "user.tier": user.subscription_tier,
            "user.id": user.id,
            "order.value": request.order_total,
        }
    ) as span:
        return process_order(request)
```

## Testing the Sampler

```python
# test_sampler.py
def test_enterprise_always_sampled():
    sampler = BusinessRuleSampler(default_rate=0.01)
    result = sampler.should_sample(
        parent_context=None,
        trace_id=12345,
        name="api_call",
        attributes={"user.tier": "enterprise"},
    )
    assert result.decision == Decision.RECORD_AND_SAMPLE

def test_health_check_always_dropped():
    sampler = BusinessRuleSampler(default_rate=1.0)
    result = sampler.should_sample(
        parent_context=None,
        trace_id=12345,
        name="health_check",
    )
    assert result.decision == Decision.DROP

def test_payment_always_sampled():
    sampler = BusinessRuleSampler(default_rate=0.01)
    result = sampler.should_sample(
        parent_context=None,
        trace_id=12345,
        name="process_payment",
    )
    assert result.decision == Decision.RECORD_AND_SAMPLE
```

## Wrapping Up

Custom samplers give you business-aware sampling at the SDK level, before data even leaves your application. This is more efficient than collector-side sampling because you avoid serializing and transmitting data that will just be dropped. The key is making sampling decisions deterministic (using trace ID hashing) so that all services in a distributed trace agree on whether to sample it.
