# How to Configure Resource Quotas per Namespace on Talos

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Kubernetes, Resource Quotas, Namespace Management, Capacity Planning

Description: Learn how to configure and manage Kubernetes resource quotas per namespace on Talos Linux to prevent resource contention and ensure fair sharing.

---

When multiple teams share a Talos Linux cluster, resource contention is inevitable without proper controls. One team's runaway deployment can consume all available CPU and memory, leaving other teams unable to schedule their workloads. Resource quotas solve this by setting hard limits on what each namespace can consume. They are one of the most important controls for running a stable, multi-tenant Kubernetes cluster.

This post covers how to configure resource quotas on Talos Linux, including compute resources, storage, object counts, and strategies for sizing quotas appropriately.

## How Resource Quotas Work

A ResourceQuota object in Kubernetes sets limits on the total amount of resources that can be consumed within a namespace. When a quota is active, every pod or persistent volume claim created in that namespace counts against the quota. If creating a new resource would exceed the quota, the creation is rejected.

Importantly, when compute resource quotas are set, every container in the namespace must specify resource requests and limits. Kubernetes will refuse to create pods that do not declare their resource needs. This forces teams to think about resource requirements upfront, which is a healthy practice.

## Basic Compute Resource Quotas

The most common quotas limit CPU and memory.

```yaml
# compute-quota.yaml
apiVersion: v1
kind: ResourceQuota
metadata:
  name: compute-quota
  namespace: team-backend
spec:
  hard:
    # Total CPU that can be requested by all pods
    requests.cpu: "16"
    # Total CPU limit across all pods
    limits.cpu: "32"
    # Total memory that can be requested
    requests.memory: 32Gi
    # Total memory limit
    limits.memory: 64Gi
```

```bash
kubectl apply -f compute-quota.yaml
```

After applying this quota, the total CPU requests across all pods in the team-backend namespace cannot exceed 16 cores. The total CPU limits cannot exceed 32 cores. The same logic applies to memory.

### Checking Quota Usage

```bash
# View quota status
kubectl -n team-backend describe resourcequota compute-quota

# Example output:
# Name:            compute-quota
# Namespace:       team-backend
# Resource         Used   Hard
# --------         ----   ----
# limits.cpu       8      32
# limits.memory    16Gi   64Gi
# requests.cpu     4      16
# requests.memory  8Gi    32Gi
```

## Object Count Quotas

Beyond compute resources, you can limit the number of objects in a namespace. This prevents a namespace from creating an excessive number of pods, services, or other resources that could strain the API server.

```yaml
# object-count-quota.yaml
apiVersion: v1
kind: ResourceQuota
metadata:
  name: object-count-quota
  namespace: team-backend
spec:
  hard:
    # Limit the number of pods
    pods: "100"
    # Limit services (each service uses a cluster IP)
    services: "30"
    services.loadbalancers: "5"
    services.nodeports: "10"
    # Limit config objects
    configmaps: "100"
    secrets: "100"
    # Limit persistent storage claims
    persistentvolumeclaims: "20"
    # Limit replica controllers and deployments
    replicationcontrollers: "20"
    count/deployments.apps: "30"
    count/statefulsets.apps: "10"
    count/jobs.batch: "50"
    count/cronjobs.batch: "20"
```

```bash
kubectl apply -f object-count-quota.yaml
```

## Storage Quotas

Storage quotas limit how much persistent storage a namespace can claim. This is important when using expensive storage classes or when total cluster storage is limited.

```yaml
# storage-quota.yaml
apiVersion: v1
kind: ResourceQuota
metadata:
  name: storage-quota
  namespace: team-backend
spec:
  hard:
    # Total storage across all PVCs
    requests.storage: 500Gi
    # Limit storage per storage class
    # Fast SSD storage - limited
    fast-ssd.storageclass.storage.k8s.io/requests.storage: 100Gi
    fast-ssd.storageclass.storage.k8s.io/persistentvolumeclaims: "5"
    # Standard storage - more generous
    standard.storageclass.storage.k8s.io/requests.storage: 400Gi
    standard.storageclass.storage.k8s.io/persistentvolumeclaims: "15"
```

This is particularly useful on Talos Linux clusters with local storage, where disk space is finite and shared across all namespaces.

## Scoped Quotas

You can create quotas that only apply to certain types of pods. For example, you might want separate quotas for best-effort pods (no resource requests) and guaranteed pods (requests equal limits).

