# How to Implement Kubernetes Namespace Resource Quotas for Multi-Team Production Clusters

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Resource Quotas, Multi-Tenancy, Namespaces

Description: Implement namespace resource quotas that prevent resource monopolization in multi-team Kubernetes clusters, ensuring fair allocation and preventing individual teams from impacting cluster-wide availability.

---

Shared Kubernetes clusters serving multiple teams face a common problem: one team's workloads can consume all available resources, starving other teams and degrading cluster performance. Without resource governance, teams compete for capacity in ways that hurt everyone. Namespace resource quotas solve this by establishing per-namespace resource limits that ensure fair allocation and prevent resource monopolization.

Quotas work by defining hard limits on resource consumption within namespaces. Teams cannot exceed their allocations regardless of available cluster capacity. This prevents scenarios where a single team deploys resource-hungry workloads that prevent other teams from scheduling pods.

Implementing effective quota policies requires understanding team needs, establishing fair allocations, and monitoring usage to adjust quotas as requirements evolve.

## Understanding Resource Quotas

Resource quotas limit total resource consumption within a namespace across all pods and other objects. They constrain CPU, memory, storage, and object counts.

```yaml
apiVersion: v1
kind: ResourceQuota
metadata:
  name: team-quota
  namespace: team-a
spec:
  hard:
    requests.cpu: "20"
    requests.memory: 40Gi
    limits.cpu: "40"
    limits.memory: 80Gi
    pods: "50"
    services: "10"
    persistentvolumeclaims: "20"
```

This quota allocates team-a 20 guaranteed CPU cores, 40Gi guaranteed memory, with burst capacity to 40 cores and 80Gi. They can create up to 50 pods, 10 services, and 20 persistent volume claims.

When quotas exist, pods must specify resource requests and limits. Attempts to create pods without resources or exceeding quota fail:

```bash
kubectl run test --image=nginx -n team-a
Error: exceeded quota: team-quota, requested: pods=1, used: pods=50, limited: pods=50
```

## Establishing Team-Based Quota Allocations

Determine quota allocations based on team size, workload characteristics, and business priorities.

For development teams:

```yaml
apiVersion: v1
kind: ResourceQuota
metadata:
  name: dev-quota
  namespace: team-dev
spec:
  hard:
    requests.cpu: "10"
    requests.memory: 20Gi
    limits.cpu: "20"
    limits.memory: 40Gi
    pods: "30"
```

Development environments typically need less capacity than production but require flexibility for experimentation.

For production services:

```yaml
apiVersion: v1
kind: ResourceQuota
metadata:
  name: prod-quota
  namespace: team-prod
spec:
  hard:
    requests.cpu: "50"
    requests.memory: 100Gi
    limits.cpu: "100"
    limits.memory: 200Gi
    pods: "100"
    services.loadbalancers: "5"
```

Production namespaces receive larger allocations reflecting higher availability requirements and traffic loads.

For batch processing teams:

```yaml
apiVersion: v1
kind: ResourceQuota
metadata:
  name: batch-quota
  namespace: team-batch
spec:
  hard:
    requests.cpu: "30"
    requests.memory: 60Gi
    limits.cpu: "80"
    limits.memory: 150Gi
    pods: "200"
```

Batch workloads often need many pods with varying resource requirements.

## Implementing Storage Quotas

Storage quotas prevent teams from consuming all available persistent storage:

```yaml
apiVersion: v1
kind: ResourceQuota
metadata:
  name: storage-quota
  namespace: team-data
spec:
  hard:
    requests.storage: 1Ti
    persistentvolumeclaims: "50"
    fast-ssd.storageclass.storage.k8s.io/requests.storage: 500Gi
    fast-ssd.storageclass.storage.k8s.io/persistentvolumeclaims: "20"
```

This quota limits total storage to 1Ti with specific limits on premium fast-ssd storage class usage.

Teams exceeding storage quotas cannot create new persistent volume claims:

```bash
kubectl apply -f pvc.yaml -n team-data
Error: exceeded quota: storage-quota, requested: requests.storage=100Gi,
used: requests.storage=950Gi, limited: requests.storage=1Ti
```

## Quota Scoping for Different Resource Classes

Apply different quotas based on pod priority or quality of service:

