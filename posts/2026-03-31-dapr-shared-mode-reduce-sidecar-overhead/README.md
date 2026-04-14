# How to Use Dapr Shared Mode to Reduce Sidecar Overhead

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Kubernetes, Performance, Sidecar, Resource Optimization

Description: Learn how Dapr shared mode deploys a single Dapr process per node instead of per pod, reducing memory and CPU overhead in high-density workloads.

---

## What Is Dapr Shared?

By default, Dapr injects a sidecar container into every pod. In clusters with hundreds of pods per node, this multiplies resource consumption significantly. Dapr Shared solves this by deploying the Dapr runtime (`daprd`) as a DaemonSet (one per node) or a Deployment (one per cluster) instead of as a sidecar in every pod. You deploy one Dapr Shared Helm release per application (app-id), and all pods for that application connect to the shared instance over the network.

This is especially useful for:
- Batch workloads with short-lived pods
- Edge deployments with constrained resources
- Clusters with many small services that rarely use Dapr features

## Enabling Dapr Shared

Install the dapr-shared Helm chart from the OCI registry alongside the standard Dapr installation. You need one Helm release per application (app-id):

```bash
helm install my-app-shared oci://registry-1.docker.io/daprio/dapr-shared-chart \
  --set shared.appId=my-app \
  --set shared.remoteURL=my-app.default.svc.cluster.local \
  --set shared.remotePort=3000 \
  --set shared.strategy=daemonset
```

The `shared.strategy` parameter accepts `daemonset` (one instance per node, the default) or `deployment` (one instance per cluster).

## Configuring Applications to Use Dapr Shared

Instead of using sidecar injection annotations, disable sidecar injection and point your application at the shared Dapr instance using endpoint environment variables:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: order-processor
spec:
  replicas: 10
  template:
    metadata:
      annotations:
        dapr.io/enabled: "false"
    spec:
      containers:
      - name: order-processor
        image: myregistry/order-processor:latest
        ports:
        - containerPort: 3000
        env:
        - name: DAPR_HTTP_ENDPOINT
          value: "http://order-processor-shared-dapr.default.svc.cluster.local:3500"
        - name: DAPR_GRPC_ENDPOINT
          value: "http://order-processor-shared-dapr.default.svc.cluster.local:50001"
```

The endpoint URLs follow the pattern `http://<helm-release-name>-dapr.<namespace>.svc.cluster.local:<port>`, where the release name matches what you used in the `helm install` command.

## Measuring the Resource Savings

Measure memory savings by comparing pod resource usage with and without shared mode:

```bash
# Check resource usage per pod with standard sidecar
kubectl top pods -n production --sort-by=memory | head -20

# After enabling shared mode, compare
kubectl top pods -n production --sort-by=memory | head -20

# Check the shared dapr process on a node
kubectl top pods -n dapr-system | grep dapr-shared
```

In a typical scenario where a single application has 50 pod replicas spread across nodes, standard sidecar mode uses roughly 50 x 20 MB = 1 GB of total Dapr sidecar memory. With the DaemonSet strategy, shared mode reduces this to one Dapr process per node for that application, significantly lowering total memory usage.

## Configuring Shared Mode Performance

Create a standard Dapr Configuration resource and reference it when installing the Helm chart:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Configuration
metadata:
  name: shared-config
spec:
  tracing:
    samplingRate: "0.1"
  metric:
    enabled: true
  httpPipeline:
    handlers:
    - name: ratelimit
      type: middleware.http.ratelimit
```

Then reference the configuration when installing dapr-shared:

```bash
helm install my-app-shared oci://registry-1.docker.io/daprio/dapr-shared-chart \
  --set shared.appId=my-app \
  --set shared.remoteURL=my-app.default.svc.cluster.local \
  --set shared.remotePort=3000 \
  --set shared.daprd.config=shared-config
```

You can also tune other runtime settings through Helm values such as `shared.daprd.metrics.enabled`, `shared.daprd.mtls.enabled`, and `shared.log.level`.

## Limitations of Shared Mode

Shared mode has trade-offs to consider:

- Each application (app-id) requires its own Dapr Shared Helm release
- Not suitable when each pod needs isolated Dapr state or different component access
- mTLS and identity isolation is reduced compared to per-pod sidecar
- Adds network latency since pods communicate with Dapr over the network instead of localhost

For compliance-sensitive applications where pod-level isolation is required, the standard sidecar model remains appropriate.

## Summary

Dapr Shared deploys the Dapr runtime as a DaemonSet or Deployment instead of injecting a sidecar into every pod, reducing memory overhead in high-density clusters. It is configured via the dapr-shared OCI Helm chart with one release per application, and pods connect to the shared instance using `DAPR_HTTP_ENDPOINT` and `DAPR_GRPC_ENDPOINT` environment variables. Evaluate the isolation and latency trade-offs before enabling shared mode in production environments where per-pod security boundaries are required.
