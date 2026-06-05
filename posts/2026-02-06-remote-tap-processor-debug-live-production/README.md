# How to Use Remote Tap Processor to Debug Live Production Traffic Without

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Remote Tap, Collector, Production Debugging, Live Traffic

Description: Use the OpenTelemetry Collector remote tap processor to inspect live production telemetry data without redeploying or restarting.

You are debugging a production issue and you need to see the actual telemetry flowing through your OpenTelemetry Collector. But redeploying the collector to add a debug exporter means downtime, pipeline disruption, and a 15-minute deploy cycle. The remote tap processor lets you connect to a running collector and stream a copy of the telemetry data to a debug endpoint in real time, without any restarts or redeployments.

## What Is the Remote Tap Processor?

The remote tap processor is a component for the OpenTelemetry Collector that exposes a WebSocket endpoint. When you connect to it, it streams a rate-limited copy of the telemetry data passing through the processor. It is like running `tcpdump` on your telemetry pipeline. The production data flow continues uninterrupted while you get a tapped copy for debugging.

## Setting Up the Remote Tap

Add the remote tap processor to your collector configuration. This should be done once as part of your base config, so it is always available when you need it:

```yaml
receivers:
  otlp:
    protocols:
      grpc:
        endpoint: 0.0.0.0:4317

processors:
  batch:
    send_batch_size: 1024
    timeout: 5s

  # The remote tap processor sits in the pipeline
  # but only activates when a client connects
  remotetap:
    endpoint: 0.0.0.0:12001
    # Limit tapped messages to 3 per second
    limit: 3

exporters:
  otlp:
    endpoint: "https://otel.oneuptime.com:4317"

service:
  pipelines:
    traces:
      receivers: [otlp]
      processors: [remotetap, batch]
      exporters: [otlp]
    metrics:
      receivers: [otlp]
      processors: [remotetap, batch]
      exporters: [otlp]
    logs:
      receivers: [otlp]
      processors: [remotetap, batch]
      exporters: [otlp]
```

## Connecting to the Tap

When you need to debug, connect to the tap endpoint from your local machine. You can use a simple client that streams the tapped data:

```python
import json
import time

import websocket


def _attribute_string(attributes, key):
    for attr in attributes:
        if attr.get("key") == key:
            return attr.get("value", {}).get("stringValue")
    return None


def _status_code(status):
    code = (status or {}).get("code", 0)
    if isinstance(code, str):
        return code
    return {
        0: "STATUS_CODE_UNSET",
        1: "STATUS_CODE_OK",
        2: "STATUS_CODE_ERROR",
    }.get(code, code)


def stream_traces_from_tap(tap_endpoint, duration_seconds=60):
    """
    Connect to the remote tap WebSocket and stream trace data
    for the specified duration. Install the client with:
    pip install websocket-client
    """
    if "://" not in tap_endpoint:
        tap_endpoint = f"ws://{tap_endpoint}"

    ws = websocket.create_connection(tap_endpoint, timeout=duration_seconds)
    deadline = time.time() + duration_seconds

    print(f"Connected to tap at {tap_endpoint}")
    print(f"Streaming for {duration_seconds} seconds...")

    try:
        while time.time() < deadline:
            ws.settimeout(max(0.1, deadline - time.time()))
            try:
                payload = json.loads(ws.recv())
            except websocket.WebSocketTimeoutException:
                break

            for resource_spans in payload.get("resourceSpans", []):
                resource = resource_spans.get("resource", {})
                service_name = (
                    _attribute_string(resource.get("attributes", []), "service.name")
                    or "unknown"
                )

                for scope_spans in resource_spans.get("scopeSpans", []):
                    for span in scope_spans.get("spans", []):
                        start_ns = int(span.get("startTimeUnixNano", 0))
                        end_ns = int(span.get("endTimeUnixNano", 0))
                        span_info = {
                            "service": service_name,
                            "name": span.get("name", ""),
                            "trace_id": span.get("traceId", ""),
                            "duration_ms": (end_ns - start_ns) / 1_000_000,
                            "status": _status_code(span.get("status")),
                        }
                        print(json.dumps(span_info, indent=2))
                        yield span_info

    except KeyboardInterrupt:
        print("Tap disconnected")
    finally:
        ws.close()
```

## Building a Debug Filter

In production, the tap will show you everything, which can be overwhelming. Build a filter to focus on what matters:

```python
def filtered_tap(tap_endpoint, filters):
    """
    Stream from the tap but only show spans matching the filters.

    filters = {
        "service_name": "checkout-service",
        "min_duration_ms": 1000,
        "has_error": True,
        "span_name_contains": "payment",
    }
    """
    for span_info in stream_traces_from_tap(tap_endpoint):
        # Apply filters
        if filters.get("service_name"):
            if span_info["service"] != filters["service_name"]:
                continue

        if filters.get("min_duration_ms"):
            if span_info["duration_ms"] < filters["min_duration_ms"]:
                continue

        if filters.get("has_error"):
            if span_info["status"] not in (2, "STATUS_CODE_ERROR"):
                continue

        if filters.get("span_name_contains"):
            if filters["span_name_contains"] not in span_info["name"]:
                continue

        yield span_info


# Usage during debugging

for span in filtered_tap("collector:12001", {
    "service_name": "payment-service",
    "has_error": True,
}):
    print(f"Error in {span['name']}: trace_id={span['trace_id']}")
```

## Using the Tap for Live Debugging Scenarios

### Scenario 1: Verifying Instrumentation

You just deployed new instrumentation and want to verify it is working without waiting for it to show up in your backend:

```bash
# Quick one-liner to check if spans are flowing
python tap_client.py --endpoint ws://collector:12001 \
    --filter-service "new-service" \
    --duration 30
```

### Scenario 2: Investigating an Active Incident

Your error rate just spiked. Connect to the tap and filter for error spans:

```python
errors = list(filtered_tap("collector:12001", {
    "has_error": True,
    "min_duration_ms": 0,
}))

# Group errors by service and span name
from collections import Counter
error_groups = Counter(
    f"{e['service']}/{e['name']}" for e in errors
)
for group, count in error_groups.most_common(10):
    print(f"{count:>5}  {group}")
```

### Scenario 3: Checking Sampling Behavior

Verify that your sampling configuration is working correctly by comparing the tap output with what reaches your backend. The tap output is pre-sampling only when the `remotetap` processor is placed before the sampler in the pipeline:

```python
tap_count = sum(
    1 for _ in stream_traces_from_tap("collector:12001", duration_seconds=60)
)
backend_count = query_backend_span_count(last_minutes=1)  # Backend-specific helper

sampling_rate = backend_count / tap_count * 100 if tap_count else 0
print(f"Effective sampling rate: {sampling_rate:.1f}%")
```

## Security Considerations

The remote tap exposes raw telemetry data, which may contain sensitive information. Secure it properly:

```yaml
processors:
  remotetap:
    endpoint: 0.0.0.0:12001
    # Use TLS
    tls:
      cert_file: /certs/tap-server.crt
      key_file: /certs/tap-server.key
      client_ca_file: /certs/ca.crt
    # Limit tapped messages to 2 per second
    limit: 2
```

Also consider network policies to restrict who can connect to the tap port. Only allow connections from your operations team's network or VPN.

## Summary

The remote tap processor turns your OpenTelemetry Collector into an observable component itself. Instead of guessing what telemetry is flowing through the pipeline, you can connect and see it directly. Set it up once in your base collector config so it is always ready when you need it, secure the endpoint with TLS and network policies, and use filtered tapping to focus on the data relevant to your current debugging session. No redeployments, no restarts, no disruption to production.