```yaml
apiVersion: v1
kind: ResourceQuota
metadata:
  name: high-priority-quota
  namespace: team-prod
spec:
  hard:
    requests.cpu: "30"
    requests.memory: 60Gi
    pods: "50"
  scopes:
  - PriorityClass
  scopeSelector:
    matchExpressions:
    - operator: In
      scopeName: PriorityClass
      values: ["high-priority"]
---
apiVersion: v1
kind: ResourceQuota
metadata:
  name: best-effort-quota
  namespace: team-prod
spec:
  hard:
    pods: "20"
  scopes:
  - BestEffort
```

This configuration allocates more resources to high-priority pods while limiting best-effort pods.

## Monitoring Quota Usage

Track quota consumption to identify teams approaching limits:

```bash
# View all quotas across namespaces
kubectl get resourcequota --all-namespaces

# Check specific quota details
kubectl describe resourcequota team-quota -n team-a

# View quota usage summary
kubectl get resourcequota -n team-a -o json | \
  jq '.items[0].status'
```

Create Prometheus alerts for quota exhaustion:

```yaml
groups:
- name: quota-alerts
  rules:
  - alert: NamespaceQuotaNearLimit
    expr: |
      kube_resourcequota{type="used"} /
      kube_resourcequota{type="hard"} > 0.9
    for: 15m
    labels:
      severity: warning
    annotations:
      summary: "Namespace {{ $labels.namespace }} quota {{ $labels.resource }} usage >90%"

  - alert: NamespaceQuotaExhausted
    expr: |
      kube_resourcequota{type="used"} /
      kube_resourcequota{type="hard"} >= 1
    labels:
      severity: critical
    annotations:
      summary: "Namespace {{ $labels.namespace }} quota {{ $labels.resource }} exhausted"
```

## Implementing Limit Ranges

Combine quotas with LimitRanges to enforce per-pod constraints:

```yaml
apiVersion: v1
kind: LimitRange
metadata:
  name: resource-limits
  namespace: team-dev
spec:
  limits:
  - max:
      cpu: "4"
      memory: 8Gi
    min:
      cpu: 100m
      memory: 128Mi
    default:
      cpu: 500m
      memory: 512Mi
    defaultRequest:
      cpu: 250m
      memory: 256Mi
    type: Container
  - max:
      cpu: "8"
      memory: 16Gi
    min:
      cpu: 200m
      memory: 256Mi
    type: Pod
```

LimitRanges prevent individual pods from consuming entire namespace quotas and provide defaults for pods without explicit resource specifications.

## Automating Quota Management

Create quotas automatically for new namespaces using admission webhooks or operators:

```go
package main

import (
    "context"
    corev1 "k8s.io/api/core/v1"
    "k8s.io/apimachinery/pkg/api/resource"
    metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
    "k8s.io/client-go/kubernetes"
)

func createDefaultQuota(clientset *kubernetes.Clientset, namespace string) error {
    quota := &corev1.ResourceQuota{
        ObjectMeta: metav1.ObjectMeta{
            Name:      "default-quota",
            Namespace: namespace,
        },
        Spec: corev1.ResourceQuotaSpec{
            Hard: corev1.ResourceList{
                corev1.ResourceRequestsCPU:    resource.MustParse("10"),
                corev1.ResourceRequestsMemory: resource.MustParse("20Gi"),
                corev1.ResourceLimitsCPU:      resource.MustParse("20"),
                corev1.ResourceLimitsMemory:   resource.MustParse("40Gi"),
                corev1.ResourcePods:           resource.MustParse("30"),
            },
        },
    }

    _, err := clientset.CoreV1().ResourceQuotas(namespace).Create(
        context.TODO(), quota, metav1.CreateOptions{})
    return err
}
```

Deploy as a controller that watches for new namespaces and creates appropriate quotas.

## Quota Exception Handling

Establish processes for quota increases:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: quota-policy
  namespace: kube-system
data:
  policy.yaml: |
    quotaIncreaseProcedure: |
      1. Team submits request with justification
      2. Review resource usage trends
      3. Verify business need
      4. Approve increase with duration
      5. Monitor usage post-increase
      6. Adjust permanent allocation if needed

    quotaLimits:
      development:
        cpu: 20
        memory: 40Gi
      staging:
        cpu: 30
        memory: 60Gi
      production:
        cpu: 100
        memory: 200Gi
```

Namespace resource quotas are essential for multi-team cluster management. By establishing fair resource allocations, preventing monopolization, and monitoring usage, you create stable shared environments where teams can work effectively without impacting each other. Proper quota management transforms shared clusters from contentious resource battles into well-governed platforms that serve all teams reliably.
