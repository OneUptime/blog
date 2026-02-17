# How to Compare Trace Latency Over Time Using Cloud Trace Analysis Reports

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Cloud Trace, Latency Analysis, Performance Monitoring, Observability

Description: Learn how to use Cloud Trace analysis reports to compare latency over different time periods, detect performance regressions, and track the impact of optimizations.

---

Knowing your current latency is useful. Knowing how it compares to last week, last month, or the period before your last deployment is far more valuable. Cloud Trace provides analysis reports that let you do exactly this - compare latency distributions across different time periods for any endpoint in your system.

This capability is what turns Cloud Trace from a debugging tool into a performance management tool. Let me walk you through how to use it effectively.

## Accessing Analysis Reports

Open the Cloud Console and navigate to **Trace > Analysis Reports**. The reports page has two main sections:

1. **Latency overview**: A scatter plot showing request latency for a selected endpoint over time.
2. **Latency distribution comparison**: Side-by-side histograms comparing two time periods.

Start by selecting the root span you want to analyze. This is usually your HTTP endpoint, like `/api/orders` or `GET /users/:id`. You can also filter by service name if you have multiple services with the same endpoint paths.

## Creating a Comparison Report

To compare latency between two time periods, use the following approach in the Cloud Console:

1. Select your endpoint from the root span dropdown
2. Choose the first time period (the "baseline" period)
3. Choose the second time period (the "comparison" period)
4. Click "Compare"

Cloud Trace will show you:
- The latency distribution for each period
- Percentile changes (p50, p95, p99)
- A visual overlay so you can see how the distribution shifted

### Common Comparison Scenarios

**Before and after a deployment**: Select the 24 hours before your deploy as the baseline and the 24 hours after as the comparison. This immediately shows whether your change improved, degraded, or had no effect on latency.

**Week over week**: Compare the same day this week versus last week. This helps identify gradual degradation that is hard to notice day-to-day.

**Peak vs. off-peak hours**: Compare 2 PM - 4 PM (peak) against 3 AM - 5 AM (off-peak) to understand how load affects latency.

## Programmatic Analysis with the Cloud Trace API

The Cloud Console is great for interactive analysis, but for automated comparisons, use the API. Here is a Python script that compares latency between two time periods.

```python
# compare_latency.py - Compare trace latency across two time periods
from google.cloud import trace_v2
from datetime import datetime, timedelta
import statistics


def get_latencies(project_id, span_name, start_time, end_time):
    """Fetch root span latencies for a given time period."""
    client = trace_v2.TraceServiceClient()

    traces = client.list_traces(
        request={
            "project_id": project_id,
            "start_time": start_time,
            "end_time": end_time,
            "filter": f"+root:{span_name}",
            "view": trace_v2.ListTracesRequest.ViewType.ROOTSPAN,
        }
    )

    latencies = []
    for trace_obj in traces:
        for span in trace_obj.spans:
            duration = (
                span.end_time.timestamp() - span.start_time.timestamp()
            ) * 1000  # Convert to milliseconds
            latencies.append(duration)

    return latencies


def calculate_percentiles(latencies):
    """Calculate common percentiles from a list of latencies."""
    if not latencies:
        return None

    sorted_vals = sorted(latencies)
    count = len(sorted_vals)

    return {
        "count": count,
        "p50": sorted_vals[int(count * 0.50)],
        "p90": sorted_vals[int(count * 0.90)],
        "p95": sorted_vals[int(count * 0.95)],
        "p99": sorted_vals[int(count * 0.99)],
        "mean": statistics.mean(sorted_vals),
    }


def compare_periods(project_id, span_name, baseline_hours_ago, comparison_hours_ago):
    """Compare latency between two time periods."""
    now = datetime.utcnow()

    # Define the baseline period (e.g., 48-24 hours ago)
    baseline_end = now - timedelta(hours=comparison_hours_ago)
    baseline_start = now - timedelta(hours=baseline_hours_ago)

    # Define the comparison period (e.g., last 24 hours)
    comparison_end = now
    comparison_start = now - timedelta(hours=comparison_hours_ago)

    print(f"Analyzing span: {span_name}")
    print(f"Baseline: {baseline_start} to {baseline_end}")
    print(f"Comparison: {comparison_start} to {comparison_end}")
    print()

    # Fetch latencies for both periods
    baseline = get_latencies(project_id, span_name, baseline_start, baseline_end)
    comparison = get_latencies(project_id, span_name, comparison_start, comparison_end)

    baseline_stats = calculate_percentiles(baseline)
    comparison_stats = calculate_percentiles(comparison)

    if not baseline_stats or not comparison_stats:
        print("Not enough data for comparison")
        return

    # Print the comparison
    print(f"{'Metric':<10} {'Baseline':>12} {'Current':>12} {'Change':>12}")
    print("-" * 50)
    for metric in ["p50", "p90", "p95", "p99", "mean"]:
        base_val = baseline_stats[metric]
        comp_val = comparison_stats[metric]
        change_pct = ((comp_val - base_val) / base_val) * 100

        indicator = "WORSE" if change_pct > 10 else "BETTER" if change_pct < -10 else "STABLE"
        print(f"{metric:<10} {base_val:>10.1f}ms {comp_val:>10.1f}ms {change_pct:>+10.1f}% {indicator}")


# Run the comparison
compare_periods(
    project_id="your-project-id",
    span_name="/api/orders",
    baseline_hours_ago=48,
    comparison_hours_ago=24
)
```

