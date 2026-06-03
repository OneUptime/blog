# How to Use Kubernetes Vertical Pod Autoscaler Recommendations

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, VPA, Autoscaling

Description: Learn how to safely implement Vertical Pod Autoscaler recommendations in production environments with gradual rollout strategies, validation gates, and rollback mechanisms.

---

The Vertical Pod Autoscaler (VPA) helps optimize resource allocation for pods by analyzing historical usage patterns and recommending CPU and memory requests, and optionally limits. However, applying these recommendations in production requires careful planning to avoid disruption. This guide shows you how to implement VPA recommendations safely with validation and rollback strategies.

## Understanding VPA Update Modes

VPA offers several update modes, each with different risk profiles for production environments. The common production-safe starting point is "Off"; "Auto" is deprecated in current VPA releases, so use explicit modes such as "Recreate", "Initial", or "InPlaceOrRecreate" when you are ready to apply recommendations.

```yaml
apiVersion: autoscaling.k8s.io/v1
kind: VerticalPodAutoscaler
metadata:
  name: my-app-vpa
spec:
  targetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: my-app
  updatePolicy:
    updateMode: "Off"  # Start with Off mode in production
  resourcePolicy:
    containerPolicies:
    - containerName: '*'
      minAllowed:
        cpu: 100m
        memory: 128Mi
      maxAllowed:
        cpu: 4
        memory: 8Gi
      controlledResources: ["cpu", "memory"]
```

The "Off" mode generates recommendations without applying changes. Start here to gather data and validate suggestions before enabling automatic updates.

## Creating a Safe Recommendation Review Process

Before applying VPA recommendations, establish a review process that compares historical usage with suggested values.

```bash
#!/bin/bash
# Script to review VPA recommendations before applying

NAMESPACE="production"
VPA_NAME="my-app-vpa"

# Get current recommendations

kubectl get vpa $VPA_NAME -n $NAMESPACE -o jsonpath='{.status.recommendation.containerRecommendations[0]}' | jq '.'

# Compare with current resource settings
kubectl get deployment my-app -n $NAMESPACE -o jsonpath='{.spec.template.spec.containers[0].resources}' | jq '.'

# Check current container metrics from the Metrics API
kubectl top pods -n $NAMESPACE --selector=app=my-app --containers | head -20

# Calculate recommendation variance
echo "CPU Target: $(kubectl get vpa $VPA_NAME -n $NAMESPACE -o jsonpath='{.status.recommendation.containerRecommendations[0].target.cpu}')"
echo "Memory Target: $(kubectl get vpa $VPA_NAME -n $NAMESPACE -o jsonpath='{.status.recommendation.containerRecommendations[0].target.memory}')"
```

This script provides visibility into what VPA suggests versus current allocations, helping you identify significant changes that need careful testing.

## Implementing Gradual Rollout with Recreate Mode

For production workloads, use "Recreate" mode with controlled testing rather than the deprecated "Auto" mode. In "Recreate" mode, VPA updates existing pods by evicting them when their requests differ significantly from the recommendation, while respecting PodDisruptionBudgets when they are defined.

```yaml
apiVersion: autoscaling.k8s.io/v1
kind: VerticalPodAutoscaler
metadata:
  name: my-app-vpa-canary
  namespace: production
spec:
  targetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: my-app-canary  # Apply to canary deployment first
  updatePolicy:
    updateMode: "Recreate"
    minReplicas: 2  # Ensure minimum replicas during updates
  resourcePolicy:
    containerPolicies:
    - containerName: 'app'
      minAllowed:
        cpu: 200m
        memory: 256Mi
      maxAllowed:
        cpu: 2
        memory: 4Gi
      controlledResources: ["cpu", "memory"]
      controlledValues: RequestsAndLimits
```

Test VPA on a canary deployment first. Monitor for issues before applying to production workloads.

## Setting Up Validation Gates

Create admission webhooks or policy enforcement to validate resource changes before new pods are admitted.

```yaml
apiVersion: admissionregistration.k8s.io/v1
kind: ValidatingWebhookConfiguration
metadata:
  name: vpa-validation-webhook
webhooks:
- name: validate.vpa.k8s.io
  matchPolicy: Equivalent
  rules:
  - apiGroups: [""]
    apiVersions: ["v1"]
    operations: ["CREATE"]
    resources: ["pods"]
  clientConfig:
    service:
      namespace: production
      name: vpa-validator
      path: /validate
      port: 443
    caBundle: <base64-encoded-ca-bundle>
  admissionReviewVersions: ["v1"]
  sideEffects: None
  timeoutSeconds: 5
  failurePolicy: Fail
```

The webhook service should compare the admitted pod's CPU and memory requests with your approved recommendation range and reject pods that exceed safe thresholds, protecting against recommendation errors.

## Building a Rollback Strategy

Always maintain the ability to quickly revert VPA changes if problems occur.

