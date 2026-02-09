# How to Use scopeSelector in ResourceQuota for Priority-Based Quotas

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, ResourceQuota, Priority Classes

Description: Configure ResourceQuota with scopeSelector to create separate resource budgets for different priority classes, QoS tiers, and workload types within the same namespace.

---

Not all workloads are equal. Production workloads need guaranteed resources while batch jobs can use whatever is left. The scopeSelector field in ResourceQuota lets you create separate budgets based on priority class, QoS class, or termination state. This guide shows you how to implement priority-based quotas.

## What Is scopeSelector?

The scopeSelector field filters which pods a ResourceQuota applies to. You can create multiple quotas in one namespace, each targeting different pod characteristics:

- Priority class (high, medium, low)
- QoS class (Guaranteed, Burstable, BestEffort)
- Termination state (Terminating vs NotTerminating)

This enables fine-grained resource allocation within a single namespace.

## Basic Priority-Based Quotas

Create separate quotas for high and low priority workloads:

```yaml
# High priority pods get 30 CPU
apiVersion: v1
kind: ResourceQuota
metadata:
  name: high-priority
  namespace: production
spec:
  hard:
    requests.cpu: "30"
    requests.memory: "60Gi"
  scopeSelector:
    matchExpressions:
    - operator: In
      scopeName: PriorityClass
      values:
      - high
---
# Low priority pods get 10 CPU
apiVersion: v1
kind: ResourceQuota
metadata:
  name: low-priority
  namespace: production
spec:
  hard:
    requests.cpu: "10"
    requests.memory: "20Gi"
  scopeSelector:
    matchExpressions:
    - operator: In
      scopeName: PriorityClass
      values:
      - low
```

Pods with `priorityClassName: high` consume from the high-priority quota, while `priorityClassName: low` pods consume from the low-priority quota.

## Creating Priority Classes

Define priority classes first:

```yaml
apiVersion: scheduling.k8s.io/v1
kind: PriorityClass
metadata:
  name: high
value: 1000
globalDefault: false
description: "High priority for production workloads"
---
apiVersion: scheduling.k8s.io/v1
kind: PriorityClass
metadata:
  name: medium
value: 500
globalDefault: true
description: "Default priority for most workloads"
---
apiVersion: scheduling.k8s.io/v1
kind: PriorityClass
metadata:
  name: low
value: 100
globalDefault: false
description: "Low priority for batch jobs"
```

Apply these cluster-wide, then reference in pods.

## Using Priority Classes in Pods

Assign priority class to pods:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: critical-app
  namespace: production
spec:
  priorityClassName: high
  containers:
  - name: app
    image: app:latest
    resources:
      requests:
        cpu: "2"
        memory: "4Gi"
```

This pod consumes from the high-priority quota.

## QoS-Based Quotas

Create quotas based on QoS class:

```yaml
# Guaranteed QoS gets most resources
apiVersion: v1
kind: ResourceQuota
metadata:
  name: guaranteed-quota
  namespace: production
spec:
  hard:
    requests.cpu: "40"
    requests.memory: "80Gi"
  scopeSelector:
    matchExpressions:
    - operator: In
      scopeName: QoS
      values:
      - Guaranteed
---
# Burstable QoS gets fewer resources
apiVersion: v1
kind: ResourceQuota
metadata:
  name: burstable-quota
  namespace: production
spec:
  hard:
    requests.cpu: "20"
    requests.memory: "40Gi"
  scopeSelector:
    matchExpressions:
    - operator: In
      scopeName: QoS
      values:
      - Burstable
---
# BestEffort gets minimal resources
apiVersion: v1
kind: ResourceQuota
metadata:
  name: besteffort-quota
  namespace: production
spec:
  hard:
    pods: "10"
  scopeSelector:
    matchExpressions:
    - operator: In
      scopeName: QoS
      values:
      - BestEffort
```

Note: BestEffort pods have no resource requests, so you can only quota their count.

## Terminating vs NotTerminating Scopes

Separate quotas for normal pods vs terminating pods:

```yaml
# Active pods
apiVersion: v1
kind: ResourceQuota
metadata:
  name: active-quota
  namespace: batch-jobs
spec:
  hard:
    requests.cpu: "50"
    requests.memory: "100Gi"
  scopeSelector:
    matchExpressions:
    - operator: In
      scopeName: TerminationState
      values:
      - NotTerminating
---
# Terminating pods (being deleted)
apiVersion: v1
kind: ResourceQuota
metadata:
  name: terminating-quota
  namespace: batch-jobs
spec:
  hard:
    requests.cpu: "10"
    requests.memory: "20Gi"
  scopeSelector:
    matchExpressions:
    - operator: In
      scopeName: TerminationState
      values:
      - Terminating
```

This ensures terminating pods don't consume too much quota during graceful shutdown.

## Combining Multiple Scopes

Use multiple match expressions:

```yaml
apiVersion: v1
kind: ResourceQuota
metadata:
  name: high-guaranteed-quota
  namespace: production
spec:
  hard:
    requests.cpu: "50"
    requests.memory: "100Gi"
  scopeSelector:
    matchExpressions:
    - operator: In
      scopeName: PriorityClass
      values:
      - high
    - operator: In
      scopeName: QoS
      values:
      - Guaranteed
```

This quota only applies to pods that are both high priority AND Guaranteed QoS.

## Real-World Example: Mixed Workload Namespace

A namespace running web apps, batch jobs, and experiments:

```yaml
# Production web apps: high priority, Guaranteed QoS
apiVersion: v1
kind: ResourceQuota
metadata:
  name: web-apps
  namespace: platform
