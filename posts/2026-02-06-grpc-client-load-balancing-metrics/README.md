# How to Monitor gRPC Client-Side Load Balancing Decisions with OpenTelemetry Metrics

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, gRPC, Load Balancing, Client Metrics

Description: Monitor gRPC client-side load balancing decisions with OpenTelemetry metrics to detect imbalanced traffic and unhealthy backends.

gRPC supports client-side load balancing, where the client itself decides which backend server to send each request to. This is different from server-side load balancing (like a reverse proxy). When the client makes these decisions, you need visibility into how traffic is being distributed. OpenTelemetry metrics can show you whether requests are evenly spread across backends or if one server is getting hammered while others sit idle.

## The Problem

Without monitoring, you might have a client-side round-robin policy that looks correct in config but is actually sending 80% of traffic to one server because of DNS caching or connection reuse patterns. You need metrics that track requests per backend.

## Setting Up gRPC Client Metrics in Go

```go
package main

import (
    "context"
    "sync"
    "time"

    "go.opentelemetry.io/otel"
    "go.opentelemetry.io/otel/attribute"
    "go.opentelemetry.io/otel/metric"
    "google.golang.org/grpc"
    "google.golang.org/grpc/balancer"
    "google.golang.org/grpc/resolver"
)

var meter = otel.Meter("grpc.client.loadbalancing")

// Metrics for tracking load balancing behavior
var (
    requestsPerBackend metric.Int64Counter
    backendLatency     metric.Float64Histogram
    backendState       metric.Int64ObservableGauge
    picksTotal         metric.Int64Counter
)

func initMetrics() {
    var err error

    requestsPerBackend, err = meter.Int64Counter(
        "grpc.client.lb.requests_per_backend",
        metric.WithDescription("Number of requests sent to each backend"),
        metric.WithUnit("1"),
    )
    if err != nil {
        panic(err)
    }

    backendLatency, err = meter.Float64Histogram(
        "grpc.client.lb.backend_latency",
        metric.WithDescription("Request latency per backend server"),
        metric.WithUnit("ms"),
    )
    if err != nil {
        panic(err)
    }

    picksTotal, err = meter.Int64Counter(
        "grpc.client.lb.picks_total",
        metric.WithDescription("Total number of backend picks by the load balancer"),
        metric.WithUnit("1"),
    )
    if err != nil {
        panic(err)
    }
}
```

## Custom Interceptor for Backend Tracking

The key is a client interceptor that records which backend was selected for each request:

```go
func lbMonitoringInterceptor() grpc.UnaryClientInterceptor {
    return func(
        ctx context.Context,
        method string,
        req, reply interface{},
        cc *grpc.ClientConn,
        invoker grpc.UnaryInvoker,
        opts ...grpc.CallOption,
    ) error {
        // Use a peer to capture the resolved address
        var peer grpc.Peer
        opts = append(opts, grpc.Peer(&peer))

        start := time.Now()
        err := invoker(ctx, method, req, reply, cc, opts...)
        elapsed := float64(time.Since(start).Milliseconds())

        // Extract the backend address from the peer
        backendAddr := "unknown"
        if peer.Addr != nil {
            backendAddr = peer.Addr.String()
        }

        attrs := []attribute.KeyValue{
            attribute.String("grpc.backend.address", backendAddr),
            attribute.String("grpc.method", method),
            attribute.String("grpc.lb.policy", cc.Target()),
        }

        if err != nil {
            attrs = append(attrs, attribute.String("grpc.status", "error"))
        } else {
            attrs = append(attrs, attribute.String("grpc.status", "ok"))
        }

        attrSet := attribute.NewSet(attrs...)
        requestsPerBackend.Add(ctx, 1, metric.WithAttributeSet(attrSet))
        backendLatency.Record(ctx, elapsed, metric.WithAttributeSet(attrSet))
        picksTotal.Add(ctx, 1, metric.WithAttributeSet(attrSet))

        return err
    }
}
```

## Python Implementation

Here is the equivalent in Python:

```python
import grpc
import time
from opentelemetry import metrics

meter = metrics.get_meter("grpc.client.loadbalancing")

requests_per_backend = meter.create_counter(
    name="grpc.client.lb.requests_per_backend",
    description="Number of requests sent to each backend",
)

backend_latency = meter.create_histogram(
    name="grpc.client.lb.backend_latency",
    description="Request latency per backend server",
    unit="ms",
)

class LoadBalancingMetricsInterceptor(grpc.UnaryUnaryClientInterceptor):
    """Interceptor that tracks which backend handles each request."""

    def intercept_unary_unary(self, continuation, client_call_details, request):
        start = time.time()

        # Make the RPC call
        response = continuation(client_call_details, request)

        elapsed_ms = (time.time() - start) * 1000

        # Extract the peer (backend address) from the response
        # The peer information is in the trailing metadata
        peer = "unknown"
        try:
            # Get the peer from call metadata
            metadata = dict(response.initial_metadata())
            peer = metadata.get("x-backend-address", "unknown")
        except Exception:
            pass

        attrs = {
            "grpc.backend.address": peer,
            "grpc.method": client_call_details.method,
        }

        requests_per_backend.add(1, attrs)
        backend_latency.record(elapsed_ms, attrs)

        return response
```

## Monitoring Backend Health States

Track how the load balancer sees each backend's connectivity state:

```go
func monitorSubconnStates(cc *grpc.ClientConn) {
    // Create an observable gauge that reports backend states
    meter.Int64ObservableGauge(
        "grpc.client.lb.backend_state",
        metric.WithDescription("Connectivity state of each backend (0=idle, 1=connecting, 2=ready, 3=transient_failure, 4=shutdown)"),
        metric.WithInt64Callback(func(ctx context.Context, obs metric.Int64Observer) error {
            // In practice, you would track subconn state changes
            // through a custom balancer or resolver
            states := getSubconnStates(cc)
            for addr, state := range states {
                obs.Observe(int64(state), metric.WithAttributes(
                    attribute.String("grpc.backend.address", addr),
                ))
            }
            return nil
        }),
    )
}
```

## Useful Queries

With these metrics in your backend, you can answer important questions:

```promql
# Request distribution across backends (should be roughly even)
sum(rate(grpc_client_lb_requests_per_backend_total[5m])) by (grpc_backend_address)

# Identify if one backend is slower than others
histogram_quantile(0.95,
  sum(rate(grpc_client_lb_backend_latency_bucket[5m])) by (le, grpc_backend_address)
)

# Percentage of traffic going to each backend
sum(rate(grpc_client_lb_requests_per_backend_total[5m])) by (grpc_backend_address)
/
sum(rate(grpc_client_lb_requests_per_backend_total[5m]))

# Backend error rates
sum(rate(grpc_client_lb_requests_per_backend_total{grpc_status="error"}[5m])) by (grpc_backend_address)
```

These metrics help you catch load balancing problems that are invisible without per-backend visibility. You will know immediately if traffic distribution is skewed, if a particular backend is degraded, or if your load balancing policy is not behaving as expected.
