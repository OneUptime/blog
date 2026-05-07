# How to Set Resource Quotas for Projects in Rancher

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rancher, Kubernetes, Project, Resource Quota, Namespace

Description: A practical guide to configuring resource quotas for Rancher projects to control CPU, memory, and object consumption across namespaces.

Resource quotas in Rancher projects prevent any single team from consuming more than their fair share of cluster resources. When you set a project-level quota, Rancher enforces the overall project limit and propagates the namespace default limit to the project's namespaces. This guide shows how to configure project resource quotas effectively.

## Prerequisites

- Rancher v2.7+ with cluster owner or administrator access
- At least one project in a managed cluster
- Understanding of your cluster's total resource capacity

## Understanding Project Quotas in Rancher

Rancher's project resource quotas work at two levels:

1. **Project Limit**: The total resources the entire project can consume across all its namespaces.
2. **Namespace Default Limit**: The default quota applied to each new namespace created within the project.

When you create a namespace in a project with quotas, Rancher automatically creates a Kubernetes ResourceQuota object in that namespace based on the namespace default limit.

## Step 1: Plan Your Quota Allocation

Before configuring quotas, calculate how to distribute cluster resources:

```bash
# Check total cluster capacity

kubectl describe nodes | grep -A 5 "Capacity:"

# Check current resource usage (requires Metrics Server)
kubectl top node

# Summarize allocatable resources
kubectl get nodes -o json | \
  jq 'def cpu_to_m:
        if endswith("m") then sub("m$"; "") | tonumber else tonumber * 1000 end;
      def mem_to_ki:
        if endswith("Ki") then sub("Ki$"; "") | tonumber
        elif endswith("Mi") then sub("Mi$"; "") | tonumber * 1024
        elif endswith("Gi") then sub("Gi$"; "") | tonumber * 1024 * 1024
        else tonumber
        end;
      {
    totalCpuMillicores: ([.items[].status.allocatable.cpu | cpu_to_m] | add),
    totalMemoryKi: ([.items[].status.allocatable.memory | mem_to_ki] | add)
  }'
```

A common approach is to reserve 20% of cluster resources for system workloads and distribute the remaining 80% across projects based on team needs.

## Step 2: Set Quotas via the Rancher UI

1. Navigate to your cluster.
2. Go to **Cluster > Projects/Namespaces**.
3. Find the project and click the three-dot menu.
4. Select **Edit Config**.
5. Scroll to **Resource Quotas**.
6. Click **Add Resource** for each resource type you want to limit:
   - **CPU Reservation**: Total CPU requests the project can make
   - **CPU Limit**: Total CPU limits across the project
   - **Memory Reservation**: Total memory requests
   - **Memory Limit**: Total memory limits
   - **Pods**: Maximum number of pods
   - **Services**: Maximum number of services
   - **ConfigMaps**: Maximum number of configmaps
   - **PersistentVolumeClaims**: Maximum number of PVCs
   - **Secrets**: Maximum number of secrets

7. For each resource, set:
   - **Project Limit**: The total for the entire project
   - **Namespace Default Limit**: The default per namespace

8. Click **Save**.

## Step 3: Set Quotas via kubectl

Run this against the Rancher management cluster. `Project` resources live there, even for managed downstream clusters.

```yaml
apiVersion: management.cattle.io/v3
kind: Project
metadata:
  name: p-xxxxx
  namespace: c-m-xxxxx
spec:
  displayName: backend-services
  clusterName: c-m-xxxxx
  resourceQuota:
    limit:
      pods: "500"
      requestsCpu: "32000m"
      requestsMemory: "64Gi"
      limitsCpu: "64000m"
      limitsMemory: "128Gi"
      configMaps: "200"
      persistentVolumeClaims: "50"
      replicationControllers: "100"
      secrets: "200"
      services: "100"
      servicesLoadBalancers: "5"
      servicesNodePorts: "10"
    usedLimit: {}
  namespaceDefaultResourceQuota:
    limit:
      pods: "100"
      requestsCpu: "8000m"
      requestsMemory: "16Gi"
      limitsCpu: "16000m"
      limitsMemory: "32Gi"
      configMaps: "50"
      persistentVolumeClaims: "10"
      secrets: "50"
      services: "20"
```

```bash
kubectl apply -f project-quota.yaml
```

## Step 4: Set Quotas via Terraform

```hcl
resource "rancher2_project" "backend" {
  name       = "backend-services"
  cluster_id = rancher2_cluster.production.id

  resource_quota {
    project_limit {
      pods               = "500"
      requests_cpu       = "32000m"
      requests_memory    = "64Gi"
      limits_cpu         = "64000m"
      limits_memory      = "128Gi"
      config_maps        = "200"
      persistent_volume_claims = "50"
      secrets            = "200"
      services           = "100"
      services_load_balancers = "5"
      services_node_ports = "10"
    }
    namespace_default_limit {
      pods               = "100"
      requests_cpu       = "8000m"
      requests_memory    = "16Gi"
      limits_cpu         = "16000m"
      limits_memory      = "32Gi"
      config_maps        = "50"
      persistent_volume_claims = "10"
      secrets            = "50"
      services           = "20"
    }
  }
}
```

