# How to Configure Flagger Load Tester with ghz for gRPC Load

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flagger, Canary, Load Testing, Ghz, GRPC, Kubernetes, Progressive Delivery, Traffic Generation

Description: Learn how to configure Flagger's load tester with the ghz gRPC load generator to produce traffic for gRPC canary analysis.

---

## Introduction

For gRPC services, HTTP load generators like `hey` are not suitable because gRPC uses HTTP/2 with Protocol Buffers for serialization rather than plain HTTP requests. The Flagger load tester includes `ghz`, a gRPC benchmarking and load testing tool that understands the gRPC protocol, handles protobuf serialization, and generates realistic gRPC traffic.

When running canary analysis on gRPC services, you need `ghz` to generate traffic that your service mesh correctly identifies as gRPC calls. This ensures that gRPC-specific metrics like `grpc_response_status` are populated in Prometheus, allowing Flagger to evaluate gRPC success rate and latency metrics.

This guide covers how to configure `ghz` within Flagger load tester webhooks for gRPC canary analysis.

## Prerequisites

- A running Kubernetes cluster with Flagger installed
- The Flagger load tester deployed in your cluster
- A gRPC service deployed as a Kubernetes Deployment with a Canary resource
- The protobuf definition (`.proto` file) for your gRPC service, or server reflection enabled
- kubectl access to your cluster

## Basic ghz Configuration

The `ghz` tool needs to know the gRPC method to call and the server address. Here is a basic configuration using Flagger webhooks:

```yaml
apiVersion: flagger.app/v1beta1
kind: Canary
metadata:
  name: my-grpc-app
  namespace: default
spec:
  targetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: my-grpc-app
  service:
    port: 9090
    targetPort: 9090
    appProtocol: grpc
  analysis:
    interval: 1m
    threshold: 5
    maxWeight: 50
    stepWeight: 10
    webhooks:
      - name: grpc-load-test
        type: rollout
        url: http://flagger-loadtester.test/
        timeout: 5s
        metadata:
          type: cmd
          cmd: >
            ghz --insecure
            --call my.package.MyService/MyMethod
            --total 1000
            --rps 50
            --duration 1m
            my-grpc-app-canary.default:9090
```

This calls the `MyMethod` RPC of `MyService` at 50 requests per second for 1 minute against the canary gRPC service.

## Key ghz Parameters

Understanding the `ghz` flags helps you configure appropriate gRPC load:

- `--call`: The fully qualified gRPC method to call (format: `package.Service/Method`)
- `--insecure`: Use plaintext connection (no TLS). Required for in-cluster testing unless mTLS is handled by the mesh.
- `--total`: Total number of requests to send. Mutually exclusive with `--duration` for controlling when to stop.
- `--duration`: Run for the specified duration (e.g., `1m`, `30s`).
- `--rps`: Target requests per second (rate limiting).
- `--concurrency`: Number of concurrent workers (default: 50).
- `--connections`: Number of gRPC connections to use.
- `--proto`: Path to the protobuf definition file.
- `--protoset`: Path to a compiled protobuf descriptor set.
- `-d`: Request data as JSON string.
- `-D`: Path to a file containing request data as JSON.

## Using Server Reflection

If your gRPC service has server reflection enabled, `ghz` can discover the service definition automatically without needing a `.proto` file:

```yaml
    webhooks:
      - name: grpc-load-test
        type: rollout
        url: http://flagger-loadtester.test/
        timeout: 5s
        metadata:
          type: cmd
          cmd: >
            ghz --insecure
            --call my.package.MyService/MyMethod
            -d '{"id": "test-123"}'
            --rps 50
            --duration 1m
            my-grpc-app-canary.default:9090
```

Server reflection is the simplest approach because it eliminates the need to distribute proto files to the load tester.

## Providing a Proto File

If server reflection is not available, provide the proto file. You can mount it as a ConfigMap:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: grpc-protos
  namespace: test
data:
  service.proto: |
    syntax = "proto3";
    package my.package;

    service MyService {
      rpc MyMethod (MyRequest) returns (MyResponse);
    }

    message MyRequest {
      string id = 1;
    }

    message MyResponse {
      string result = 1;
    }
