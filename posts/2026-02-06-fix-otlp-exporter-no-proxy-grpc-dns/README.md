# How to Fix the OTLP Exporter Not Respecting NO_PROXY Configuration Due to gRPC DNS Resolver Behavior

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, gRPC, Proxy, Networking

Description: Fix the issue where the OTLP gRPC exporter ignores NO_PROXY settings because of how gRPC handles DNS resolution.

You have set `HTTP_PROXY`, `HTTPS_PROXY`, and `NO_PROXY` environment variables correctly. HTTP-based exporters respect them fine. But the gRPC-based OTLP exporter keeps trying to route through the proxy anyway, even for hosts listed in `NO_PROXY`. This is a known gotcha with how gRPC handles proxy configuration.

## The Root Cause

The standard Go `net/http` library reads `HTTP_PROXY`, `HTTPS_PROXY`, and `NO_PROXY` from environment variables and handles them correctly. But gRPC in Go uses its own transport layer that does not always respect these variables in the same way.

Specifically, older versions of the `grpc-go` library did not check `NO_PROXY` at all. More recent versions do, but there are edge cases where the gRPC DNS resolver resolves the hostname to an IP address *before* checking proxy rules, and the IP address does not match the hostname patterns in `NO_PROXY`.

## Reproducing the Problem

Here is a typical environment setup:

```bash
export HTTP_PROXY="http://corporate-proxy.internal:3128"
export HTTPS_PROXY="http://corporate-proxy.internal:3128"
export NO_PROXY="otel-collector.observability.svc.cluster.local,10.0.0.0/8,.internal"

# Your OTLP exporter endpoint
export OTEL_EXPORTER_OTLP_ENDPOINT="http://otel-collector.observability.svc.cluster.local:4317"
```

You would expect the exporter to bypass the proxy for the Collector since it matches `NO_PROXY`. But you see errors like:

```
failed to export: rpc error: code = Unavailable desc = connection error:
desc = "transport: Error while dialing: proxy connect to corporate-proxy.internal:3128 failed"
```

## Fix 1: Use the IP Address Directly

If you know the Collector's ClusterIP, you can bypass DNS entirely:

```bash
# Get the Collector service IP
kubectl get svc otel-collector -n observability -o jsonpath='{.spec.clusterIP}'
# Output: 10.96.45.123

# Use the IP directly and make sure it matches a NO_PROXY CIDR
export OTEL_EXPORTER_OTLP_ENDPOINT="http://10.96.45.123:4317"
export NO_PROXY="10.0.0.0/8"
```

This is not ideal because ClusterIPs can change, but it confirms whether the issue is in DNS resolution vs. proxy routing.

## Fix 2: Upgrade grpc-go

The gRPC library has improved proxy handling over time. Make sure you are using a recent version:

```go
// In your go.mod, ensure you have at least v1.58.0
require (
    google.golang.org/grpc v1.62.0
)
```

Then rebuild your application. Newer versions of grpc-go properly respect the `NO_PROXY` environment variable.

## Fix 3: Use the HTTP/protobuf Exporter Instead

If the gRPC proxy issues are too painful, switch to the HTTP/protobuf OTLP exporter. It uses the standard `net/http` library, which handles proxy configuration correctly:

```bash
# Switch from gRPC (port 4317) to HTTP (port 4318)
export OTEL_EXPORTER_OTLP_ENDPOINT="http://otel-collector.observability.svc.cluster.local:4318"
export OTEL_EXPORTER_OTLP_PROTOCOL="http/protobuf"
```

For Go applications:

```go
import (
    "go.opentelemetry.io/otel/exporters/otlp/otlptrace/otlptracehttp"
)

exporter, err := otlptracehttp.New(
    context.Background(),
    otlptracehttp.WithEndpoint("otel-collector.observability.svc.cluster.local:4318"),
    otlptracehttp.WithInsecure(),
)
```

## Fix 4: Set gRPC-Specific Environment Variables

gRPC has its own set of environment variables for proxy configuration:

```bash
# Tell gRPC to not use any proxy
export GRPC_PROXY=""

# Or configure gRPC proxy settings independently
export GRPC_HTTP_PROXY=""
```

You can also disable the proxy in code:

```go
import (
    "google.golang.org/grpc"
    "go.opentelemetry.io/otel/exporters/otlp/otlptrace/otlptracegrpc"
)

exporter, err := otlptracegrpc.New(
    context.Background(),
    otlptracegrpc.WithEndpoint("otel-collector.observability:4317"),
    otlptracegrpc.WithInsecure(),
    otlptracegrpc.WithDialOption(grpc.WithNoProxy()),  // Explicitly skip proxy
)
```

## Fix 5: Configure the Proxy at the Pod Level

In Kubernetes, you can set `NO_PROXY` at the pod level to include all in-cluster traffic:

```yaml
env:
  - name: NO_PROXY
    value: ".cluster.local,.svc,10.0.0.0/8,172.16.0.0/12,192.168.0.0/16"
  - name: HTTP_PROXY
    value: "http://corporate-proxy.internal:3128"
  - name: HTTPS_PROXY
    value: "http://corporate-proxy.internal:3128"
```

The `.cluster.local` and `.svc` suffixes will catch all Kubernetes service names, and the CIDR ranges cover typical pod and service IP ranges.

## Summary

The gRPC proxy bypass issue catches many teams off guard because HTTP-based tools work fine with the same `NO_PROXY` settings. If you are stuck, switching to the HTTP/protobuf exporter is the fastest path to a working setup. For a long-term fix, upgrade your gRPC library and make sure your `NO_PROXY` patterns cover both hostnames and IP ranges.
