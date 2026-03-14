# Predictive Autoscaling with Flux CD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: flux-cd, kubernetes, autoscaling, hpa, keda, gitops, performance

Description: Learn how to implement predictive autoscaling for Kubernetes workloads using Flux CD, combining KEDA event-driven scaling with custom metrics and scheduled scaling policies to anticipate demand rather than react to it. This guide covers GitOps-managed autoscaling configurations for production workloads.

---

## Introduction

Reactive autoscaling — scaling up after CPU or memory thresholds are breached — introduces latency between demand spikes and additional capacity. By the time new pods are running, users have already experienced degraded performance. Predictive autoscaling anticipates demand using historical patterns, external event signals, and scheduled scale-out triggers to provision capacity before it is needed.

Flux CD is an ideal tool for managing predictive autoscaling configurations because all scaling policies live in Git, changes are auditable, and you can preview scaling behavior in staging before promoting to production. Combined with KEDA (Kubernetes Event-Driven Autoscaling) and Prometheus-based custom metrics, Flux enables a sophisticated autoscaling strategy that's fully declarative.

This guide walks through deploying KEDA with Flux, configuring KEDA ScaledObjects for event-driven scaling, and layering scheduled scale-out for known traffic patterns.

## Prerequisites

- Flux CD v2.x bootstrapped
- Prometheus deployed in the cluster (for custom metrics)
- Kubernetes 1.25+
- `flux` and `kubectl` CLIs installed

## Step 1: Deploy KEDA via Flux HelmRelease

Use Flux to install and manage KEDA in the cluster.
```yaml
# infrastructure/keda/helmrelease.yaml
# HelmRelease deploying KEDA for event-driven autoscaling
apiVersion: helm.toolkit.fluxcd.io/v2beta2
kind: HelmRelease
metadata:
  name: keda
  namespace: keda
spec:
  interval: 10m
  chart:
    spec:
      chart: keda
      version: "2.13.0"
      sourceRef:
        kind: HelmRepository
        name: kedacore
        namespace: flux-system
  values:
    # Enable metrics server for HPA integration
    metricsServer:
      replicaCount: 2
    # Resource limits for KEDA operators
    resources:
      operator:
        limits:
          cpu: 500m
          memory: 500Mi
```

## Step 2: Create a KEDA ScaledObject with Prometheus Metrics

Configure KEDA to scale based on Prometheus query results representing predicted load.
```yaml
# apps/api-service/scaledobject.yaml
# KEDA ScaledObject using Prometheus metrics for predictive scaling
apiVersion: keda.sh/v1alpha1
kind: ScaledObject
metadata:
  name: api-service-scaled
  namespace: production
spec:
  scaleTargetRef:
    name: api-service
  # Minimum replicas during off-peak hours
  minReplicaCount: 2
  # Maximum replicas during peak hours
  maxReplicaCount: 50
  # Cooldown period after scale-down
  cooldownPeriod: 300
  triggers:
    - type: prometheus
      metadata:
        serverAddress: http://prometheus.monitoring.svc.cluster.local:9090
        # Query predicting load based on rolling average request rate
        query: |
          sum(rate(http_requests_total{service="api-service"}[5m])) * 1.5
        # Target requests per replica
        threshold: "100"
```

## Step 3: Add Scheduled Pre-Scaling for Known Traffic Patterns

Layer scheduled scaling on top of event-driven scaling for predictable peaks.
```yaml
# apps/api-service/scaledobject-scheduled.yaml
# KEDA ScaledObject with cron-based pre-scaling for business hours peak traffic
apiVersion: keda.sh/v1alpha1
kind: ScaledObject
metadata:
  name: api-service-scheduled
  namespace: production
spec:
  scaleTargetRef:
    name: api-service
  minReplicaCount: 2
  maxReplicaCount: 50
  triggers:
    - type: cron
      metadata:
        timezone: "America/New_York"
        # Pre-scale at 7:45 AM — 15 minutes before business hours start
        start: "45 7 * * 1-5"
        # Scale back down after business hours
        end: "0 19 * * 1-5"
        # Number of replicas to pre-provision
        desiredReplicas: "20"
```

## Step 4: Configure Flux Kustomization for Autoscaling Resources

Manage all autoscaling resources through Flux with proper dependency ordering.
```yaml
# clusters/production/autoscaling-kustomization.yaml
# Kustomization managing predictive autoscaling resources
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: autoscaling-policies
  namespace: flux-system
spec:
  interval: 5m
  sourceRef:
    kind: GitRepository
    name: flux-system
  path: ./apps/production/autoscaling
  prune: true
  # Ensure KEDA is running before applying ScaledObjects
  dependsOn:
    - name: keda
```

## Best Practices

- Use a 1.5x multiplier in Prometheus queries to provision slightly more capacity than predicted
- Set `cooldownPeriod` to at least 5 minutes to avoid flapping during gradual load changes
- Combine cron-based and metric-based triggers for comprehensive predictive coverage
- Test ScaledObjects in staging with load testing tools (k6, Locust) before production
- Monitor HPA events via `kubectl describe hpa` to understand scaling decisions
- Use Flux notifications to alert when replicas hit maxReplicaCount limits

## Conclusion

Predictive autoscaling with KEDA and Flux CD shifts your capacity strategy from reactive to proactive. By combining Prometheus metric signals with cron-based pre-scaling for known traffic patterns, you eliminate the latency between demand spikes and available capacity. Managing all ScaledObjects in Git through Flux ensures changes are reviewed, auditable, and can be rapidly rolled back if a scaling policy behaves unexpectedly.
