# How to Configure Vertical Pod Autoscaling with Flux CD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, Kubernetes, Vertical Pod Autoscaler, VPA, GitOps, Resource Management

Description: A practical guide to deploying and managing Vertical Pod Autoscalers with Flux CD for optimal resource allocation in Kubernetes.

---

## Introduction

Vertical Pod Autoscaling (VPA) automatically adjusts the CPU and memory resource requests for your containers based on actual usage patterns. Unlike Horizontal Pod Autoscaling which changes the number of pods, VPA right-sizes individual pods. Managing VPA through Flux CD ensures your resource optimization policies are version-controlled and consistently applied.

This guide covers installing the VPA controller with Flux, configuring VPA resources, and advanced patterns for production environments.

## Prerequisites

- Kubernetes cluster v1.26 or later
- Flux CD v2 installed and bootstrapped
- Metrics Server installed in the cluster
- kubectl access to the cluster

## Installing the VPA Controller with Flux

First, deploy the VPA controller using a Flux HelmRelease:

```yaml
# infrastructure/controllers/vpa-helmrepository.yaml
apiVersion: source.toolkit.fluxcd.io/v1
kind: HelmRepository
metadata:
  name: fairwinds-charts
  namespace: flux-system
spec:
  interval: 1h
  url: https://charts.fairwinds.com/stable
```

```yaml
# infrastructure/controllers/vpa-helmrelease.yaml
apiVersion: helm.toolkit.fluxcd.io/v1
kind: HelmRelease
metadata:
  name: vpa
  namespace: kube-system
spec:
  interval: 30m
  chart:
    spec:
      chart: vpa
      version: "4.x"
      sourceRef:
        kind: HelmRepository
        name: fairwinds-charts
        namespace: flux-system
  values:
    # Enable all three VPA components
    recommender:
      enabled: true
      resources:
        requests:
          cpu: 50m
          memory: 500Mi
    updater:
      enabled: true
      resources:
        requests:
          cpu: 50m
          memory: 500Mi
    admissionController:
      enabled: true
      resources:
        requests:
          cpu: 50m
          memory: 200Mi
```

## Flux Kustomization for VPA Resources

```yaml
# clusters/my-cluster/vpa.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: vpa-resources
  namespace: flux-system
spec:
  interval: 10m
  sourceRef:
    kind: GitRepository
    name: flux-system
  path: ./infrastructure/vpa/production
  prune: true
  wait: true
  # VPA resources depend on the VPA controller being installed
  dependsOn:
    - name: vpa-controller
```

## Basic VPA Configuration

Configure VPA in recommendation-only mode to start:

```yaml
# infrastructure/vpa/base/web-app-vpa.yaml
apiVersion: autoscaling.k8s.io/v1
kind: VerticalPodAutoscaler
metadata:
  name: web-app-vpa
  namespace: production
  labels:
    app.kubernetes.io/managed-by: flux
spec:
  targetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: web-app
  # Off mode only provides recommendations without applying them
  updatePolicy:
    updateMode: "Off"
```

## VPA with Auto Update Mode

Once you trust the recommendations, enable automatic updates:

```yaml
# infrastructure/vpa/base/api-server-vpa.yaml
apiVersion: autoscaling.k8s.io/v1
kind: VerticalPodAutoscaler
metadata:
  name: api-server-vpa
  namespace: production
spec:
  targetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: api-server
  # Auto mode applies recommendations by evicting and recreating pods
  updatePolicy:
    updateMode: "Auto"
  resourcePolicy:
    containerPolicies:
      - containerName: api-server
        # Set minimum and maximum resource boundaries
        minAllowed:
          cpu: 100m
          memory: 128Mi
        maxAllowed:
          cpu: 2000m
          memory: 4Gi
        controlledResources:
          - cpu
          - memory
```

## VPA with Initial Update Mode

Apply recommendations only when pods are created, not by evicting running pods:

```yaml
# infrastructure/vpa/base/worker-vpa.yaml
apiVersion: autoscaling.k8s.io/v1
kind: VerticalPodAutoscaler
metadata:
  name: worker-vpa
  namespace: production
spec:
  targetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: worker
  # Initial mode sets resources only at pod creation time
  updatePolicy:
    updateMode: "Initial"
  resourcePolicy:
    containerPolicies:
      - containerName: worker
        minAllowed:
          cpu: 50m
          memory: 64Mi
        maxAllowed:
          cpu: 4000m
          memory: 8Gi
```

## Multi-Container VPA Configuration

Configure VPA for pods with multiple containers:

