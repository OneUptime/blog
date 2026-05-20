# How to Tune ArgoCD Controller for Large Application Counts

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: ArgoCD, GitOps, Kubernetes, Performance Tuning, Scalability

Description: Learn how to tune the ArgoCD application controller to handle hundreds or thousands of applications without degrading sync performance or overwhelming your cluster.

---

When your ArgoCD instance manages more than a hundred applications, the default controller settings start to show their limits. Syncs take longer, the UI becomes sluggish, and you may notice applications stuck in a "Processing" state for minutes at a time. This guide explains how to tune the ArgoCD application controller specifically for environments with large application counts.

## How the Controller Works

The ArgoCD application controller runs a reconciliation loop. On each iteration, it picks up applications from an internal queue, compares their live state against their desired state, and triggers syncs when needed. The speed of this loop depends on several factors: the number of status processors, the number of operation processors, sharding configuration, and available compute resources.

```mermaid
graph TD
    A[Application Queue] --> B{Status Processor Pool}
    B --> C[Compare Live vs Desired]
    C --> D{Out of Sync?}
    D -->|Yes| E[Operation Processor Pool]
    D -->|No| F[Mark Synced]
    E --> G[Execute Sync]
    G --> H[Health Check]
```

With 500 applications and only the default 20 status processors, each reconciliation cycle takes much longer than necessary because most applications sit in the queue waiting.

## Increasing Status Processors

Status processors handle the comparison between live and desired state. This is the first thing to increase.

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: argocd-application-controller
  namespace: argocd
spec:
  template:
    spec:
      containers:
      - name: argocd-application-controller
        args:
        - /usr/local/bin/argocd-application-controller
        # Default is 20, increase based on app count
        # Rule of thumb: 1 processor per 10 apps
        - --status-processors=100
        # Default is 10
        - --operation-processors=50
```

For 500 applications, setting `--status-processors` to 50-100 is reasonable. For 1000+ applications, consider 100-200 processors. Each processor runs as a goroutine, so the overhead is primarily CPU and memory on the controller pod, not additional pods.

## Increasing Operation Processors

Operation processors handle the actual sync execution. If you have many applications syncing simultaneously (for example, after a shared library update), the default 10 processors create a bottleneck.

```yaml
# Operation processors control concurrent syncs

# Default: 10
- --operation-processors=50
```

Set this to roughly half your status processor count. Operations are heavier than status checks because they involve applying resources to the cluster, so you want fewer of them running concurrently than status checks.

## Enabling Controller Sharding

For very large deployments, especially when those applications target many clusters, a single controller instance may not be enough regardless of processor counts. Controller sharding distributes clusters across multiple controller replicas, and each shard reconciles the applications assigned to its clusters.

```yaml
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: argocd-application-controller
  namespace: argocd
spec:
  replicas: 3  # Run 3 controller shards
  template:
    spec:
      containers:
      - name: argocd-application-controller
        args:
        - /usr/local/bin/argocd-application-controller
        - --status-processors=50
        - --operation-processors=25
        env:
        # Enable sharding
        - name: ARGOCD_CONTROLLER_REPLICAS
          value: "3"
```

With sharding enabled, each controller replica is responsible for a subset of clusters. The assignment is based on the cluster shard value, or calculated by the controller when a cluster does not specify one.

You can also use the `--sharding-method` flag to control how clusters are distributed.

```yaml
# Available sharding methods
# round-robin: distributes clusters evenly across shards
# consistent-hashing: reduces reshuffling when shards or clusters change
# legacy: hash-based (default)
- --sharding-method=round-robin
```

The `round-robin` method provides more even cluster distribution. In current ArgoCD versions, `round-robin` and `consistent-hashing` are still documented as experimental, so test them before using them in production.

## Configuring Resource Limits

A controller processing hundreds of applications needs substantial CPU and memory. If the controller is resource-constrained, it will be slow regardless of processor counts.

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: argocd-application-controller
  namespace: argocd
spec:
  template:
    spec:
      containers:
      - name: argocd-application-controller
        resources:
          requests:
            # Base: 500m per 100 apps
            cpu: "2"
            # Base: 1Gi per 100 apps
            memory: "4Gi"
          limits:
            cpu: "4"
            memory: "8Gi"
```