```yaml
# scoped-quota-besteffort.yaml
apiVersion: v1
kind: ResourceQuota
metadata:
  name: besteffort-quota
  namespace: team-backend
spec:
  hard:
    pods: "10"
  scopes:
    - BestEffort

---
# scoped-quota-not-besteffort.yaml
apiVersion: v1
kind: ResourceQuota
metadata:
  name: guaranteed-quota
  namespace: team-backend
spec:
  hard:
    pods: "90"
    requests.cpu: "16"
    limits.cpu: "32"
    requests.memory: 32Gi
    limits.memory: 64Gi
  scopes:
    - NotBestEffort
```

This allows you to give a small allocation for best-effort workloads (like batch jobs that can be preempted) while reserving most resources for workloads with proper resource specifications.

## Priority-Based Quotas

If you use priority classes, you can create quotas per priority level.

```yaml
# priority-quota.yaml
apiVersion: v1
kind: ResourceQuota
metadata:
  name: high-priority-quota
  namespace: team-backend
spec:
  hard:
    pods: "20"
    requests.cpu: "8"
    requests.memory: 16Gi
  scopeSelector:
    matchExpressions:
      - scopeName: PriorityClass
        operator: In
        values:
          - high-priority
```

## Sizing Quotas Appropriately

Setting quotas too low causes frustration as teams constantly hit limits. Setting them too high defeats the purpose. Here are guidelines for sizing.

### Start with Current Usage

Measure what each namespace currently uses and set quotas with headroom.

```bash
# Check current resource usage per namespace
kubectl top pods -n team-backend --no-headers | \
  awk '{cpu+=$2; mem+=$3} END {print "Total CPU:", cpu, "Total Memory:", mem}'

# Check resource requests and limits
kubectl get pods -n team-backend -o json | \
  jq '[.items[].spec.containers[].resources] |
      {total_cpu_requests: [.[].requests.cpu // "0"] | join("+"),
       total_memory_requests: [.[].requests.memory // "0"] | join("+")}'
```

### Quota Sizing Formula

A reasonable starting point:

```
Quota requests = current_average_usage * 1.5
Quota limits = current_average_usage * 3.0

# For example, if team-backend typically uses 4 CPU cores:
# requests.cpu = 4 * 1.5 = 6 cores
# limits.cpu = 4 * 3.0 = 12 cores
```

The 1.5x multiplier for requests gives teams room to scale. The 3x multiplier for limits allows for burst usage.

### Total Cluster Allocation

Make sure the sum of all namespace quotas does not dramatically exceed your cluster capacity. Some overcommitment is normal (not all namespaces use their full quota simultaneously), but excessive overcommitment leads to problems.

```
Total cluster CPU: 64 cores
Sum of all namespace request quotas: 80 cores (1.25x overcommit - acceptable)
Sum of all namespace limit quotas: 160 cores (2.5x overcommit - might be risky)
```

## Handling Quota Rejections

When a pod creation is rejected due to quota, the error message tells you which quota was exceeded.

```bash
# Example error when quota is exceeded
# Error from server (Forbidden): pods "my-pod" is forbidden:
# exceeded quota: compute-quota, requested: requests.cpu=2,
# used: requests.cpu=15, limited: requests.cpu=16

# Check current quota usage to understand the situation
kubectl -n team-backend describe resourcequota
```

To resolve quota rejections, either increase the quota, remove unused workloads from the namespace, or reduce the resource requests on the new pod.

## Monitoring Quota Usage

Set up alerts for when namespace quota usage approaches the limit.

```yaml
# Prometheus alert for quota approaching limit
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: quota-alerts
  namespace: monitoring
spec:
  groups:
    - name: quota.rules
      rules:
        - alert: NamespaceQuotaNearLimit
          expr: |
            kube_resourcequota{type="used"} /
            kube_resourcequota{type="hard"} > 0.85
          for: 10m
          labels:
            severity: warning
          annotations:
            summary: "Namespace {{ $labels.namespace }} quota for {{ $labels.resource }} is at {{ $value | humanizePercentage }}"
```

```bash
# Quick command to check quota utilization across all namespaces
kubectl get resourcequota --all-namespaces -o custom-columns=\
NAMESPACE:.metadata.namespace,\
NAME:.metadata.name,\
CPU_REQ_USED:.status.used.requests\\.cpu,\
CPU_REQ_HARD:.status.hard.requests\\.cpu,\
MEM_REQ_USED:.status.used.requests\\.memory,\
MEM_REQ_HARD:.status.hard.requests\\.memory
```

## Conclusion

Resource quotas are a fundamental building block for running a stable, shared Talos Linux cluster. They prevent any single namespace from monopolizing resources and force teams to specify their resource needs upfront. Start by measuring current usage, apply quotas with reasonable headroom, monitor utilization over time, and adjust as workload patterns change. Combined with limit ranges for per-pod defaults and network policies for traffic isolation, resource quotas give you the controls needed to share a cluster safely between multiple teams.
