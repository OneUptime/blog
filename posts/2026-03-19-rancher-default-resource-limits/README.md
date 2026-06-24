# How to Configure Default Resource Limits per Namespace in Rancher

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rancher, Kubernetes, Namespace, Resource Quota

Description: Learn how to set default container resource limits per namespace in Rancher so every pod gets sensible defaults automatically.

When developers deploy workloads without specifying resource requests and limits, pods can consume unbounded resources and cause problems for other workloads. Rancher can manage project-level container defaults, and Kubernetes LimitRange objects can enforce namespace defaults so containers get sensible requests and limits. This guide shows how to set up and manage these defaults.

## Prerequisites

- Rancher v2.7+ with cluster owner or project owner access
- A project with namespaces
- Understanding of Kubernetes resource requests and limits

## Why Default Resource Limits Matter

Without default limits:

- A single pod can consume all available CPU or memory on a node.
- The Kubernetes scheduler cannot make informed placement decisions.
- CPU and memory resource quotas become harder to use because pods must declare the corresponding requests or limits, or admission may reject them.
- Noisy neighbor problems become common in shared clusters.

Kubernetes LimitRange objects solve this by automatically assigning default resource requests and limits to containers that do not specify them.

## Step 1: Configure Defaults at the Project Level

Rancher lets you set container defaults for a project. These defaults are propagated to namespaces created in the project after the setting is enabled.

**Via the Rancher UI:**

1. In the upper left corner, click **☰ > Cluster Management**.
2. On the **Clusters** page, go to your cluster and click **Explore**.
3. Go to **Cluster > Projects/Namespaces**.
4. Click the three-dot menu on the project.
5. Select **Edit Config**.
6. Scroll to **Container Default Resource Limit**.
7. Set the following:
   - **CPU Reservation**: `100m` (the default CPU request)
   - **CPU Limit**: `500m` (the default CPU limit)
   - **Memory Reservation**: `128Mi` (the default memory request)
   - **Memory Limit**: `512Mi` (the default memory limit)
8. Click **Save**.

Rancher propagates this setting to namespaces created after the project is updated. Existing namespaces need the setting configured individually, and a Kubernetes LimitRange is what enforces admission-time defaults for pods created without explicit resources.

## Step 2: Configure Defaults via Terraform

```hcl
resource "rancher2_project" "backend" {
  name       = "backend-services"
  cluster_id = rancher2_cluster.production.id

  container_resource_limit {
    limits_cpu      = "500m"
    limits_memory   = "512Mi"
    requests_cpu    = "100m"
    requests_memory = "128Mi"
  }

  resource_quota {
    project_limit {
      pods            = "200"
      requests_cpu    = "16000m"
      requests_memory = "32Gi"
    }
    namespace_default_limit {
      pods            = "50"
      requests_cpu    = "4000m"
      requests_memory = "8Gi"
    }
  }
}
```

As with the Rancher UI, these project-level container defaults are propagated to newly created namespaces rather than injected into every Pod.

## Step 3: Configure Defaults per Namespace with LimitRange

For admission-time defaulting and enforcement, create a LimitRange directly in a namespace:

```yaml
apiVersion: v1
kind: LimitRange
metadata:
  name: default-limits
  namespace: api-production
spec:
  limits:
    - type: Container
      default:
        cpu: "500m"
        memory: "512Mi"
      defaultRequest:
        cpu: "100m"
        memory: "128Mi"
      max:
        cpu: "4"
        memory: "8Gi"
      min:
        cpu: "50m"
        memory: "32Mi"
```

```bash
kubectl apply -f limitrange.yaml
```

This LimitRange does four things:

- **default**: Sets the CPU and memory limit if not specified by the container.
- **defaultRequest**: Sets the CPU and memory request if not specified.
- **max**: Caps the maximum resources any container can declare.
- **min**: Sets the minimum resources any container can declare.

## Step 4: Configure Different Defaults for Different Namespaces

Different workload types need different defaults. Set up tiered defaults:

**Web application namespaces:**

```yaml
apiVersion: v1
kind: LimitRange
metadata:
  name: web-defaults
  namespace: web-production
spec:
  limits:
    - type: Container
      default:
        cpu: "250m"
        memory: "256Mi"
      defaultRequest:
        cpu: "100m"
        memory: "128Mi"
      max:
        cpu: "2"
        memory: "2Gi"
```

**Data processing namespaces:**

```yaml
apiVersion: v1
kind: LimitRange
metadata:
  name: data-defaults
  namespace: data-processing
spec:
  limits:
    - type: Container
      default:
        cpu: "1"
        memory: "2Gi"
      defaultRequest:
        cpu: "500m"
        memory: "1Gi"
      max:
        cpu: "8"
        memory: "32Gi"
```

**Development namespaces:**

```yaml
apiVersion: v1
kind: LimitRange
metadata:
  name: dev-defaults
  namespace: development
spec:
  limits:
    - type: Container
      default:
        cpu: "200m"
        memory: "256Mi"
      defaultRequest:
        cpu: "50m"
        memory: "64Mi"
      max:
        cpu: "1"
        memory: "1Gi"
```

## Step 5: Verify Default Limits Are Applied

Deploy a pod without resource specifications and check if the LimitRange defaults are applied:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: test-defaults
  namespace: api-production
