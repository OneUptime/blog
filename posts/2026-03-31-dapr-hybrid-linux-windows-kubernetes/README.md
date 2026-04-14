# How to Run Dapr on Hybrid Linux/Windows Kubernetes Clusters

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Kubernetes, Window, Linux, Hybrid Cluster

Description: Configure Dapr to run correctly on hybrid Kubernetes clusters with both Linux and Windows nodes using node selectors and tolerations.

---

## Hybrid Cluster Challenges

Hybrid Kubernetes clusters run both Linux and Windows nodes. Dapr control plane components must run on Linux nodes, while Windows pods require the Windows Dapr sidecar image. Without proper node selectors, Dapr control plane pods may be scheduled on Windows nodes and fail.

## Ensuring Control Plane Runs on Linux

When installing Dapr with Helm, set node selectors for all control plane components:

```yaml
# dapr-hybrid-values.yaml
global:
  nodeSelector:
    kubernetes.io/os: linux
```

```bash
helm install dapr dapr/dapr \
  --namespace dapr-system \
  -f dapr-hybrid-values.yaml \
  --wait
```

## Deploying Windows Applications with Dapr

Windows pods use a different Dapr sidecar image. Annotate Windows deployments with the correct image:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: windows-service
  namespace: default
spec:
  template:
    metadata:
      annotations:
        dapr.io/enabled: "true"
        dapr.io/app-id: "windows-service"
        dapr.io/app-port: "8080"
        dapr.io/sidecar-image: "daprio/daprd:1.13.0-windows-amd64"
      labels:
        app: windows-service
    spec:
      nodeSelector:
        kubernetes.io/os: windows
      containers:
      - name: windows-service
        image: myregistry/windows-service:latest
```

## Deploying Linux Applications on Hybrid Clusters

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: linux-service
spec:
  template:
    metadata:
      annotations:
        dapr.io/enabled: "true"
        dapr.io/app-id: "linux-service"
        dapr.io/app-port: "3000"
    spec:
      nodeSelector:
        kubernetes.io/os: linux
      containers:
      - name: linux-service
        image: myregistry/linux-service:latest
```

## Verifying Cross-OS Service Invocation

Dapr enables Linux and Windows services to communicate seamlessly:

```bash
# From a Linux pod, invoke a Windows service
curl http://localhost:3500/v1.0/invoke/windows-service/method/api/data

# Check that both services are registered with Dapr
dapr list -k
```

## Troubleshooting Windows Sidecar Issues

```bash
# Check that Windows node has the correct labels
kubectl get nodes --show-labels | grep windows

# Describe a Windows pod if sidecar injection fails
kubectl describe pod windows-service-xxxx | grep -E "sidecar|dapr|inject"

# View sidecar injector logs for Windows scheduling issues
kubectl logs -n dapr-system -l app=dapr-sidecar-injector --tail=50
```

## Summary

Running Dapr on hybrid Linux/Windows Kubernetes clusters requires setting `kubernetes.io/os: linux` node selectors on all Dapr control plane components and using the Windows-specific sidecar image for Windows application pods. With proper node selectors, Linux and Windows Dapr services communicate transparently through the standard Dapr service invocation API.
