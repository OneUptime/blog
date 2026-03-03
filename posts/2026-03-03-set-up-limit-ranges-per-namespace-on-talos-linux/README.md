# How to Set Up Limit Ranges per Namespace on Talos Linux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Kubernetes, Limit Ranges, Resource Management, Namespace

Description: Learn how to configure LimitRange objects per namespace on Talos Linux to set default resource requests, limits, and constraints for containers and pods.

---

Resource quotas control the total resources a namespace can consume, but they do not say anything about individual pods or containers. A namespace with a 16-core CPU quota could have one pod requesting all 16 cores, leaving nothing for the rest. Limit ranges solve this by setting per-pod and per-container constraints, including default resource requests and limits for containers that do not specify their own.

On a Talos Linux cluster, limit ranges are essential for preventing poorly configured deployments from causing problems. This post covers how to set up and manage limit ranges across your namespaces.

## What Limit Ranges Control

A LimitRange object can set several types of constraints within a namespace.

**Default values** are applied to containers that do not specify their own resource requests or limits. This ensures every container has at least some resource specification, which helps the scheduler make good placement decisions.

**Minimum and maximum values** restrict how small or large a container's resource specification can be. This prevents someone from requesting 64 cores for a single container when they should be scaling horizontally.

**Default request-to-limit ratios** control the relationship between requests and limits, preventing extreme overcommitment at the container level.

## Creating a Basic Limit Range

Here is a limit range that sets sensible defaults for a typical namespace.

```yaml
# limit-range-basic.yaml
apiVersion: v1
kind: LimitRange
metadata:
  name: default-limits
  namespace: team-backend
spec:
  limits:
    - type: Container
      # Default limits applied when none specified
      default:
        cpu: 500m
        memory: 512Mi
      # Default requests applied when none specified
      defaultRequest:
        cpu: 100m
        memory: 128Mi
      # Maximum any single container can request
      max:
        cpu: "4"
        memory: 8Gi
      # Minimum any container must request
      min:
        cpu: 50m
        memory: 64Mi
```

```bash
kubectl apply -f limit-range-basic.yaml
```

After applying this limit range, any container created in the team-backend namespace without resource specifications will automatically get 100m CPU request, 500m CPU limit, 128Mi memory request, and 512Mi memory limit.

## Testing the Defaults

Create a pod without specifying resources and check what gets applied.

```bash
# Create a pod without resource specs
kubectl -n team-backend run test-defaults --image=nginx

# Check what resources were assigned
kubectl -n team-backend get pod test-defaults -o yaml | grep -A 10 resources

# Expected output:
# resources:
#   limits:
#     cpu: 500m
#     memory: 512Mi
#   requests:
#     cpu: 100m
#     memory: 128Mi

# Clean up
kubectl -n team-backend delete pod test-defaults
```

## Pod-Level Limit Ranges

In addition to container-level limits, you can set constraints at the pod level. Pod-level limits apply to the sum of all containers in the pod.

```yaml
# limit-range-pod.yaml
apiVersion: v1
kind: LimitRange
metadata:
  name: pod-limits
  namespace: team-backend
spec:
  limits:
    - type: Pod
      # Maximum total resources for all containers in a pod
      max:
        cpu: "8"
        memory: 16Gi
      # Minimum total resources for a pod
      min:
        cpu: 100m
        memory: 128Mi
```

This prevents a single pod with many containers from consuming too many resources. Even if each container is within the container limit, the pod as a whole is capped.

## PVC Limit Ranges

You can also limit the size of persistent volume claims within a namespace.

```yaml
# limit-range-storage.yaml
apiVersion: v1
kind: LimitRange
metadata:
  name: storage-limits
  namespace: team-backend
spec:
  limits:
    - type: PersistentVolumeClaim
      # Maximum PVC size
      max:
        storage: 100Gi
      # Minimum PVC size
      min:
        storage: 1Gi
```

This prevents someone from creating a 1TB PVC in a namespace that should only use moderate amounts of storage. It works alongside resource quotas, which control the total storage across all PVCs.

## Different Limit Ranges for Different Namespaces

Different teams and workloads need different limits. A machine learning team needs more memory per container than a web application team. Set limit ranges appropriate for each namespace.

```yaml
# Web application namespace - smaller containers
apiVersion: v1
kind: LimitRange
metadata:
  name: web-app-limits
  namespace: web-apps
spec:
  limits:
    - type: Container
      default:
        cpu: 250m
        memory: 256Mi
      defaultRequest:
        cpu: 50m
        memory: 64Mi
      max:
        cpu: "2"
        memory: 2Gi
      min:
        cpu: 25m
        memory: 32Mi
---
# Data processing namespace - larger containers
apiVersion: v1
kind: LimitRange
metadata:
  name: data-processing-limits
  namespace: data-processing
spec:
  limits:
    - type: Container
      default:
        cpu: "2"
        memory: 4Gi
      defaultRequest:
        cpu: 500m
        memory: 1Gi
      max:
        cpu: "16"
        memory: 64Gi
      min:
        cpu: 100m
        memory: 256Mi
```

