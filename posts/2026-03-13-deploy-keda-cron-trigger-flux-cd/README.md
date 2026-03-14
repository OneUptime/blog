# How to Deploy KEDA with Cron Trigger with Flux CD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, Kubernetes, GitOps, KEDA, Cron, Scheduled Scaling, Autoscaling

Description: Deploy KEDA with cron-based scheduled scaling using Flux CD to pre-scale workloads before predicted traffic peaks.

---

## Introduction

While most KEDA scalers react to real-time metrics, the Cron scaler takes a proactive approach — scaling workloads up before predicted traffic arrives and down after the busy period ends. This is ideal for workloads with predictable traffic patterns: business-hours APIs, scheduled batch processing, or services that see daily/weekly peak loads.

Combining the Cron scaler with reactive scalers (like Prometheus or Kafka) gives you a hybrid approach: pre-scale at known peak times and continue reacting to actual load beyond those predictions.

Managing Cron-based scaling through Flux CD means your scheduled scaling windows are version-controlled. Adjusting business hours or adding a new time zone is a pull request, not a manual update.

## Prerequisites

- KEDA deployed on your Kubernetes cluster
- Flux CD v2 bootstrapped to your Git repository
- A deployment to schedule-scale

## Step 1: Create a Basic Cron ScaledObject

```yaml
# clusters/my-cluster/keda-cron/business-hours-scaler.yaml
apiVersion: keda.sh/v1alpha1
kind: ScaledObject
metadata:
  name: business-hours-scaler
  namespace: app
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: api-server
  # Baseline during off-hours
  minReplicaCount: 2
  # Maximum during peak
  maxReplicaCount: 20
  pollingInterval: 30
  triggers:
    - type: cron
      metadata:
        # Timezone for the schedule (IANA timezone name)
        timezone: America/New_York
        # Scale UP: Monday-Friday at 8:00 AM
        start: "0 8 * * 1-5"
        # Scale DOWN: Monday-Friday at 7:00 PM
        end: "0 19 * * 1-5"
        # Desired replicas during the active window
        desiredReplicas: "10"
```

## Step 2: Combine Cron with Reactive Scaler

Use multiple triggers so the workload scales from cron schedule OR metric pressure:

```yaml
# clusters/my-cluster/keda-cron/hybrid-scaler.yaml
apiVersion: keda.sh/v1alpha1
kind: ScaledObject
metadata:
  name: hybrid-scaler
  namespace: app
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: checkout-service
  minReplicaCount: 1
  maxReplicaCount: 50
  pollingInterval: 15
  cooldownPeriod: 120
  triggers:
    # Pre-scale during holiday sale hours (US Eastern)
    - type: cron
      metadata:
        timezone: America/New_York
        start: "0 9 * * *"    # 9 AM daily
        end: "0 22 * * *"     # 10 PM daily
        desiredReplicas: "15"
    # Also scale on Prometheus request rate
    - type: prometheus
      metadata:
        serverAddress: http://prometheus-operated.monitoring.svc.cluster.local:9090
        query: |
          sum(rate(http_requests_total{service="checkout-service"}[1m]))
        threshold: "50"
        namespace: app
```

## Step 3: Handle Multiple Time Zones

For global services, stack multiple cron triggers for different regions:

```yaml
# clusters/my-cluster/keda-cron/global-scaler.yaml
apiVersion: keda.sh/v1alpha1
kind: ScaledObject
metadata:
  name: global-api-scaler
  namespace: app
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: global-api
  minReplicaCount: 3
  maxReplicaCount: 40
  pollingInterval: 60
  triggers:
    # US business hours (Eastern)
    - type: cron
      metadata:
        timezone: America/New_York
        start: "0 8 * * 1-5"
        end: "0 20 * * 1-5"
        desiredReplicas: "10"
    # EU business hours (London)
    - type: cron
      metadata:
        timezone: Europe/London
        start: "0 8 * * 1-5"
        end: "0 18 * * 1-5"
        desiredReplicas: "8"
    # APAC business hours (Tokyo)
    - type: cron
      metadata:
        timezone: Asia/Tokyo
        start: "0 9 * * 1-5"
        end: "0 18 * * 1-5"
        desiredReplicas: "6"
```

## Step 4: Schedule-Based Batch Processing

Scale a batch job processor during its processing window:

```yaml
# clusters/my-cluster/keda-cron/batch-scaler.yaml
apiVersion: keda.sh/v1alpha1
kind: ScaledObject
metadata:
  name: nightly-batch-scaler
  namespace: app
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: report-processor
  # Zero replicas during the day
  minReplicaCount: 0
  maxReplicaCount: 20
  pollingInterval: 60
  triggers:
    # Scale up for nightly report processing (2 AM - 5 AM UTC)
    - type: cron
      metadata:
        timezone: UTC
        start: "0 2 * * *"
        end: "0 5 * * *"
        desiredReplicas: "10"
```

## Step 5: Create the Flux Kustomization

```yaml
# clusters/my-cluster/keda-cron/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - business-hours-scaler.yaml
  - hybrid-scaler.yaml
  - nightly-batch-scaler.yaml
---
# clusters/my-cluster/flux-kustomization-keda-cron.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: keda-cron
  namespace: flux-system
spec:
  interval: 5m
  dependsOn:
    - name: keda
  path: ./clusters/my-cluster/keda-cron
  prune: true
  sourceRef:
    kind: GitRepository
    name: flux-system
```

## Step 6: Verify Cron Scaling

```bash
# Check ScaledObjects
kubectl get scaledobject -n app

# View the KEDA-managed HPA
kubectl get hpa -n app

# Check when the cron trigger fires (KEDA logs)
kubectl logs -n keda deployment/keda-operator | grep cron

# Manually verify replica count matches expected at current time
TZ="America/New_York" date
kubectl get deployment api-server -n app -o jsonpath='{.spec.replicas}'
```

## Best Practices

- Use IANA timezone names (e.g., `America/New_York`, `Europe/London`) rather than UTC offsets in cron triggers so daylight saving time is handled automatically.
- Combine cron with reactive scalers (Prometheus, Kafka) using multiple triggers — KEDA takes the maximum desired replicas across all active triggers.
- Set `minReplicaCount` to 0 for batch workloads that only run during scheduled windows; use `minReplicaCount: 1` for services that must be available 24/7 at reduced capacity.
- Test cron schedules with KEDA's `--debug` logging before deploying to production to verify timezone and schedule correctness.
- Use the cron trigger to pre-scale 15-30 minutes before anticipated peaks so pods are warmed and ready before traffic arrives.

## Conclusion

KEDA's cron-based scaling managed through Flux CD provides predictable, schedule-driven capacity management with full GitOps auditability. Scheduled scaling windows are defined as code, reviewed in pull requests, and automatically applied — enabling your infrastructure to anticipate demand rather than just react to it.
