# How to Fix Grafana Tempo Not Receiving Traces Because the Collector Uses OTLP/gRPC but Tempo Expects HTTP

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Grafana Tempo, OTLP, gRPC

Description: Fix traces not arriving in Grafana Tempo due to protocol mismatch between the Collector OTLP exporter and Tempo ingestion endpoint.

You configure the OpenTelemetry Collector to export traces to Grafana Tempo. The Collector logs show no export errors. But Tempo has no traces. After investigation, you discover the Collector is sending OTLP/gRPC on port 4317, but Tempo is only configured to accept OTLP/HTTP on port 4318, or vice versa.

## The Protocol Mismatch

OTLP supports two transport protocols:
- **gRPC** on port 4317 (default for OTLP gRPC)
- **HTTP** on port 4318 (default for OTLP HTTP)

The Collector's `otlp` exporter defaults to gRPC. Tempo might be configured for HTTP only, or on a different port.

## Diagnosing the Issue

### Check the Collector Exporter Config

```yaml
# This is gRPC by default
exporters:
  otlp:
    endpoint: tempo:4317    # gRPC endpoint
```

### Check Tempo's Configuration

```yaml
# Tempo configuration
distributor:
  receivers:
    otlp:
      protocols:
        grpc:
          endpoint: 0.0.0.0:4317  # Is this enabled?
        http:
          endpoint: 0.0.0.0:4318  # Is this enabled?
```

If Tempo only has `http` enabled and the Collector sends gRPC, the connection fails silently or with an error that does not clearly indicate a protocol mismatch.

### Check for Connection Errors

Look at the Collector logs more carefully:

```bash
kubectl logs <collector-pod> | grep -i "tempo\|export\|failed\|error"
```

You might see:
- `rpc error: code = Unavailable` (gRPC to non-gRPC endpoint)
- `connection refused` (wrong port)
- No errors at all (if the connection "succeeds" but the wrong protocol is used)

## Fix 1: Match the Collector to Tempo's gRPC Endpoint

If Tempo accepts gRPC:

```yaml
# Collector config
exporters:
  otlp:
    endpoint: tempo:4317
    tls:
      insecure: true

# Tempo config
distributor:
  receivers:
    otlp:
      protocols:
        grpc:
          endpoint: 0.0.0.0:4317
```

## Fix 2: Switch the Collector to OTLP/HTTP

If Tempo only accepts HTTP:

```yaml
# Collector config - use otlphttp exporter
exporters:
  otlphttp:
    endpoint: http://tempo:4318
    tls:
      insecure: true

service:
  pipelines:
    traces:
      receivers: [otlp]
      processors: [batch]
      exporters: [otlphttp]     # use otlphttp, not otlp
```

Note that `otlp` and `otlphttp` are two different exporters. The `otlp` exporter uses gRPC. The `otlphttp` exporter uses HTTP.

## Fix 3: Enable Both Protocols in Tempo

The safest approach is to enable both protocols in Tempo:

```yaml
# Tempo configuration
distributor:
  receivers:
    otlp:
      protocols:
        grpc:
          endpoint: 0.0.0.0:4317
        http:
          endpoint: 0.0.0.0:4318
```

Then the Collector can use either protocol.

## Kubernetes Service Configuration

Make sure the Tempo Service exposes both ports:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: tempo
spec:
  selector:
    app: tempo
  ports:
  - name: otlp-grpc
    port: 4317
    targetPort: 4317
  - name: otlp-http
    port: 4318
    targetPort: 4318
  - name: tempo-query
    port: 3200
    targetPort: 3200
```

If you forget to add the port to the Service, the Collector cannot reach it even if Tempo is configured correctly.

## Testing the Connection

### Test gRPC Connectivity

```bash
# From the Collector pod
kubectl exec <collector-pod> -- \
  wget -qO- --spider http://tempo:4317
# gRPC endpoints won't respond to HTTP, but you can check port is open

# Better: use grpcurl
kubectl exec <collector-pod> -- \
  grpcurl -plaintext tempo:4317 list
```

### Test HTTP Connectivity

```bash
kubectl exec <collector-pod> -- \
  wget -qO- http://tempo:4318/v1/traces
```

A 405 Method Not Allowed response means the endpoint is reachable (it just does not accept GET).

### Send a Test Trace

```bash
# Install otel-cli in the Collector pod or a debug pod
otel-cli span \
  --service "test" \
  --name "connectivity-test" \
  --endpoint "tempo:4317" \
  --protocol grpc

# Check Tempo API for the trace
curl -s "http://tempo:3200/api/search?q={resource.service.name=\"test\"}" | jq .
```

## Helm Chart Configuration

If using the Grafana Tempo Helm chart, check the values:

```yaml
# tempo-values.yaml
tempo:
  receivers:
    otlp:
      protocols:
        grpc:
          endpoint: "0.0.0.0:4317"
        http:
          endpoint: "0.0.0.0:4318"
```

## Summary

The most common cause of traces not reaching Tempo is a protocol mismatch: the Collector uses gRPC (port 4317) while Tempo expects HTTP (port 4318), or vice versa. Verify that both the Collector exporter and Tempo receiver agree on the protocol. Use the `otlp` exporter for gRPC and `otlphttp` for HTTP. Enable both protocols in Tempo to avoid this issue entirely.
