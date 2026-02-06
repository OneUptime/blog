# How to Monitor Travel Aggregator API Response Times Across Multiple Supplier Backends with OpenTelemetry

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Travel Aggregator, API Monitoring, Supplier Management

Description: Monitor travel aggregator API response times across multiple supplier backends using OpenTelemetry metrics and distributed traces.

Travel aggregators sit between consumers and dozens of travel suppliers. Every search request fans out to multiple hotel chains, airlines, car rental companies, and activity providers. The aggregator's job is to return the best results quickly, but each supplier has different API performance characteristics. Some respond in 200ms, others take 3 seconds. This post shows how to monitor supplier API response times with OpenTelemetry so you can manage this complexity.

## The Aggregator Pattern

A travel aggregator typically:

1. Receives a search request from the frontend
2. Determines which suppliers to query based on the destination and request type
3. Sends parallel requests to all relevant suppliers
4. Waits for responses with a global timeout
5. Aggregates and normalizes the responses
6. Returns results to the user

The key challenge is managing the trade-off between completeness (waiting for all suppliers) and speed (returning results fast).

## Setting Up Supplier-Level Metrics

```python
from opentelemetry import metrics, trace
import time

meter = metrics.get_meter("aggregator")
tracer = trace.get_tracer("aggregator")

# Per-supplier response time tracking
supplier_latency = meter.create_histogram(
    "aggregator.supplier_latency_ms",
    description="Supplier API response time in milliseconds",
    unit="ms",
)

# Track how often suppliers are slow enough to hit timeout
supplier_timeouts = meter.create_counter(
    "aggregator.supplier_timeouts_total",
    description="Number of supplier requests that hit the timeout",
)

# Track supplier error rates
supplier_errors = meter.create_counter(
    "aggregator.supplier_errors_total",
    description="Number of supplier API errors by type",
)

# Track results contributed by each supplier
supplier_results = meter.create_histogram(
    "aggregator.supplier_results_count",
    description="Number of results returned per supplier per request",
)
```

## Instrumenting the Fan-Out Request

```python
import asyncio
from opentelemetry.trace import SpanKind, StatusCode

async def aggregate_search(search_params):
    """Fan out search to multiple suppliers and aggregate results."""
    with tracer.start_as_current_span(
        "aggregator.search",
        kind=SpanKind.SERVER,
        attributes={
            "aggregator.search_type": search_params.type,
            "aggregator.destination": search_params.destination,
        }
    ) as span:
        # Determine which suppliers to query
        suppliers = select_suppliers(search_params)
        span.set_attribute("aggregator.supplier_count", len(suppliers))
        span.set_attribute("aggregator.suppliers", str([s.name for s in suppliers]))

        global_timeout = 4.0  # Maximum time to wait for all suppliers
        span.set_attribute("aggregator.global_timeout_seconds", global_timeout)

        # Launch all supplier requests in parallel
        tasks = {}
        for supplier in suppliers:
            task = asyncio.create_task(
                query_supplier_with_tracking(supplier, search_params)
            )
            tasks[supplier.name] = task

        # Wait for all tasks with global timeout
        done, pending = await asyncio.wait(
            tasks.values(),
            timeout=global_timeout,
            return_when=asyncio.ALL_COMPLETED,
        )

        # Cancel any still-pending requests
        for task in pending:
            task.cancel()

        span.set_attribute("aggregator.completed_suppliers", len(done))
        span.set_attribute("aggregator.timed_out_suppliers", len(pending))

        # Collect results from completed tasks
        all_results = []
        for supplier_name, task in tasks.items():
            if task.done() and not task.cancelled():
                try:
                    results = task.result()
                    all_results.extend(results)
                except Exception:
                    pass  # Already tracked in the supplier span

        # Aggregate and rank
        final = rank_and_deduplicate(all_results)
        span.set_attribute("aggregator.total_raw_results", len(all_results))
        span.set_attribute("aggregator.final_results", len(final))

        return final


async def query_supplier_with_tracking(supplier, params):
    """Query a single supplier with full telemetry."""
    with tracer.start_as_current_span(
        f"aggregator.supplier.{supplier.name}",
        kind=SpanKind.CLIENT,
        attributes={
            "aggregator.supplier_name": supplier.name,
            "aggregator.supplier_type": supplier.type,
            "aggregator.supplier_region": supplier.region,
            "aggregator.supplier_timeout_ms": supplier.timeout_ms,
        }
    ) as span:
        start = time.time()

        try:
            response = await asyncio.wait_for(
                supplier.search(params),
                timeout=supplier.timeout_ms / 1000,
            )

            latency_ms = (time.time() - start) * 1000

            span.set_attribute("aggregator.supplier_latency_ms", latency_ms)
            span.set_attribute("aggregator.supplier_result_count", len(response.results))
            span.set_attribute("http.status_code", response.status_code)

            # Record metrics
            supplier_latency.record(latency_ms, {
                "aggregator.supplier_name": supplier.name,
                "aggregator.supplier_type": supplier.type,
            })

            supplier_results.record(len(response.results), {
                "aggregator.supplier_name": supplier.name,
            })

            return response.results

        except asyncio.TimeoutError:
            latency_ms = (time.time() - start) * 1000
            span.set_status(StatusCode.ERROR, "Supplier timeout")
            span.set_attribute("aggregator.supplier_timed_out", True)
            span.set_attribute("aggregator.supplier_latency_ms", latency_ms)

            supplier_timeouts.add(1, {
                "aggregator.supplier_name": supplier.name,
            })
            return []

        except Exception as e:
            span.set_status(StatusCode.ERROR, str(e))
            span.record_exception(e)

            supplier_errors.add(1, {
                "aggregator.supplier_name": supplier.name,
                "aggregator.error_type": type(e).__name__,
            })
            raise
```

