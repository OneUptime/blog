# How to Set Up gRPC Health Checking with Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, GRPC, Health Checking, Kubernetes, Service Mesh

Description: A practical guide to setting up gRPC health checking with Istio, covering the gRPC health protocol, Kubernetes probes, and Envoy integration.

---

gRPC has its own health checking protocol defined in `grpc.health.v1.Health`. It is different from the HTTP health endpoints most people are used to. When you add Istio to the mix, there are some extra steps to make sure health checks work properly through the sidecar proxy.

## The gRPC Health Checking Protocol

The gRPC health checking protocol is a standard defined in the gRPC repository. Your service implements the `Health` service with a `Check` RPC that returns a `HealthCheckResponse` with a status of `SERVING`, `NOT_SERVING`, or `UNKNOWN`.

Here is what the proto definition looks like:

```protobuf
service Health {
  rpc Check(HealthCheckRequest) returns (HealthCheckResponse);
  rpc Watch(HealthCheckRequest) returns (stream HealthCheckResponse);
}

message HealthCheckRequest {
  string service = 1;
}

message HealthCheckResponse {
  enum ServingStatus {
    UNKNOWN = 0;
    SERVING = 1;
    NOT_SERVING = 2;
  }
  ServingStatus status = 1;
}
```

Most gRPC frameworks have built-in support for this. In Go, for example:

```go
import "google.golang.org/grpc/health"
import "google.golang.org/grpc/health/grpc_health_v1"

healthServer := health.NewServer()
grpc_health_v1.RegisterHealthServer(grpcServer, healthServer)
healthServer.SetServingStatus("myservice", grpc_health_v1.HealthCheckResponse_SERVING)
```

## Kubernetes gRPC Probes

Since Kubernetes 1.24, there is native support for gRPC probes. You can configure them directly in your Pod spec:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: grpc-service
  namespace: default
spec:
  replicas: 2
  selector:
    matchLabels:
      app: grpc-service
  template:
    metadata:
      labels:
        app: grpc-service
    spec:
      containers:
        - name: grpc-service
          image: myregistry/grpc-service:latest
          ports:
            - containerPort: 50051
          livenessProbe:
            grpc:
              port: 50051
              service: "myservice"
            initialDelaySeconds: 10
            periodSeconds: 10
          readinessProbe:
            grpc:
              port: 50051
              service: "myservice"
            initialDelaySeconds: 5
            periodSeconds: 5
```

The `service` field in the grpc probe maps to the `service` field in `HealthCheckRequest`. If you leave it empty, it checks the overall server health.

## The Istio Complication

When Istio injects its sidecar, the Envoy proxy sits in front of your container. Kubernetes sends health check probes to the pod, and those probes now go through the Istio proxy. This can cause problems:

1. If mTLS is in STRICT mode, the kubelet cannot reach your container because it does not present a valid mTLS certificate.
2. The probe might hit the Envoy proxy before your application is ready.

Istio handles this by rewriting health probes. Since Istio 1.10+, probe rewriting is enabled by default. Istio modifies the pod spec so that health probes are redirected to the sidecar agent, which then forwards them to your application.

You can verify this is enabled in your mesh config:

```bash
kubectl get cm istio -n istio-system -o jsonpath='{.data.mesh}' | grep -A2 "defaultConfig"
```

Look for `holdApplicationUntilProxyStarts` and probe rewriting settings.

## Configuring gRPC Health Checks with Istio Probe Rewriting

With probe rewriting enabled, Istio converts your gRPC probe into an HTTP probe that hits the Istio agent on port 15021. The agent then makes the actual gRPC health check to your container.

Your deployment does not need any special changes. Just define the gRPC probes normally:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: grpc-service
  namespace: default
spec:
  replicas: 2
  selector:
    matchLabels:
      app: grpc-service
  template:
    metadata:
      labels:
        app: grpc-service
      annotations:
        sidecar.istio.io/rewriteAppHTTPProbers: "true"
    spec:
      containers:
        - name: grpc-service
          image: myregistry/grpc-service:latest
          ports:
            - containerPort: 50051
          livenessProbe:
            grpc:
              port: 50051
            initialDelaySeconds: 10
            periodSeconds: 10
          readinessProbe:
            grpc:
              port: 50051
            initialDelaySeconds: 5
            periodSeconds: 5
```

