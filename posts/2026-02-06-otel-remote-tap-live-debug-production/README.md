# How to Use the Remote Tap Processor to Live-Debug Production Telemetry Without

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Remote Tap, Live Debug, Production, Collector

Description: Use the OpenTelemetry remote tap processor to tap into live production telemetry streams for debugging without disrupting existing pipelines.

Debugging telemetry pipelines in production is tricky. You cannot just add a debug exporter because that would dump everything to stdout and potentially overwhelm the system. The remote tap processor lets you tap into the live telemetry stream, inspect a rate-limited copy of the data, and disconnect when you are done. The existing pipeline continues undisturbed.

## What Is Remote Tap?

Remote tap exposes a WebSocket endpoint on the collector. When you connect to it, you start receiving a rate-limited copy of telemetry flowing through the processor. When you disconnect, the tap stops sending data to that client. The processor continues passing telemetry through the pipeline.

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
    # Maximum tapped messages per second
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

The `remotetap` processor sits in the pipeline and passes data through. It writes a rate-limited copy of telemetry to WebSocket clients connected to port 12001.

## Connecting to the Tap

Use a WebSocket client to connect and start receiving data:

```bash
# Using websocat (install with: cargo install websocat)
websocat ws://localhost:12001
```

You will see JSON-formatted trace data streaming in real time.

## Filtering the Tap

The remote tap processor itself does not filter by query parameters. It streams a rate-limited copy of telemetry passing through that processor. Filter what you see in the client, or place Collector filtering processors before a dedicated tap point when you need server-side filtering:

```bash
# Show payloads that include a specific service
websocat "ws://localhost:12001" | \
  jq --arg service "payment-service" \
    'select(any(.. | objects; .key? == "service.name" and .value.stringValue? == $service))'

# Show payloads that include error spans
websocat "ws://localhost:12001" | \
  jq 'select(any(.. | objects; .code? == "STATUS_CODE_ERROR"))'

# Combine filters
websocat "ws://localhost:12001" | \
  jq --arg service "api-gateway" \
    'select(
      any(.. | objects; .key? == "service.name" and .value.stringValue? == $service) and
      any(.. | objects; .key? == "http.status_code" and (.value.intValue? == "500" or .value.stringValue? == "500"))
    )'
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
  "ws://localhost:12001" | \
  jq --arg service "${SERVICE}" \
    'select(any(.. | objects; .key? == "service.name" and .value.stringValue? == $service))'

echo "Tap complete. Captured traces for ${DURATION}s."
```

## Using Remote Tap with Port Forwarding in Kubernetes

In a Kubernetes deployment, use port forwarding to access the tap:

```bash
# Forward the remote tap port
kubectl port-forward -n monitoring \
  deployment/otel-collector 12001:12001

# In another terminal, connect to the tap
websocat ws://localhost:12001
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
    # Limit tapped messages per second to prevent resource abuse
    limit: 3
```

- **Rate limit**: Always set a limit. Tapped telemetry is serialized and sent to connected clients at this message-per-second rate.
- **Bind to localhost**: Only bind to `localhost`, not `0.0.0.0`, to prevent external access.
- **No persistent buffering**: Data is only sent while a client is connected. The processor does not store missed telemetry for later replay.
- **Read-only**: The tap is purely observational. It cannot modify data flowing through the pipeline.

## Practical Debugging Workflow

Here is how you would use remote tap during an incident:

```bash
# Step 1: Connect and look for errors from the affected service
websocat "ws://localhost:12001" | \
  jq --arg service "checkout" \
    'select(
      any(.. | objects; .key? == "service.name" and .value.stringValue? == $service) and
      any(.. | objects; .code? == "STATUS_CODE_ERROR")
    )' | head -5

# Step 2: Grab a trace ID from the output
TRACE_ID="abc123..."

# Step 3: Look for all spans in that trace
websocat "ws://localhost:12001" | \
  grep "${TRACE_ID}" | python3 -m json.tool

# Step 4: Check if metrics show the issue
websocat "ws://localhost:12002" | \
  jq --arg service "checkout" \
    'select(any(.. | objects; .key? == "service.name" and .value.stringValue? == $service))' | head -10

# Step 5: Disconnect when done (Ctrl+C)
```

## Wrapping Up

Remote tap is an underrated tool for production debugging. It gives you real-time visibility into what the collector is processing without adding a debug exporter to your production pipeline. Keep it configured where you can secure and rate-limit it appropriately so it is ready when you need it.