spec:
  hard:
    requests.cpu: "40"
    requests.memory: "80Gi"
    pods: "50"
  scopeSelector:
    matchExpressions:
    - operator: In
      scopeName: PriorityClass
      values:
      - high
---
# Batch jobs: medium priority
apiVersion: v1
kind: ResourceQuota
metadata:
  name: batch-jobs
  namespace: platform
spec:
  hard:
    requests.cpu: "30"
    requests.memory: "60Gi"
    pods: "100"
  scopeSelector:
    matchExpressions:
    - operator: In
      scopeName: PriorityClass
      values:
      - medium
---
# Experiments: low priority, BestEffort
apiVersion: v1
kind: ResourceQuota
metadata:
  name: experiments
  namespace: platform
spec:
  hard:
    pods: "20"
  scopeSelector:
    matchExpressions:
    - operator: In
      scopeName: PriorityClass
      values:
      - low
```

## Monitoring Scoped Quotas

Check quota usage per scope:

```bash
kubectl get resourcequota -n production
```

Output shows each quota separately:

```
NAME              AGE   REQUEST
high-priority     1d    requests.cpu: 20/30, requests.memory: 40Gi/60Gi
low-priority      1d    requests.cpu: 5/10, requests.memory: 8Gi/20Gi
```

Describe for details:

```bash
kubectl describe resourcequota high-priority -n production
```

## What Happens Without Priority Class?

If a pod doesn't specify priorityClassName:

- It gets the default priority class (if one is marked `globalDefault: true`)
- If no default exists, it has priority 0 and doesn't match any scoped quota

Always set a global default priority class:

```yaml
apiVersion: scheduling.k8s.io/v1
kind: PriorityClass
metadata:
  name: medium
value: 500
globalDefault: true
description: "Default priority"
```

## Best Practices

- Create priority classes that match your organization's tiers
- Set a global default priority class
- Reserve more quota for higher priorities
- Monitor quota usage per priority
- Document priority class semantics
- Use Guaranteed QoS for production workloads
- Limit BestEffort pods by count only
- Combine priority and QoS scopes for fine control

## Troubleshooting Scoped Quotas

**Pod Rejected Despite Available Quota**: Check if the pod's priority class matches a quota:

```bash
kubectl get pod failing-pod -o yaml | grep priorityClassName
```

If it doesn't match any scopeSelector, the pod can't use any quota.

**Wrong Quota Applied**: Verify the pod's QoS class:

```bash
kubectl get pod my-app -o jsonpath='{.status.qosClass}'
```

The QoS class determines which QoS-scoped quota applies.

**Quota Not Enforced**: Ensure the scopeSelector values match exactly:

```yaml
# Wrong
scopeSelector:
  matchExpressions:
  - operator: In
    scopeName: PriorityClass
    values:
    - "high"  # String literal

# Correct
scopeSelector:
  matchExpressions:
  - operator: In
    scopeName: PriorityClass
    values:
    - high  # Plain value
```

## Advanced: Per-Team Priority Quotas

In a multi-team namespace, use priority classes to separate team budgets:

```yaml
# Team A priority class
apiVersion: scheduling.k8s.io/v1
kind: PriorityClass
metadata:
  name: team-a
value: 800
description: "Team A workloads"
---
# Team A quota
apiVersion: v1
kind: ResourceQuota
metadata:
  name: team-a-quota
  namespace: shared
spec:
  hard:
    requests.cpu: "30"
    requests.memory: "60Gi"
  scopeSelector:
    matchExpressions:
    - operator: In
      scopeName: PriorityClass
      values:
      - team-a
---
# Team B priority class
apiVersion: scheduling.k8s.io/v1
kind: PriorityClass
metadata:
  name: team-b
value: 700
description: "Team B workloads"
---
# Team B quota
apiVersion: v1
kind: ResourceQuota
metadata:
  name: team-b-quota
  namespace: shared
spec:
  hard:
    requests.cpu: "20"
    requests.memory: "40Gi"
  scopeSelector:
    matchExpressions:
    - operator: In
      scopeName: PriorityClass
      values:
      - team-b
```

Teams share a namespace but have isolated budgets.

## Scope Operators

ScopeSelector supports these operators:

- **In**: Value must be in the list
- **NotIn**: Value must not be in the list
- **Exists**: Scope must exist (value ignored)
- **DoesNotExist**: Scope must not exist

Example using NotIn:

```yaml
# Quota for everything EXCEPT high priority
apiVersion: v1
kind: ResourceQuota
metadata:
  name: non-high-quota
  namespace: production
spec:
  hard:
    requests.cpu: "20"
  scopeSelector:
    matchExpressions:
    - operator: NotIn
      scopeName: PriorityClass
      values:
      - high
```

## Migrating to Scoped Quotas

If you have existing unscoped quotas, migrate gradually:

1. Create scoped quotas alongside existing quota
2. Update pods to use priority classes
3. Monitor that scoped quotas are working
4. Remove the old unscoped quota

```bash
# Create scoped quotas
kubectl apply -f scoped-quotas.yaml

# Verify pods are using priority classes
kubectl get pods -n production -o jsonpath='{.items[*].spec.priorityClassName}' | tr ' ' '\n' | sort | uniq -c

# Once all pods have priorities, remove old quota
kubectl delete resourcequota old-quota -n production
```

## Conclusion

ScopeSelector enables sophisticated resource allocation within namespaces. Use priority-based quotas to guarantee resources for production workloads while allowing batch jobs and experiments to use remaining capacity. Combine with QoS-based quotas for even finer control. Define clear priority classes, document their semantics, and monitor quota usage per scope. Scoped quotas turn namespaces into multi-tenant environments with customizable resource allocation policies.
