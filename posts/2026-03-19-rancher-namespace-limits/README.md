# How to Set Resource Limits on Namespaces in Rancher

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rancher, Kubernetes, Namespace, Resource Quota

Description: Learn how to configure resource limits on individual namespaces in Rancher to control resource consumption and prevent workload interference.

While project-level quotas control total resource consumption across a group of namespaces, namespace-level limits give you finer control over individual namespaces. This guide covers how to set, customize, and manage resource limits on namespaces within Rancher projects.

## Prerequisites

- Rancher v2.7+ with cluster owner or project owner access
- A project with at least one namespace
- Understanding of Kubernetes resource requests and limits

## Understanding Namespace Resource Limits

Namespace resource limits in Rancher come from two sources:

1. **Project namespace default limits**: When a project has quotas configured with namespace defaults, every new namespace in that project automatically receives a ResourceQuota.
2. **Per-namespace overrides**: You can customize the limits for individual namespaces within the project's total allocation.

Additionally, you can set **LimitRange** resources to control default and maximum resource allocations per container or pod within a namespace.

## Step 1: View Current Namespace Limits

Check what limits are currently applied to a namespace:

```bash
# View ResourceQuota in a namespace

kubectl get resourcequota -n <namespace-name> -o yaml

# View LimitRange in a namespace
kubectl get limitrange -n <namespace-name> -o yaml

# Summary view
kubectl describe resourcequota -n <namespace-name>
kubectl describe limitrange -n <namespace-name>
```

## Step 2: Set Namespace Limits via the Rancher UI

1. Navigate to your cluster in Rancher.
2. Go to **Cluster > Projects/Namespaces**.
3. Find the namespace you want to configure.
4. Click the three-dot menu and select **Edit Config**.
5. Under **Resource Limits**, configure the limits:
   - **CPU Reservation**: Total CPU requests allowed
   - **CPU Limit**: Total CPU limits allowed
   - **Memory Reservation**: Total memory requests allowed
   - **Memory Limit**: Total memory limits allowed
   - **Pods**: Maximum number of pods
6. Click **Save**.

## Step 3: Set Namespace Limits via kubectl

For a namespace in a Rancher project, set the project association and optional override on the Namespace object:

```yaml
apiVersion: v1
kind: Namespace
metadata:
  name: api-production
  annotations:
    field.cattle.io/projectId: c-m-abcde:p-vwxyz
    field.cattle.io/resourceQuota: '{"limit":{"pods":"50","requestsCpu":"8","requestsMemory":"16Gi","limitsCpu":"16","limitsMemory":"32Gi","configMaps":"50","persistentVolumeClaims":"10","secrets":"50","services":"20","servicesLoadBalancers":"2","servicesNodePorts":"5"}}'
```

```bash
kubectl apply -f namespace.yaml
```

Rancher only applies override values for resources that are already defined on the project's quota.

## Step 4: Set Container-Level Defaults with LimitRange

LimitRange objects set default resource requests and limits for containers that do not specify their own:

```yaml
apiVersion: v1
kind: LimitRange
metadata:
  name: container-defaults
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
        cpu: "2"
        memory: "4Gi"
      min:
        cpu: "50m"
        memory: "64Mi"
    - type: Pod
      max:
        cpu: "4"
        memory: "8Gi"
    - type: PersistentVolumeClaim
      max:
        storage: "50Gi"
      min:
        storage: "1Gi"
```

```bash
kubectl apply -f limitrange.yaml
```

This configuration:

- Sets default container limits to 500m CPU and 512Mi memory
- Sets default container requests to 100m CPU and 128Mi memory
- Caps any single container at 2 CPU and 4Gi memory
- Caps any single pod at 4 CPU and 8Gi memory
- Limits PVC sizes between 1Gi and 50Gi

## Step 5: Configure Default Container Resource Limits in Rancher

Rancher projects can set default container resource limits that apply to all namespaces:

