# How to Right-Size Dapr Control Plane Resources

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Control Plane, Resource, Optimization, Kubernetes

Description: Right-size Dapr control plane resources by measuring actual CPU and memory usage, adjusting Helm values for operator, sentry, and placement components based on cluster scale.

---

## Dapr Control Plane Components and Their Resources

The Dapr control plane consists of:
- `dapr-operator` - reconciles CRDs, moderate CPU/memory
- `dapr-sentry` - issues certificates, CPU-intensive during pod churn
- `dapr-placement` - manages actor placement, memory-intensive for large actor deployments
- `dapr-sidecar-injector` - injects Dapr sidecars into pods, moderate CPU/memory
- `dapr-scheduler` - schedules jobs and reminders, moderate resource usage

The Dapr dashboard (`dapr-dashboard`) is an optional component installed as a separate Helm chart (`dapr/dapr-dashboard`), not part of the main `dapr/dapr` chart.

Default resource allocations are conservative for broad compatibility but are often overprovisioned for small to medium clusters.

## Step 1 - Measure Current Usage

Before right-sizing, establish actual usage baselines:

```bash
kubectl top pods -n dapr-system --containers
```

Use Prometheus for historical data:

```text
# Max CPU usage over 7 days
max_over_time(
  rate(container_cpu_usage_seconds_total{namespace="dapr-system"}[5m])[7d:]
)
```

```text
# Max memory usage over 7 days
max_over_time(
  container_memory_working_set_bytes{namespace="dapr-system"}[7d]
)
```

## Step 2 - Scale by Cluster Size

Right-size control plane resources based on number of Dapr-enabled pods:

**Small cluster (under 50 Dapr pods):**

```yaml
# dapr-small-cluster-values.yaml
dapr_operator:
  resources:
    requests:
      cpu: "50m"
      memory: "64Mi"
    limits:
      cpu: "500m"
      memory: "256Mi"

dapr_sentry:
  resources:
    requests:
      cpu: "50m"
      memory: "64Mi"
    limits:
      cpu: "500m"
      memory: "256Mi"

dapr_placement:
  resources:
    requests:
      cpu: "50m"
      memory: "64Mi"
    limits:
      cpu: "500m"
      memory: "256Mi"
```

**Large cluster (500+ Dapr pods):**

```yaml
# dapr-large-cluster-values.yaml
dapr_operator:
  resources:
    requests:
      cpu: "500m"
      memory: "256Mi"
    limits:
      cpu: "2000m"
      memory: "1Gi"

dapr_sentry:
  resources:
    requests:
      cpu: "200m"
      memory: "128Mi"
    limits:
      cpu: "1000m"
      memory: "512Mi"

dapr_placement:
  resources:
    requests:
      cpu: "500m"
      memory: "512Mi"
    limits:
      cpu: "2000m"
      memory: "2Gi"
```

## Step 3 - Apply Right-Sized Resources

```bash
helm upgrade dapr dapr/dapr \
  -n dapr-system \
  -f dapr-small-cluster-values.yaml \
  --wait
```

## Step 4 - Remove the Dashboard in Production

The dashboard is installed as a separate Helm chart (`dapr/dapr-dashboard`) and is not needed in production. If installed, uninstall it to reclaim resources:

```bash
helm uninstall dapr-dashboard -n dapr-system
```

If you have not yet installed the dashboard, simply skip installing the `dapr/dapr-dashboard` chart in production environments.

## Step 5 - Scale HA Replicas Appropriately

High availability mode runs 3 replicas of each control plane component. For clusters that don't need HA, 1 replica saves significant resources:

```yaml
# Non-production: disable HA
global:
  ha:
    enabled: false
```

```yaml
# Production: HA with custom replica count
global:
  ha:
    enabled: true
    replicaCount: 2  # 2 instead of 3 for cost savings with acceptable availability
```

Note: In HA mode, the Dapr Placement service always runs 3 replicas regardless of the `replicaCount` setting. The custom replica count applies to operator, sentry, and sidecar-injector.

## Step 6 - Monitor After Right-Sizing

After adjusting resources, monitor for OOMKills and CPU throttling over the next 48 hours:

```bash
kubectl get events -n dapr-system | grep -E "OOMKill|BackOff"
kubectl top pods -n dapr-system
```

Increase limits if throttling or OOMKill events appear.

## Summary

Right-sizing Dapr control plane resources starts with measuring actual usage through `kubectl top` and Prometheus. Scale allocations by cluster size - small clusters need far less than the defaults, while large actor-heavy clusters may need more. Disabling the dashboard in production and reducing HA replica count from 3 to 2 provides meaningful savings with acceptable availability trade-offs for most workloads.
