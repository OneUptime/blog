# How to Use the Remote Tap Processor to Live-Debug Production Telemetry Without Disrupting Pipelines

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Remote Tap, Live Debug, Production, Collector

Description: Use the OpenTelemetry remote tap processor to tap into live production telemetry streams for debugging without disrupting existing pipelines.

Debugging telemetry pipelines in production is tricky. You cannot just add a debug exporter because that would dump everything to stdout and potentially overwhelm the system. The remote tap processor lets you selectively tap into the live telemetry stream, inspect specific data matching your criteria, and disconnect when you are done. The existing pipeline continues undisturbed.

## What Is Remote Tap?

Remote tap exposes a WebSocket or gRPC endpoint on the collector. When you connect to it, you start receiving a copy of telemetry flowing through the processor. When you disconnect, the tap stops. No data is buffered while you are not connected, so there is zero overhead when the tap is idle.

## Basic Configuration

```yaml
# otel-collector-config.yaml
receivers:
  otlp:
    protocols:
      grpc:
        endpoint: "0.0.0.0:4317"

processors:
  memory_limiter:
    check_interval: 1s
    limit_mib: 512

  # Remote tap processor - exposes a debug endpoint
  remotetap:
    # Endpoint where you connect to tap into the stream
    endpoint: "localhost:12001"
    # Maximum number of simultaneous tap connections
    limit: 5

  batch:
    send_batch_size: 512
    timeout: 5s

exporters:
  otlp:
    endpoint: "https://otlp.oneuptime.com:4317"
    headers:
      x-oneuptime-token: "${ONEUPTIME_TOKEN}"

service:
  pipelines:
    traces:
      receivers: [otlp]
      processors: [memory_limiter, remotetap, batch]
      exporters: [otlp]
```

The `remotetap` processor sits in the pipeline and normally does nothing. It just passes data through. When someone connects to port 12001, it starts copying matching data to that connection.

## Connecting to the Tap

Use a WebSocket client to connect and start receiving data:

```bash
# Using websocat (install with: cargo install websocat)
websocat ws://localhost:12001/v1/traces

# Or use curl for a quick check
curl -N http://localhost:12001/v1/traces
```

You will see JSON-formatted trace data streaming in real time.

## Filtering the Tap

The real power is in filtering. You do not want to see all telemetry, just the spans you are debugging:

```bash
# Tap only traces from a specific service
websocat "ws://localhost:12001/v1/traces?service.name=payment-service"

# Tap only error spans
websocat "ws://localhost:12001/v1/traces?otel.status_code=ERROR"

# Combine filters
websocat "ws://localhost:12001/v1/traces?service.name=api-gateway&http.status_code=500"
```

## Building a Debug Script

Here is a practical script that taps into production, captures matching traces, and formats them for readability:

```bash
#!/bin/bash
# debug-tap.sh - Tap into production telemetry
# Usage: ./debug-tap.sh <service-name> [duration-seconds]

SERVICE=$1
DURATION=${2:-60}

echo "Tapping into traces for service: ${SERVICE}"
echo "Duration: ${DURATION} seconds"
echo "---"

# Connect to the remote tap and format output
timeout ${DURATION} websocat \
  "ws://localhost:12001/v1/traces?service.name=${SERVICE}" | \
  while IFS= read -r line; do
    echo "${line}" | python3 -m json.tool
    echo "---"
  done

echo "Tap complete. Captured traces for ${DURATION}s."
```

## Using Remote Tap with Port Forwarding in Kubernetes

In a Kubernetes deployment, use port forwarding to access the tap:

```bash
# Forward the remote tap port
kubectl port-forward -n monitoring \
  deployment/otel-collector 12001:12001

# In another terminal, connect to the tap
websocat ws://localhost:12001/v1/traces
```

For security, the remote tap endpoint should only be accessible within the cluster. Never expose it to the public internet.

## Tapping Multiple Signal Types

Configure separate tap instances for traces, metrics, and logs:

```yaml
processors:
  remotetap/traces:
    endpoint: "localhost:12001"
    limit: 3

  remotetap/metrics:
    endpoint: "localhost:12002"
    limit: 3

  remotetap/logs:
    endpoint: "localhost:12003"
    limit: 3

service:
  pipelines:
    traces:
      receivers: [otlp]
      processors: [memory_limiter, remotetap/traces, batch]
      exporters: [otlp]

    metrics:
      receivers: [otlp]
      processors: [memory_limiter, remotetap/metrics, batch]
      exporters: [otlp]

    logs:
      receivers: [otlp]
      processors: [memory_limiter, remotetap/logs, batch]
      exporters: [otlp]
```

## Safety Considerations

Remote tap is designed to be safe for production, but keep these things in mind:

```yaml
processors:
  remotetap:
    endpoint: "localhost:12001"
    # Limit concurrent connections to prevent resource abuse
    limit: 3
```

- **Connection limit**: Always set a limit. Each connection consumes CPU to copy and serialize data.
- **Bind to localhost**: Only bind to `localhost`, not `0.0.0.0`, to prevent external access.
- **No buffering**: Data is only sent while a client is connected. No disk or memory overhead when idle.
- **Read-only**: The tap is purely observational. It cannot modify data flowing through the pipeline.

## Practical Debugging Workflow

Here is how you would use remote tap during an incident:

```bash
# Step 1: Connect and look for errors from the affected service
websocat "ws://localhost:12001/v1/traces?service.name=checkout&otel.status_code=ERROR" | head -5

# Step 2: Grab a trace ID from the output
TRACE_ID="abc123..."

# Step 3: Look for all spans in that trace
websocat "ws://localhost:12001/v1/traces" | \
  grep "${TRACE_ID}" | python3 -m json.tool

# Step 4: Check if metrics show the issue
websocat "ws://localhost:12002/v1/metrics?service.name=checkout" | head -10

# Step 5: Disconnect when done (Ctrl+C)
```

## Wrapping Up

Remote tap is an underrated tool for production debugging. It gives you real-time visibility into what the collector is processing without adding permanent overhead to your pipeline. Keep it configured in every production collector so it is ready when you need it. The zero-cost-when-idle design means there is no reason not to have it available.
