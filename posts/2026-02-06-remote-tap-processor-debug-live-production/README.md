# How to Use Remote Tap Processor to Debug Live Production Traffic Without Redeploying the Collector

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Remote Tap, Collector, Production Debugging, Live Traffic

Description: Use the OpenTelemetry Collector remote tap processor to inspect live production telemetry data without redeploying or restarting.

You are debugging a production issue and you need to see the actual telemetry flowing through your OpenTelemetry Collector. But redeploying the collector to add a debug exporter means downtime, pipeline disruption, and a 15-minute deploy cycle. The remote tap processor lets you connect to a running collector and stream a copy of the telemetry data to a debug endpoint in real time, without any restarts or redeployments.

## What Is the Remote Tap Processor?

The remote tap processor is a component for the OpenTelemetry Collector that exposes a WebSocket or gRPC endpoint. When you connect to it, it streams a copy of the telemetry data passing through the processor. It is like running `tcpdump` on your telemetry pipeline. The production data flow continues uninterrupted while you get a tapped copy for debugging.

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
  remote_tap:
    endpoint: 0.0.0.0:12001
    # Limit the number of concurrent tap connections
    limit: 3

exporters:
  otlp:
    endpoint: "https://otel.oneuptime.com:4317"

service:
  pipelines:
    traces:
      receivers: [otlp]
      processors: [remote_tap, batch]
      exporters: [otlp]
    metrics:
      receivers: [otlp]
      processors: [remote_tap, batch]
      exporters: [otlp]
    logs:
      receivers: [otlp]
      processors: [remote_tap, batch]
      exporters: [otlp]
```

## Connecting to the Tap

When you need to debug, connect to the tap endpoint from your local machine. You can use a simple client that streams the tapped data:

```python
import grpc
import json
from opentelemetry.proto.collector.trace.v1 import (
    trace_service_pb2,
    trace_service_pb2_grpc,
)

def stream_traces_from_tap(tap_endpoint, duration_seconds=60):
    """
    Connect to the remote tap and stream trace data
    for the specified duration.
    """
    channel = grpc.insecure_channel(tap_endpoint)
    stub = trace_service_pb2_grpc.TraceServiceStub(channel)

    print(f"Connected to tap at {tap_endpoint}")
    print(f"Streaming for {duration_seconds} seconds...")

    request = trace_service_pb2.ExportTraceServiceRequest()
    stream = stub.Export(iter([request]))

    collected_spans = []
    start_time = time.time()

    try:
        for response in stream:
            for resource_spans in response.resource_spans:
                service_name = "unknown"
                for attr in resource_spans.resource.attributes:
                    if attr.key == "service.name":
                        service_name = attr.value.string_value

                for scope_spans in resource_spans.scope_spans:
                    for span in scope_spans.spans:
                        span_info = {
                            "service": service_name,
                            "name": span.name,
                            "trace_id": span.trace_id.hex(),
                            "duration_ms": (
                                span.end_time_unix_nano - span.start_time_unix_nano
                            ) / 1_000_000,
                            "status": span.status.code,
                        }
                        collected_spans.append(span_info)
                        print(json.dumps(span_info, indent=2))

            if time.time() - start_time > duration_seconds:
                break

    except KeyboardInterrupt:
        print("Tap disconnected")

    return collected_spans
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
            if span_info["status"] != 2:  # STATUS_CODE_ERROR
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
python tap_client.py --endpoint collector:12001 \
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

Verify that your sampling configuration is working correctly by comparing the tap output (pre-sampling) with what reaches your backend (post-sampling):

```python
tap_count = count_spans_from_tap("collector:12001", duration=60)
backend_count = query_backend_span_count(last_minutes=1)

sampling_rate = backend_count / tap_count * 100
print(f"Effective sampling rate: {sampling_rate:.1f}%")
```

## Security Considerations

The remote tap exposes raw telemetry data, which may contain sensitive information. Secure it properly:

```yaml
processors:
  remote_tap:
    endpoint: 0.0.0.0:12001
    # Use TLS
    tls:
      cert_file: /certs/tap-server.crt
      key_file: /certs/tap-server.key
      client_ca_file: /certs/ca.crt
    # Limit connections
    limit: 2
```

Also consider network policies to restrict who can connect to the tap port. Only allow connections from your operations team's network or VPN.

## Summary

The remote tap processor turns your OpenTelemetry Collector into an observable component itself. Instead of guessing what telemetry is flowing through the pipeline, you can connect and see it directly. Set it up once in your base collector config so it is always ready when you need it, secure the endpoint with TLS and network policies, and use filtered tapping to focus on the data relevant to your current debugging session. No redeployments, no restarts, no disruption to production.