```

Mount this ConfigMap in the load tester deployment, then reference the file in the `ghz` command:

```yaml
    webhooks:
      - name: grpc-load-test
        type: rollout
        url: http://flagger-loadtester.test/
        timeout: 5s
        metadata:
          type: cmd
          cmd: >
            ghz --insecure
            --proto /protos/service.proto
            --call my.package.MyService/MyMethod
            -d '{"id": "test-123"}'
            --rps 50
            --duration 1m
            my-grpc-app-canary.default:9090
```

## Sending Request Data

Pass request data as a JSON string using the `-d` flag:

```yaml
    webhooks:
      - name: grpc-load-test
        type: rollout
        url: http://flagger-loadtester.test/
        timeout: 5s
        metadata:
          type: cmd
          cmd: >
            ghz --insecure
            --call my.package.UserService/GetUser
            -d '{"user_id": "user-001", "include_profile": true}'
            --rps 30
            --duration 1m
            my-grpc-app-canary.default:9090
```

The JSON structure must match the protobuf message definition for the request type.

## Controlling Concurrency and Connections

Tune concurrency and connections based on your service capacity:

```yaml
    webhooks:
      - name: grpc-load-test
        type: rollout
        url: http://flagger-loadtester.test/
        timeout: 5s
        metadata:
          type: cmd
          cmd: >
            ghz --insecure
            --call my.package.MyService/MyMethod
            -d '{}'
            --rps 100
            --concurrency 10
            --connections 5
            --duration 1m
            my-grpc-app-canary.default:9090
```

The `--concurrency` flag controls how many goroutines send requests concurrently, and `--connections` controls how many underlying gRPC connections are used.

## Testing Streaming RPCs

For server streaming RPCs, `ghz` sends the request and reads all responses:

```yaml
    webhooks:
      - name: grpc-stream-test
        type: rollout
        url: http://flagger-loadtester.test/
        timeout: 5s
        metadata:
          type: cmd
          cmd: >
            ghz --insecure
            --call my.package.StreamService/ListItems
            -d '{"page_size": 10}'
            --rps 20
            --duration 1m
            my-grpc-app-canary.default:9090
```

## Adding Metadata Headers

gRPC metadata (headers) can be passed using the `-m` flag:

```yaml
    webhooks:
      - name: grpc-load-test
        type: rollout
        url: http://flagger-loadtester.test/
        timeout: 5s
        metadata:
          type: cmd
          cmd: >
            ghz --insecure
            --call my.package.MyService/MyMethod
            -d '{"id": "test"}'
            -m '{"authorization": "Bearer test-token"}'
            --rps 50
            --duration 1m
            my-grpc-app-canary.default:9090
```

## Combining with gRPC Metrics

Use `ghz` load generation alongside gRPC-specific Flagger metrics for a complete canary evaluation:

```yaml
  analysis:
    interval: 1m
    threshold: 5
    maxWeight: 50
    stepWeight: 10
    metrics:
      - name: grpc-success-rate
        templateRef:
          name: grpc-success-rate
          namespace: default
        thresholdRange:
          min: 99
        interval: 1m
    webhooks:
      - name: grpc-load-test
        type: rollout
        url: http://flagger-loadtester.test/
        timeout: 5s
        metadata:
          type: cmd
          cmd: >
            ghz --insecure
            --call my.package.MyService/MyMethod
            -d '{}'
            --rps 50
            --duration 1m
            my-grpc-app-canary.default:9090
```

The `ghz` traffic generates the gRPC metrics that the `grpc-success-rate` MetricTemplate evaluates.

## Conclusion

The `ghz` gRPC load generator in the Flagger load tester provides protocol-aware traffic generation for gRPC canary analysis. It handles protobuf serialization, supports server reflection or proto file imports, and offers fine-grained control over request rate, concurrency, and request data. Configure it through Flagger's rollout webhooks, targeting the canary service address, and combine it with gRPC-specific MetricTemplates for accurate canary evaluation of gRPC services.
