# How to Scale Deployments Managed by Flux Without Git Changes

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, Kubernetes, GitOps, Day 2 Operations, Scaling, HPA

Description: Temporarily scale Flux-managed deployments without triggering reconciliation conflicts, using field manager exclusions and HPA integration correctly.

---

## Introduction

Scaling a deployment managed by Flux creates a conflict: you manually set `replicas: 10` for a traffic spike, but Flux sees the Git-declared value of `replicas: 3` and reconciles it back to three. This drift correction is Flux doing exactly what it is designed to do — but it is the wrong behavior when you intentionally need to override replica counts during incidents or traffic events.

There are three correct approaches to scaling Flux-managed deployments: using a HorizontalPodAutoscaler (which Flux explicitly accommodates), temporarily suspending Flux reconciliation, or modifying the replica count in Git as an emergency change. Each approach has a different tradeoff between speed, safety, and GitOps compliance.

This guide covers all three approaches, explains when to use each, and shows how to configure Flux to coexist peacefully with HPA-managed replica counts.

## Prerequisites

- Flux CD v2 managing Deployments in your cluster
- kubectl and Flux CLI installed
- Understanding of server-side apply field ownership

## Step 1: The Problem — Why Naive Scaling Fails

Observe the conflict before learning to avoid it:

```bash
# Manually scale up (replicas declared as 2 in Git)
kubectl scale deployment my-service -n team-alpha --replicas=10

# Wait for Flux's next reconciliation (check interval)
flux get kustomization my-service -n team-alpha

# Flux restores it to 2 — the Git-declared value
kubectl get deployment my-service -n team-alpha -o jsonpath='{.spec.replicas}'
# Output: 2
```

The conflict happens because Flux owns the `spec.replicas` field through its server-side apply field manager.

## Step 2: The Correct Approach — Use HPA and Remove replicas from Git

The cleanest solution is to let HPA manage replica counts and remove `spec.replicas` from your Flux-managed manifests entirely.

```yaml
# deploy/deployment.yaml — Remove spec.replicas entirely when HPA is in use
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-service
  namespace: team-alpha
spec:
  # DO NOT set replicas here when HPA manages scaling
  # Removing this field means Flux won't own it and won't override HPA
  selector:
    matchLabels:
      app: my-service
  template:
    spec:
      containers:
        - name: my-service
          image: ghcr.io/acme/my-service:v1.5.0
```

```yaml
# deploy/hpa.yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: my-service
  namespace: team-alpha
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: my-service
  minReplicas: 2
  maxReplicas: 20
  metrics:
    - type: Resource
      resource:
        name: cpu
        target:
          type: Utilization
          averageUtilization: 70
```

With HPA in place, you can scale manually without Flux reverting:

```bash
# Scale up temporarily during a traffic spike
kubectl patch hpa my-service -n team-alpha \
  --type=merge \
  -p '{"spec":{"minReplicas":10}}'

# Or use kubectl scale (works on HPA min replicas through the HPA object)
kubectl scale --replicas=10 deployment/my-service -n team-alpha
# This works because Flux no longer owns spec.replicas
```

## Step 3: Suspend Flux Reconciliation for Emergency Scaling

When HPA is not in place and you need to scale immediately without a Git commit:

```bash
# Suspend the specific Kustomization to stop Flux from reconciling
flux suspend kustomization my-service -n team-alpha

# Verify the suspension
flux get kustomization my-service -n team-alpha
# NAME        SUSPENDED   READY   MESSAGE
# my-service  True        True    ...

# Now scale freely
kubectl scale deployment my-service -n team-alpha --replicas=10

# Verify the new replica count
kubectl get deployment my-service -n team-alpha -o jsonpath='{.spec.replicas}'
# Output: 10
```

Document the suspension immediately in your incident log and set a reminder to resume.

## Step 4: Resume After the Incident

Always resume Flux reconciliation when the manual override is no longer needed:

```bash
# Resume Flux reconciliation
flux resume kustomization my-service -n team-alpha

# Force immediate reconciliation to restore Git-declared state
flux reconcile kustomization my-service -n team-alpha --with-source

# Watch Flux restore the Git-declared replica count
kubectl get deployment my-service -n team-alpha -w
```

If the Git-declared replica count is too low for the current traffic, update Git first:

```bash
# Update replicas in Git, then commit and push
# Then resume Flux — it will apply the updated value
flux resume kustomization my-service -n team-alpha
```

## Step 5: Use Flux's ignore Annotation for Specific Fields

Flux supports a `kustomize.toolkit.fluxcd.io/ssa: merge` annotation that switches from server-side apply to a merge strategy for specific resources, giving manual changes a longer window before being overwritten.

For fine-grained control, annotate the Deployment to exclude specific fields:

```yaml
# deploy/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-service
  annotations:
    # Tell Flux to ignore diffs in spec.replicas (useful with HPA)
    kustomize.toolkit.fluxcd.io/ssa: IfNotPresent
```

Or use Flux's `force: false` and field exclusion via the Kustomization:

```yaml
# Kustomization spec to ignore replica drift
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: my-service
  namespace: team-alpha
spec:
  interval: 5m
  force: false
  sourceRef:
    kind: GitRepository
    name: team-alpha-apps
  path: ./deploy
```

## Step 6: Emergency Scaling via Git (the GitOps-Correct Way)

For non-emergency situations, always make replica changes through Git:

```bash
# Update replicas in the manifest
sed -i 's/replicas: 2/replicas: 10/' deploy/deployment.yaml

# Commit and push
git add deploy/deployment.yaml
git commit -m "ops: scale my-service to 10 replicas for traffic event"
git push

# Force Flux to reconcile immediately
flux reconcile kustomization my-service -n team-alpha --with-source
```

## Best Practices

- Always configure HPA for production workloads and remove `spec.replicas` from Deployment manifests — this is the cleanest solution
- When suspending Flux for emergency scaling, set a calendar reminder to resume within a defined SLA (e.g., 4 hours)
- Log all manual scaling operations in your incident management system with a link to the Kustomization that was suspended
- After every incident where you scaled manually, file a follow-up to add HPA and remove the need for future manual overrides
- Use KEDA for event-driven scaling (queue depth, custom metrics) alongside Flux for richer auto-scaling scenarios
- Configure Flux alerts when a Kustomization has been suspended longer than your SLA

## Conclusion

Scaling Flux-managed deployments without Git changes requires understanding Flux's field ownership model. The cleanest approach is using HPA to manage replica counts so Flux never owns the `spec.replicas` field. For emergency situations, suspending the Kustomization gives you a controlled override window with a clear path back to GitOps compliance. The key discipline is always resuming Flux when the override is no longer needed.