The annotation `sidecar.istio.io/rewriteAppHTTPProbers: "true"` is typically enabled globally, but you can set it per pod if needed.

## Using grpc-health-probe as a Fallback

If you are running an older version of Kubernetes (before 1.24), you will not have native gRPC probe support. In that case, use the `grpc-health-probe` binary as an exec probe:

```yaml
livenessProbe:
  exec:
    command:
      - /bin/grpc_health_probe
      - -addr=:50051
      - -service=myservice
  initialDelaySeconds: 10
  periodSeconds: 10
readinessProbe:
  exec:
    command:
      - /bin/grpc_health_probe
      - -addr=:50051
      - -service=myservice
  initialDelaySeconds: 5
  periodSeconds: 5
```

You need to include the `grpc_health_probe` binary in your container image. You can add it in your Dockerfile:

```dockerfile
FROM golang:1.21 AS builder
# ... build your app ...

# Download grpc-health-probe
RUN GRPC_HEALTH_PROBE_VERSION=v0.4.22 && \
    wget -qO/bin/grpc_health_probe \
    https://github.com/grpc-ecosystem/grpc-health-probe/releases/download/${GRPC_HEALTH_PROBE_VERSION}/grpc_health_probe-linux-amd64 && \
    chmod +x /bin/grpc_health_probe
```

Exec probes run inside the container, so they bypass the Istio proxy entirely. This actually avoids the mTLS issue but at the cost of running a binary for every probe interval.

## Envoy Health Checking

Beyond Kubernetes probes, Envoy itself performs health checking on upstream endpoints. You can configure this through Istio's DestinationRule:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: DestinationRule
metadata:
  name: grpc-service-health
  namespace: default
spec:
  host: grpc-service.default.svc.cluster.local
  trafficPolicy:
    outlierDetection:
      consecutive5xxErrors: 3
      interval: 10s
      baseEjectionTime: 30s
      maxEjectionPercent: 50
```

This is not exactly health checking per se. It is outlier detection. Envoy tracks error rates and ejects unhealthy endpoints from the load balancing pool. For gRPC, a 5xx error maps to gRPC status codes like `UNAVAILABLE`, `INTERNAL`, and `UNKNOWN`.

## Checking Health Check Status

To see if your probes are passing:

```bash
kubectl describe pod <pod-name> | grep -A5 "Conditions"
```

To see what Envoy thinks about your upstream endpoints:

```bash
kubectl exec -it <pod-name> -c istio-proxy -- \
  pilot-agent request GET clusters | grep "health_flags"
```

Healthy endpoints show no flags. Unhealthy ones show flags like `failed_active_hc` or `failed_outlier_check`.

## Troubleshooting

If your gRPC health checks are failing with Istio:

1. Check if the sidecar is ready before your app: set `holdApplicationUntilProxyStarts: true` in the mesh config or per-pod with the annotation `proxy.istio.io/config: '{"holdApplicationUntilProxyStarts": true}'`

2. Make sure your Service port is named `grpc` so Istio recognizes the protocol

3. If using STRICT mTLS and probes are failing, verify that probe rewriting is active by checking the actual pod spec (not the deployment spec):

```bash
kubectl get pod <pod-name> -o yaml | grep -A10 "livenessProbe"
```

The rewritten probe should target port 15021 on the Istio agent.

4. Check the pilot-agent logs for probe-related errors:

```bash
kubectl logs <pod-name> -c istio-proxy | grep -i "probe"
```

Getting gRPC health checks right with Istio is mostly about understanding how probe rewriting works and making sure your gRPC service properly implements the health protocol. Once those two pieces are in place, everything flows smoothly.
