# How to Avoid the Anti-Pattern of Sending OTLP/HTTP Traffic to the gRPC Port and Getting Protocol Errors

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, OTLP, Protocol Mismatch, Debugging

Description: Diagnose and fix the protocol mismatch error when your OTLP/HTTP exporter accidentally sends traffic to the gRPC port.

Sending HTTP/1.1 requests to a gRPC endpoint (or vice versa) is one of the most common OpenTelemetry networking mistakes. The error messages are unhelpful, and the misconfiguration can persist for days in production without anyone noticing that telemetry data is being silently dropped.

## How This Happens

The typical scenario: a developer copies an endpoint URL from one project to another without checking which protocol the exporter uses.

```javascript
// Project A uses gRPC exporter
const { OTLPTraceExporter } = require('@opentelemetry/exporter-trace-otlp-grpc');
const exporter = new OTLPTraceExporter({
  url: 'http://collector:4317',  // Correct for gRPC
});

// Project B copies the URL but uses HTTP exporter
const { OTLPTraceExporter } = require('@opentelemetry/exporter-trace-otlp-http');
const exporter = new OTLPTraceExporter({
  url: 'http://collector:4317/v1/traces',  // Wrong! HTTP exporter to gRPC port
});
```

## The Error Messages You Will See

When HTTP traffic hits the gRPC port, you might see:

```
Failed to export spans: Request failed with status 0
```

```
Error: connect ECONNREFUSED 127.0.0.1:4317
```

```
upstream connect error or disconnect/reset before headers
```

The gRPC server receives an HTTP/1.1 request and does not know what to do with it. It might close the connection, return an empty response, or time out. None of these produce an error message that says "wrong protocol."

## Diagnosing the Mismatch

### Step 1: Check Your Exporter Package

Look at your `package.json` or `requirements.txt`:

```json
{
  "dependencies": {
    "@opentelemetry/exporter-trace-otlp-http": "^0.48.0"
  }
}
```

If the package name contains `http`, you must use port 4318. If it contains `grpc`, use port 4317.

### Step 2: Check the Collector Receiver Config

```yaml
receivers:
  otlp:
    protocols:
      grpc:
        endpoint: 0.0.0.0:4317
      http:
        endpoint: 0.0.0.0:4318
```

Make sure both protocols are configured if your services use different exporters.

### Step 3: Test with curl

```bash
# Test if port 4318 (HTTP) is responding
curl -X POST http://localhost:4318/v1/traces \
  -H "Content-Type: application/json" \
  -d '{"resourceSpans":[]}'

# Expected response: {} or empty 200 OK
```

```bash
# Test if port 4317 (gRPC) is responding
# This should fail with a protocol error from curl
curl http://localhost:4317
# Expected: binary garbage or connection reset (it is gRPC, not HTTP)
```

## The Fix

### Option 1: Change the Port

If you are using the HTTP exporter, point it to port 4318:

```javascript
const { OTLPTraceExporter } = require('@opentelemetry/exporter-trace-otlp-http');

const exporter = new OTLPTraceExporter({
  url: 'http://collector:4318/v1/traces',  // HTTP port
});
```

### Option 2: Change the Exporter

If your infrastructure requires port 4317, switch to the gRPC exporter:

```javascript
// Switch from HTTP to gRPC exporter
const { OTLPTraceExporter } = require('@opentelemetry/exporter-trace-otlp-grpc');

const exporter = new OTLPTraceExporter({
  url: 'http://collector:4317',  // gRPC port, no path needed
});
```

### Option 3: Use Environment Variables

Let the SDK pick the right port based on the protocol:

```bash
# For HTTP
export OTEL_EXPORTER_OTLP_PROTOCOL=http/protobuf
export OTEL_EXPORTER_OTLP_ENDPOINT=http://collector:4318

# For gRPC
export OTEL_EXPORTER_OTLP_PROTOCOL=grpc
export OTEL_EXPORTER_OTLP_ENDPOINT=http://collector:4317
```

## The Reverse Problem: gRPC to HTTP Port

Sending gRPC traffic to the HTTP port also fails:

```python
# gRPC exporter pointing to HTTP port - wrong!
from opentelemetry.exporter.otlp.proto.grpc.trace_exporter import OTLPSpanExporter

exporter = OTLPSpanExporter(
    endpoint="http://collector:4318"  # This is the HTTP port!
)
```

The gRPC client tries to establish an HTTP/2 connection, but port 4318 expects HTTP/1.1. The error is typically:

```
grpc._channel._InactiveRpcError: <_InactiveRpcError of RPC that terminated with:
  status = StatusCode.UNAVAILABLE
  details = "failed to connect to all addresses"
>
```

## Creating a Consistency Convention

To avoid this issue across your organization, standardize on one protocol:

```bash
# In your team's shared configuration template
# We standardize on HTTP/protobuf because it works through all proxies
OTEL_EXPORTER_OTLP_PROTOCOL=http/protobuf
OTEL_EXPORTER_OTLP_ENDPOINT=http://otel-collector:4318
```

Document this choice and add it to your service template so every new service starts with the correct configuration.

## Collector Health Check

Add a health check to catch Collector issues early:

```yaml
extensions:
  health_check:
    endpoint: 0.0.0.0:13133

service:
  extensions: [health_check]
```

```bash
# Verify the Collector is healthy
curl http://localhost:13133/
# Response: {"status":"Server available"}
```

The protocol mismatch is easy to prevent once you understand the port convention. Pick one protocol, standardize the port across all services, and your telemetry pipeline will be reliable.
