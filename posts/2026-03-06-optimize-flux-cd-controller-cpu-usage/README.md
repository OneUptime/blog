# How to Optimize Flux CD Controller CPU Usage

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, Kubernetes, GitOps, CPU Optimization, Performance Tuning, Resource Management

Description: A practical guide to reducing CPU consumption of Flux CD controllers through reconciliation tuning, concurrency limits, and efficient resource configuration.

---

Flux CD controllers can become CPU-intensive in clusters with many reconciled resources. High CPU usage increases infrastructure costs, causes throttling, and can slow down reconciliation loops. This guide provides actionable strategies to minimize CPU usage across all Flux CD controllers.

## Identifying CPU-Intensive Operations

Before optimizing, understand which operations consume the most CPU:

- **Manifest rendering**: Kustomize and Helm template rendering are CPU-bound operations
- **Diff calculations**: Comparing desired state with cluster state on every reconciliation
- **Git operations**: Cloning and fetching large repositories
- **TLS handshakes**: Frequent HTTPS connections to Git and Helm repositories
- **Server-side apply**: Calculating diffs for large manifests

## Profiling Current CPU Usage

Flux controllers expose pprof profiling data on their metrics endpoint by default. Port-forward the controller metrics port to collect a CPU profile.

```bash
# Terminal 1
kubectl port-forward -n flux-system deploy/source-controller 8080:8080

# Terminal 2
curl -s http://localhost:8080/debug/pprof/profile?seconds=30 > source-controller.cpu.pprof
```

If you prefer a temporary service for profiling, expose the existing metrics port:

```yaml
# Service to expose the metrics and pprof endpoint for CPU profiling
apiVersion: v1
kind: Service
metadata:
  name: source-controller-pprof
  namespace: flux-system
spec:
  selector:
    app: source-controller
  ports:
    - port: 8080
      targetPort: http-prom
      protocol: TCP
```

## Setting CPU Resource Limits

Configure appropriate CPU requests and limits for each controller.

```yaml
# cpu-limits-patch.yaml
# Right-sized CPU limits for Flux controllers
apiVersion: apps/v1
kind: Deployment
metadata:
  name: source-controller
  namespace: flux-system
spec:
  template:
    spec:
      containers:
        - name: manager
          resources:
            requests:
              # Match request to average observed usage
              cpu: "50m"
              memory: "256Mi"
            limits:
              # Allow burst for fetch operations
              cpu: "500m"
              memory: "512Mi"
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: kustomize-controller
  namespace: flux-system
spec:
  template:
    spec:
      containers:
        - name: manager
          resources:
            requests:
              # Kustomize rendering is CPU-intensive
              cpu: "100m"
              memory: "256Mi"
            limits:
              cpu: "1000m"
              memory: "1Gi"
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: helm-controller
  namespace: flux-system
spec:
  template:
    spec:
      containers:
        - name: manager
          resources:
            requests:
              # Helm template rendering requires CPU bursts
              cpu: "100m"
              memory: "256Mi"
            limits:
              cpu: "1000m"
              memory: "768Mi"
```

## Increasing Reconciliation Intervals

The most effective way to reduce CPU usage is to reconcile less frequently. Adjust intervals based on how often your resources actually change.

```yaml
# Use longer intervals for stable infrastructure components
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: infrastructure
  namespace: flux-system
spec:
  # Infrastructure changes infrequently; 1 hour is sufficient
  interval: 1h
  # Retry interval for failed reconciliations
  retryInterval: 5m
  path: ./infrastructure
  prune: true
  sourceRef:
    kind: GitRepository
    name: fleet-infra
---
# Use shorter intervals only for frequently changing applications
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: apps
  namespace: flux-system
spec:
  # Applications change more often; 10 minutes is reasonable
  interval: 10m
  retryInterval: 2m
  path: ./apps
  prune: true
  sourceRef:
    kind: GitRepository
    name: fleet-infra
```

## Reducing Reconciliation Overhead

For resources that are intentionally changed by another controller after Flux creates them, use Flux server-side apply policies to avoid unnecessary repeated ownership changes. Do not use `force` as a CPU optimization; Flux uses it to recreate resources when immutable fields change, and it can cause downtime if left enabled.

```yaml
# Apply this resource only if it is not already present
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: my-app
  namespace: flux-system
spec:
  interval: 30m
  path: ./deploy
  prune: true
  sourceRef:
    kind: GitRepository
    name: my-app
  patches:
    # Let another controller mutate this Secret after Flux creates it
    - target:
        kind: Secret
        name: webhook-cert
      patch: |
        apiVersion: v1
        kind: Secret
        metadata:
          name: webhook-cert
          annotations:
            # Flux creates it only when it is missing
            kustomize.toolkit.fluxcd.io/ssa: "IfNotPresent"
```

