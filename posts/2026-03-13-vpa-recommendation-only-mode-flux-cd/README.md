# How to Configure VPA in Recommendation-Only Mode with Flux CD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, VPA, Vertical Pod Autoscaler, Autoscaling, Kubernetes, GitOps, Right-Sizing

Description: Learn how to configure Vertical Pod Autoscaler in recommendation-only mode for right-sizing insights without automatic pod eviction using Flux CD.

---

## Introduction

VPA in Recommendation-Only (Off) mode collects resource usage metrics and provides sizing recommendations without modifying any pods. This is ideal for teams who want to understand optimal resource requests before adopting automatic vertical scaling, or for workloads where automatic pod eviction is not acceptable during business hours. Managing VPA in recommendation mode via Flux CD gives you organization-wide right-sizing visibility.

## Prerequisites

- Kubernetes cluster with VPA installed
- Flux CD bootstrapped
- Metrics Server and VPA Recommender running

## Step 1: Deploy VPA with Recommender Only

For recommendation-only mode, you only need the VPA Recommender (not the Updater or Admission Controller):

```yaml
# clusters/production/infrastructure/vpa-recommender.yaml
apiVersion: helm.toolkit.fluxcd.io/v2beta2
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
      enabled: false  # Disable for recommendation-only
    admissionController:
      enabled: false  # Disable for recommendation-only
```

## Step 2: Configure VPA in Off Mode

```yaml
# apps/myapp/vpa-recommender.yaml
apiVersion: autoscaling.k8s.io/v1
kind: VerticalPodAutoscaler
metadata:
  name: myapp-recommendations
  namespace: myapp
spec:
  targetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: myapp
  updatePolicy:
    updateMode: "Off"  # Recommendation only, no automatic updates
  resourcePolicy:
    containerPolicies:
      - containerName: myapp
        # Set bounds for recommendations
        minAllowed:
          cpu: 50m
          memory: 64Mi
        maxAllowed:
          cpu: "8"
          memory: 8Gi
        controlledResources: ["cpu", "memory"]
```

## Step 3: Create a Script to Read VPA Recommendations

```bash
#!/bin/bash
# vpa-recommendations.sh - Report VPA recommendations for all namespaces

echo "=== VPA Resource Recommendations ==="
echo ""

for ns in $(kubectl get ns -o jsonpath='{.items[*].metadata.name}'); do
  VPAs=$(kubectl get vpa -n $ns -o jsonpath='{.items[*].metadata.name}' 2>/dev/null)
  
  for vpa in $VPAs; do
    TARGET=$(kubectl get vpa $vpa -n $ns \
      -o jsonpath='{.spec.targetRef.kind}/{.spec.targetRef.name}')
    
    echo "--- $ns/$vpa ($TARGET) ---"
    
    # Get current resource requests
    echo "Current requests:"
    kubectl get vpa $vpa -n $ns \
      -o jsonpath='{range .status.recommendation.containerRecommendations[*]}{.containerName}{": CPU="}{.target.cpu}{", Mem="}{.target.memory}{"\n"}{end}'
    
    # Get recommendation bounds
    echo "Lower bound (safe minimum):"
    kubectl get vpa $vpa -n $ns \
      -o jsonpath='{range .status.recommendation.containerRecommendations[*]}{.containerName}{": CPU="}{.lowerBound.cpu}{", Mem="}{.lowerBound.memory}{"\n"}{end}'
    
    echo "Upper bound (safety buffer):"
    kubectl get vpa $vpa -n $ns \
      -o jsonpath='{range .status.recommendation.containerRecommendations[*]}{.containerName}{": CPU="}{.upperBound.cpu}{", Mem="}{.upperBound.memory}{"\n"}{end}'
    
    echo ""
  done
done
```

## Step 4: Deploy VPA Across All Namespaces via Flux

```yaml
# apps/vpa-recommendations/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - myapp-vpa.yaml
  - backend-vpa.yaml
  - worker-vpa.yaml
  - frontend-vpa.yaml
```

```yaml
# clusters/production/apps/vpa-recommendations.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: vpa-recommendations
  namespace: flux-system
spec:
  interval: 1h
  path: ./apps/vpa-recommendations
  prune: true
  sourceRef:
    kind: GitRepository
    name: fleet-repo
  dependsOn:
    - name: vpa
```

## Step 5: Act on VPA Recommendations

After reviewing recommendations, update resource requests in manifests:

```yaml
# Before (current values):
resources:
  requests:
    cpu: 500m    # VPA recommends: 120m
    memory: 1Gi  # VPA recommends: 256Mi

# After (VPA-informed values):
resources:
  requests:
    cpu: 150m    # Slightly above VPA recommendation for headroom
    memory: 384Mi  # 50% above recommendation as safety buffer
  limits:
    cpu: "1"
    memory: 768Mi
```

## Step 6: Build a VPA Recommendation Dashboard

```yaml
# PrometheusRule to alert when recommendations differ significantly from requests
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: vpa-drift-alerts
  namespace: monitoring
spec:
  groups:
    - name: vpa.rules
      rules:
        # Alert when CPU request is >2x the VPA recommendation
        - alert: CPURequestOverprovisioned
          expr: |
            kube_verticalpodautoscaler_status_recommendation_containerrecommendations_target{resource="cpu"}
            / on(namespace, pod)
            kube_pod_container_resource_requests{resource="cpu"} < 0.5
          for: 1h
          labels:
            severity: info
          annotations:
            summary: "CPU request may be overprovisioned for {{ $labels.namespace }}/{{ $labels.pod }}"
```

## Best Practices

- Run VPA in recommendation mode for at least 1-2 weeks before acting on recommendations; early recommendations are based on insufficient data.
- Review recommendations weekly and apply them during the next deployment cycle rather than continuously chasing VPA suggestions.
- Add a 20-30% buffer above the VPA `target` recommendation when setting resource requests; VPA's target is based on P90 usage.
- Use VPA recommendations as input to your team's resource planning, not as automatically applied values.
- When transitioning from recommendation to Auto mode, do it gradually: enable Auto for non-production namespaces first.
- Export VPA recommendations to a Grafana dashboard for organization-wide resource optimization visibility.

## Conclusion

VPA in recommendation-only mode deployed via Flux CD provides actionable resource right-sizing insights without the risk of automatic pod eviction. This is the safest way to adopt VPA: observe recommendations, validate them in staging, apply them manually to production manifests via Git, and then consider enabling Auto mode once you have confidence in VPA's behavior for your workloads.
