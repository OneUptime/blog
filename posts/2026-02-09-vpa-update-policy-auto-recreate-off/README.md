# How to Configure VPA updatePolicy to Auto, Recreate, or Off Modes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, VPA, Autoscaling

Description: Configure Vertical Pod Autoscaler update policies to control how resource recommendations are applied - automatically with pod recreation, only at startup, or recommendation-only mode.

---

Vertical Pod Autoscaler can automatically update pod resources, but eviction-based updates require pod restarts. The updatePolicy field controls when and how VPA applies recommendations. This guide explains the main update modes and when to use each.

## VPA Update Modes

VPA supports these commonly used update policies:

- **Off**: Generate recommendations, never update pods
- **Initial**: Apply recommendations only when pods are created
- **Recreate**: Evict and recreate pods to apply new resources
- **Auto**: Deprecated alias that currently behaves like Recreate

Choose based on your tolerance for pod disruptions.

## Off Mode: Recommendations Only

The safest mode. VPA generates recommendations but never modifies pods:

```yaml
apiVersion: autoscaling.k8s.io/v1
kind: VerticalPodAutoscaler
metadata:
  name: web-app-vpa
  namespace: production
spec:
  targetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: web-app
  updatePolicy:
    updateMode: "Off"
```

Use Off mode when:

- You want to review recommendations before applying
- Pod restarts are expensive (stateful workloads)
- You're testing VPA in production
- You apply updates during maintenance windows

View recommendations and apply manually:

```bash
kubectl describe vpa web-app-vpa -n production
kubectl set resources deployment web-app --requests=cpu=300m,memory=512Mi
```

## Initial Mode: Set Resources at Creation

VPA sets resources when pods are created but doesn't update running pods:

```yaml
apiVersion: autoscaling.k8s.io/v1
kind: VerticalPodAutoscaler
metadata:
  name: batch-job-vpa
  namespace: batch
spec:
  targetRef:
    apiVersion: batch/v1
    kind: Job
    name: data-processor
  updatePolicy:
    updateMode: "Initial"
```

Use Initial mode for:

- Batch jobs that run repeatedly
- Pods that scale down to zero (autoscaled deployments)
- Workloads where you want consistent resources within a generation

New pods get VPA recommendations, existing pods keep their current resources. When pods restart naturally (deployments, node drains), they get updated resources.

## Recreate Mode: Automatic Updates

VPA automatically recreates pods when recommendations change significantly:

```yaml
apiVersion: autoscaling.k8s.io/v1
kind: VerticalPodAutoscaler
metadata:
  name: stateless-app-vpa
  namespace: production
spec:
  targetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: stateless-app
  updatePolicy:
    updateMode: "Recreate"
```

Use Recreate mode for:

- Stateless applications that tolerate restarts
- Deployments with multiple replicas (rolling updates)
- Non-critical workloads
- Development and staging environments

VPA evicts and recreates pods to apply new resource requests.

`Auto` is deprecated and currently behaves like `Recreate`. Use `Recreate` explicitly for eviction-based updates.

## How Recreate Mode Works

When VPA detects recommendations differ significantly from current resources:

1. VPA Updater marks the pod for eviction
2. Kubernetes evicts the pod
3. The controller (Deployment, ReplicaSet) creates a new pod
4. VPA Admission Controller injects recommended resources
5. The new pod starts with updated requests

This respects PodDisruptionBudgets to avoid disrupting services.

## Controlling Update Aggressiveness

VPA only recreates pods when recommendations change significantly. The updater controls eviction cadence and thresholds:

```yaml
# VPA Updater deployment

args:
- --updater-interval=1m
- --pod-update-threshold=0.1
- --eviction-rate-limit=1
- --eviction-rate-burst=1
```

These settings help prevent VPA from reacting too quickly or evicting too many pods at once.

## Setting PodDisruptionBudgets with Recreate Mode

Protect services from excessive disruption:

```yaml
apiVersion: policy/v1
kind: PodDisruptionBudget
metadata:
  name: web-app-pdb
  namespace: production
spec:
  minAvailable: 2
  selector:
    matchLabels:
      app: web-app
```

VPA respects PDBs and won't evict pods if it would violate the budget.

## Update Policy Per Container

Control which containers VPA can update:

```yaml
apiVersion: autoscaling.k8s.io/v1
kind: VerticalPodAutoscaler
metadata:
  name: multi-container-vpa
  namespace: production
spec:
  targetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: multi-container-app
  updatePolicy:
    updateMode: "Recreate"
  resourcePolicy:
    containerPolicies:
    - containerName: app
      mode: "Auto"
    - containerName: sidecar
      mode: "Off"
```

This updates the app container automatically but leaves the sidecar unchanged.

## Transitioning Between Modes

Start with Off, move to Initial, then Recreate as confidence grows:

