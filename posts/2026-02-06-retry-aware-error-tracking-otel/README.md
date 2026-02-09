# How to Implement Retry-Aware Error Tracking with OpenTelemetry (Distinguishing Transient from Permanent Failures)

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Retry Logic, Error Tracking, Resilience

Description: Implement retry-aware error tracking with OpenTelemetry to distinguish transient failures from permanent ones in your metrics.

Retries are everywhere in distributed systems. A database query times out, you retry, and it works. An HTTP call to a downstream service returns 503, you retry, and it succeeds. If your error tracking counts the transient failure as an error, your error rate is inflated. If it ignores it completely, you miss important signals about system health. This post shows how to track errors in a retry-aware way using OpenTelemetry so you can see both the retries happening and the actual failure rate.

## The Retry Tracking Problem

Consider this scenario:
- Your service makes 1000 requests to a downstream API.
- 50 of those get a transient error on the first attempt.
- 48 succeed on retry.
- 2 fail permanently after all retries.

What is your error rate? If you count every failed attempt, it is 5% (50/1000). If you only count permanent failures, it is 0.2% (2/1000). Both numbers are useful, but for different purposes. The 5% tells you about system health. The 0.2% tells you about user impact.

## Span Structure for Retry Tracking

Model retries as child spans under a parent span that represents the overall operation:

```python
# retry_instrumented.py
import time
from opentelemetry import trace

tracer = trace.get_tracer("my-service")

def call_with_retry(operation_name, func, max_retries=3, backoff_base=0.5):
    """
    Execute a function with retries, creating OpenTelemetry spans
    for both the overall operation and each individual attempt.
    """
    # Parent span represents the entire operation including retries
    with tracer.start_as_current_span(f"{operation_name}") as parent_span:
        parent_span.set_attribute("retry.max_attempts", max_retries + 1)

        last_exception = None
        attempt = 0

        for attempt in range(max_retries + 1):
            # Child span for each individual attempt
            with tracer.start_as_current_span(
                f"{operation_name}.attempt",
                attributes={
                    "retry.attempt_number": attempt,
                    "retry.is_retry": attempt > 0,
                },
            ) as attempt_span:
                try:
                    result = func()

                    # Attempt succeeded
                    attempt_span.set_status(trace.StatusCode.OK)
                    attempt_span.set_attribute("retry.outcome", "success")

                    # Set parent span info
                    parent_span.set_attribute("retry.total_attempts", attempt + 1)
                    parent_span.set_attribute("retry.had_transient_failures", attempt > 0)
                    parent_span.set_status(trace.StatusCode.OK)

                    if attempt > 0:
                        parent_span.set_attribute("retry.succeeded_after_retry", True)

                    return result

                except TransientError as e:
                    # Transient failure - will retry
                    last_exception = e
                    attempt_span.record_exception(e)
                    attempt_span.set_attribute("retry.outcome", "transient_failure")
                    attempt_span.set_attribute("error.transient", True)
                    attempt_span.set_status(trace.StatusCode.ERROR, str(e))

                    if attempt < max_retries:
                        # Calculate backoff and sleep
                        backoff = backoff_base * (2 ** attempt)
                        attempt_span.set_attribute("retry.backoff_seconds", backoff)
                        time.sleep(backoff)

                except PermanentError as e:
                    # Permanent failure - do not retry
                    last_exception = e
                    attempt_span.record_exception(e)
                    attempt_span.set_attribute("retry.outcome", "permanent_failure")
                    attempt_span.set_attribute("error.transient", False)
                    attempt_span.set_status(trace.StatusCode.ERROR, str(e))

                    parent_span.set_attribute("retry.total_attempts", attempt + 1)
                    parent_span.set_attribute("retry.exhausted", False)
                    parent_span.set_attribute("retry.permanent_failure", True)
                    parent_span.record_exception(e)
                    parent_span.set_status(trace.StatusCode.ERROR, str(e))
                    raise

        # All retries exhausted
        parent_span.set_attribute("retry.total_attempts", attempt + 1)
        parent_span.set_attribute("retry.exhausted", True)
        parent_span.set_attribute("retry.permanent_failure", False)
        parent_span.record_exception(last_exception)
        parent_span.set_status(
            trace.StatusCode.ERROR,
            f"All {max_retries + 1} attempts failed"
        )
        raise last_exception
```

