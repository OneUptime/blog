# How to Implement Differential Profiling with OpenTelemetry to Compare Before and After Deployment Performance

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Profiling, Differential, Deployment

Description: Implement differential profiling with OpenTelemetry to compare application performance before and after deployments.

You deployed a new version and latency increased by 15%. Was it your code change, a dependency update, or something environmental? Differential profiling answers this by comparing two profiles side by side: one from before the deployment and one from after. Functions that got slower show up in red, functions that got faster show up in green, and everything else fades into the background.

## What Differential Profiling Is

A differential profile (sometimes called a diff flame graph) takes two flame graphs and computes the difference. For each function, it calculates:

```
delta = (samples_after / total_after) - (samples_before / total_before)
```

A positive delta means the function consumes a larger share of CPU after the deployment. A negative delta means it consumes less. The visualization colors functions based on this delta.

## Capturing Baseline and Comparison Profiles

The key requirement is having continuous profiling running before and after the deployment. If you are already running the eBPF profiler as described in previous posts, you have this data automatically.

You need to identify the time ranges:

```bash
# Deployment happened at 2026-02-05 14:30:00 UTC
# Baseline: 1 hour before deployment
BASELINE_FROM="2026-02-05T13:30:00Z"
BASELINE_UNTIL="2026-02-05T14:30:00Z"

# Comparison: 1 hour after deployment stabilized
COMPARISON_FROM="2026-02-05T15:00:00Z"
COMPARISON_UNTIL="2026-02-05T16:00:00Z"
```

Notice the 30-minute gap after deployment. This accounts for rolling update time and lets the new version warm up (JIT compilation, cache population, etc.).

## Generating Diff Profiles with Pyroscope

Pyroscope has built-in diff profile support. In the UI:

1. Navigate to your service's CPU profile.
2. Click "Comparison" mode.
3. Select the baseline time range on the left.
4. Select the comparison time range on the right.
5. The diff flame graph renders automatically.

Programmatically, you can query the diff API:

```bash
# Query Pyroscope for a diff profile
curl -G http://pyroscope:4040/api/v1/diff \
  --data-urlencode 'query=process_cpu:cpu:nanoseconds{service_name="order-service"}' \
  --data-urlencode "leftFrom=$BASELINE_FROM" \
  --data-urlencode "leftUntil=$BASELINE_UNTIL" \
  --data-urlencode "rightFrom=$COMPARISON_FROM" \
  --data-urlencode "rightUntil=$COMPARISON_UNTIL"
```

## Automating Diff Profiles in CI/CD

You can integrate differential profiling into your deployment pipeline. After a canary deployment, automatically generate a diff profile and include it in the deployment report:

```python
import requests
import json
from datetime import datetime, timedelta

def generate_deployment_diff(service_name, deploy_time_utc):
    """
    Generate a differential profile comparing pre and post deployment.
    Returns the diff data that can be rendered or stored.
    """
    deploy_dt = datetime.fromisoformat(deploy_time_utc)

    # Baseline: 1 hour before deployment
    baseline_start = deploy_dt - timedelta(hours=1)
    baseline_end = deploy_dt

    # Comparison: 1 hour starting 30 min after deployment
    comparison_start = deploy_dt + timedelta(minutes=30)
    comparison_end = comparison_start + timedelta(hours=1)

    response = requests.get(
        "http://pyroscope:4040/api/v1/diff",
        params={
            "query": f'process_cpu:cpu:nanoseconds{{service_name="{service_name}"}}',
            "leftFrom": int(baseline_start.timestamp()),
            "leftUntil": int(baseline_end.timestamp()),
            "rightFrom": int(comparison_start.timestamp()),
            "rightUntil": int(comparison_end.timestamp()),
        }
    )

    diff_data = response.json()
    return diff_data


def find_regressions(diff_data, threshold_pct=2.0):
    """
    Find functions that increased their CPU share by more than threshold.
    Returns a list of (function_name, delta_percentage) tuples.
    """
    regressions = []
    flamegraph = diff_data.get("flamebearer", {})
    names = flamegraph.get("names", [])
    levels = flamegraph.get("levels", [])

    for level in levels:
        # Each level entry: [offset, self_left, self_right, total_left, total_right, name_idx]
        for i in range(0, len(level), 6):
            name_idx = level[i + 5]
            self_left = level[i + 1]
            self_right = level[i + 2]

            if self_left > 0:
                delta_pct = ((self_right - self_left) / self_left) * 100
                if delta_pct > threshold_pct:
                    regressions.append((names[name_idx], delta_pct))

    return sorted(regressions, key=lambda x: x[1], reverse=True)
```

## Reading a Diff Flame Graph

The color coding in a diff flame graph is straightforward:

- **Red** functions got slower (consume more CPU share after deployment).
- **Green** functions got faster (consume less CPU share).
- **Gray/neutral** functions did not change significantly.

Focus on the red bars. The wider and redder a bar is, the more significant the regression. Here is an example of what you might see:

```
processOrder()           [neutral - no change]
  validateInput()        [slightly green - 2% faster]
  calculateDiscount()    [deep red - 45% more CPU]
    lookupRules()        [deep red - 40% more CPU]
      matchPattern()     [deep red - 38% more CPU]
  saveOrder()            [neutral]
```

This immediately tells you: the deployment introduced a regression in `matchPattern()` inside the discount calculation path.

## Comparing Memory Allocation Profiles

Diff profiling works for allocation profiles too. If memory usage increased after a deployment:

```bash
curl -G http://pyroscope:4040/api/v1/diff \
  --data-urlencode 'query=memory:alloc_space:bytes{service_name="order-service"}' \
  --data-urlencode "leftFrom=$BASELINE_FROM" \
  --data-urlencode "leftUntil=$BASELINE_UNTIL" \
  --data-urlencode "rightFrom=$COMPARISON_FROM" \
  --data-urlencode "rightUntil=$COMPARISON_UNTIL"
```

A red function in the allocation diff means it is allocating more memory after the deployment. This can help catch memory leaks or inefficient data structure changes.

## Best Practices

Choose comparable time windows. Comparing a low-traffic period against a high-traffic period will produce misleading diffs. Align your baseline and comparison windows to similar traffic patterns (same time of day, similar request volume).

Give the new deployment time to stabilize before capturing the comparison window. JIT warmup, cache warming, and connection pool initialization all affect the first few minutes after deployment.

Run the diff on a per-endpoint basis if possible. A global CPU profile might dilute a regression in one endpoint if other endpoints improved. Filter by the specific endpoint or operation you are investigating.

Differential profiling turns deployment validation from "did the metrics change?" into "which exact code paths changed and by how much?" It is one of the most effective tools for catching performance regressions early.