```bash
#!/bin/bash
# Quick rollback script for VPA changes

NAMESPACE="production"
DEPLOYMENT="my-app"

# Save current VPA state before changes
kubectl get vpa -n $NAMESPACE -o yaml > vpa-backup-$(date +%Y%m%d-%H%M%S).yaml

# Disable VPA immediately if issues occur
kubectl patch vpa my-app-vpa -n $NAMESPACE --type='merge' -p '{"spec":{"updatePolicy":{"updateMode":"Off"}}}'

# Restore previous resource values
kubectl set resources deployment/$DEPLOYMENT -n $NAMESPACE \
  --requests=cpu=500m,memory=1Gi \
  --limits=cpu=1,memory=2Gi

# Monitor rollback progress
kubectl rollout status deployment/$DEPLOYMENT -n $NAMESPACE

echo "VPA disabled and resources restored. Monitor application health."
```

Keep this script accessible for rapid response when VPA changes cause unexpected behavior.

## Monitoring VPA Impact

Track key metrics to validate that VPA recommendations improve resource efficiency without degrading performance.

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: prometheus-vpa-rules
  namespace: monitoring
data:
  vpa-alerts.yaml: |
    groups:
    - name: vpa_monitoring
      interval: 30s
      rules:
      # Alert on resource recommendation changes
      - alert: VPARecommendationChange
        expr: |
          abs(
            (
              kube_verticalpodautoscaler_status_recommendation_containerrecommendations_target{resource="cpu"} -
              kube_verticalpodautoscaler_status_recommendation_containerrecommendations_target{resource="cpu"} offset 1h
            )
            /
            (kube_verticalpodautoscaler_status_recommendation_containerrecommendations_target{resource="cpu"} offset 1h)
          ) > 0.3
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "VPA recommendation changed by more than 30%"
          description: "CPU recommendation for {{ $labels.container }} changed significantly"

      # Alert on pod restarts after VPA changes
      - alert: VPAPodRestartSpike
        expr: |
          rate(kube_pod_container_status_restarts_total[5m]) >
          rate(kube_pod_container_status_restarts_total[1h] offset 1h) * 2
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "Pod restart rate doubled after VPA change"
          description: "Pod {{ $labels.pod }} restart rate increased after VPA update"

      # Track resource utilization post-VPA
      - alert: VPAIneffectiveRecommendation
        expr: |
          (container_memory_working_set_bytes{container!="",container!="POD"} /
           on(namespace,pod,container) group_left()
           kube_pod_container_resource_requests{resource="memory"}) > 0.9
        for: 15m
        labels:
          severity: warning
        annotations:
          summary: "VPA recommendation insufficient"
          description: "Memory usage exceeds 90% of VPA-recommended request"
```

These alerts provide early warning when VPA recommendations cause problems or fail to improve resource utilization.

## Progressive Adoption Strategy

Roll out VPA recommendations across your cluster gradually to minimize risk.

```yaml
# Week 1: Non-critical development workloads
apiVersion: autoscaling.k8s.io/v1
kind: VerticalPodAutoscaler
metadata:
  name: dev-app-vpa
  namespace: development
spec:
  targetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: dev-app
  updatePolicy:
    updateMode: "Recreate"  # Use explicit mode instead of deprecated Auto
---
# Week 2: Staging environment with Recreate mode
apiVersion: autoscaling.k8s.io/v1
kind: VerticalPodAutoscaler
metadata:
  name: staging-app-vpa
  namespace: staging
spec:
  targetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: staging-app
  updatePolicy:
    updateMode: "Recreate"
---
# Week 3: Production canary with strict limits
apiVersion: autoscaling.k8s.io/v1
kind: VerticalPodAutoscaler
metadata:
  name: prod-app-vpa-canary
  namespace: production
spec:
  targetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: prod-app-canary
  updatePolicy:
    updateMode: "Recreate"
  resourcePolicy:
    containerPolicies:
    - containerName: '*'
      minAllowed:
        cpu: 100m
        memory: 128Mi
      maxAllowed:
        cpu: 2
        memory: 4Gi
      controlledResources: ["cpu", "memory"]
---
# Week 4+: Full production rollout after validation
apiVersion: autoscaling.k8s.io/v1
kind: VerticalPodAutoscaler
metadata:
  name: prod-app-vpa
  namespace: production
spec:
  targetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: prod-app
  updatePolicy:
    updateMode: "Recreate"
  resourcePolicy:
    containerPolicies:
    - containerName: '*'
      minAllowed:
        cpu: 100m
        memory: 128Mi
      maxAllowed:
        cpu: 2
        memory: 4Gi
      controlledResources: ["cpu", "memory"]
```

This phased approach lets you catch issues early before they impact production workloads.

## Conclusion

Implementing VPA recommendations safely in production requires a methodical approach. Start with "Off" mode to gather data, validate recommendations against historical usage, test changes on canary deployments, implement validation gates to prevent extreme changes, and maintain rollback capabilities. Monitor VPA impact continuously and adopt recommendations gradually across environments. With these safeguards in place, you can leverage VPA to optimize resource allocation while maintaining production stability and minimizing disruption risk.