1. Go to **Cluster > Projects/Namespaces**.
2. Click the three-dot menu on the project.
3. Select **Edit Config**.
4. Scroll to **Container Default Resource Limit**.
5. Configure:
   - **CPU Reservation**: Default CPU request per container
   - **CPU Limit**: Default CPU limit per container
   - **Memory Reservation**: Default memory request per container
   - **Memory Limit**: Default memory limit per container
6. Click **Save**.

Rancher creates LimitRange objects to enforce these defaults. Namespaces created after you set the project-level default inherit it automatically; existing namespaces need their container default resource limit updated separately.

## Step 6: Override Namespace Limits Within a Project

When one namespace needs more resources than the default:

```bash
# Run this against the Rancher management cluster
# Check the project's total quota and namespace default quota
kubectl --namespace <cluster-id> get projects.management.cattle.io <project-id> -o json | \
  jq '.spec | {
    projectLimit: .resourceQuota.limit,
    namespaceDefaultLimit: .namespaceDefaultResourceQuota.limit
  }'

# Check the current namespace override, if any
kubectl get namespace api-production -o json | \
  jq -r '.metadata.annotations["field.cattle.io/resourceQuota"] // "no override set"'
```

Then adjust the specific namespace's quota:

```bash
kubectl annotate namespace api-production \
  field.cattle.io/resourceQuota='{"limit":{"pods":"100","requestsCpu":"16","requestsMemory":"32Gi","limitsCpu":"32","limitsMemory":"64Gi"}}' \
  --overwrite
```

Make sure the override stays within the configured project limit and includes every resource you want Rancher to manage for that namespace.

## Step 7: Set Limits for Different Workload Types

A simple Rancher approach is to set different namespace overrides based on workload type:

**For high-traffic API namespaces:**

```yaml
apiVersion: v1
kind: Namespace
metadata:
  name: api-production
  annotations:
    field.cattle.io/projectId: c-m-abcde:p-vwxyz
    field.cattle.io/resourceQuota: '{"limit":{"pods":"100","requestsCpu":"16","requestsMemory":"32Gi","limitsCpu":"32","limitsMemory":"64Gi"}}'
```

**For batch processing namespaces:**

```yaml
apiVersion: v1
kind: Namespace
metadata:
  name: batch-processing
  annotations:
    field.cattle.io/projectId: c-m-abcde:p-vwxyz
    field.cattle.io/resourceQuota: '{"limit":{"pods":"20","requestsCpu":"32","requestsMemory":"64Gi","limitsCpu":"64","limitsMemory":"128Gi"}}'
```

Batch namespaces typically need fewer pods but more resources per pod.

## Step 8: Monitor Namespace Resource Usage

Track how namespaces use their allocated resources:

```bash
# Current usage vs limits
kubectl get resourcequota -n api-production -o json | \
  jq '.items[] | .status | {
    used: .used,
    hard: .hard
  }'

# Percentage usage
kubectl get resourcequota -n api-production -o json | \
  jq -r '
    def qty:
      if test("^[0-9]+(\\.[0-9]+)?m$") then sub("m$"; "") | tonumber / 1000
      elif test("^[0-9]+(\\.[0-9]+)?Ki$") then sub("Ki$"; "") | tonumber * 1024
      elif test("^[0-9]+(\\.[0-9]+)?Mi$") then sub("Mi$"; "") | tonumber * 1048576
      elif test("^[0-9]+(\\.[0-9]+)?Gi$") then sub("Gi$"; "") | tonumber * 1073741824
      elif test("^[0-9]+(\\.[0-9]+)?Ti$") then sub("Ti$"; "") | tonumber * 1099511627776
      elif test("^[0-9]+(\\.[0-9]+)?Pi$") then sub("Pi$"; "") | tonumber * 1125899906842624
      elif test("^[0-9]+(\\.[0-9]+)?Ei$") then sub("Ei$"; "") | tonumber * 1152921504606847000
      elif test("^[0-9]+(\\.[0-9]+)?$") then tonumber
      else null
      end;
    .items[].status as $status
    | $status.hard
    | to_entries[]
    | .key as $key
    | (.value | qty) as $hard
    | ($status.used[$key] | qty) as $used
    | select($hard != null and $used != null and $hard > 0)
    | "\($key): \((($used / $hard) * 10000 | round) / 100)% (\($status.used[$key])/\($status.hard[$key]))"
  '
```

