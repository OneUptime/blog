# How to Configure VPA in Auto Mode with Flux CD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, VPA, Vertical Pod Autoscaler, Autoscaling, Kubernetes, GitOps, Resource Management

Description: Learn how to deploy and configure Vertical Pod Autoscaler in auto mode using Flux CD to automatically right-size pod CPU and memory requests.

---

## Introduction

Vertical Pod Autoscaler (VPA) automatically adjusts CPU and memory requests for containers based on historical usage. In Auto mode, VPA can evict and restart pods with updated resource requests. This ensures pods always have the right amount of resources allocated, reducing overprovisioning waste and preventing OOM kills from underprovisioning.

## Prerequisites

- Kubernetes cluster with Flux CD bootstrapped
- VPA installed (via Flux)
- Metrics Server running

## Step 1: Deploy VPA via Flux

```yaml
# clusters/production/infrastructure/vpa.yaml
apiVersion: source.toolkit.fluxcd.io/v1
kind: HelmRepository
metadata:
  name: fairwinds-stable
  namespace: flux-system
spec:
  interval: 1h
  url: https://charts.fairwinds.com/stable
---
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata:
  name: vpa
  namespace: kube-system
spec:
  interval: 1h
  chart:
    spec:
      chart: vpa
      version: "4.4.x"
      sourceRef:
        kind: HelmRepository
        name: fairwinds-stable
  values:
    recommender:
      enabled: true
      resources:
        requests:
          cpu: 50m
          memory: 256Mi
    updater:
      enabled: true   # Required for Auto mode
    admissionController:
      enabled: true   # Required for Auto mode (mutates pod specs)
```

## Step 2: Configure VPA in Auto Mode

```yaml
# apps/myapp/vpa.yaml
apiVersion: autoscaling.k8s.io/v1
kind: VerticalPodAutoscaler
metadata:
  name: myapp
  namespace: myapp
spec:
  targetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: myapp
  updatePolicy:
    updateMode: "Auto"  # Automatically apply recommendations and evict pods
  resourcePolicy:
    containerPolicies:
      - containerName: myapp
        minAllowed:
          cpu: 100m
          memory: 128Mi
        maxAllowed:
          cpu: "4"
          memory: 4Gi
        # Apply to both requests and limits
        controlledResources: ["cpu", "memory"]
        # Control which resources VPA adjusts
        controlledValues: RequestsAndLimits
```

## Step 3: VPA with Controlled Values

```yaml
# VPA that only adjusts requests (not limits)
apiVersion: autoscaling.k8s.io/v1
kind: VerticalPodAutoscaler
metadata:
  name: myapp-requests-only
  namespace: myapp
spec:
  targetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: myapp
  updatePolicy:
    updateMode: "Auto"
    minReplicas: 2  # Don't evict if replicas < 2 (ensures availability)
  resourcePolicy:
    containerPolicies:
      - containerName: myapp
        minAllowed:
          cpu: 50m
          memory: 64Mi
        maxAllowed:
          cpu: "2"
          memory: 2Gi
        controlledResources: ["cpu", "memory"]
        controlledValues: RequestsOnly  # Don't touch limits
```

## Step 4: Deploy VPA via Flux Kustomization

```yaml
# clusters/production/apps/myapp-vpa.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: myapp-vpa
  namespace: flux-system
spec:
  interval: 10m
  path: ./apps/myapp/vpa
  prune: true
  sourceRef:
    kind: GitRepository
    name: fleet-repo
  dependsOn:
    - name: vpa  # VPA CRDs must exist
  targetNamespace: myapp
```

## Step 5: Monitor VPA Recommendations

```bash
# Check VPA recommendations
kubectl get vpa myapp -n myapp
kubectl describe vpa myapp -n myapp

# View recommendation details
kubectl get vpa myapp -n myapp -o json | jq '.status.recommendation'

# Check if pods were evicted and restarted with new resources
kubectl get events -n myapp | grep VPA

# Verify pod has new resource requests after restart
kubectl get pod -n myapp -l app=myapp \
  -o jsonpath='{.items[0].spec.containers[0].resources}'
```

## Step 6: Handle VPA and HPA Conflict

VPA and HPA should not both control CPU and memory. Use VPA for requests and HPA for replica count:

```yaml
# HPA for replica scaling (CPU-based)
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: myapp
  namespace: myapp
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: myapp
  minReplicas: 2
  maxReplicas: 20
  metrics:
    - type: Resource
      resource:
        name: cpu
        target:
          type: Utilization
          averageUtilization: 70
---
# VPA for request right-sizing (memory only to avoid HPA conflict)
apiVersion: autoscaling.k8s.io/v1
kind: VerticalPodAutoscaler
metadata:
  name: myapp
  namespace: myapp
spec:
  targetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: myapp
  updatePolicy:
    updateMode: "Auto"
  resourcePolicy:
    containerPolicies:
      - containerName: myapp
        controlledResources: ["memory"]  # Only manage memory; let HPA handle CPU via requests
```

## Best Practices

- Start with VPA in Recommendation-Only mode to observe what changes it would make before enabling Auto mode.
- Set `minReplicas: 2` in the VPA updatePolicy to prevent evicting all pods simultaneously.
- Use PodDisruptionBudgets alongside VPA to control how many pods can be evicted at once.
- Do not use VPA Auto mode with HPA on the same resource dimension (both CPU or both memory); it causes oscillation.
- Set generous `maxAllowed` values; VPA will not recommend resources above this ceiling.
- Allow VPA at least 24-48 hours of metric collection before the recommendations stabilize.

## Conclusion

VPA in Auto mode deployed via Flux CD provides automatic right-sizing of pod resources based on actual usage patterns. This reduces both overprovisioning (waste) and underprovisioning (OOM kills and throttling). Combined with HPA for horizontal scaling, VPA and HPA together create a complete autoscaling solution that optimizes both the number of replicas and the resources allocated to each.