## Custom Exception Classification

Define which errors are transient and which are permanent:

```python
# error_classification.py

class TransientError(Exception):
    """Errors that are likely to succeed on retry."""
    pass

class PermanentError(Exception):
    """Errors that will not succeed on retry."""
    pass

def classify_http_error(status_code, exception=None):
    """
    Classify an HTTP error as transient or permanent
    based on the status code.
    """
    transient_codes = {408, 429, 500, 502, 503, 504}
    permanent_codes = {400, 401, 403, 404, 405, 409, 422}

    if status_code in transient_codes:
        raise TransientError(
            f"HTTP {status_code} - transient, will retry"
        ) from exception
    elif status_code in permanent_codes:
        raise PermanentError(
            f"HTTP {status_code} - permanent, will not retry"
        ) from exception
    else:
        # Unknown status code, treat as permanent to be safe
        raise PermanentError(
            f"HTTP {status_code} - unknown, treating as permanent"
        ) from exception
```

## Tracking Retry Metrics

Create separate metrics for transient failures, permanent failures, and retry success:

```python
# retry_metrics.py
from opentelemetry import metrics

meter = metrics.get_meter("retry-tracking")

# Count of operations by final outcome
operation_outcomes = meter.create_counter(
    name="operation.outcome.total",
    description="Final outcome of operations (after all retries)",
    unit="1",
)

# Count of individual attempt outcomes
attempt_outcomes = meter.create_counter(
    name="operation.attempt.outcome.total",
    description="Outcome of individual attempts (including retries)",
    unit="1",
)

# Histogram of retry counts
retry_count_histogram = meter.create_histogram(
    name="operation.retry.count",
    description="Number of retries before success or final failure",
    unit="1",
)

def record_retry_metrics(operation_name, total_attempts, final_outcome, transient_failures):
    """Record metrics for a completed operation with retries."""
    base_attrs = {"operation": operation_name}

    # Record the final outcome
    operation_outcomes.add(1, {
        **base_attrs,
        "outcome": final_outcome,  # "success", "permanent_failure", "exhausted"
    })

    # Record retry count
    retry_count_histogram.record(total_attempts - 1, base_attrs)

    # Record per-attempt metrics
    for i in range(transient_failures):
        attempt_outcomes.add(1, {
            **base_attrs,
            "outcome": "transient_failure",
            "attempt": str(i),
        })

    if final_outcome == "success":
        attempt_outcomes.add(1, {
            **base_attrs,
            "outcome": "success",
            "attempt": str(total_attempts - 1),
        })
```

## Dashboard Queries

With these metrics, build queries that show the real picture:

```promql
# User-facing error rate (only permanent failures)
sum(rate(operation_outcome_total{outcome!="success"}[5m]))
/
sum(rate(operation_outcome_total[5m]))

# System health indicator (includes transient failures)
sum(rate(operation_attempt_outcome_total{outcome!="success"}[5m]))
/
sum(rate(operation_attempt_outcome_total[5m]))

# Retry rate (what percentage of operations need at least one retry)
sum(rate(operation_outcome_total{outcome="success"}[5m]))
-
sum(rate(operation_attempt_outcome_total{outcome="success", attempt="0"}[5m]))

# Average retries per operation
sum(rate(operation_retry_count_sum[5m]))
/
sum(rate(operation_retry_count_count[5m]))
```

## Alerting on Retry Patterns

Alert on the retry rate as an early warning signal. A rising retry rate means the system is degrading even if the final error rate looks fine:

```yaml
# alert-rules.yaml
groups:
  - name: retry-alerts
    rules:
      - alert: HighRetryRate
        expr: |
          sum(rate(operation_retry_count_sum[5m]))
          /
          sum(rate(operation_retry_count_count[5m]))
          > 0.5
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "Average retry count per operation exceeds 0.5"
          description: >
            Operations are requiring retries at an elevated rate.
            This indicates degraded downstream service health
            even though user-facing errors may still be low.
```

## Conclusion

Retry-aware error tracking gives you two views of system health: the user-facing error rate (permanent failures only) and the system health indicator (including transient failures). By modeling retries as child spans and tracking separate metrics for each outcome type, you can detect degradation early through rising retry rates while keeping your user-facing SLO metrics clean. The retry rate is often the first signal that something is going wrong, long before users start seeing errors.
