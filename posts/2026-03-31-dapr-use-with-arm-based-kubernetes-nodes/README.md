# How to Use Dapr with ARM-Based Kubernetes Nodes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, ARM, Kubernetes, Multi-Architecture, Node

Description: Learn how to deploy Dapr on ARM-based Kubernetes nodes, configure multi-arch image support, and run Dapr workloads on Graviton and Ampere processors.

---

ARM-based cloud instances (AWS Graviton, Azure Cobalt, Ampere Altra) offer better price-performance for many workloads. Dapr fully supports ARM64 architecture, and this guide shows you how to set it up correctly.

## Dapr ARM64 Support

The Dapr project publishes multi-architecture container images for both `amd64` and `arm64`. The standard Dapr Helm chart and init commands work on ARM nodes without modification.

```bash
# Dapr's official images are multi-arch
docker manifest inspect daprio/daprd:1.14.0 | grep architecture
# "architecture": "amd64"
# "architecture": "arm64"
```

## Setting Up an ARM64 Kubernetes Cluster

On AWS EKS with Graviton nodes:

```bash
# Create EKS cluster with ARM64 node group
eksctl create cluster \
  --name dapr-arm64-cluster \
  --region us-east-1 \
  --nodes 3 \
  --node-type m7g.xlarge \
  --with-oidc

# Verify node architecture
kubectl get nodes -o jsonpath='{.items[*].status.nodeInfo.architecture}'
# arm64 arm64 arm64
```

On Azure AKS with Cobalt nodes:

```bash
az aks create \
  --resource-group myRG \
  --name dapr-arm64-cluster \
  --node-vm-size Standard_D4plds_v5 \
  --node-count 3
```

## Installing Dapr on ARM64

```bash
# Standard Dapr init works on ARM64
dapr init -k

# Verify - Dapr pods should run on ARM64 nodes
kubectl get pods -n dapr-system -o wide
kubectl describe pod dapr-operator-xxx -n dapr-system | grep "Node:"
```

## Multi-Architecture Application Images

Your application images must also be ARM64-compatible. Build multi-arch images with Docker buildx:

```bash
# Set up multi-arch builder
docker buildx create --name multiarch-builder --use
docker buildx inspect --bootstrap

# Build and push multi-arch image
docker buildx build \
  --platform linux/amd64,linux/arm64 \
  -t myrepo/order-service:1.0.0 \
  --push .
```

## Node Selectors for ARM64

If your cluster has mixed architecture nodes, use node selectors to schedule Dapr-enabled workloads on ARM64 nodes:

```yaml
spec:
  template:
    metadata:
      annotations:
        dapr.io/enabled: "true"
        dapr.io/app-id: "order-service"
        dapr.io/app-port: "8080"
    spec:
      nodeSelector:
        kubernetes.io/arch: arm64
      containers:
        - name: order-service
          image: myrepo/order-service:1.0.0
```

## Benchmarking on ARM64

Compare Dapr performance on ARM64 vs x86 to quantify the cost savings:

```bash
# Install hey for load testing
go install github.com/rakyll/hey@latest

# Benchmark Dapr state operations on ARM64
hey -n 10000 -c 50 \
  -m POST \
  -H "Content-Type: application/json" \
  -d '[{"key":"test","value":"hello"}]' \
  http://localhost:3500/v1.0/state/statestore

# Compare p50, p99 latency and requests/sec
```

## Known Considerations

- Some Dapr components use CGo or C libraries; verify they have ARM64 builds
- Dapr actor reminder persistence on ARM64 is functionally identical; no special configuration needed
- If using hardware security modules (HSM) with Dapr, verify ARM64 HSM driver availability

## Summary

Dapr fully supports ARM64 architecture through multi-architecture container images published for both amd64 and arm64. Install Dapr on ARM64 EKS or AKS clusters using standard commands, build your application images as multi-arch with Docker buildx, and use node selectors in mixed clusters to place Dapr workloads on ARM64 nodes for better cost efficiency.
