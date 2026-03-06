# How to Optimize Flux CD Controller CPU Usage

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: flux cd, kubernetes, gitops, cpu optimization, performance tuning, resource management

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

Enable profiling on Flux controllers to identify bottlenecks.

```yaml
# Enable pprof profiling on source-controller for CPU analysis
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
          args:
            - --storage-path=/data
            - --storage-adv-addr=source-controller.$(RUNTIME_NAMESPACE).svc.cluster.local.
            # Enable pprof endpoint for CPU profiling
            - --enable-pprof=true
            - --pprof-addr=:6060
          ports:
            - containerPort: 6060
              name: pprof
              protocol: TCP
```

Create a service to access the pprof endpoint:

```yaml
# Service to expose pprof endpoint for CPU profiling
apiVersion: v1
kind: Service
metadata:
  name: source-controller-pprof
  namespace: flux-system
spec:
  selector:
    app: source-controller
  ports:
    - port: 6060
      targetPort: pprof
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

## Reducing Diff Computation Overhead

Server-side apply generates large diffs for complex resources. Use field managers and strategic merge patches to reduce computation.

```yaml
# Use server-side apply with force to reduce diff complexity
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
  # Force server-side apply to avoid conflict detection overhead
  force: true
  # Use server-side apply for efficient diffing
  patches:
    # Exclude frequently-changing fields from diff calculations
    - target:
        kind: Deployment
      patch: |
        apiVersion: apps/v1
        kind: Deployment
        metadata:
          name: placeholder
          annotations:
            # Tell Flux to skip diffing on managed fields
            kustomize.toolkit.fluxcd.io/ssa: "IfNotPresent"
```

## Limiting Controller Concurrency

Reduce the number of concurrent reconciliations to lower peak CPU usage.

```yaml
# concurrency-patch.yaml
# Lower concurrency to reduce peak CPU usage across all controllers
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
          args:
            # Default is 4; reduce to 2 for lower CPU usage
            # Trade-off: reconciliations take longer to complete
            - --concurrent=2
            # Requeue dependency interval to avoid tight loops
            - --requeue-dependency=10s
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
          args:
            # Helm rendering is CPU-heavy; limit concurrency
            - --concurrent=2
---
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
          args:
            - --storage-path=/data
            - --storage-adv-addr=source-controller.$(RUNTIME_NAMESPACE).svc.cluster.local.
            # Reduce concurrent source fetches
            - --concurrent=2
```

## Tuning Go Runtime for CPU Efficiency

Configure the Go runtime to use fewer OS threads.

```yaml
# go-cpu-tuning-patch.yaml
# Limit Go runtime threads to match CPU allocation
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
            # Limit the number of OS threads Go can use
            # Set to match CPU limit (e.g., 1 core = 1 thread)
            - name: GOMAXPROCS
              value: "2"
```

For automatic GOMAXPROCS tuning based on container CPU limits, use the `automaxprocs` approach by adding a sidecar or init container that sets the value dynamically.

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
            }[5m]) / container_spec_cpu_quota{
              namespace="flux-system",
              container="manager"
            } * 100000 > 0.8
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
4. Limit Go runtime threads with `GOMAXPROCS`
5. Disable unused controllers to eliminate unnecessary CPU consumption
6. Set appropriate CPU requests and limits based on observed usage
7. Monitor CPU throttling with Prometheus alerts

The biggest CPU savings come from increasing reconciliation intervals and reducing concurrency. Apply these changes gradually and monitor the impact on reconciliation latency.
