# How to Fix the Common Mistake of Using the Wrong OTLP Port (4317 for gRPC vs 4318 for HTTP)

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, OTLP, gRPC, HTTP, Networking

Description: Resolve OTLP connection errors by understanding the port differences between gRPC (4317) and HTTP/protobuf (4318) protocols.

The OpenTelemetry Collector listens on two different ports for two different protocols: port 4317 for gRPC and port 4318 for HTTP/protobuf. Mixing them up results in cryptic connection errors that do not clearly tell you the port is wrong. This post explains how to diagnose and fix port mismatches.

## The Two OTLP Protocols

OTLP (OpenTelemetry Protocol) supports two transport mechanisms:

- **OTLP/gRPC** on port **4317**: Uses HTTP/2 with protocol buffers. This is the original OTLP transport.
- **OTLP/HTTP** on port **4318**: Uses HTTP/1.1 with protocol buffers (or JSON). This was added later for environments where gRPC is difficult to use (proxies, load balancers, serverless).

## Common Error Messages

### Sending HTTP to the gRPC Port (4317)

```
Error: 14 UNAVAILABLE: No connection established
```

or

```
Error: failed to export: unexpected HTTP status code received from server: 0
```

### Sending gRPC to the HTTP Port (4318)

```
Error: 14 UNAVAILABLE: failed to connect to all addresses
```

or

```
Error: upstream connect error or disconnect/reset before headers. retried and the latest reset reason: remote connection failure
```

These error messages never say "you are using the wrong port." You have to know the port mapping to diagnose this.

## The Fix: Match Your Exporter to the Right Port

### Node.js with HTTP Exporter

```javascript
// Using HTTP/protobuf exporter - connects to port 4318
const { OTLPTraceExporter } = require('@opentelemetry/exporter-trace-otlp-http');

const exporter = new OTLPTraceExporter({
  url: 'http://localhost:4318/v1/traces',  // Port 4318 for HTTP
});
```

### Node.js with gRPC Exporter

```javascript
// Using gRPC exporter - connects to port 4317
const { OTLPTraceExporter } = require('@opentelemetry/exporter-trace-otlp-grpc');

const exporter = new OTLPTraceExporter({
  url: 'http://localhost:4317',  // Port 4317 for gRPC (no path needed)
});
```

### Python with HTTP Exporter

```python
# HTTP exporter - port 4318
from opentelemetry.exporter.otlp.proto.http.trace_exporter import OTLPSpanExporter

exporter = OTLPSpanExporter(
    endpoint="http://localhost:4318/v1/traces"  # Port 4318
)
```

### Python with gRPC Exporter

```python
# gRPC exporter - port 4317
from opentelemetry.exporter.otlp.proto.grpc.trace_exporter import OTLPSpanExporter

exporter = OTLPSpanExporter(
    endpoint="http://localhost:4317"  # Port 4317, no path
)
```

## Key Differences in URL Format

Notice that the URL format differs between the two protocols:

| Protocol | Port | URL Format | Package |
|----------|------|------------|---------|
| gRPC | 4317 | `http://host:4317` | `exporter-trace-otlp-grpc` |
| HTTP | 4318 | `http://host:4318/v1/traces` | `exporter-trace-otlp-http` |

The HTTP URL includes the path (`/v1/traces`, `/v1/metrics`, `/v1/logs`). The gRPC URL does not use a path because gRPC uses service definitions instead of URL paths.

## Collector Configuration

Make sure your Collector has both protocols enabled if you need them:

```yaml
receivers:
  otlp:
    protocols:
      grpc:
        endpoint: 0.0.0.0:4317
      http:
        endpoint: 0.0.0.0:4318
```

If you only configure one protocol, the other port will not be listening:

```yaml
# Only gRPC - port 4318 will not be available
receivers:
  otlp:
    protocols:
      grpc:
        endpoint: 0.0.0.0:4317
```

## Using Environment Variables

The `OTEL_EXPORTER_OTLP_PROTOCOL` environment variable controls which protocol the SDK uses:

```bash
# Use HTTP/protobuf (port 4318)
export OTEL_EXPORTER_OTLP_PROTOCOL=http/protobuf
export OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4318

# Use gRPC (port 4317)
export OTEL_EXPORTER_OTLP_PROTOCOL=grpc
export OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4317
```

## When to Use Which Protocol

**Choose gRPC (4317) when:**
- Your infrastructure supports HTTP/2
- You want slightly lower overhead due to persistent connections
- You are running in Kubernetes where gRPC works natively

**Choose HTTP (4318) when:**
- You are behind a load balancer or proxy that does not support gRPC
- You are in a serverless environment (AWS Lambda, Cloud Functions)
- You need to traverse firewalls that only allow HTTP/1.1
- You want simpler debugging with standard HTTP tools like curl

## Quick Diagnostic Check

If you are unsure which port your Collector is listening on:

```bash
# Check which ports are open
netstat -tlnp | grep otel
# or
ss -tlnp | grep 4317
ss -tlnp | grep 4318
```

Or test connectivity directly:

```bash
# Test gRPC port
grpcurl -plaintext localhost:4317 list

# Test HTTP port
curl -v http://localhost:4318/v1/traces -d '{}' \
  -H "Content-Type: application/json"
```

Getting the port right is a simple check that saves hours of debugging cryptic connection errors. Remember: 4317 for gRPC, 4318 for HTTP. Match the port to your exporter package.
