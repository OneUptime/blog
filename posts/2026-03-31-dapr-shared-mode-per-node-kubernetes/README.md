# How to Use Dapr Shared Mode (Per-Node Deployment) on Kubernetes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Kubernetes, Shared Mode, DaemonSet, Performance

Description: Configure Dapr in shared sidecar mode where a single Dapr process runs per node as a DaemonSet, reducing resource overhead in high-density clusters.

---

## What Is Dapr Shared?

By default, Dapr injects a sidecar container into every pod. In high-density environments with many small pods per node, this creates significant memory and CPU overhead. Dapr Shared (also called per-node or per-cluster deployment) runs a Dapr process as a DaemonSet (one per node) or a Deployment (one per cluster), instead of injecting a sidecar into every pod. Each microservice gets its own Dapr Shared Helm release with a unique app-id.

## When to Use Shared Mode

Use shared mode when:
- You have many small pods per node (50+)
- Sidecar memory overhead is a concern
- You are running Dapr on resource-constrained nodes

## Installing Dapr Shared

Dapr Shared is installed via an OCI Helm chart alongside the main Dapr installation. You need one Helm release per microservice (each with its own app-id):

```bash
# Install the main Dapr control plane first
helm repo add dapr https://dapr.github.io/helm-charts/
helm repo update
helm install dapr dapr/dapr --namespace dapr-system --wait

# Install a dapr-shared instance for your service (one per microservice)
helm install my-service-dapr oci://registry-1.docker.io/daprio/dapr-shared-chart \
  --namespace dapr-system \
  --set shared.appId="my-service" \
  --set shared.remoteURL="my-service.default.svc.cluster.local" \
  --set shared.remotePort="8080" \
  --wait
```

By default, the chart deploys a DaemonSet (one instance per node). To use a single Deployment instead, add `--set shared.strategy=deployment`.

## Connecting Applications to Dapr Shared

Applications using Dapr Shared do **not** use Dapr sidecar annotations. Since there is no injected sidecar, the Dapr SDKs connect to the shared instance via environment variables pointing to the Dapr Shared service:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-service
spec:
  template:
    metadata:
      labels:
        app: my-service
    spec:
      containers:
      - name: my-service
        image: myregistry/my-service:latest
        ports:
        - containerPort: 8080
        env:
        - name: DAPR_HTTP_ENDPOINT
          value: "http://my-service-dapr-dapr-shared-chart.dapr-system.svc.cluster.local:3500"
        - name: DAPR_GRPC_ENDPOINT
          value: "http://my-service-dapr-dapr-shared-chart.dapr-system.svc.cluster.local:50001"
```

## Verifying the DaemonSet

```bash
# Check the DaemonSet is running on all nodes
kubectl get daemonset -n dapr-system
# NAME                                    DESIRED   CURRENT   READY   UP-TO-DATE   AVAILABLE
# my-service-dapr-dapr-shared-chart       3         3         3       3            3

# Verify each node has a shared dapr pod
kubectl get pods -n dapr-system -l app.kubernetes.io/name=dapr-shared-chart -o wide
```

## Resource Savings Calculation

```bash
# With standard sidecars: 50 pods x 50Mi memory = 2500Mi per node
# With shared mode: 1 DaemonSet pod x 128Mi = 128Mi per node
# Savings: ~95% memory reduction for high-density workloads

# Check actual resource usage
kubectl top pods -n dapr-system -l app.kubernetes.io/name=dapr-shared-chart
```

## Limitations of Shared Mode

Dapr Shared has some trade-offs to consider:
- Each microservice requires its own Helm release (one dapr-shared instance per app-id)
- DaemonSet strategy uses more overall cluster resources since it runs one instance on every node
- Deployment strategy may introduce network latency when the workload and daprd are on different nodes
- Isolation between apps sharing the same node process is reduced

## Summary

Dapr Shared deploys Dapr as a DaemonSet (per-node) or Deployment (per-cluster) instead of per-pod sidecars, reducing resource consumption in high-density clusters. Each microservice gets its own Dapr Shared Helm release, and applications connect via `DAPR_HTTP_ENDPOINT` and `DAPR_GRPC_ENDPOINT` environment variables rather than sidecar annotations.
