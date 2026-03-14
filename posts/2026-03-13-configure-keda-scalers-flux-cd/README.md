# How to Configure KEDA Scalers with Flux CD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, Kubernetes, GitOps, KEDA, Autoscaling, Event-Driven, Scalers

Description: Configure KEDA event-driven autoscaler scalers using Flux CD to automatically scale Kubernetes workloads based on external metrics and event sources.

---

## Introduction

KEDA (Kubernetes Event-Driven Autoscaling) extends the Kubernetes Horizontal Pod Autoscaler to support scaling based on external event sources — Kafka queue depth, message queue length, database row counts, Prometheus metrics, and dozens more. Unlike standard HPA which only scales on CPU and memory, KEDA can scale workloads to zero when there are no events to process and scale out rapidly when demand spikes.

Managing KEDA and its ScaledObjects through Flux CD ensures your autoscaling configuration is version-controlled and consistently applied. Changes to scaling thresholds, polling intervals, or event source connections flow through pull requests.

This guide covers deploying KEDA and configuring ScaledObjects using Flux CD.

## Prerequisites

- Kubernetes cluster (1.24+)
- Flux CD v2 bootstrapped to your Git repository
- An event source accessible from the cluster (covered in specific trigger posts)

## Step 1: Create the Namespace and HelmRepository

```yaml
# clusters/my-cluster/keda/namespace.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: keda
  labels:
    app.kubernetes.io/managed-by: flux
---
# clusters/my-cluster/keda/helmrepository.yaml
apiVersion: source.toolkit.fluxcd.io/v1
kind: HelmRepository
metadata:
  name: kedacore
  namespace: flux-system
spec:
  interval: 12h
  url: https://kedacore.github.io/charts
```

## Step 2: Deploy KEDA via HelmRelease

```yaml
# clusters/my-cluster/keda/helmrelease.yaml
apiVersion: helm.toolkit.fluxcd.io/v2beta2
kind: HelmRelease
metadata:
  name: keda
  namespace: keda
spec:
  interval: 1h
  chart:
    spec:
      chart: keda
      version: "2.14.*"
      sourceRef:
        kind: HelmRepository
        name: kedacore
        namespace: flux-system
      interval: 12h
  values:
    # KEDA operator resources
    resources:
      operator:
        requests:
          cpu: 100m
          memory: 100Mi
        limits:
          cpu: 1
          memory: 1000Mi
      # Metrics API server resources
      metricServer:
        requests:
          cpu: 100m
          memory: 100Mi
        limits:
          cpu: 1
          memory: 1000Mi
    # Prometheus metrics for KEDA itself
    prometheus:
      metricServer:
        enabled: true
        port: 9022
      operator:
        enabled: true
        port: 8080
    # Replica count for HA
    operator:
      replicaCount: 1
    metricsServer:
      replicaCount: 1
```

## Step 3: Create a Flux Kustomization for KEDA

```yaml
# clusters/my-cluster/keda/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - namespace.yaml
  - helmrepository.yaml
  - helmrelease.yaml
---
# clusters/my-cluster/flux-kustomization-keda.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: keda
  namespace: flux-system
spec:
  interval: 10m
  path: ./clusters/my-cluster/keda
  prune: true
  sourceRef:
    kind: GitRepository
    name: flux-system
  healthChecks:
    - apiVersion: apps/v1
      kind: Deployment
      name: keda-operator
      namespace: keda
    - apiVersion: apps/v1
      kind: Deployment
      name: keda-operator-metrics-apiserver
      namespace: keda
```

## Step 4: Define a ScaledObject for a Worker Deployment

```yaml
# clusters/my-cluster/keda-scalers/worker-scaledobject.yaml
# Example: scale a worker based on a Redis list length
apiVersion: keda.sh/v1alpha1
kind: ScaledObject
metadata:
  name: worker-scaledobject
  namespace: app
spec:
  # Target deployment to scale
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: message-worker
  # Scale down to 0 when idle (scale-to-zero)
  minReplicaCount: 0
  maxReplicaCount: 30
  # How often to poll the scaler
  pollingInterval: 15
  # Seconds to wait before scaling down
  cooldownPeriod: 60
  triggers:
    - type: redis
      metadata:
        address: redis.redis.svc.cluster.local:6379
        listName: job-queue
        # Scale by 1 replica per 10 items in the list
        listLength: "10"
```

## Step 5: Define a ScaledJob for Batch Processing

```yaml
# clusters/my-cluster/keda-scalers/batch-scaledjob.yaml
# ScaledJob creates individual Job objects per event batch
apiVersion: keda.sh/v1alpha1
kind: ScaledJob
metadata:
  name: batch-processor
  namespace: app
spec:
  jobTargetRef:
    template:
      spec:
        restartPolicy: Never
        containers:
          - name: processor
            image: myregistry/batch-processor:v1.0.0
            resources:
              requests:
                cpu: "500m"
                memory: "512Mi"
  # Minimum and maximum job count
  minReplicaCount: 0
  maxReplicaCount: 10
  pollingInterval: 30
  # Cleanup completed jobs after 1 hour
  successfulJobsHistoryLimit: 5
  failedJobsHistoryLimit: 3
  triggers:
    - type: redis
      metadata:
        address: redis.redis.svc.cluster.local:6379
        listName: batch-queue
        listLength: "100"
```

## Step 6: Create Flux Kustomization for Scalers

```yaml
# clusters/my-cluster/flux-kustomization-keda-scalers.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: keda-scalers
  namespace: flux-system
spec:
  interval: 5m
  dependsOn:
    - name: keda
  path: ./clusters/my-cluster/keda-scalers
  prune: true
  sourceRef:
    kind: GitRepository
    name: flux-system
```

## Step 7: Verify KEDA Scaling

```bash
# Check KEDA is running
flux get kustomizations keda

# View ScaledObjects
kubectl get scaledobject -n app

# Check HPA created by KEDA
kubectl get hpa -n app

# View KEDA operator logs for scaling decisions
kubectl logs -n keda deployment/keda-operator --tail=50
```

## Best Practices

- Set `minReplicaCount: 0` for workloads that can tolerate cold starts to reduce idle costs; use `minReplicaCount: 1` for latency-sensitive services.
- Use `cooldownPeriod` to prevent rapid scale-down after a traffic burst, giving workloads time to finish processing in-flight work.
- Store scaler connection strings in Kubernetes Secrets and reference them in `ScaledObject.spec.triggers[].authenticationRef` using `TriggerAuthentication` resources.
- Use `ScaledJob` instead of `ScaledObject` for batch workloads where each unit of work should be processed by a dedicated Job pod.
- Monitor KEDA metrics with Prometheus — KEDA exposes `keda_scaler_active`, `keda_scaler_metrics_value`, and `keda_scaler_errors_total` for each scaler.

## Conclusion

KEDA deployed and configured through Flux CD gives your platform team a powerful, GitOps-governed autoscaling solution that goes far beyond CPU and memory. Autoscaling policies for dozens of event sources are defined in Git, reviewed as code, and automatically reconciled — enabling your workloads to scale precisely with demand while minimizing idle infrastructure costs.