## Building a Supplier Health Score

Use collected metrics to compute a real-time supplier health score:

```python
class SupplierHealthTracker:
    """Tracks supplier health and adjusts timeouts dynamically."""

    def __init__(self):
        self.health_score = meter.create_observable_gauge(
            "aggregator.supplier_health_score",
            description="Computed health score for each supplier (0-100)",
        )

    def compute_health_score(self, supplier_name, window_minutes=15):
        """Compute health score based on recent performance."""
        with tracer.start_as_current_span(
            "aggregator.compute_health_score",
            attributes={"aggregator.supplier_name": supplier_name}
        ) as span:
            recent_stats = get_recent_supplier_stats(supplier_name, window_minutes)

            # Factors in the health score
            latency_score = 100 - min(recent_stats.p95_latency_ms / 50, 100)
            error_score = 100 - (recent_stats.error_rate * 100)
            timeout_score = 100 - (recent_stats.timeout_rate * 200)
            result_score = min(recent_stats.avg_results / 10 * 100, 100)

            # Weighted composite
            health = (
                latency_score * 0.3 +
                error_score * 0.3 +
                timeout_score * 0.25 +
                result_score * 0.15
            )

            span.set_attribute("aggregator.health_score", health)
            span.set_attribute("aggregator.latency_score", latency_score)
            span.set_attribute("aggregator.error_score", error_score)

            return max(0, min(100, health))
```

## Adaptive Timeout Management

Use supplier performance data to adjust timeouts dynamically:

```python
def get_adaptive_timeout(supplier_name):
    """Calculate timeout based on recent supplier performance."""
    stats = get_recent_supplier_stats(supplier_name, window_minutes=30)

    # Set timeout to P95 latency + 20% buffer, with min/max bounds
    adaptive_timeout = stats.p95_latency_ms * 1.2
    adaptive_timeout = max(500, min(adaptive_timeout, 5000))  # Between 500ms and 5s

    return adaptive_timeout
```

## Key Dashboard Panels

Build a supplier performance dashboard with:

- Response time heatmap by supplier (P50, P95, P99)
- Timeout rate trend per supplier
- Results contributed per supplier per search
- Supplier health score over time
- Error rate breakdown by supplier and error type

## Conclusion

Monitoring travel aggregator APIs with OpenTelemetry gives you granular per-supplier performance data that you can use to optimize timeouts, adjust supplier priorities, and detect degradation before it affects users. The combination of traces for debugging individual slow requests and metrics for tracking supplier trends over time provides complete observability for the aggregation layer.