spec:
  containers:
    - name: test
      image: nginx
      # No resources specified - defaults should be applied
```

```bash
kubectl apply -f test-pod.yaml

# Check what resources were assigned

kubectl get pod test-defaults -n api-production -o json | \
  jq '.spec.containers[0].resources'
```

Expected output:

```json
{
  "limits": {
    "cpu": "500m",
    "memory": "512Mi"
  },
  "requests": {
    "cpu": "100m",
    "memory": "128Mi"
  }
}
```

Clean up:

```bash
kubectl delete pod test-defaults -n api-production
```

## Step 6: Set Pod-Level Limits

In addition to container limits, set pod-level maximums:

```yaml
apiVersion: v1
kind: LimitRange
metadata:
  name: pod-limits
  namespace: api-production
spec:
  limits:
    - type: Pod
      max:
        cpu: "8"
        memory: "16Gi"
    - type: Container
      default:
        cpu: "500m"
        memory: "512Mi"
      defaultRequest:
        cpu: "100m"
        memory: "128Mi"
      max:
        cpu: "4"
        memory: "8Gi"
      min:
        cpu: "50m"
        memory: "32Mi"
```

The pod-level max ensures that even a pod with multiple containers cannot exceed 8 CPU and 16Gi memory total.

## Step 7: Set PVC Size Limits

Control persistent volume claim sizes:

```yaml
apiVersion: v1
kind: LimitRange
metadata:
  name: storage-limits
  namespace: api-production
spec:
  limits:
    - type: PersistentVolumeClaim
      max:
        storage: "100Gi"
      min:
        storage: "1Gi"
```

## Step 8: Apply Defaults Across All Namespaces

Use a script to apply consistent defaults across all namespaces in a project:

```bash
#!/bin/bash
# apply-default-limits.sh

CLUSTER_ID="c-m-xxxxx"
PROJECT_ID="p-xxxxx"

# Get all namespaces in the project
NAMESPACES=$(kubectl get namespaces -o json | \
  jq -r ".items[] | select(.metadata.annotations[\"field.cattle.io/projectId\"] == \"${CLUSTER_ID}:${PROJECT_ID}\") | .metadata.name")

for ns in $NAMESPACES; do
  echo "Applying default limits to namespace: $ns"

  cat <<EOF | kubectl apply -f -
apiVersion: v1
kind: LimitRange
metadata:
  name: default-limits
  namespace: $ns
spec:
  limits:
    - type: Container
      default:
        cpu: "500m"
        memory: "512Mi"
      defaultRequest:
        cpu: "100m"
        memory: "128Mi"
      max:
        cpu: "4"
        memory: "8Gi"
      min:
        cpu: "50m"
        memory: "32Mi"
    - type: Pod
      max:
        cpu: "8"
        memory: "16Gi"
EOF

  echo "  Done."
done
```

## Step 9: Monitor the Impact of Default Limits

After setting defaults, monitor whether they are appropriate:

```bash
# Check current CPU usage
kubectl top pods -n api-production --sort-by=cpu

# Check current memory usage
kubectl top pods -n api-production --sort-by=memory

# Check for pods with OOMKilled containers
kubectl get pods -n api-production -o json | \
  jq -r '.items[] | select(any(.status.containerStatuses[]?; .lastState.terminated.reason == "OOMKilled" or .state.terminated.reason == "OOMKilled")) | .metadata.name'

# Check for pods that cannot be scheduled
kubectl get events -n api-production --field-selector reason=FailedScheduling
```

These `kubectl top` commands require Metrics Server or another metrics pipeline that serves the Kubernetes metrics API.

If memory usage is consistently high or pods are frequently OOMKilled, the default memory limit may be too low. If pods cannot be scheduled, the default requests may be too high for the available cluster capacity.

## Step 10: Update Default Limits

To change defaults for a namespace:

```bash
kubectl edit limitrange default-limits -n api-production
```

Or replace the LimitRange:

```bash
kubectl apply -f updated-limitrange.yaml
```

Changes apply only to new pods. Existing pods keep their current resource settings. To apply new defaults to existing workloads managed by Deployments, restart the deployments:

```bash
kubectl rollout restart deployment -n api-production
```

## Best Practices

- **Always set defaults**: Every namespace should have a LimitRange to prevent unbounded resource consumption.
- **Set requests lower than limits**: Allow containers to burst above their requests up to their limits.
- **Set reasonable maximums**: Use max constraints to prevent any single container from requesting too many resources.
- **Match defaults to workload type**: Web servers, batch jobs, and databases have very different resource profiles.
- **Monitor and adjust**: Default limits are starting points. Adjust them based on actual usage patterns.
- **Coordinate with quotas**: Ensure LimitRange defaults are compatible with namespace and project ResourceQuotas.
- **Document your defaults**: Maintain documentation of what defaults are set for each namespace and why.

## Conclusion

Default resource policies per namespace help ensure that containers in your Rancher-managed clusters have appropriate resource constraints, even when developers do not specify them. Rancher project settings can pre-populate defaults during workload creation, while Kubernetes LimitRange objects enforce namespace-level defaults at admission time. Tune your defaults based on monitoring data and adjust them as workload patterns change.
