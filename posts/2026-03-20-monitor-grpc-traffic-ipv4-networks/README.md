# How to Monitor gRPC Traffic over IPv4 Networks

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: gRPC, IPv4, Monitoring, Prometheus, OpenTelemetry, Interceptors, Observability

Description: Monitor gRPC traffic over IPv4 using Prometheus interceptors, OpenTelemetry tracing, and server reflection to gain visibility into request rates, latency, and error rates.

## Introduction

gRPC traffic is HTTP/2, which makes traditional L7 monitoring harder than plain HTTP/1.1. The recommended approach combines server-side Prometheus metrics via interceptors with distributed tracing using OpenTelemetry.

## Go - Prometheus Interceptors

```go
package main

import (
    "net"

    grpc_prometheus "github.com/grpc-ecosystem/go-grpc-prometheus"
    "github.com/prometheus/client_golang/prometheus/promhttp"
    "google.golang.org/grpc"
    "net/http"
)

func newMonitoredServer() *grpc.Server {
    srv := grpc.NewServer(
        grpc.UnaryInterceptor(grpc_prometheus.UnaryServerInterceptor),
        grpc.StreamInterceptor(grpc_prometheus.StreamServerInterceptor),
    )
    grpc_prometheus.EnableHandlingTimeHistogram()
    return srv
}

func main() {
    lis, _ := net.Listen("tcp4", "0.0.0.0:50051")
    srv := newMonitoredServer()
    // register services ...

    // Expose /metrics
    go func() {
        http.Handle("/metrics", promhttp.Handler())
        http.ListenAndServe("0.0.0.0:9090", nil)
    }()

    srv.Serve(lis)
}
```

## Key Prometheus Metrics

```promql
# Request rate per method

rate(grpc_server_handled_total[5m])

# Error rate
rate(grpc_server_handled_total{grpc_code!="OK"}[5m])
  / rate(grpc_server_handled_total[5m])

# P99 latency
histogram_quantile(0.99,
  rate(grpc_server_handling_seconds_bucket[5m]))

# Active streaming RPCs
grpc_server_started_total - grpc_server_handled_total
```

## OpenTelemetry Tracing (Go)

```go
import (
    "go.opentelemetry.io/contrib/instrumentation/google.golang.org/grpc/otelgrpc"
    "go.opentelemetry.io/otel/exporters/otlp/otlptrace/otlptracegrpc"
)

// Server
srv := grpc.NewServer(
    grpc.StatsHandler(otelgrpc.NewServerHandler()),
)

// Client
conn, _ := grpc.NewClient(
    "192.168.1.10:50051",
    grpc.WithStatsHandler(otelgrpc.NewClientHandler()),
    grpc.WithTransportCredentials(insecure.NewCredentials()),
)
```

## Python - OpenTelemetry Instrumentation

```python
from opentelemetry import trace
from opentelemetry.instrumentation.grpc import GrpcInstrumentorServer

# Instrument the server
GrpcInstrumentorServer().instrument()

# Instrument the client
from opentelemetry.instrumentation.grpc import GrpcInstrumentorClient
GrpcInstrumentorClient().instrument()

import grpc
channel = grpc.insecure_channel("192.168.1.10:50051")
```

## Capture gRPC with tcpdump

```bash
# Capture gRPC (HTTP/2) on port 50051
sudo tcpdump -i eth0 -w grpc_capture.pcap 'tcp port 50051'

# Analyze with tshark
tshark -r grpc_capture.pcap -d tcp.port==50051,http2 \
  -T fields -e http2.headers.path -e http2.headers.status
```

## Grafana Dashboard Queries

```promql
# Top 5 slowest gRPC methods
topk(5, histogram_quantile(0.95,
  sum by (grpc_method, le) (
    rate(grpc_server_handling_seconds_bucket[5m])
  )
))

# Error rate alarm
100 * rate(grpc_server_handled_total{grpc_code=~"INTERNAL|UNAVAILABLE"}[5m])
    / rate(grpc_server_handled_total[5m]) > 1
```

## Conclusion

Monitor gRPC traffic by adding Prometheus interceptors to emit per-method request/error/latency metrics, instrument with OpenTelemetry for end-to-end traces, and use `tcpdump`/tshark for raw packet inspection. Export metrics to Grafana for dashboards and alerting.
