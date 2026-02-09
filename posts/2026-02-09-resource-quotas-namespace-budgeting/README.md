# How to Use Kubernetes Resource Quotas for Namespace Budgeting

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Resource Management, Multi-tenancy, Cost Control, Namespace Isolation

Description: Implement resource quotas to enforce namespace-level budgets, prevent resource exhaustion, and enable fair multi-tenant cluster sharing.

---

Resource quotas limit the aggregate resource consumption within a namespace. They prevent any single team or application from monopolizing cluster resources. This enables safe multi-tenancy and predictable cost allocation across teams.

## Understanding Resource Quota Mechanics

A ResourceQuota object defines limits on compute resources, storage, and object counts. The Kubernetes API server enforces these limits during resource creation. Requests exceeding quotas get rejected immediately.

Quotas work at the namespace level. Each namespace can have multiple ResourceQuota objects, and all must be satisfied for resource creation to succeed. This allows layering different quota policies.

The quota system tracks cumulative usage across all pods and persistent volume claims in a namespace. When a pod requests resources, the API server checks if adding those requests would exceed any quota. If yes, the pod creation fails.

## Creating Basic Compute Quotas

Start with simple CPU and memory limits:

```yaml
apiVersion: v1
kind: ResourceQuota
metadata:
  name: compute-quota
  namespace: team-backend
spec:
  hard:
    requests.cpu: "40"
    requests.memory: "100Gi"
    limits.cpu: "80"
    limits.memory: "200Gi"
```

This quota restricts the team-backend namespace to 40 CPU cores of requests and 100Gi memory requests across all pods. The limits constraints prevent setting excessively high burst limits.

Apply the quota:

```bash
kubectl apply -f compute-quota.yaml
```

Check quota status:

```bash
kubectl describe resourcequota compute-quota -n team-backend
```

The output shows used vs hard limits for each resource type.

## Enforcing Object Count Limits

Beyond compute resources, quotas can limit Kubernetes object counts:

```yaml
apiVersion: v1
kind: ResourceQuota
metadata:
  name: object-count-quota
  namespace: team-backend
spec:
  hard:
    pods: "100"
    services: "20"
    persistentvolumeclaims: "10"
    configmaps: "50"
    secrets: "50"
```

This prevents teams from creating too many objects, which can strain the API server and etcd. Pod limits are particularly important - they prevent runaway replicas from overwhelming the cluster.

## Storage Quotas

Limit persistent storage consumption:

```yaml
apiVersion: v1
kind: ResourceQuota
metadata:
  name: storage-quota
  namespace: team-backend
spec:
  hard:
    requests.storage: "500Gi"
    persistentvolumeclaims: "20"
    # Storage class specific quotas
    ssd.storageclass.storage.k8s.io/requests.storage: "100Gi"
    ssd.storageclass.storage.k8s.io/persistentvolumeclaims: "5"
```

The storage-class-specific quotas let you limit expensive storage separately from standard storage. This encourages teams to use cost-effective storage tiers.

## Quota Scopes for Granular Control

Scopes allow applying quotas to subsets of resources:

```yaml
apiVersion: v1
kind: ResourceQuota
metadata:
  name: priority-quota
  namespace: team-backend
spec:
  hard:
    pods: "50"
    requests.cpu: "20"
    requests.memory: "50Gi"
  scopes:
  - PriorityClass
  scopeSelector:
    matchExpressions:
    - operator: In
      scopeName: PriorityClass
      values: ["high-priority"]
```

This quota applies only to pods with the high-priority PriorityClass. You can create separate quotas for different priority levels, ensuring critical workloads get guaranteed resources.

Other useful scopes include:
- `BestEffort`: Pods without resource requests/limits
- `NotBestEffort`: Pods with requests or limits
- `Terminating`: Pods with activeDeadlineSeconds set
- `NotTerminating`: Long-running pods

## Implementing Team Budgets

