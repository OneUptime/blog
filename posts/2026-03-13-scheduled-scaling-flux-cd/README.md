# Scheduled Scaling with Flux CD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux-cd, Kubernetes, Autoscaling, Scheduling, Cost-Optimization, GitOps

Description: Learn how to implement time-based scheduled scaling for Kubernetes workloads using Flux CD, enabling automatic replica adjustments based on known traffic patterns and business hours.

---

## Introduction

Many production workloads follow predictable traffic patterns - higher load during business hours, spikes at specific times, quiet periods overnight and on weekends. Scheduled scaling lets you pre-provision capacity before demand arrives, avoiding the latency of reactive HPA scale-up, and scale back down during known quiet periods to reduce costs.

Flux CD enables scheduled scaling through two complementary patterns: using Kustomize overlays to define time-specific replica counts, and using CronJobs to trigger Flux reconciliation with different overlays at scheduled times. Unlike raw KEDA cron triggers, this approach keeps all scaling policy in Git and fully auditable.

This guide covers both approaches, from simple replica count overrides to more sophisticated time-window Kustomization switching.

## Prerequisites

- Flux CD v2.x bootstrapped
- `kubectl` and `flux` CLIs installed
- Workloads with predictable scaling patterns
- RBAC configured for automated Flux operations

## Step 1: Define Base and Scaled Kustomize Overlays

Create overlay directories for different time windows.
```yaml
# apps/api-service/overlays/peak-hours/replica-patch.yaml
# Kustomize patch setting higher replica counts for peak business hours
apiVersion: apps/v1
kind: Deployment
metadata:
  name: api-service
  namespace: production
spec:
  # Peak capacity: 20 replicas for business hours
  replicas: 20
---
# apps/api-service/overlays/off-hours/replica-patch.yaml
# Kustomize patch reducing replicas during off-peak hours
apiVersion: apps/v1
kind: Deployment
metadata:
  name: api-service
  namespace: production
spec:
  # Reduced capacity: 5 replicas for off-hours
  replicas: 5
```

## Step 2: Create a Flux Kustomization That References the Active Overlay

Manage which overlay is active via a Flux Kustomization that points to the appropriate path.
```yaml
# clusters/production/api-service-kustomization.yaml
# Flux Kustomization for the API service - path is updated by the scheduler CronJob
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: api-service
  namespace: flux-system
spec:
  interval: 5m
  sourceRef:
    kind: GitRepository
    name: flux-system
  # Path points to the active overlay - changed by the CronJob scheduler
  path: ./apps/api-service/overlays/peak-hours
  prune: true
```

## Step 3: Use KEDA for Simpler Cron-Based Scaling

For a simpler approach, use a KEDA ScaledObject with cron triggers managed by Flux.
```yaml
# apps/api-service/scaledobject-scheduled.yaml
# KEDA ScaledObject with cron-based scaling for business hours
apiVersion: keda.sh/v1alpha1
kind: ScaledObject
metadata:
  name: api-service-scheduled
  namespace: production
spec:
  scaleTargetRef:
    name: api-service
  minReplicaCount: 5
  maxReplicaCount: 20
  triggers:
    # Scale up before business hours start (7:45 AM EST weekdays)
    - type: cron
      metadata:
        timezone: "America/New_York"
        start: "45 7 * * 1-5"
        end: "0 19 * * 1-5"
        desiredReplicas: "20"
    # Scale up for evening batch processing window
    - type: cron
      metadata:
        timezone: "America/New_York"
        start: "0 22 * * *"
        end: "30 23 * * *"
        desiredReplicas: "15"
```

## Step 4: Manage Scheduled Scaling via Flux Kustomization

Apply all scheduled scaling resources through Flux for GitOps management.
```yaml
# clusters/production/scheduled-scaling.yaml
# Flux Kustomization managing all scheduled scaling policies
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: scheduled-scaling
  namespace: flux-system
spec:
  interval: 5m
  sourceRef:
    kind: GitRepository
    name: flux-system
  path: ./apps/production/scaling
  prune: true
  dependsOn:
    # Ensure KEDA is running before applying ScaledObjects
    - name: keda
```

## Step 5: Validate Scaling Behavior

Test the scheduled scaling configuration in a staging environment.
```bash
# Manually trigger a KEDA cron scale-out for testing
kubectl patch scaledobject api-service-scheduled -n production \
  --type=json -p='[{"op":"replace","path":"/spec/minReplicaCount","value":20}]'

# Monitor HPA events driven by the ScaledObject
kubectl describe hpa keda-hpa-api-service-scheduled -n production

# Check replica count over time
kubectl get deployment api-service -n production -w
```

## Best Practices

- Align cron schedules to timezone-specific business hours, not UTC, for readability
- Add a 15-minute buffer before expected peak load to ensure capacity is ready
- Use `stabilizationWindowSeconds` in HPA behavior to prevent scale-down during brief lulls within peak windows
- Combine scheduled scaling with reactive metric-based scaling for comprehensive coverage
- Notify on-call teams before scheduled scale-up events for awareness
- Document all scaling windows in your runbook so engineers understand expected replica counts

## Conclusion

Scheduled scaling with Flux CD and KEDA combines the predictability of time-based pre-provisioning with the auditability of GitOps. By storing all scaling policies in Git and managing them through Flux, changes to business hours or capacity requirements go through peer review and generate an audit trail. Layer scheduled scaling on top of metric-based HPA to handle both predictable peaks and unexpected demand spikes.