## Step 5: Override Namespace Default Limits

When a namespace needs more resources than the default, override the quota for that specific namespace:

1. Go to **Cluster > Projects/Namespaces**.
2. Find the namespace within the project.
3. Click the three-dot menu and select **Edit Config**.
4. Modify the resource limits for this specific namespace.
5. Click **Save**.

The namespace limits must stay within the configured project limits.

Via kubectl, edit the ResourceQuota in the namespace directly:

```bash
kubectl edit resourcequota/<quota-name> -n <namespace-name>
```

## Step 6: Monitor Quota Usage

Track how much of each project's quota is being used:

**Via the UI:**

1. Go to **Cluster > Projects/Namespaces**.
2. The project view shows quota usage bars for each resource type.

**Via kubectl:**

```bash
# Check quota usage for a specific namespace
kubectl describe resourcequota -n <namespace-name>

# Check quota usage across all namespaces in a project
PROJECT_NAMESPACES=$(kubectl get namespaces -o json | \
  jq -r '.items[] | select(.metadata.annotations["field.cattle.io/projectId"] == "c-m-xxxxx:p-xxxxx") | .metadata.name')

for ns in $PROJECT_NAMESPACES; do
  echo "=== Namespace: $ns ==="
  kubectl describe resourcequota -n $ns 2>/dev/null || echo "  No quota set"
  echo ""
done
```

## Step 7: Handle Quota Violations

When a team hits their quota, they will see errors like:

```plaintext
Error from server (Forbidden): pods "my-pod" is forbidden: exceeded quota:
default-xxxxx, requested: pods=1, used: pods=100, limited: pods=100
```

Options for handling this:

1. **Increase the namespace quota** if the project has headroom.
2. **Increase the project quota** if the cluster has capacity.
3. **Help the team optimize** by identifying unused resources.

```bash
# Find pods that are not Running or Pending and may be candidates for cleanup
kubectl get pods -n <namespace-name> --field-selector=status.phase!=Running,status.phase!=Pending

# Find deployments scaled to zero that may be candidates for cleanup
kubectl get deployments -n <namespace-name> -o json | \
  jq '.items[] | select(.spec.replicas == 0) | .metadata.name'
```

## Step 8: Set Up Quota Alerts

Create alerts when quota usage is high:

```yaml
# PrometheusRule for quota alerts
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: quota-alerts
  namespace: cattle-monitoring-system
spec:
  groups:
    - name: quota
      rules:
        - alert: ResourceQuotaUsageHigh
          expr: |
            kube_resourcequota{type="used"} / ignoring(type) kube_resourcequota{type="hard"} > 0.8
          for: 10m
          labels:
            severity: warning
          annotations:
            summary: "Resource quota usage is above 80%"
            description: "Namespace {{ $labels.namespace }} is using more than 80% of its {{ $labels.resource }} quota."
        - alert: ResourceQuotaUsageCritical
          expr: |
            kube_resourcequota{type="used"} / ignoring(type) kube_resourcequota{type="hard"} > 0.95
          for: 5m
          labels:
            severity: critical
          annotations:
            summary: "Resource quota usage is above 95%"
```

## Step 9: Adjust Quotas Over Time

Regularly review and adjust quotas based on actual usage:

```bash
#!/bin/bash
# quota-review.sh - Generate a quota utilization report

echo "=== Project Quota Utilization Report ==="
echo "Date: $(date)"
echo ""

for ns in $(kubectl get namespaces -o jsonpath='{.items[*].metadata.name}'); do
  quotas=$(kubectl get resourcequota -n $ns -o json 2>/dev/null | jq '.items | length')
  if [ "$quotas" -gt 0 ]; then
    echo "Namespace: $ns"
    kubectl get resourcequota -n $ns -o json | \
      jq -r '.items[].status | to_entries[] | select(.key == "used" or .key == "hard") | .value | to_entries[] | "\(.key): \(.value)"' | \
      sort | paste - - | column -t
    echo ""
  fi
done
```

## Best Practices

- **Always set quotas**: Every project should have resource quotas to prevent any team from consuming unlimited resources.
- **Set namespace defaults**: Configure namespace default limits so that new namespaces automatically get quotas.
- **Leave headroom**: Do not allocate 100% of cluster resources. Leave 10-20% for system overhead and burst capacity.
- **Use requests and limits**: Set both CPU/memory requests and limits to enable proper scheduling and cap resource usage. If you set CPU or memory quotas, make sure workloads define the matching fields or set container default resource limits in Rancher.
- **Monitor usage**: Regularly check quota utilization and adjust based on actual consumption patterns.
- **Communicate limits**: Make sure teams know their quotas and how to request increases.
- **Automate reviews**: Script quarterly quota reviews to ensure allocations match actual needs.

## Conclusion

Resource quotas for Rancher projects are essential for fair resource distribution in multi-team Kubernetes environments. By setting project-level limits, configuring namespace defaults, monitoring usage, and adjusting allocations over time, you ensure that every team has the resources they need without risking cluster stability. Start with conservative quotas and adjust based on real usage data.