For multi-team clusters, assign each team a namespace with appropriate quotas:

```yaml
# Development team - smaller quota
apiVersion: v1
kind: ResourceQuota
metadata:
  name: team-quota
  namespace: team-dev
spec:
  hard:
    requests.cpu: "20"
    requests.memory: "40Gi"
    limits.cpu: "40"
    limits.memory: "80Gi"
    pods: "50"
---
# Production team - larger quota
apiVersion: v1
kind: ResourceQuota
metadata:
  name: team-quota
  namespace: team-prod
spec:
  hard:
    requests.cpu: "100"
    requests.memory: "200Gi"
    limits.cpu: "200"
    limits.memory: "400Gi"
    pods: "200"
```

Document quota allocations in a central location. Teams need visibility into their budgets to plan capacity.

## Quota vs LimitRange

Quotas work alongside LimitRanges. Quotas set namespace-wide limits. LimitRanges set per-pod or per-container constraints:

```yaml
apiVersion: v1
kind: LimitRange
metadata:
  name: default-limits
  namespace: team-backend
spec:
  limits:
  - max:
      memory: "4Gi"
      cpu: "2000m"
    min:
      memory: "64Mi"
      cpu: "50m"
    default:
      memory: "256Mi"
      cpu: "200m"
    defaultRequest:
      memory: "128Mi"
      cpu: "100m"
    type: Container
```

LimitRanges prevent individual pods from consuming too much. They also provide defaults for pods without explicit resources, which is required when quotas are active.

Without LimitRanges, teams must set requests on all pods, or pod creation fails with quota errors.

## Monitoring Quota Usage

Track quota utilization with kubectl:

```bash
# View all quotas in a namespace
kubectl get resourcequota -n team-backend

# Detailed quota status
kubectl describe resourcequota -n team-backend
```

The describe output shows:

```
Name:            compute-quota
Namespace:       team-backend
Resource         Used   Hard
--------         ----   ----
limits.cpu       45     80
limits.memory    120Gi  200Gi
requests.cpu     28     40
requests.memory  75Gi   100Gi
```

Use Prometheus to alert on quota exhaustion:

```promql
# Quota usage percentage
(
  kube_resourcequota{type="used"} /
  kube_resourcequota{type="hard"}
) * 100

# Alert when usage exceeds 80%
(
  kube_resourcequota{type="used", resource="requests.cpu"} /
  kube_resourcequota{type="hard", resource="requests.cpu"}
) > 0.8
```

Alert teams when they approach quota limits, giving them time to clean up or request increases.

## Handling Quota Exceeded Errors

When deployments fail due to quotas, kubectl shows clear errors:

```
Error from server (Forbidden): pods "myapp-abc123" is forbidden:
exceeded quota: compute-quota, requested: requests.memory=2Gi,
used: requests.memory=99Gi, limited: requests.memory=100Gi
```

To resolve:

1. Check current usage: `kubectl describe resourcequota -n team-backend`
2. Identify resource-heavy pods: `kubectl top pods -n team-backend --sort-by=memory`
3. Scale down or delete unused workloads
4. If legitimately needed, request quota increase

Document the quota increase request process. Include justification requirements and approval workflows.

## Dynamic Quota Adjustment

Quotas are not static. Adjust them as team needs evolve:

```bash
# Edit quota directly
kubectl edit resourcequota compute-quota -n team-backend

# Or apply updated YAML
kubectl apply -f updated-quota.yaml
```

Changes take effect immediately. Existing pods are not evicted, but new pods must fit within updated limits.

Track quota changes in version control:

```bash
git log -- quotas/team-backend.yaml
```

This provides an audit trail of quota allocations over time.

## Namespace Lifecycle Management

Implement automation for namespace creation with quotas:

```bash
#!/bin/bash
# create-team-namespace.sh

TEAM=$1
CPU_QUOTA=$2
MEMORY_QUOTA=$3

kubectl create namespace team-$TEAM

cat <<EOF | kubectl apply -f -
apiVersion: v1
kind: ResourceQuota
metadata:
  name: team-quota
  namespace: team-$TEAM
spec:
  hard:
    requests.cpu: "${CPU_QUOTA}"
    requests.memory: "${MEMORY_QUOTA}Gi"
    limits.cpu: "$((CPU_QUOTA * 2))"
    limits.memory: "$((MEMORY_QUOTA * 2))Gi"
    pods: "100"
---
apiVersion: v1
kind: LimitRange
metadata:
  name: default-limits
  namespace: team-$TEAM
spec:
  limits:
  - default:
      memory: "256Mi"
      cpu: "200m"
    defaultRequest:
      memory: "128Mi"
      cpu: "100m"
    type: Container
EOF
```

Usage:

```bash
./create-team-namespace.sh backend 40 100
```

This ensures consistent quota policies across all team namespaces.

## Quota Hierarchies with Policies

Use admission controllers like OPA or Kyverno to enforce quota policies:

```yaml
apiVersion: kyverno.io/v1
kind: ClusterPolicy
metadata:
  name: require-resource-quota
spec:
  validationFailureAction: enforce
  rules:
  - name: check-quota-exists
    match:
      resources:
        kinds:
        - Namespace
    validate:
      message: "All namespaces must have a ResourceQuota"
      pattern:
        metadata:
          name: "*"
    context:
    - name: quotaCount
      apiCall:
        urlPath: "/api/v1/namespaces/{{request.object.metadata.name}}/resourcequotas"
        jmesPath: "items | length(@)"
    preconditions:
      all:
      - key: "{{ quotaCount }}"
        operator: GreaterThan
        value: 0
```

This policy ensures every namespace has at least one ResourceQuota, preventing uncontrolled resource consumption.

## Cost Allocation and Chargeback

Map quotas to cost centers for chargeback:

```yaml
apiVersion: v1
kind: ResourceQuota
metadata:
  name: team-quota
  namespace: team-backend
  labels:
    cost-center: "backend-team"
    budget-code: "CC-12345"
spec:
  hard:
    requests.cpu: "40"
    requests.memory: "100Gi"
```

Export quota usage to billing systems:

```bash
# Generate monthly usage report
kubectl get resourcequota --all-namespaces -o json | \
  jq -r '.items[] |
    [.metadata.namespace,
     .metadata.labels["cost-center"],
     .status.used["requests.cpu"],
     .status.hard["requests.cpu"]] | @csv'
```

Calculate costs based on quota allocation or actual usage, depending on your chargeback model.

## Performance Impact

ResourceQuotas add minimal overhead. The API server checks quotas synchronously during resource creation, adding a few milliseconds of latency. This is negligible compared to other admission steps.

Quota objects themselves consume etcd space. In large clusters with thousands of namespaces, quota status updates can generate etcd traffic. Monitor etcd write rates and adjust quotas if needed.

The quota system does not impact runtime pod performance. Once a pod starts, quotas do not affect it until scale operations or pod updates occur.

## Troubleshooting Common Issues

Pods fail to schedule despite node capacity:

```bash
# Check quota status
kubectl describe resourcequota -n team-backend

# Check pod events
kubectl describe pod myapp-abc123 -n team-backend
```

Look for quota-related errors in events. Common issues include:
- Pods lacking resource requests when quotas require them
- Total namespace requests exceeding quota
- Mismatched units (Mi vs Gi, m vs cores)

Quota appears stuck after deleting pods:

```bash
# Force quota resync
kubectl annotate resourcequota compute-quota -n team-backend \
  kubectl.kubernetes.io/last-applied-configuration-
```

If this fails, check the quota controller logs for errors.

Resource quotas provide essential guardrails for multi-tenant Kubernetes clusters. They prevent resource exhaustion, enable fair sharing, and support cost allocation without requiring complex admission webhooks or third-party tools.
