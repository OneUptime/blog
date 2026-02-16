# How to Implement Resource Quotas and Limit Ranges per Namespace on AKS

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: AKS, Kubernetes, Resource Quotas, Limit Ranges, Azure, Capacity Planning, Multi-Tenancy

Description: A practical guide to implementing resource quotas and limit ranges on AKS to prevent resource hogging and ensure fair allocation across namespaces.

---

On a shared AKS cluster, one misbehaving deployment can eat up all the CPU and memory, starving everything else. I have seen a single team deploy a memory-leaking application that consumed every available byte on the cluster, taking down services from three other teams in the process. Resource quotas and limit ranges exist to prevent exactly this kind of situation.

Resource quotas set hard caps on the total resources a namespace can consume. Limit ranges set defaults and constraints on individual pods and containers. Together, they form the resource governance layer that makes multi-tenant AKS clusters viable.

## Resource Quotas: Namespace-Level Caps

A ResourceQuota defines the maximum amount of compute resources, storage, and object counts that a namespace can use. Once a quota is in place, Kubernetes rejects any pod creation that would exceed the limit.

Here is a comprehensive quota for a team namespace.

```yaml
# team-alpha-quota.yaml
# Sets resource limits for the team-alpha namespace
# Prevents any single team from consuming more than their fair share
apiVersion: v1
kind: ResourceQuota
metadata:
  name: team-alpha-quota
  namespace: team-alpha
spec:
  hard:
    # Compute resource limits
    requests.cpu: "8"           # Total CPU requests across all pods
    requests.memory: "16Gi"     # Total memory requests across all pods
    limits.cpu: "16"            # Total CPU limits across all pods
    limits.memory: "32Gi"       # Total memory limits across all pods

    # Storage limits
    requests.storage: "100Gi"   # Total PVC storage requests
    persistentvolumeclaims: "10" # Maximum number of PVCs

    # Object count limits
    pods: "50"                  # Maximum number of pods
    services: "20"              # Maximum number of services
    services.loadbalancers: "2" # Maximum LoadBalancer services (each costs a public IP)
    services.nodeports: "0"     # Disallow NodePort services
    configmaps: "50"            # Maximum ConfigMaps
    secrets: "50"               # Maximum Secrets
    replicationcontrollers: "20"
```

Apply it to the namespace.

```bash
# Create the namespace first
kubectl create namespace team-alpha

# Apply the quota
kubectl apply -f team-alpha-quota.yaml

# Verify the quota and current usage
kubectl describe resourcequota team-alpha-quota -n team-alpha
```

The output shows both the hard limits and the current usage, making it easy to see how close a namespace is to hitting its ceiling.

## Important: Quotas Require Resource Requests

Here is the gotcha that trips up most people. Once you apply a resource quota that limits CPU or memory, every pod in that namespace must specify resource requests and limits. If a pod does not specify them, Kubernetes rejects it with an error like "must specify requests.cpu" or "must specify limits.memory".

This is where limit ranges come in.

## Limit Ranges: Pod and Container Defaults

A LimitRange sets default resource requests and limits for containers that do not specify their own. It also sets minimum and maximum values that individual containers can request.

```yaml
# team-alpha-limits.yaml
# Sets default and boundary resource values for containers
# Any container without explicit resources gets these defaults
apiVersion: v1
kind: LimitRange
metadata:
  name: team-alpha-limits
  namespace: team-alpha
spec:
  limits:
    # Default values for containers
    - type: Container
      default:
        cpu: "500m"        # Default CPU limit if not specified
        memory: "512Mi"    # Default memory limit if not specified
      defaultRequest:
        cpu: "100m"        # Default CPU request if not specified
        memory: "128Mi"    # Default memory request if not specified
      min:
        cpu: "50m"         # Minimum CPU any container can request
        memory: "64Mi"     # Minimum memory any container can request
      max:
        cpu: "4"           # Maximum CPU any container can request
        memory: "8Gi"      # Maximum memory any container can request

    # Limits for pods (sum of all containers in the pod)
    - type: Pod
      max:
        cpu: "8"           # Maximum total CPU for all containers in a pod
        memory: "16Gi"     # Maximum total memory for all containers in a pod

    # Limits for PVCs
    - type: PersistentVolumeClaim
      min:
        storage: "1Gi"     # Minimum PVC size
      max:
        storage: "50Gi"    # Maximum PVC size
```

```bash
# Apply the limit range
kubectl apply -f team-alpha-limits.yaml

# Verify it
kubectl describe limitrange team-alpha-limits -n team-alpha
```

Now when a developer deploys a pod without resource specifications, Kubernetes automatically applies the defaults from the LimitRange. And if they try to request more than the maximum, the pod is rejected.

## Practical Example: Multi-Team Cluster Setup

Let us set up a cluster with three teams, each getting a proportional share of resources. Assume the cluster has 24 CPU cores and 96 GB of memory across all nodes.

```bash
# Create namespaces for each team
kubectl create namespace team-frontend
kubectl create namespace team-backend
kubectl create namespace team-data
```

Here is a script that creates quotas proportionally.

