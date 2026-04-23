# How to Configure Rancher Resource Limits - A Practical Guide

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rancher, Kubernetes, Resource Limit, LimitRange, ResourceQuota

Description: Configure resource limits and quotas in Rancher at multiple levels-namespace, project, and workload-to ensure fair resource distribution and cluster stability.

## Introduction

Resource limits in Kubernetes prevent any single workload from consuming all cluster resources, which is essential for cluster stability and fair multi-tenancy. Rancher extends Kubernetes resource management with project-level quotas. This guide covers configuring limits at every level from individual containers to entire projects.

## Prerequisites

- Rancher-managed Kubernetes cluster
- Cluster admin access
- Understanding of CPU and memory units in Kubernetes
- Metrics Server installed for `kubectl top` and VPA recommendations
- Vertical Pod Autoscaler installed if you plan to use Step 5

## Step 1: Configure Container Resource Limits

```yaml
# Deployment with resource limits

apiVersion: apps/v1
kind: Deployment
metadata:
  name: web-app
  namespace: production
spec:
  selector:
    matchLabels:
      app: web-app
  template:
    metadata:
      labels:
        app: web-app
    spec:
      containers:
        - name: web
          image: registry.example.com/web:v1.0
          resources:
            # Always specify requests and limits
            requests:
              cpu: 250m       # 0.25 CPU cores guaranteed
              memory: 256Mi   # 256 MiB guaranteed
            limits:
              cpu: 1000m      # 1 CPU core maximum
              memory: 512Mi   # 512 MiB maximum
          # With a single container, this Pod would be Burstable (request < limit)
          # For Guaranteed QoS: set CPU and memory requests == limits for every container in the Pod
```

## Step 2: Set Default Limits with LimitRange

```yaml
# namespace-limitrange.yaml - Enforce defaults for all containers
apiVersion: v1
kind: LimitRange
metadata:
  name: default-limits
  namespace: production
spec:
  limits:
    # Container-level defaults
    - type: Container
      default:
        cpu: 500m
        memory: 256Mi
      defaultRequest:
        cpu: 100m
        memory: 128Mi
      max:
        cpu: "4"
        memory: 4Gi
      min:
        cpu: 50m
        memory: 64Mi
      # Ratios: CPU limit <= 10x request, memory limit <= 4x request
      maxLimitRequestRatio:
        cpu: "10"
        memory: "4"

    # Pod-level limits
    - type: Pod
      max:
        cpu: "8"
        memory: 8Gi
      min:
        cpu: 100m
        memory: 128Mi

    # PVC size limits
    - type: PersistentVolumeClaim
      max:
        storage: 50Gi
      min:
        storage: 1Gi
```

## Step 3: Configure Namespace ResourceQuota

```yaml
# namespace-quota.yaml - Namespace-level resource quota
apiVersion: v1
kind: ResourceQuota
metadata:
  name: production-quota
  namespace: production
spec:
  hard:
    # Compute
    requests.cpu: "20"
    requests.memory: 40Gi
    limits.cpu: "40"
    limits.memory: 80Gi

    # Object count limits
    pods: "100"
    services: "20"
    configmaps: "50"
    secrets: "50"
    persistentvolumeclaims: "30"

    # Storage
    requests.storage: 500Gi
    standard.storageclass.storage.k8s.io/requests.storage: 200Gi
    longhorn.storageclass.storage.k8s.io/requests.storage: 300Gi

    # Service types
    services.nodeports: "0"     # No NodePort in production
    services.loadbalancers: "5"

    # Workload object counts
    count/deployments.apps: "50"
    count/statefulsets.apps: "10"
```

## Step 4: Configure Rancher Project Quotas

```bash
# Set project resource quota via Rancher API
curl -X PUT \
  -H "Authorization: Bearer ${RANCHER_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "resourceQuota": {
      "limit": {
        "pods": "500",
        "services": "100",
        "requestsCpu": "40000m",
        "requestsMemory": "80Gi",
        "limitsCpu": "80000m",
        "limitsMemory": "160Gi",
        "requestsStorage": "1Ti",
        "persistentVolumeClaims": "100"
      }
    },
    "namespaceDefaultResourceQuota": {
      "limit": {
        "requestsCpu": "4000m",
        "requestsMemory": "8Gi",
        "limitsCpu": "8000m",
        "limitsMemory": "16Gi"
      }
    }
  }' \
  "https://rancher.example.com/v3/projects/c-xxxxx:p-xxxxx"
```

## Step 5: Configure Vertical Pod Autoscaler

```yaml
# vpa.yaml - Requires VPA to be installed in the cluster
# Auto-adjust resource sizing based on usage
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
    updateMode: "Recreate"  # Off, Initial, Recreate, or InPlaceOrRecreate; Auto is deprecated
  resourcePolicy:
    containerPolicies:
      - containerName: web
        minAllowed:
          cpu: 100m
          memory: 128Mi
        maxAllowed:
          cpu: "2"
          memory: 2Gi
        controlledResources: ["cpu", "memory"]
```

## Step 6: Audit Resource Usage

```bash
# Find pods without resource requests
kubectl get pods --all-namespaces -o json | \
  jq -r '.items[] | select(any((.spec.containers[]?, .spec.initContainers[]?); .resources.requests == null)) |
    "\(.metadata.namespace)/\(.metadata.name)"'

# Check namespace quota usage
kubectl describe resourcequota -n production

# Find top resource consumers
kubectl top pod --all-namespaces \
  --sort-by=memory | head -20

# Check LimitRange in all namespaces
kubectl get limitrange --all-namespaces
```

## Step 7: Configure Quality of Service Classes

```yaml
# Guaranteed QoS - CPU and memory requests == limits for every container
# Least likely to be evicted under node pressure
resources:
  requests:
    cpu: 1000m
    memory: 1Gi
  limits:
    cpu: 1000m
    memory: 1Gi

# Burstable QoS - at least one CPU/memory request or limit is set, but the Pod is not Guaranteed
# Evicted after BestEffort under node pressure
resources:
  requests:
    cpu: 250m
    memory: 256Mi
  limits:
    cpu: 1000m
    memory: 1Gi

# BestEffort QoS - no CPU/memory requests or limits
# First to be evicted under node pressure
# Don't use in production
resources: {}
```

## Conclusion

Proper resource limit configuration is fundamental to a stable and efficient Rancher deployment. LimitRanges enforce sensible defaults preventing containers from running without resource constraints, while ResourceQuotas prevent namespace sprawl from consuming all cluster resources. Rancher's project-level quotas provide an additional governance layer for multi-team environments. Pair resource limits with the Vertical Pod Autoscaler to automatically right-size workloads based on actual consumption patterns.
