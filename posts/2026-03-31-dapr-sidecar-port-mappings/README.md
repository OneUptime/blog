# How to Configure Dapr Sidecar Port Mappings

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Sidecar, Port, Configuration, Kubernetes

Description: Learn how to configure Dapr sidecar port mappings for HTTP, gRPC, metrics, and internal communication to avoid conflicts and optimize your deployment.

---

## Dapr Sidecar Ports Overview

Every Dapr-enabled pod gets a sidecar (daprd) injected alongside your application. The sidecar listens on multiple ports for different protocols and purposes. Understanding and configuring these ports is essential for avoiding conflicts and enabling proper observability.

Default Dapr sidecar ports:
- **3500**: HTTP API port (app to Dapr)
- **50001**: gRPC API port (app to Dapr)
- **50002**: Internal gRPC port (Dapr to Dapr)
- **9090**: Metrics port (Prometheus scrape)
- **7777**: Profile port (only active when profiling is enabled via `--enable-profiling`)

## Configuring Ports via Annotations

All port settings can be configured through pod annotations:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-service
spec:
  template:
    metadata:
      annotations:
        dapr.io/enabled: "true"
        dapr.io/app-id: "my-service"
        dapr.io/app-port: "8080"
        dapr.io/grpc-port: "50001"
        dapr.io/internal-grpc-port: "50002"
        dapr.io/metrics-port: "9090"
    spec:
      containers:
      - name: my-service
        image: my-service:latest
        ports:
        - containerPort: 8080
```

## Resolving Port Conflicts

When multiple Dapr-enabled containers share a pod's network namespace, port conflicts can occur. Resolve them by explicitly mapping different ports for each service:

```yaml
# Service A in a multi-container pod
dapr.io/app-id: "service-a"
dapr.io/grpc-port: "50001"
dapr.io/metrics-port: "9090"

# Service B would need different ports if in same pod
# (though generally, one sidecar per pod is recommended)
```

## App Port Configuration

The `app-port` annotation tells the Dapr sidecar which port your application listens on:

```yaml
# For an Express.js app on port 3000
dapr.io/app-port: "3000"
dapr.io/app-protocol: "http"

# For a gRPC app
dapr.io/app-port: "5001"
dapr.io/app-protocol: "grpc"
```

## Dapr CLI Local Development Port Configuration

```bash
# Run with custom port mappings locally
dapr run \
  --app-id my-service \
  --app-port 8080 \
  --dapr-http-port 3500 \
  --dapr-grpc-port 50001 \
  --metrics-port 9090 \
  -- node app.js
```

## Verifying Port Configuration

```bash
# Check which ports the sidecar is listening on
kubectl exec -n default POD_NAME -c daprd -- netstat -tlnp

# Test HTTP API port
kubectl exec -n default POD_NAME -c app -- \
  curl http://localhost:3500/v1.0/healthz

# Test gRPC port
kubectl exec -n default POD_NAME -c app -- \
  grpcurl -plaintext localhost:50001 dapr.proto.runtime.v1.Dapr/GetState
```

## Network Policy Configuration

Ensure network policies allow traffic on Dapr sidecar ports:

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-dapr-ports
spec:
  podSelector:
    matchLabels:
      dapr-enabled: "true"
  ingress:
  - ports:
    - port: 3500
      protocol: TCP
    - port: 50001
      protocol: TCP
    - port: 50002
      protocol: TCP
    - port: 9090
      protocol: TCP
```

## Summary

Dapr sidecar port mappings provide fine-grained control over how your application communicates with the sidecar and how the Dapr mesh operates internally. Configuring these ports explicitly through annotations avoids conflicts in shared environments, enables proper Prometheus scraping, and ensures network policies are correctly scoped to the ports your services actually use.
