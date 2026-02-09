# How to Configure ResourceQuota to Cap Total CPU and Memory Per Namespace

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, ResourceQuota, Multi-Tenancy

Description: Use Kubernetes ResourceQuota to limit total CPU, memory, and storage consumption per namespace, preventing resource exhaustion and enforcing fair sharing in multi-tenant clusters.

---

Uncapped namespaces can consume entire cluster capacity. ResourceQuota prevents this by enforcing hard limits on total resource consumption per namespace. This guide shows you how to configure quotas for CPU, memory, storage, and object counts.

## What Is ResourceQuota?

ResourceQuota is a namespace-scoped policy that limits aggregate resource consumption. It can cap:

- Total CPU and memory requests and limits
- Storage capacity
- Number of objects (pods, services, etc.)
- Extended resources

The quota admission controller tracks usage and rejects resources that would exceed quotas.

## Creating a Basic ResourceQuota

Limit total CPU and memory in a namespace:

```yaml
apiVersion: v1
kind: ResourceQuota
metadata:
  name: compute-quota
  namespace: development
spec:
  hard:
    requests.cpu: "10"
    requests.memory: "20Gi"
    limits.cpu: "20"
    limits.memory: "40Gi"
```

Apply it:

```bash
kubectl apply -f quota.yaml
```

This namespace can now use at most 10 CPU requests and 20Gi memory requests across all pods.

## Understanding Requests vs Limits Quotas

You can quota requests, limits, or both:

- `requests.cpu`: Total CPU requests across all pods
- `limits.cpu`: Total CPU limits across all pods
- `requests.memory`: Total memory requests
- `limits.memory`: Total memory limits

Most clusters quota requests since they determine scheduling:

```yaml
spec:
  hard:
    requests.cpu: "20"
    requests.memory: "40Gi"
```

This prevents over-provisioning at the scheduler level.

## Checking Quota Usage

View quota status:

```bash
kubectl get resourcequota -n development
```

Output:

```
NAME            AGE   REQUEST                                     LIMIT
compute-quota   5m    requests.cpu: 6/10, requests.memory: 12Gi/20Gi
```

This shows 6 CPU and 12Gi memory in use out of quota.

Describe for details:

```bash
kubectl describe resourcequota compute-quota -n development
```

Shows current usage, hard limits, and whether quota is exceeded.

## What Happens When Quota Is Exceeded?

Pods that would exceed quota are rejected:

```bash
kubectl run test --image=nginx --requests=cpu=5 -n development
# Error: exceeded quota: compute-quota, requested: requests.cpu=5, used: requests.cpu=6, limited: requests.cpu=10
```

The pod is not created. Reduce requests or delete other pods to free quota.

## Quotas for Storage

Limit total storage requests:

```yaml
apiVersion: v1
kind: ResourceQuota
metadata:
  name: storage-quota
  namespace: team-a
spec:
  hard:
    requests.storage: "100Gi"
```

This caps total PVC capacity at 100Gi.

You can also quota by storage class:

```yaml
spec:
  hard:
    fast-storage.storageclass.storage.k8s.io/requests.storage: "50Gi"
    slow-storage.storageclass.storage.k8s.io/requests.storage: "200Gi"
```

## Quotas for Object Counts

Limit the number of resources:

```yaml
apiVersion: v1
kind: ResourceQuota
metadata:
  name: object-quota
  namespace: sandbox
spec:
  hard:
    pods: "10"
    services: "5"
    configmaps: "20"
    persistentvolumeclaims: "5"
    secrets: "10"
```

Prevents runaway object creation.

## Combining Multiple Quotas

You can have multiple ResourceQuota objects in a namespace. All must be satisfied:

```yaml
apiVersion: v1
kind: ResourceQuota
metadata:
  name: compute-quota
  namespace: production
spec:
  hard:
    requests.cpu: "50"
    requests.memory: "100Gi"
---
apiVersion: v1
kind: ResourceQuota
metadata:
  name: storage-quota
  namespace: production
spec:
  hard:
    requests.storage: "500Gi"
---
apiVersion: v1
kind: ResourceQuota
metadata:
  name: object-quota
  namespace: production
spec:
  hard:
    pods: "100"
    services: "50"
```

All three quotas apply simultaneously.

## Quotas and Priority Classes

Use scopeSelector to quota based on priority class:

```yaml
apiVersion: v1
kind: ResourceQuota
metadata:
  name: high-priority-quota
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
      - high-priority
```

This quota only applies to pods with `priorityClassName: high-priority`.

Create separate quotas for different priorities:

```yaml
# High priority: 30 CPU
apiVersion: v1
kind: ResourceQuota
metadata:
  name: high-priority-quota
  namespace: production
spec:
  hard:
    requests.cpu: "30"
  scopeSelector:
    matchExpressions:
    - operator: In
      scopeName: PriorityClass
      values:
      - high-priority
---
# Low priority: 20 CPU
apiVersion: v1
kind: ResourceQuota
metadata:
  name: low-priority-quota
  namespace: production
spec:
  hard:
    requests.cpu: "20"
  scopeSelector:
    matchExpressions:
    - operator: In
      scopeName: PriorityClass
      values:
      - low-priority
```

## Quotas for Extended Resources

Quota custom resources like GPUs:

```yaml
apiVersion: v1
kind: ResourceQuota
metadata:
  name: gpu-quota
  namespace: ml-team
spec:
  hard:
    requests.nvidia.com/gpu: "4"
```

The namespace can use at most 4 GPUs across all pods.

## Best Practices Per Environment

### Development Namespaces

Generous quotas for experimentation:

```yaml
apiVersion: v1
kind: ResourceQuota
metadata:
  name: dev-quota
  namespace: dev
spec:
  hard:
    requests.cpu: "20"
    requests.memory: "40Gi"
    pods: "50"
```

### Staging Namespaces

Moderate quotas similar to production:

```yaml
apiVersion: v1
kind: ResourceQuota
metadata:
  name: staging-quota
  namespace: staging
spec:
  hard:
    requests.cpu: "40"
    requests.memory: "80Gi"
    requests.storage: "200Gi"
    pods: "100"
```

### Production Namespaces

Conservative quotas with monitoring:

```yaml
apiVersion: v1
kind: ResourceQuota
metadata:
  name: prod-quota
  namespace: prod
spec:
  hard:
    requests.cpu: "100"
    requests.memory: "200Gi"
    limits.cpu: "200"
    limits.memory: "400Gi"
    requests.storage: "1Ti"
    pods: "200"
    services.loadbalancers: "5"
```

## Monitoring Quota Usage

Export quota metrics with kube-state-metrics:

```promql
# Quota usage percentage
(kube_resourcequota{type="used"} / kube_resourcequota{type="hard"}) * 100
```

Alert when quotas are near limits:

```yaml
# Prometheus alert
- alert: QuotaNearLimit
  expr: (kube_resourcequota{type="used"} / kube_resourcequota{type="hard"}) > 0.9
  for: 10m
  annotations:
    summary: "ResourceQuota {{ $labels.resource }} in namespace {{ $labels.namespace }} is at {{ $value }}%"
```

## Handling Quota Exhaustion

When quota is exhausted:

1. Check current usage:

```bash
kubectl describe quota compute-quota -n production
```

2. List pods sorted by resource usage:

```bash
kubectl top pods -n production --sort-by=memory
```

3. Delete unnecessary pods or reduce requests:

```bash
kubectl delete pod low-priority-job-xyz -n production
```

4. Or increase quota if justified:

```bash
kubectl edit resourcequota compute-quota -n production
```

## ResourceQuota with LimitRange

Combine with LimitRange to enforce both individual and aggregate limits:

```yaml
# LimitRange: Per-container limits
apiVersion: v1
kind: LimitRange
metadata:
  name: container-limits
  namespace: team-a
spec:
  limits:
  - max:
      cpu: "4"
      memory: "8Gi"
    type: Container
---
# ResourceQuota: Namespace totals
apiVersion: v1
kind: ResourceQuota
metadata:
  name: namespace-quota
  namespace: team-a
spec:
  hard:
    requests.cpu: "50"
    requests.memory: "100Gi"
```

LimitRange prevents huge containers, ResourceQuota prevents too many containers.

## Per-User Quotas with RBAC

Create quotas for different teams using namespaces:

```bash
# Team A namespace
kubectl create namespace team-a

# Team A quota
kubectl apply -f - <<EOF
apiVersion: v1
kind: ResourceQuota
metadata:
  name: team-a-quota
  namespace: team-a
spec:
  hard:
    requests.cpu: "30"
    requests.memory: "60Gi"
EOF

# Grant Team A access to their namespace
kubectl create rolebinding team-a-admin \
  --clusterrole=admin \
  --group=team-a \
  --namespace=team-a
```

## Quota for Ephemeral Storage

Limit ephemeral storage (EmptyDir, container logs):

```yaml
apiVersion: v1
kind: ResourceQuota
metadata:
  name: ephemeral-quota
  namespace: data-processing
spec:
  hard:
    requests.ephemeral-storage: "50Gi"
    limits.ephemeral-storage: "100Gi"
```

Prevents filling node disks with temporary data.

## Namespaced vs Cluster-Scoped Resources

ResourceQuota only applies to namespaced resources. Cluster-scoped resources (nodes, PVs) aren't quotaable.

Quotaable resources:

- Pods, Services, ConfigMaps, Secrets
- PVCs (but not PVs)
- Namespaced custom resources

Not quotaable:

- Nodes, Namespaces
- PersistentVolumes
- ClusterRoles, ClusterRoleBindings

## Quota Updates

Update quota by editing:

```bash
kubectl edit resourcequota compute-quota -n production
```

Changes apply immediately. Existing pods continue running even if they now exceed quota. New pods must fit within the new limits.

## Removing ResourceQuota

Delete quota:

```bash
kubectl delete resourcequota compute-quota -n development
```

Existing pods are unaffected. Future pods have no quota restrictions.

## Real-World Example: Multi-Tenant SaaS

A SaaS platform with per-customer namespaces:

```yaml
# Small customer tier
apiVersion: v1
kind: ResourceQuota
metadata:
  name: small-tier
  namespace: customer-123
spec:
  hard:
    requests.cpu: "5"
    requests.memory: "10Gi"
    pods: "20"
---
# Medium customer tier
apiVersion: v1
kind: ResourceQuota
metadata:
  name: medium-tier
  namespace: customer-456
spec:
  hard:
    requests.cpu: "20"
    requests.memory: "40Gi"
    pods: "50"
---
# Enterprise customer tier
apiVersion: v1
kind: ResourceQuota
metadata:
  name: enterprise-tier
  namespace: customer-789
spec:
  hard:
    requests.cpu: "100"
    requests.memory: "200Gi"
    pods: "200"
```

## Conclusion

ResourceQuota is essential for multi-tenant clusters and cost control. Set quotas based on team size, workload type, and cluster capacity. Combine with LimitRange to enforce both individual and aggregate limits. Monitor quota usage and alert before limits are reached. Start with generous quotas and tighten based on actual consumption. ResourceQuota ensures fair resource sharing and prevents any single namespace from consuming the entire cluster.
