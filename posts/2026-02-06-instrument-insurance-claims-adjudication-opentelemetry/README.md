# How to Instrument Insurance Claims Adjudication Pipelines with OpenTelemetry for SLA Tracking

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Insurance, Claims Adjudication, SLA Tracking

Description: Instrument your insurance claims adjudication pipeline with OpenTelemetry to track SLA compliance and identify processing bottlenecks.

Insurance claims adjudication is a multi-step process where a submitted claim gets validated, assessed, and ultimately paid or denied. Regulators and policyholders both care about how long this takes, and most insurers have SLAs that mandate processing within a specific number of business days. This post shows you how to instrument the adjudication pipeline with OpenTelemetry so you can track SLA compliance, spot bottlenecks, and produce audit-ready data about processing times.

## The Claims Adjudication Pipeline

A simplified claims pipeline looks like this:

1. **Intake** - claim is submitted and assigned a claim number
2. **Validation** - check policy status, coverage, deductibles
3. **Assessment** - review damage/loss, possibly assign an adjuster
4. **Decision** - approve, deny, or request more information
5. **Payment** - disburse funds if approved

Each step may be handled by a different service, and some steps involve manual review. We need to track how long each step takes and whether the overall claim meets its SLA.

## Core Instrumentation Setup

```python
from opentelemetry import trace, metrics
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.metrics import MeterProvider
from opentelemetry.sdk.trace.export import BatchSpanExporter
from opentelemetry.sdk.metrics.export import PeriodicExportingMetricReader
from opentelemetry.exporter.otlp.proto.grpc.trace_exporter import OTLPSpanExporter
from opentelemetry.exporter.otlp.proto.grpc.metric_exporter import OTLPMetricExporter

# Initialize providers
trace_provider = TracerProvider()
trace_provider.add_span_processor(
    BatchSpanExporter(OTLPSpanExporter(endpoint="http://otel-collector:4317"))
)
trace.set_tracer_provider(trace_provider)

reader = PeriodicExportingMetricReader(
    OTLPMetricExporter(endpoint="http://otel-collector:4317")
)
meter_provider = MeterProvider(metric_readers=[reader])
metrics.set_meter_provider(meter_provider)

tracer = trace.get_tracer("claims-adjudication")
meter = metrics.get_meter("claims-adjudication")
```

## Tracking Phase Durations for SLA Compliance

Since claims processing spans hours or days, we do not keep spans open for that long. Instead, we record the timestamps when each phase starts and ends, then compute the duration.

```python
import time
from datetime import datetime, timezone

# Histogram for phase durations in hours
phase_duration = meter.create_histogram(
    name="claims.phase_duration_hours",
    description="Duration of each claims processing phase in hours",
    unit="h"
)

# Counter for claims entering each phase
phase_entries = meter.create_counter(
    name="claims.phase_entries_total",
    description="Number of claims entering each phase"
)

# Histogram for total claim processing time
total_processing_time = meter.create_histogram(
    name="claims.total_processing_hours",
    description="Total time from intake to final decision in hours",
    unit="h"
)

# Counter for SLA breaches
sla_breaches = meter.create_counter(
    name="claims.sla_breaches_total",
    description="Number of claims that breached their SLA"
)

class ClaimPhaseTracker:
    """Tracks the progression of a claim through adjudication phases."""

    # SLA definitions: max allowed hours per claim type
    SLA_LIMITS = {
        "auto_collision": 72,    # 3 business days
        "homeowner_fire": 120,   # 5 business days
        "health_routine": 48,    # 2 business days
        "health_complex": 240,   # 10 business days
    }

    def record_phase_transition(self, claim_id, from_phase, to_phase, claim_type):
        """Record when a claim moves from one phase to the next."""
        claim = load_claim(claim_id)
        phase_start = claim.phase_timestamps.get(from_phase)

        if phase_start:
            duration_hours = (
                datetime.now(timezone.utc) - phase_start
            ).total_seconds() / 3600

            phase_duration.record(duration_hours, attributes={
                "claim.type": claim_type,
                "claim.phase": from_phase,
            })

        # Record the new phase entry
        phase_entries.add(1, attributes={
            "claim.type": claim_type,
            "claim.phase": to_phase,
        })

        # Check SLA if this is a terminal phase
        if to_phase in ("approved", "denied", "closed"):
            intake_time = claim.phase_timestamps.get("intake")
            if intake_time:
                total_hours = (
                    datetime.now(timezone.utc) - intake_time
                ).total_seconds() / 3600

                total_processing_time.record(total_hours, attributes={
                    "claim.type": claim_type,
                    "claim.outcome": to_phase,
                })

                # Check if SLA was breached
                sla_limit = self.SLA_LIMITS.get(claim_type, 120)
                if total_hours > sla_limit:
                    sla_breaches.add(1, attributes={
                        "claim.type": claim_type,
                        "sla_limit_hours": sla_limit,
                    })

        # Save the timestamp for this phase
        update_claim_phase(claim_id, to_phase, datetime.now(timezone.utc))
```