## Limiting Controller Concurrency

Reduce the number of concurrent reconciliations to lower peak CPU usage.

```yaml
# kustomization.yaml
# Lower concurrency to reduce peak CPU usage across all controllers
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - gotk-components.yaml
  - gotk-sync.yaml
patches:
  - target:
      kind: Deployment
      name: kustomize-controller
    patch: |
      - op: add
        path: /spec/template/spec/containers/0/args/-
        value: --concurrent=2
      - op: add
        path: /spec/template/spec/containers/0/args/-
        value: --requeue-dependency=10s
  - target:
      kind: Deployment
      name: helm-controller
    patch: |
      - op: add
        path: /spec/template/spec/containers/0/args/-
        value: --concurrent=2
  - target:
      kind: Deployment
      name: source-controller
    patch: |
      - op: add
        path: /spec/template/spec/containers/0/args/-
        value: --concurrent=1
```

## Tuning Go Runtime for CPU Efficiency

Configure the Go runtime to limit the number of goroutines that execute Go code in parallel.

```yaml
# go-cpu-tuning-patch.yaml
# Limit Go scheduler parallelism to match CPU allocation
apiVersion: apps/v1
kind: Deployment
metadata:
  name: kustomize-controller
  namespace: flux-system
spec:
  template:
    spec:
      containers:
        - name: manager
          env:
            # Limit Go scheduler parallelism
            # Set to match the CPU limit (e.g., 2 cores = 2)
            - name: GOMAXPROCS
              value: "2"
```

For automatic GOMAXPROCS tuning based on container CPU limits, use a Flux controller image built with an `automaxprocs`-style library, or set `GOMAXPROCS` explicitly in the controller environment.

## Disabling Unnecessary Controllers

If you do not use certain Flux features, disable those controllers entirely to save CPU.

```bash
# Bootstrap Flux without image automation controllers if not needed
# This eliminates CPU usage from unused controllers entirely
flux bootstrap github \
  --owner=my-org \
  --repository=fleet-infra \
  --path=clusters/production \
  --components=source-controller,kustomize-controller,helm-controller,notification-controller
```

To remove controllers from an existing installation:

```yaml
# kustomization.yaml
# Remove unused components from Flux installation
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - gotk-components.yaml
  - gotk-sync.yaml
patches:
  # Scale down image-reflector if not using image automation
  - target:
      kind: Deployment
      name: image-reflector-controller
    patch: |
      apiVersion: apps/v1
      kind: Deployment
      metadata:
        name: image-reflector-controller
      spec:
        replicas: 0
  # Scale down image-automation if not using image updates
  - target:
      kind: Deployment
      name: image-automation-controller
    patch: |
      apiVersion: apps/v1
      kind: Deployment
      metadata:
        name: image-automation-controller
      spec:
        replicas: 0
```

## Monitoring CPU Usage

Set up dashboards and alerts to track CPU consumption.

```yaml
# PrometheusRule for Flux CPU alerts
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: flux-cpu-alerts
  namespace: flux-system
spec:
  groups:
    - name: flux-cpu
      rules:
        # Alert when CPU is consistently throttled
        - alert: FluxControllerCPUThrottled
          expr: |
            rate(container_cpu_cfs_throttled_seconds_total{
              namespace="flux-system",
              container="manager"
            }[5m]) > 0.1
          for: 10m
          labels:
            severity: warning
          annotations:
            summary: "Flux controller {{ $labels.pod }} is being CPU throttled"
            description: "Consider increasing CPU limits or reducing concurrency."

        # Alert when CPU usage exceeds 80% of limit
        - alert: FluxControllerHighCPU
          expr: |
            rate(container_cpu_usage_seconds_total{
              namespace="flux-system",
              container="manager"
            }[5m]) / (
              container_spec_cpu_quota{
                namespace="flux-system",
                container="manager"
              } / container_spec_cpu_period{
                namespace="flux-system",
                container="manager"
              }
            ) > 0.8
          for: 10m
          labels:
            severity: warning
          annotations:
            summary: "Flux controller {{ $labels.pod }} CPU usage above 80%"
```

## Summary

Key strategies for optimizing Flux CD controller CPU usage:

1. Profile controllers with pprof to identify CPU hotspots
2. Increase reconciliation intervals for stable resources
3. Reduce controller concurrency with the `--concurrent` flag
4. Limit Go scheduler parallelism with `GOMAXPROCS`
5. Disable unused controllers to eliminate unnecessary CPU consumption
6. Set appropriate CPU requests and limits based on observed usage
7. Monitor CPU throttling with Prometheus alerts

The biggest CPU savings come from increasing reconciliation intervals and reducing concurrency. Apply these changes gradually and monitor the impact on reconciliation latency.