```yaml
# infrastructure/vpa/base/sidecar-app-vpa.yaml
apiVersion: autoscaling.k8s.io/v1
kind: VerticalPodAutoscaler
metadata:
  name: sidecar-app-vpa
  namespace: production
spec:
  targetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: sidecar-app
  updatePolicy:
    updateMode: "Auto"
  resourcePolicy:
    containerPolicies:
      # Main application container
      - containerName: app
        minAllowed:
          cpu: 200m
          memory: 256Mi
        maxAllowed:
          cpu: 2000m
          memory: 4Gi
      # Sidecar container with different resource bounds
      - containerName: envoy-proxy
        minAllowed:
          cpu: 50m
          memory: 64Mi
        maxAllowed:
          cpu: 500m
          memory: 512Mi
      # Exclude the log collector from VPA management
      - containerName: log-collector
        mode: "Off"
```

## VPA for StatefulSets

```yaml
# infrastructure/vpa/base/database-vpa.yaml
apiVersion: autoscaling.k8s.io/v1
kind: VerticalPodAutoscaler
metadata:
  name: database-vpa
  namespace: production
spec:
  targetRef:
    apiVersion: apps/v1
    kind: StatefulSet
    name: postgresql
  # Use Initial mode for databases to avoid disruptive restarts
  updatePolicy:
    updateMode: "Initial"
  resourcePolicy:
    containerPolicies:
      - containerName: postgresql
        minAllowed:
          cpu: 500m
          memory: 1Gi
        maxAllowed:
          cpu: 8000m
          memory: 32Gi
        controlledResources:
          - cpu
          - memory
```

## Environment-Specific Overlays

```yaml
# infrastructure/vpa/base/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - web-app-vpa.yaml
  - api-server-vpa.yaml
  - worker-vpa.yaml
```

```yaml
# infrastructure/vpa/production/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - ../base
patches:
  - target:
      kind: VerticalPodAutoscaler
      name: web-app-vpa
    patch: |
      - op: replace
        path: /spec/updatePolicy/updateMode
        # Production uses Auto mode after validation
        value: "Auto"
```

```yaml
# infrastructure/vpa/staging/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - ../base
patches:
  - target:
      kind: VerticalPodAutoscaler
      name: web-app-vpa
    patch: |
      - op: replace
        path: /spec/updatePolicy/updateMode
        # Staging stays in recommendation-only mode
        value: "Off"
```

## Combining VPA with HPA

VPA and HPA can work together, but they should not scale on the same metric. Use VPA for memory and HPA for CPU:

```yaml
# infrastructure/vpa/base/combined-vpa.yaml
apiVersion: autoscaling.k8s.io/v1
kind: VerticalPodAutoscaler
metadata:
  name: combined-app-vpa
  namespace: production
spec:
  targetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: combined-app
  updatePolicy:
    updateMode: "Auto"
  resourcePolicy:
    containerPolicies:
      - containerName: app
        # Only manage memory, let HPA handle CPU scaling
        controlledResources:
          - memory
        minAllowed:
          memory: 128Mi
        maxAllowed:
          memory: 4Gi
```

```yaml
# infrastructure/autoscaling/base/combined-hpa.yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: combined-app-hpa
  namespace: production
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: combined-app
  minReplicas: 3
  maxReplicas: 20
  metrics:
    # HPA scales horizontally on CPU
    - type: Resource
      resource:
        name: cpu
        target:
          type: Utilization
          averageUtilization: 70
```

## Monitoring VPA Recommendations

```bash
# View VPA recommendations
kubectl describe vpa web-app-vpa -n production

# Check all VPAs
kubectl get vpa --all-namespaces

# View detailed recommendation values
kubectl get vpa web-app-vpa -n production -o jsonpath='{.status.recommendation}'

# Verify Flux reconciliation
flux get kustomizations vpa-resources
```

## Flux Notifications for VPA

```yaml
# clusters/my-cluster/vpa-alerts.yaml
apiVersion: notification.toolkit.fluxcd.io/v1
kind: Alert
metadata:
  name: vpa-alerts
  namespace: flux-system
spec:
  providerRef:
    name: slack-provider
  eventSeverity: info
  eventSources:
    - kind: Kustomization
      name: vpa-resources
      namespace: flux-system
    - kind: HelmRelease
      name: vpa
      namespace: kube-system
```

## Best Practices

1. Start with `updateMode: "Off"` to observe recommendations before enabling auto-updates
2. Always set `minAllowed` and `maxAllowed` to prevent extreme resource assignments
3. Use `Initial` mode for stateful workloads to avoid disruptive pod evictions
4. When combining VPA with HPA, ensure they control different resource dimensions
5. Monitor VPA recommendations regularly to validate they align with expectations
6. Exclude sidecar containers that have known, fixed resource requirements

## Conclusion

Vertical Pod Autoscaling through Flux CD provides an automated, GitOps-driven approach to resource right-sizing. By starting with recommendation mode and gradually enabling auto-updates, you can optimize resource allocation while maintaining application stability. VPA is particularly valuable for workloads with unpredictable or changing resource patterns, and when combined with HPA, provides comprehensive autoscaling coverage.