For a visual overview, use Rancher's monitoring:

1. Navigate to the cluster.
2. Go to **Monitoring > Dashboards**.
3. Look for namespace-level resource usage dashboards.

## Step 9: Handle Resource Limit Issues

Common issues and solutions:

**Pods stuck in Pending due to quota:**

```bash
# Check if quota is exhausted
kubectl describe resourcequota -n <namespace>

# Find pods consuming the most resources
kubectl top pods -n <namespace> --sort-by=cpu
kubectl top pods -n <namespace> --sort-by=memory
```

**Pods rejected due to LimitRange:**

```bash
# Check the LimitRange constraints
kubectl describe limitrange -n <namespace>

# The error message will indicate which constraint was violated
# Adjust the pod spec or the LimitRange accordingly
```

**Quota not applied to new namespace:**

```bash
# Verify the namespace is in the correct project
kubectl get namespace <namespace> -o jsonpath='{.metadata.annotations.field\.cattle\.io/projectId}'
```

If the namespace was created outside the target project, recreate it with the correct `field.cattle.io/projectId` annotation. Rancher does not allow moving a namespace into a project that already has a resource quota configured.

## Step 10: Automate Namespace Limit Configuration

Use a script to apply consistent limits across namespaces:

```bash
#!/bin/bash
# apply-namespace-limits.sh

PROJECT_ID=$1
NAMESPACE=$2
TIER=${3:-standard}  # standard, high, or batch

case $TIER in
  standard)
    QUOTA='{"limit":{"pods":"50","requestsCpu":"4","requestsMemory":"8Gi","limitsCpu":"8","limitsMemory":"16Gi"}}'
    ;;
  high)
    QUOTA='{"limit":{"pods":"100","requestsCpu":"16","requestsMemory":"32Gi","limitsCpu":"32","limitsMemory":"64Gi"}}'
    ;;
  batch)
    QUOTA='{"limit":{"pods":"20","requestsCpu":"32","requestsMemory":"64Gi","limitsCpu":"64","limitsMemory":"128Gi"}}'
    ;;
esac

cat <<EOF | kubectl apply -f -
apiVersion: v1
kind: Namespace
metadata:
  name: ${NAMESPACE}
  annotations:
    field.cattle.io/projectId: ${PROJECT_ID}
    field.cattle.io/resourceQuota: '${QUOTA}'
EOF

echo "Applied $TIER limits to namespace $NAMESPACE in project $PROJECT_ID"
```

Usage:

```bash
./apply-namespace-limits.sh c-m-abcde:p-vwxyz api-production high
./apply-namespace-limits.sh c-m-abcde:p-vwxyz data-processing batch
./apply-namespace-limits.sh c-m-abcde:p-vwxyz frontend-staging standard
```

## Best Practices

- **Always set both requests and limits**: Resource quotas that only set limits without requests can lead to unpredictable scheduling.
- **Use LimitRange for defaults**: Ensure every container has resource requests and limits even if developers forget to set them.
- **Right-size over time**: Start with estimates and adjust based on actual monitoring data.
- **Set minimum resource requirements**: Use LimitRange `min` to prevent containers from requesting too few resources.
- **Cap individual containers**: Use LimitRange `max` to prevent any single container from consuming too many resources.
- **Monitor continuously**: Set up alerts for when namespaces approach their limits.

## Conclusion

Setting resource limits on namespaces in Rancher provides precise control over resource consumption at the namespace level. By combining ResourceQuotas for total namespace limits and LimitRanges for per-container defaults and bounds, you create a predictable resource environment. Start with project-level defaults, customize for specific namespaces, and monitor continuously to keep allocations aligned with actual needs.