## Tracing Individual Phase Processing

When a phase is actively being processed (as opposed to sitting in a queue), you want detailed traces.

```python
def validate_claim(claim_id):
    """Validate a claim against the policy."""
    with tracer.start_as_current_span("claims.validate") as span:
        claim = load_claim(claim_id)
        span.set_attribute("claim.id", claim_id)
        span.set_attribute("claim.type", claim.claim_type)
        span.set_attribute("claim.amount", claim.claimed_amount)

        # Step 1: Verify the policy is active
        with tracer.start_as_current_span("claims.validate.policy_check") as policy_span:
            policy = fetch_policy(claim.policy_id)
            is_active = policy.status == "active"
            policy_span.set_attribute("policy.id", claim.policy_id)
            policy_span.set_attribute("policy.active", is_active)

            if not is_active:
                span.set_attribute("validation.result", "rejected_inactive_policy")
                return {"valid": False, "reason": "inactive_policy"}

        # Step 2: Check coverage applies to this claim type
        with tracer.start_as_current_span("claims.validate.coverage_check") as cov_span:
            coverage = check_coverage(policy, claim.claim_type)
            cov_span.set_attribute("coverage.applies", coverage.applies)
            cov_span.set_attribute("coverage.deductible", coverage.deductible)
            cov_span.set_attribute("coverage.max_payout", coverage.max_payout)

        # Step 3: Check for duplicate claims
        with tracer.start_as_current_span("claims.validate.duplicate_check") as dup_span:
            duplicates = find_duplicate_claims(claim)
            dup_span.set_attribute("duplicates.found", len(duplicates))

            if duplicates:
                span.set_attribute("validation.result", "flagged_duplicate")
                return {"valid": False, "reason": "potential_duplicate"}

        span.set_attribute("validation.result", "passed")
        return {"valid": True, "coverage": coverage}
```

## Monitoring Queue Wait Times

A significant portion of SLA time is often spent waiting in queues for manual review. Tracking this separately helps you staff appropriately.

```python
# Gauge for claims waiting in each queue
claims_in_queue = meter.create_up_down_counter(
    name="claims.queue_depth",
    description="Number of claims waiting in each processing queue"
)

# Histogram for queue wait times
queue_wait_time = meter.create_histogram(
    name="claims.queue_wait_hours",
    description="Time a claim spends waiting in a queue before being picked up",
    unit="h"
)

def assign_claim_to_queue(claim_id, queue_name, claim_type):
    """Place a claim into a processing queue."""
    claims_in_queue.add(1, attributes={
        "queue": queue_name,
        "claim.type": claim_type,
    })
    update_claim_phase(claim_id, f"queued_{queue_name}", datetime.now(timezone.utc))

def pick_claim_from_queue(claim_id, queue_name, claim_type):
    """An adjuster picks up a claim from the queue."""
    claims_in_queue.add(-1, attributes={
        "queue": queue_name,
        "claim.type": claim_type,
    })
    claim = load_claim(claim_id)
    queued_at = claim.phase_timestamps.get(f"queued_{queue_name}")
    if queued_at:
        wait_hours = (datetime.now(timezone.utc) - queued_at).total_seconds() / 3600
        queue_wait_time.record(wait_hours, attributes={
            "queue": queue_name,
            "claim.type": claim_type,
        })
```

## Building SLA Dashboards

With these metrics, you can build dashboards that show SLA compliance rates by claim type, average processing time per phase, queue depths over time, and breach trends. The combination of per-phase histograms and the total processing time histogram gives you both the detail to find bottlenecks and the high-level view to report on compliance.

## Conclusion

Claims adjudication pipelines are long-running, multi-step workflows where SLA tracking is not just a nice-to-have but a regulatory requirement. By instrumenting each phase transition, queue wait time, and processing step with OpenTelemetry, you get the data you need to ensure compliance, identify staffing gaps, and reduce overall cycle times.