```yaml
# Week 1: Off mode
updatePolicy:
  updateMode: "Off"

# Week 2: Initial mode
updatePolicy:
  updateMode: "Initial"

# Week 3+: Recreate mode
updatePolicy:
  updateMode: "Recreate"
```

Monitor the impact at each stage before progressing.

## Real-World Example: Stateless Web App

A stateless web app with 5 replicas can use Recreate mode safely:

```yaml
apiVersion: autoscaling.k8s.io/v1
kind: VerticalPodAutoscaler
metadata:
  name: web-app-vpa
  namespace: production
spec:
  targetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: web-app
  updatePolicy:
    updateMode: "Recreate"
  resourcePolicy:
    containerPolicies:
    - containerName: app
      minAllowed:
        cpu: "100m"
        memory: "128Mi"
      maxAllowed:
        cpu: "2"
        memory: "4Gi"
---
apiVersion: policy/v1
kind: PodDisruptionBudget
metadata:
  name: web-app-pdb
  namespace: production
spec:
  minAvailable: 3
  selector:
    matchLabels:
      app: web-app
```

VPA updates resources automatically while PDB ensures 3 pods are always available.

## Real-World Example: Stateful Database

A database should use Off mode to prevent unexpected restarts:

```yaml
apiVersion: autoscaling.k8s.io/v1
kind: VerticalPodAutoscaler
metadata:
  name: database-vpa
  namespace: production
spec:
  targetRef:
    apiVersion: apps/v1
    kind: StatefulSet
    name: database
  updatePolicy:
    updateMode: "Off"
```

Review recommendations and apply during maintenance windows.

## Monitoring VPA Updates

Track VPA evictions:

```bash
kubectl get events -n production | grep -i "evicted"
```

Look for events from VPA Updater. High eviction rates indicate aggressive updating.

Check VPA Updater logs:

```bash
kubectl logs -n kube-system deployment/vpa-updater
```

## Handling Update Failures

If VPA updates cause issues:

1. Switch to Off mode immediately:

```bash
kubectl patch vpa web-app-vpa -n production --type=merge -p '{"spec":{"updatePolicy":{"updateMode":"Off"}}}'
```

2. Check recommendations:

```bash
kubectl describe vpa web-app-vpa -n production
```

3. Manually revert resources if needed:

```bash
kubectl set resources deployment web-app --requests=cpu=500m,memory=1Gi
```

## Best Practices

- Start with Off mode for all workloads
- Use Initial mode for batch jobs and autoscaled deployments
- Use Recreate mode only for stateless, multi-replica workloads
- Always set PodDisruptionBudgets with Recreate mode
- Set minAllowed and maxAllowed in resourcePolicy
- Monitor eviction rates when using Recreate mode
- Document update policy decisions
- Test Recreate mode in staging before production

## Common Pitfalls

**Too Aggressive Updates**: Recreate mode without PDB can disrupt services. Always set PDB.

**VPA and HPA Conflict**: Don't use VPA Recreate mode with HPA on the same resource (CPU or memory). Use VPA Off or Initial mode instead.

**Stateful Workloads**: Avoid Recreate mode for StatefulSets or other stateful workloads. Pod restarts can cause outages and operational risk.

**Insufficient Replicas**: Recreate mode needs multiple replicas to update safely. Single-replica deployments will have downtime.

## VPA Update Mode Decision Tree

```text
Is the workload stateless?
  No -> Use Off mode
  Yes -> Does it have multiple replicas?
    No -> Use Off or Initial mode
    Yes -> Do you have a PodDisruptionBudget?
      No -> Create PDB first, then use Recreate
      Yes -> Is it critical?
        Yes -> Use Initial mode
        No -> Use Recreate mode
```

## Combining Modes Across Namespaces

Use different modes per environment:

```yaml
# Development: Recreate mode
apiVersion: autoscaling.k8s.io/v1
kind: VerticalPodAutoscaler
metadata:
  name: app-vpa
  namespace: dev
spec:
  targetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: app
  updatePolicy:
    updateMode: "Recreate"
---
# Production: Off mode
apiVersion: autoscaling.k8s.io/v1
kind: VerticalPodAutoscaler
metadata:
  name: app-vpa
  namespace: prod
spec:
  targetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: app
  updatePolicy:
    updateMode: "Off"
```

## Disabling VPA Temporarily

To stop VPA without deleting it:

```bash
kubectl patch vpa web-app-vpa -n production --type=merge -p '{"spec":{"updatePolicy":{"updateMode":"Off"}}}'
```

Recommendations continue, but no updates occur.

## Conclusion

Choose VPA update modes based on workload characteristics and risk tolerance. Off mode is safest and works for all workloads. Initial mode balances automation with safety for pods that restart naturally. Recreate mode provides eviction-based automation but requires stateless workloads, multiple replicas, and PodDisruptionBudgets. Start conservative with Off mode, validate recommendations, then graduate to Initial or Recreate as appropriate. Document your choices and monitor the impact of automatic updates to catch issues early.
