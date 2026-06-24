# VPA Auto Mode with Flux CD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, VPA, Kubernetes, Resource Management, GitOps

Description: Learn how to configure Vertical Pod Autoscaler in Auto mode with Flux CD, enabling automatic right-sizing of pod resource requests through GitOps-managed VPA objects.

---

## Introduction

Vertical Pod Autoscaler (VPA) automatically adjusts CPU and memory requests for containers based on historical usage. In Recreate mode, VPA can evict and restart pods with updated resource requests. This ensures pods have more appropriate resources allocated, reducing overprovisioning waste and helping prevent OOM kills from underprovisioning.

## Prerequisites

- Kubernetes cluster with Flux CD bootstrapped
- VPA installed (via Flux)
- Metrics Server running
- `jq` installed locally for the JSON filtering command

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
  namespace: flux-system
spec:
  interval: 1h
  targetNamespace: kube-system
  chart:
    spec:
      chart: vpa
      version: "4.4.x"
      sourceRef:
        kind: HelmRepository
        name: fairwinds-stable
        namespace: flux-system
  values:
    recommender:
      enabled: true
      resources:
        requests:
          cpu: 50m
          memory: 256Mi
    updater:
      enabled: true   # Required for Recreate mode
    admissionController:
      enabled: true   # Required for Recreate mode (mutates pod specs)
```

## Step 2: Configure VPA in Recreate Mode

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
    updateMode: "Recreate"  # Automatically apply recommendations by evicting pods
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
    updateMode: "Recreate"
    minReplicas: 2  # Require at least 2 live replicas before eviction
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
    - name: vpa  # Flux Kustomization that installs the VPA CRDs/controller
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
    updateMode: "Recreate"
  resourcePolicy:
    containerPolicies:
      - containerName: myapp
        controlledResources: ["memory"]  # Only manage memory; let HPA handle CPU via requests
```

## Best Practices

- Start with VPA in `Off` mode to observe what changes it would make before enabling Recreate mode.
- Set `minReplicas: 2` in the VPA updatePolicy to require at least two live replicas before the updater attempts eviction.
- Use PodDisruptionBudgets alongside VPA to control how many pods can be evicted at once.
- Do not use VPA Recreate mode with HPA on the same resource dimension (both CPU or both memory); it can cause oscillation.
- Set generous `maxAllowed` values; VPA will not recommend resources above this ceiling.
- Allow VPA at least 24-48 hours of metric collection before the recommendations stabilize.

## Conclusion

VPA in Recreate mode deployed via Flux CD provides automatic right-sizing of pod resources based on actual usage patterns. This reduces both overprovisioning (waste) and underprovisioning (OOM kills and throttling). Combined with HPA for horizontal scaling, VPA and HPA together create a complete autoscaling solution that optimizes both the number of replicas and the resources allocated to each.