```yaml
# multi-team-quotas.yaml
# Frontend team gets 30% of cluster resources
apiVersion: v1
kind: ResourceQuota
metadata:
  name: quota
  namespace: team-frontend
spec:
  hard:
    requests.cpu: "6"
    requests.memory: "24Gi"
    limits.cpu: "8"
    limits.memory: "32Gi"
    pods: "40"
    services.loadbalancers: "2"
---
# Backend team gets 40% of cluster resources
apiVersion: v1
kind: ResourceQuota
metadata:
  name: quota
  namespace: team-backend
spec:
  hard:
    requests.cpu: "8"
    requests.memory: "32Gi"
    limits.cpu: "12"
    limits.memory: "48Gi"
    pods: "60"
    services.loadbalancers: "3"
---
# Data team gets 30% of cluster resources
apiVersion: v1
kind: ResourceQuota
metadata:
  name: quota
  namespace: team-data
spec:
  hard:
    requests.cpu: "6"
    requests.memory: "24Gi"
    limits.cpu: "8"
    limits.memory: "32Gi"
    pods: "30"
    services.loadbalancers: "1"
    requests.storage: "500Gi"
    persistentvolumeclaims: "20"
```

Notice the total requests add up to less than the cluster capacity. This is intentional - you need headroom for system pods, kube-system workloads, and burst capacity.

## Scoped Quotas: Different Rules for Different Priorities

You can create quotas that only apply to pods matching certain criteria. This is useful for setting different limits based on priority class.

```yaml
# priority-based-quota.yaml
# Allow more resources for high-priority workloads
apiVersion: v1
kind: ResourceQuota
metadata:
  name: high-priority-quota
  namespace: team-backend
spec:
  hard:
    requests.cpu: "6"
    requests.memory: "24Gi"
  scopeSelector:
    matchExpressions:
      - scopeName: PriorityClass
        operator: In
        values:
          - high-priority
---
# Limit resources for best-effort (no resource requests) workloads
apiVersion: v1
kind: ResourceQuota
metadata:
  name: best-effort-quota
  namespace: team-backend
spec:
  hard:
    pods: "5"
  scopes:
    - BestEffort
```

## Monitoring Quota Usage

Keeping an eye on quota usage helps you adjust limits before teams hit their ceilings and start getting deployment failures.

```bash
# Check quota usage for all namespaces at once
kubectl get resourcequota --all-namespaces -o custom-columns=\
NAMESPACE:.metadata.namespace,\
NAME:.metadata.name,\
CPU_REQ:.status.used.requests\\.cpu,\
CPU_LIMIT:.status.hard.requests\\.cpu,\
MEM_REQ:.status.used.requests\\.memory,\
MEM_LIMIT:.status.hard.requests\\.memory

# Detailed view for a specific namespace
kubectl describe resourcequota -n team-backend
```

You can also set up Prometheus alerts for quota utilization. If you are using Azure Monitor managed Prometheus on AKS, use these PromQL queries.

```promql
# Percentage of CPU request quota used per namespace
kube_resourcequota{type="used", resource="requests.cpu"}
/
kube_resourcequota{type="hard", resource="requests.cpu"}
* 100

# Alert when any namespace exceeds 80% of its memory quota
kube_resourcequota{type="used", resource="requests.memory"}
/
kube_resourcequota{type="hard", resource="requests.memory"}
* 100 > 80
```

## Common Pitfalls

### Forgetting to Set Limit Ranges

If you add a ResourceQuota without a LimitRange, existing pods continue running fine but new pods without explicit resource requests fail to schedule. Always deploy both together.

### Setting Limits Too Tight

Start with generous quotas and tighten them based on actual usage data. A quota that is too tight causes deployment failures during peak times and leads to frustrated developers who will ask you to remove the quotas entirely.

### Ignoring the Request-to-Limit Ratio

If your LimitRange sets default requests much lower than default limits (for example, 100m CPU request but 2 CPU limit), you are enabling CPU overcommitment. This works fine until all pods burst simultaneously and start competing for CPU time. Keep the ratio reasonable - I typically use a 1:2 or 1:3 ratio between requests and limits.

### Not Accounting for System Overhead

Every namespace has a default service account, and Kubernetes creates a token secret for it. Do not set your secrets quota to 0 or you will break basic functionality. Similarly, leave room for ConfigMaps used by system components.

## Automating with Azure Policy

You can use Azure Policy to automatically enforce that every namespace has a quota and limit range.

```bash
# Assign a built-in policy that requires resource limits on containers
az policy assignment create \
  --name 'require-resource-limits' \
  --display-name 'Require resource limits on AKS containers' \
  --scope "/subscriptions/<sub-id>/resourceGroups/myRG/providers/Microsoft.ContainerService/managedClusters/myAKS" \
  --policy "e345eecc-fa47-480f-9e88-67dcc122b164" \
  --params '{"effect": {"value": "Deny"}}'
```

## Wrapping Up

Resource quotas and limit ranges are essential for any shared AKS cluster. Quotas prevent any single namespace from consuming disproportionate resources, while limit ranges ensure that every container has sensible defaults and cannot request excessive resources. Deploy them together, start with generous limits, and adjust based on actual usage. The combination of these two features turns your AKS cluster from a free-for-all into a well-governed shared platform where teams can deploy confidently without worrying about noisy neighbors.
