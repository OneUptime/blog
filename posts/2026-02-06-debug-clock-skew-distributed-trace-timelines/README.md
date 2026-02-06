# How to Use OpenTelemetry to Debug Clock Skew Issues in Distributed Trace Timelines

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Clock Skew, Distributed Tracing, Time Synchronization, Debugging

Description: Identify and correct clock skew problems in distributed trace timelines using OpenTelemetry span analysis techniques.

You open a trace in your tracing UI and something looks wrong. A child span appears to start before its parent span. A network call seems to complete before it was sent. These impossible timelines are the hallmark of clock skew, where the system clocks on different machines are not perfectly synchronized. This is a common problem in distributed systems, and OpenTelemetry traces are one of the best tools for detecting it.

## How Clock Skew Breaks Traces

Every span records its start and end time using the local system clock of the machine where it runs. When Service A on Machine 1 calls Service B on Machine 2, the trace expects that Service B's span starts after Service A sends the request. But if Machine 2's clock is 500ms behind Machine 1's clock, Service B's span will appear to start 500ms earlier than it actually did relative to Service A.

This makes trace timelines confusing and can lead to wrong conclusions during debugging. You might think a downstream service responded before being called, which makes no sense.

## Detecting Clock Skew Programmatically

Here is a script that analyzes traces to detect likely clock skew between services:

```python
from collections import defaultdict

def detect_clock_skew(trace_data):
    """
    Detect clock skew by finding child spans that appear
    to start before their parent sends the request.
    """
    spans_by_id = {s["spanId"]: s for s in trace_data["spans"]}
    skew_incidents = []

    for span in trace_data["spans"]:
        parent_id = span.get("parentSpanId")
        if not parent_id or parent_id not in spans_by_id:
            continue

        parent = spans_by_id[parent_id]

        # Get the service names from resource attributes
        child_service = span.get("resource", {}).get("service.name", "unknown")
        parent_service = parent.get("resource", {}).get("service.name", "unknown")

        # Only check cross-service spans (same service = same clock)
        if child_service == parent_service:
            continue

        # If child starts before parent, we have clock skew
        if span["startTime"] < parent["startTime"]:
            skew_ns = parent["startTime"] - span["startTime"]
            skew_incidents.append({
                "parent_service": parent_service,
                "child_service": child_service,
                "parent_span": parent["name"],
                "child_span": span["name"],
                "apparent_skew_ms": skew_ns / 1_000_000,
                "trace_id": span["traceId"],
            })

        # Also check: if child ends after parent ends by too much,
        # the child's clock may be ahead
        if span["endTime"] > parent["endTime"]:
            # Some overlap is normal, but large gaps suggest skew
            overflow_ns = span["endTime"] - parent["endTime"]
            parent_duration = parent["endTime"] - parent["startTime"]
            child_duration = span["endTime"] - span["startTime"]

            # If the child appears to outlast the parent significantly
            if overflow_ns > parent_duration * 0.5:
                skew_incidents.append({
                    "parent_service": parent_service,
                    "child_service": child_service,
                    "direction": "child_clock_ahead",
                    "overflow_ms": overflow_ns / 1_000_000,
                    "trace_id": span["traceId"],
                })

    return skew_incidents
```

## Aggregating Skew Estimates Across Multiple Traces

A single trace might show a one-off timing anomaly. To confirm clock skew, aggregate across many traces:

```python
def estimate_service_pair_skew(traces, min_samples=10):
    """
    Estimate the clock skew between each pair of services
    by analyzing many traces.
    """
    pair_offsets = defaultdict(list)

    for trace_data in traces:
        spans_by_id = {s["spanId"]: s for s in trace_data["spans"]}

        for span in trace_data["spans"]:
            parent_id = span.get("parentSpanId")
            if not parent_id or parent_id not in spans_by_id:
                continue

            parent = spans_by_id[parent_id]
            child_svc = span.get("resource", {}).get("service.name")
            parent_svc = parent.get("resource", {}).get("service.name")

            if child_svc == parent_svc:
                continue

            # The minimum possible network delay is when child starts
            # right after parent starts. Any negative value = skew.
            offset = span["startTime"] - parent["startTime"]
            pair_key = f"{parent_svc} -> {child_svc}"
            pair_offsets[pair_key].append(offset)

    results = {}
    for pair, offsets in pair_offsets.items():
        if len(offsets) < min_samples:
            continue

        offsets.sort()
        results[pair] = {
            "sample_count": len(offsets),
            "min_offset_ms": offsets[0] / 1_000_000,
            "median_offset_ms": offsets[len(offsets) // 2] / 1_000_000,
            "p5_offset_ms": offsets[int(len(offsets) * 0.05)] / 1_000_000,
        }

    return results
```

If the minimum offset for a service pair is consistently negative, the child service's clock is behind the parent's clock by at least that amount.

## Adding Clock Metadata to Spans

To help diagnose skew issues, add clock source information as resource attributes:

```python
import subprocess
from opentelemetry.sdk.resources import Resource

def get_clock_resource():
    """Create resource attributes with clock synchronization info."""
    ntp_offset = get_ntp_offset()  # Query NTP for current offset

    return Resource.create({
        "host.clock.source": "ntp",
        "host.clock.ntp_offset_ms": ntp_offset,
        "host.clock.last_sync": get_last_ntp_sync_time(),
    })

def get_ntp_offset():
    """Get the current NTP offset in milliseconds."""
    try:
        result = subprocess.run(
            ["chronyc", "tracking"],
            capture_output=True, text=True, timeout=5,
        )
        for line in result.stdout.splitlines():
            if "System time" in line:
                # Parse the offset value
                parts = line.split()
                offset_sec = float(parts[3])
                return offset_sec * 1000
    except Exception:
        return None
    return None
```

## Correcting Skew in Your Trace Backend

Some trace backends support server-side clock skew correction. If yours does not, you can build a collector processor that adjusts timestamps based on known skew values:

```yaml
processors:
  # Custom processor to adjust for known clock skew
  transform:
    trace_statements:
      - context: span
        statements:
          # Log the original timestamps for debugging
          - set(attributes["original.start_time"], start_time)
```

## Preventing Clock Skew

The best fix is to prevent skew in the first place:

1. Use NTP or PTP (Precision Time Protocol) on all machines.
2. Monitor NTP sync status and alert when offset exceeds 10ms.
3. In Kubernetes, ensure nodes have proper NTP configuration.
4. Use `chrony` instead of `ntpd` for better accuracy on cloud VMs.

## Summary

Clock skew turns your trace timelines into puzzles where effects appear before causes. Detect it by analyzing parent-child span timing across service boundaries, aggregate across many traces to get reliable skew estimates, and add clock metadata to your spans. Fix the root cause by ensuring all machines use NTP with monitoring. Your future debugging sessions will thank you for having accurate timestamps.
