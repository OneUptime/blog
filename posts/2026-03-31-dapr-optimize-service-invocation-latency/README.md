# How to Optimize Dapr Service Invocation Latency

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Performance, Service Invocation, Latency, Optimization

Description: Reduce Dapr service invocation latency by enabling gRPC proxying, tuning mTLS, using connection keep-alives, and profiling the sidecar-to-sidecar communication path.

---

## Overview

Dapr service invocation adds overhead compared to direct HTTP calls because traffic passes through two sidecar proxies. By enabling gRPC, tuning connection settings, and understanding the hot path, you can significantly reduce end-to-end latency.

## Measuring Baseline Latency

Benchmark service invocation latency before optimizing:

```bash
# Install hey for HTTP load testing
brew install hey

# Benchmark Dapr service invocation
hey -n 1000 -c 10 \
  -m POST \
  -H "Content-Type: application/json" \
  -d '{"orderId":"123"}' \
  http://localhost:3500/v1.0/invoke/inventory-service/method/check-stock

# Sample output:
# Average: 8.5 ms
# 99th percentile: 25 ms
```

## Switching to gRPC for Lower Latency

gRPC uses HTTP/2 multiplexing and binary Protocol Buffers, reducing overhead compared to HTTP/1.1:

```yaml
annotations:
  dapr.io/app-protocol: "grpc"
  dapr.io/app-port: "50051"
```

Use the Dapr gRPC proxying in your client:

```javascript
const { DaprClient, CommunicationProtocolEnum, HttpMethod } = require('@dapr/dapr');

// Use gRPC protocol for Dapr client
const client = new DaprClient({
  communicationProtocol: CommunicationProtocolEnum.GRPC
});

const result = await client.invoker.invoke('inventory-service', 'check-stock', HttpMethod.POST, { orderId: '123' });
```

## Enabling HTTP Keep-Alives

Ensure HTTP/1.1 connections are reused between sidecar calls:

```yaml
annotations:
  dapr.io/app-protocol: "http"
  dapr.io/enable-api-logging: "false"
```

Configure your application to set `Connection: keep-alive` and use persistent HTTP agents:

```javascript
const http = require('http');
const agent = new http.Agent({ keepAlive: true, maxSockets: 10 });

// Pass agent when making Dapr calls via raw HTTP (not SDK)
const options = {
  hostname: 'localhost',
  port: 3500,
  path: '/v1.0/invoke/inventory-service/method/check-stock',
  method: 'POST',
  agent
};
```

## Disabling mTLS for Internal Low-Latency Calls

For services that trust the cluster network, you can disable mTLS to reduce crypto overhead on the hot path:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Configuration
metadata:
  name: low-latency-config
spec:
  mtls:
    enabled: false
```

Apply this only when running in a network-isolated namespace and when the performance gain justifies the tradeoff.

## Collocating Services on the Same Node

Place services that call each other frequently on the same node to avoid network hop overhead:

```yaml
spec:
  affinity:
    podAffinity:
      preferredDuringSchedulingIgnoredDuringExecution:
      - weight: 100
        podAffinityTerm:
          labelSelector:
            matchLabels:
              app: inventory-service
          topologyKey: kubernetes.io/hostname
```

## Profiling with Dapr Distributed Tracing

Use Dapr's built-in tracing to find latency bottlenecks:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Configuration
metadata:
  name: tracing-config
spec:
  tracing:
    samplingRate: "1"
    zipkin:
      endpointAddress: http://zipkin:9411/api/v2/spans
```

```bash
# Find slow service invocation spans in Zipkin
# Filter by operation: /dapr.proto.runtime.v1.Dapr/InvokeService
```

## Summary

Dapr service invocation latency can be reduced by switching from HTTP/1.1 to gRPC (which uses persistent multiplexed connections), enabling keep-alives for HTTP, co-locating frequently communicating services on the same node, and using Zipkin or OpenTelemetry tracing to identify the specific spans contributing most to end-to-end latency. gRPC typically delivers 30-50% lower latency than HTTP for high-frequency service-to-service calls.