Monitor actual usage with Prometheus and adjust accordingly. The controller memory usage grows linearly with the number of applications and the number of resources in each application.

## Tuning Reconciliation Intervals

With many applications, you want to be careful about how frequently reconciliation runs. Too frequent means the controller never finishes one cycle before starting another.

```yaml
# argocd-cm ConfigMap
apiVersion: v1
kind: ConfigMap
metadata:
  name: argocd-cm
  namespace: argocd
data:
  # Increase for large app counts to reduce controller load
  # Current default maximum is 120s plus up to 60s of jitter
  timeout.reconciliation: "300s"
```

For large deployments, increasing the reconciliation interval to 5 minutes (300s) reduces the steady-state load on the controller. Combine this with webhooks so that actual changes are still detected immediately.

## Adjusting the kubectl Parallelism Limit

When the controller syncs applications, it can fork and execute kubectl commands. The kubectl parallelism limit controls the number of concurrent kubectl fork/exec operations across the controller.

```yaml
# Default: 20 in current ArgoCD
- --kubectl-parallelism-limit=20
```

Setting this higher can help when kubectl execution is the bottleneck, but it also increases load on the Kubernetes API server. Monitor API server latency and controller metrics before raising it.

## Using Server-Side Apply

Server-side apply uses Kubernetes field management instead of the `kubectl.kubernetes.io/last-applied-configuration` annotation. Enable it per-application in the sync policy.

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: my-app
spec:
  syncPolicy:
    syncOptions:
    - ServerSideApply=true
```

Server-side apply also eliminates the "too large" error that occurs when annotations exceed the 262144-byte limit on client-side apply.

## Monitoring Controller Performance

Track these Prometheus metrics to understand controller behavior at scale.

```promql
# Reconciliation queue depth - should stay low
workqueue_depth{name="app_reconciliation_queue"}

# Reconciliation time per app
histogram_quantile(0.95,
  sum(rate(argocd_app_reconcile_bucket[5m])) by (le)
)

# Number of apps in each sync status
argocd_app_info{sync_status="OutOfSync"}

# Controller workqueue depth
workqueue_depth{name="app_operation_processing_queue"}
```

If the reconciliation queue depth is consistently growing, the controller cannot keep up. Either increase processors, add shards, or increase the reconciliation interval.

## Practical Scaling Guide

Here is a reference table for controller settings based on application count.

| App Count | Status Processors | Op Processors | Shards | CPU (per shard) | Memory (per shard) |
|-----------|------------------|---------------|--------|-----------------|-------------------|
| 50 | 20 | 10 | 1 | 500m | 1Gi |
| 200 | 50 | 25 | 1 | 1 | 2Gi |
| 500 | 50 | 25 | 2 | 2 | 4Gi |
| 1000 | 100 | 50 | 3 | 2 | 4Gi |
| 2000+ | 100 | 50 | 5+ | 4 | 8Gi |

These are starting points. Profile your actual workload because the complexity of individual applications varies significantly. An application with 5 resources is much cheaper than one with 500 resources.

## Avoiding Common Mistakes

One frequent mistake is increasing processor counts without providing enough CPU. Each processor is a goroutine that actively computes diffs, so high processor counts without proportional CPU just causes contention.

Another mistake is running too many shards for a small number of clusters. Sharding has operational overhead, and if each shard only handles one or two small clusters, the overhead may outweigh the benefit.

Finally, do not forget that the repo server and Redis also need to scale alongside the controller. A tuned controller that is waiting on a slow repo server will not show improvement. See our guide on [tuning the ArgoCD repo server](https://oneuptime.com/blog/post/2026-02-26-argocd-tune-repo-server-large-repos/view) for the repo server side.
