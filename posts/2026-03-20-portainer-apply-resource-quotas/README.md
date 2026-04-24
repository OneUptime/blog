# How to Apply Resource Quotas in Portainer - A Practical Guide

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Kubernetes, Resource Quota, Namespace, DevOps

Description: Learn how to configure resource quotas in Portainer's Kubernetes environments to prevent individual teams or applications from consuming excessive cluster resources.

## Introduction

Resource quotas in Kubernetes limit the total compute resources (CPU, memory) and object counts (pods, services, PVCs) that can be consumed within a namespace. Portainer provides a UI to configure namespace CPU and memory quotas, and `kubectl` gives you access to the broader Kubernetes `ResourceQuota` feature set.

## Prerequisites

- Portainer CE or BE with a Kubernetes environment
- Portainer admin access, or a role with permission to manage the target namespace
- Kubernetes cluster with multiple namespaces

## Understanding Resource Quotas

A ResourceQuota object in Kubernetes defines limits for:

- **Compute resources**: CPU requests/limits, memory requests/limits
- **Object counts**: Max pods, services, PVCs, configmaps, secrets
- **Storage**: Total PVC capacity, storage class limits
- **Priority classes**: Resource limits per priority class

## Step 1: Enable CPU and Memory Quotas in Portainer

### Via Portainer UI

1. Log into Portainer.
2. Select your Kubernetes environment.
3. Go to **Namespaces**.
4. Click on the target namespace or create a new one.
5. In the namespace settings, find the **Resource quota** section.
6. Enable the **Resource assignment** toggle.
7. Configure:
   - **CPU**: Total CPU cores limit (e.g., `4` cores)
   - **Memory**: Total memory limit (e.g., `8Gi`)
8. Click **Update namespace**. If you're creating a new namespace, click **Create namespace**.

Portainer creates or updates the ResourceQuota object automatically.

## Step 2: Create Resource Quotas via kubectl shell

For more granular control, use `kubectl` in Portainer's `kubectl shell`:

```yaml
# resource-quota-team.yaml - Team namespace quota

apiVersion: v1
kind: ResourceQuota
metadata:
  name: team-quota
  namespace: backend-team
spec:
  hard:
    # Compute resources
    requests.cpu: "4"          # Max total CPU requests
    requests.memory: 8Gi       # Max total memory requests
    limits.cpu: "8"            # Max total CPU limits
    limits.memory: 16Gi        # Max total memory limits

    # Object counts
    pods: "20"                 # Max number of pods
    services: "10"             # Max number of services
    persistentvolumeclaims: "5" # Max number of PVCs
    secrets: "20"              # Max number of secrets
    configmaps: "20"           # Max number of configmaps

    # Storage
    requests.storage: "100Gi"  # Max total storage requests
```

```bash
# Apply in kubectl shell
kubectl apply -f resource-quota-team.yaml
```

## Step 3: Set Default Resource Requests with LimitRange

If your quota covers CPU or memory, pods must specify requests or limits. Use LimitRange to set defaults:

```yaml
# limitrange-defaults.yaml
apiVersion: v1
kind: LimitRange
metadata:
  name: default-limits
  namespace: backend-team
spec:
  limits:
    - type: Container
      default:                  # Default limits if not specified
        cpu: "500m"
        memory: 256Mi
      defaultRequest:           # Default requests if not specified
        cpu: "100m"
        memory: 128Mi
      max:                      # Maximum per-container limits
        cpu: "2"
        memory: 2Gi
      min:                      # Minimum per-container requests
        cpu: "50m"
        memory: 64Mi
    - type: PersistentVolumeClaim
      max:
        storage: 20Gi           # Max PVC size
```

```bash
kubectl apply -f limitrange-defaults.yaml -n backend-team
```

## Step 4: Configure Quotas via the Portainer API