## Interaction with Resource Quotas

Limit ranges and resource quotas work together. Resource quotas set the total for the namespace. Limit ranges set the constraints for individual objects.

When both are active and a compute resource quota is defined, every pod must specify resource requests and limits (either explicitly or through limit range defaults). If the limit range provides defaults, pods without explicit specifications will use those defaults and count against the quota.

```yaml
# A complete namespace setup with both quotas and limits
# Step 1: Resource Quota
apiVersion: v1
kind: ResourceQuota
metadata:
  name: compute-quota
  namespace: team-backend
spec:
  hard:
    requests.cpu: "16"
    limits.cpu: "32"
    requests.memory: 32Gi
    limits.memory: 64Gi
    pods: "100"
---
# Step 2: Limit Range
apiVersion: v1
kind: LimitRange
metadata:
  name: container-limits
  namespace: team-backend
spec:
  limits:
    - type: Container
      default:
        cpu: 500m
        memory: 512Mi
      defaultRequest:
        cpu: 100m
        memory: 128Mi
      max:
        cpu: "4"
        memory: 8Gi
      min:
        cpu: 50m
        memory: 64Mi
```

With these settings, you can have at most 100 pods in the namespace. Each container defaults to 100m/500m CPU request/limit and 128Mi/512Mi memory request/limit. No single container can exceed 4 CPU cores or 8Gi memory. The total across all pods cannot exceed 16 CPU request cores or 32Gi memory requests.

## Handling Violations

When a pod specification violates a limit range, the creation is rejected with a clear error message.

```bash
# Try to create a container that exceeds the max CPU
kubectl -n team-backend run too-big --image=nginx \
  --overrides='{"spec":{"containers":[{"name":"too-big","image":"nginx","resources":{"requests":{"cpu":"8"},"limits":{"cpu":"8"}}}]}}'

# Error: pods "too-big" is forbidden: maximum cpu usage per Container is 4, but limit is 8
```

```bash
# Try to create a container below the minimum
kubectl -n team-backend run too-small --image=nginx \
  --overrides='{"spec":{"containers":[{"name":"too-small","image":"nginx","resources":{"requests":{"cpu":"10m"},"limits":{"cpu":"20m"}}}]}}'

# Error: pods "too-small" is forbidden: minimum cpu usage per Container is 50m, but request is 10m
```

## Updating Limit Ranges

Updating a limit range affects only new pods. Existing pods are not modified or evicted. If you need to enforce new limits on existing pods, you need to restart them.

```bash
# Update the limit range
kubectl -n team-backend apply -f updated-limit-range.yaml

# Existing pods continue with their current settings
# Only new pods will use the updated limits

# To apply new defaults to existing deployments, restart them
kubectl -n team-backend rollout restart deployment my-app
```

## Monitoring Limit Range Effectiveness

Track how often pods use default values versus specifying their own. This tells you how much the limit range defaults are being relied upon.

```bash
# Find pods using default resource values
# These will match the limit range defaults exactly
kubectl -n team-backend get pods -o json | \
  jq '.items[] | select(.spec.containers[].resources.requests.cpu == "100m") | .metadata.name'
```

If most pods are using defaults, it might mean teams are not setting resources intentionally, which could lead to poor scheduling decisions. Encourage teams to specify resources that match their actual needs rather than relying on defaults.

## Automation Script

Apply standard limit ranges to all team namespaces:

```bash
#!/bin/bash
# apply-limit-ranges.sh
# Apply standard limit ranges to all team namespaces

NAMESPACES=$(kubectl get namespaces -l type=team -o jsonpath='{.items[*].metadata.name}')

for ns in $NAMESPACES; do
  echo "Applying limit range to $ns..."
  kubectl -n "$ns" apply -f - <<EOF
apiVersion: v1
kind: LimitRange
metadata:
  name: standard-limits
spec:
  limits:
    - type: Container
      default:
        cpu: 500m
        memory: 512Mi
      defaultRequest:
        cpu: 100m
        memory: 128Mi
      max:
        cpu: "4"
        memory: 8Gi
      min:
        cpu: 50m
        memory: 64Mi
    - type: Pod
      max:
        cpu: "8"
        memory: 16Gi
    - type: PersistentVolumeClaim
      max:
        storage: 100Gi
      min:
        storage: 1Gi
EOF
done

echo "Limit ranges applied to all team namespaces."
```

## Conclusion

Limit ranges on Talos Linux clusters fill the gap between resource quotas (which control namespace totals) and pod specifications (which control individual containers). They provide sensible defaults for containers that do not specify resources, prevent any single container from claiming excessive resources, and enforce minimum allocations. Set up limit ranges when you create a namespace, tailor them to the workload profile of each team, and combine them with resource quotas for complete resource governance. This combination ensures that your shared Talos cluster remains stable and fair for all teams.