Running this produces output like:

```
Analyzing span: /api/orders
Baseline: 2026-02-15 10:00:00 to 2026-02-16 10:00:00
Comparison: 2026-02-16 10:00:00 to 2026-02-17 10:00:00

Metric       Baseline      Current       Change
--------------------------------------------------
p50           45.2ms       48.1ms       +6.4% STABLE
p90          120.3ms      135.7ms      +12.8% WORSE
p95          210.5ms      280.3ms      +33.1% WORSE
p99          450.1ms      820.6ms      +82.3% WORSE
mean          72.4ms       89.1ms      +23.1% WORSE
```

This tells you that while median latency is stable, the tail latencies (p95, p99) have degraded significantly.

## Automated Regression Detection

You can schedule the comparison script to run after every deployment and alert if latency regresses beyond a threshold.

```python
# regression_check.py - Check for latency regressions after deployment
import sys
from compare_latency import get_latencies, calculate_percentiles
from datetime import datetime, timedelta


def check_regression(project_id, span_name, threshold_pct=20):
    """
    Compare last hour against the previous 24 hours.
    Returns True if regression is detected.
    """
    now = datetime.utcnow()

    # Baseline: 25 hours ago to 1 hour ago
    baseline = get_latencies(
        project_id, span_name,
        now - timedelta(hours=25),
        now - timedelta(hours=1)
    )

    # Current: last 1 hour
    current = get_latencies(
        project_id, span_name,
        now - timedelta(hours=1),
        now
    )

    baseline_stats = calculate_percentiles(baseline)
    current_stats = calculate_percentiles(current)

    if not baseline_stats or not current_stats:
        print("Insufficient data for regression check")
        return False

    # Check p95 regression
    p95_change = (
        (current_stats["p95"] - baseline_stats["p95"])
        / baseline_stats["p95"]
        * 100
    )

    if p95_change > threshold_pct:
        print(f"REGRESSION DETECTED: p95 increased by {p95_change:.1f}%")
        print(f"  Baseline p95: {baseline_stats['p95']:.1f}ms")
        print(f"  Current p95: {current_stats['p95']:.1f}ms")
        return True

    print(f"No regression: p95 change is {p95_change:+.1f}%")
    return False


if check_regression("your-project-id", "/api/orders"):
    sys.exit(1)  # Non-zero exit code for CI/CD pipelines
```

## Using BigQuery for Long-Term Comparisons

If you have trace data in BigQuery (as covered in a separate guide), you can run more sophisticated comparisons.

This query compares weekly latency trends over the past month.

```sql
-- Weekly latency comparison for the past 4 weeks
SELECT
  DATE_TRUNC(DATE(start_time), WEEK) AS week,
  COUNT(*) AS requests,
  ROUND(APPROX_QUANTILES(duration_ms, 100)[OFFSET(50)], 1) AS p50_ms,
  ROUND(APPROX_QUANTILES(duration_ms, 100)[OFFSET(95)], 1) AS p95_ms,
  ROUND(APPROX_QUANTILES(duration_ms, 100)[OFFSET(99)], 1) AS p99_ms
FROM
  `your-project.trace_analytics.spans`
WHERE
  span_name = "/api/orders"
  AND parent_span_id = ""
  AND start_time > TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 28 DAY)
GROUP BY
  week
ORDER BY
  week
```

## Building a Latency SLO Dashboard

Combine trace analysis with SLOs (Service Level Objectives) to track whether you are meeting your latency targets.

```sql
-- Daily SLO compliance: % of requests under 200ms
SELECT
  DATE(start_time) AS day,
  COUNT(*) AS total_requests,
  COUNTIF(duration_ms <= 200) AS fast_requests,
  ROUND(COUNTIF(duration_ms <= 200) / COUNT(*) * 100, 2) AS slo_compliance_pct,
  CASE
    WHEN COUNTIF(duration_ms <= 200) / COUNT(*) >= 0.99 THEN 'MET'
    WHEN COUNTIF(duration_ms <= 200) / COUNT(*) >= 0.95 THEN 'AT_RISK'
    ELSE 'BREACHED'
  END AS slo_status
FROM
  `your-project.trace_analytics.spans`
WHERE
  span_name = "/api/orders"
  AND parent_span_id = ""
  AND start_time > TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 30 DAY)
GROUP BY
  day
ORDER BY
  day
```

## Tips for Meaningful Comparisons

A few things to keep in mind when comparing latency across time periods:

1. **Compare like with like**: Traffic patterns vary by time of day and day of week. Compare Monday afternoon to Monday afternoon, not Monday to Sunday.

2. **Account for traffic volume**: A period with 10x more traffic will naturally have higher tail latencies due to resource contention. Normalize by checking if request volume changed significantly.

3. **Watch for outliers**: A single 30-second request can skew averages. Use percentiles (p50, p95, p99) instead of mean for more robust comparisons.

4. **Consider external factors**: Network issues, dependency degradation, and cloud provider incidents can all affect latency independent of your code changes.

5. **Minimum sample size**: Do not draw conclusions from small samples. Wait until you have at least a few hundred traces in each period before comparing.

## Wrapping Up

Comparing latency over time is essential for understanding whether your system is getting faster or slower. Use Cloud Trace analysis reports for quick visual comparisons, the Cloud Trace API for automated regression detection, and BigQuery for long-term trend analysis. The combination gives you confidence that every change you deploy either improves performance or at least does not make it worse.