```bash
API_KEY="your-portainer-api-key"
ENDPOINT_ID=1
NAMESPACE="backend-team"

# Apply ResourceQuota via the Kubernetes API through Portainer's proxy
curl -s -X POST \
  -H "X-API-Key: $API_KEY" \
  -H "Content-Type: application/json" \
  "https://portainer.example.com/api/endpoints/${ENDPOINT_ID}/kubernetes/api/v1/namespaces/${NAMESPACE}/resourcequotas" \
  -d '{
    "apiVersion": "v1",
    "kind": "ResourceQuota",
    "metadata": {
      "name": "team-quota",
      "namespace": "backend-team"
    },
    "spec": {
      "hard": {
        "requests.cpu": "4",
        "requests.memory": "8Gi",
        "limits.cpu": "8",
        "limits.memory": "16Gi",
        "pods": "20"
      }
    }
  }' | jq .
```

## Step 5: Check Quota Usage

```bash
# Check quota usage in a namespace
kubectl describe quota -n backend-team

# Example output:
# Name:            team-quota
# Namespace:       backend-team
# Resource                Used    Hard
# --------                ----    ----
# limits.cpu              2       8
# limits.memory           4Gi     16Gi
# pods                    8       20
# requests.cpu            1       4
# requests.memory         2Gi     8Gi

# Check via Portainer API
curl -s -H "X-API-Key: $API_KEY" \
  "https://portainer.example.com/api/endpoints/${ENDPOINT_ID}/kubernetes/api/v1/namespaces/${NAMESPACE}/resourcequotas" | \
  jq .
```

## Step 6: Quota Enforcement in Action

When a workload exceeds the quota:

```bash
# Attempt to deploy more pods than allowed
for i in $(seq 1 21); do
  kubectl run test-pod-$i --image=nginx -n backend-team
done

# Error when quota exceeded:
# Error from server (Forbidden): pods "test-pod-21" is forbidden:
# exceeded quota: team-quota, requested: pods=1, used: pods=20, limited: pods=20
```

## Step 7: Namespace Templates with Quotas

Create a script to provision new team namespaces with standard quotas:

```bash
#!/bin/bash
# create-team-namespace.sh - Provision a new team namespace with quotas

set -euo pipefail

if [[ $# -lt 1 ]]; then
  echo "Usage: $0 <team-name> [cpu-cores] [memory-limit]"
  exit 1
fi

TEAM_NAME=$1
CPU_LIMIT="${2:-4}"
MEMORY_LIMIT="${3:-8Gi}"

if ! [[ "$CPU_LIMIT" =~ ^[0-9]+$ ]]; then
  echo "CPU limit must be a whole number of cores, for example: 4"
  exit 1
fi

if ! [[ "$MEMORY_LIMIT" =~ ^[0-9]+Gi$ ]]; then
  echo "Memory limit must use whole Gi units, for example: 8Gi"
  exit 1
fi

MEMORY_LIMIT_GI="${MEMORY_LIMIT%Gi}"

echo "Creating namespace for team: $TEAM_NAME"

kubectl create namespace "$TEAM_NAME"

cat << EOF | kubectl apply -f -
apiVersion: v1
kind: ResourceQuota
metadata:
  name: team-quota
  namespace: $TEAM_NAME
spec:
  hard:
    requests.cpu: "${CPU_LIMIT}"
    requests.memory: "${MEMORY_LIMIT}"
    limits.cpu: "$((CPU_LIMIT * 2))"
    limits.memory: "$((MEMORY_LIMIT_GI * 2))Gi"
    pods: "30"
    services: "15"
    persistentvolumeclaims: "10"
---
apiVersion: v1
kind: LimitRange
metadata:
  name: default-limits
  namespace: $TEAM_NAME
spec:
  limits:
    - type: Container
      default:
        cpu: "500m"
        memory: "256Mi"
      defaultRequest:
        cpu: "100m"
        memory: "128Mi"
EOF

echo "Namespace $TEAM_NAME created with quotas: CPU=$CPU_LIMIT, Memory=$MEMORY_LIMIT"
```

## Conclusion

Resource quotas in Portainer's Kubernetes environments ensure fair resource sharing between teams and prevent runaway workloads from consuming all cluster resources. Configure CPU and memory quotas through Portainer's UI, use `kubectl` when you need the full Kubernetes `ResourceQuota` feature set, use LimitRange to enforce per-container defaults, and script namespace provisioning to ensure every new team gets appropriate resource boundaries from day one.
