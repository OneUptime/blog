# How to Use Resource Idle Detection for Waste Identification

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Resource Optimization, Cost Management, Waste Detection, Efficiency

Description: Implement automated idle resource detection to identify unused workloads, abandoned PVCs, and zombie services draining your cloud budget.

---

Idle resources are the silent budget killers in Kubernetes clusters. Deployments scaled to zero still claim PVCs. Load balancers attached to deleted services continue charging hourly fees. Test namespaces accumulate orphaned resources. Systematic idle detection recovers 20-40% wasted spend in most clusters.

## Defining Idle Resources

Idle resources consume costs without delivering value. Common examples include:

**Zero-replica deployments** with attached persistent volumes or services consuming load balancer IPs.

**Unattached persistent volumes** that no pod currently mounts but continue incurring storage costs.

**Unused services** especially LoadBalancer type services with no backend pods.

**Zombie workloads** with pods that have not restarted in months and show zero CPU/memory usage.

**Orphaned cloud resources** like EBS volumes or load balancers created by Kubernetes but not cleaned up after deletion.

Each category requires different detection strategies.

## Detecting Zero-Replica Workloads

Find deployments and statefulsets scaled to zero that still hold resources:

```bash
# Find zero-replica deployments with PVCs
kubectl get deploy --all-namespaces -o json | \
  jq -r '.items[] |
    select(.spec.replicas == 0) |
    [.metadata.namespace, .metadata.name, .spec.replicas] |
    @tsv'

# Check for associated PVCs
kubectl get pvc --all-namespaces -o json | \
  jq -r '.items[] |
    select(.spec.volumeName != null) |
    [.metadata.namespace, .metadata.name, .spec.resources.requests.storage] |
    @tsv'
```

Cross-reference these lists to find zero-replica workloads with active PVCs.

Create a monitoring query:

```promql
# Deployments at zero replicas with PVCs
count by (namespace, deployment) (
  kube_deployment_spec_replicas{replicas="0"} *
  on(namespace) group_left
  kube_persistentvolumeclaim_info
)
```

## Identifying Unattached Persistent Volumes

Find PVCs not mounted by any running pod:

```bash
#!/bin/bash
# find-orphaned-pvcs.sh

# Get all PVCs
kubectl get pvc --all-namespaces -o json > /tmp/pvcs.json

# Get all mounted volumes
kubectl get pods --all-namespaces -o json | \
  jq -r '.items[].spec.volumes[]?.persistentVolumeClaim.claimName' | \
  sort -u > /tmp/mounted-pvcs.txt

# Find unattached PVCs
jq -r '.items[] | [.metadata.namespace, .metadata.name] | @tsv' /tmp/pvcs.json | \
  while read namespace pvc; do
    if ! grep -q "^$pvc$" /tmp/mounted-pvcs.txt; then
      size=$(kubectl get pvc -n $namespace $pvc -o jsonpath='{.spec.resources.requests.storage}')
      echo "$namespace/$pvc - $size - UNATTACHED"
    fi
  done
```

Run this weekly to identify accumulating orphaned volumes.

For automated detection:

```promql
# PVCs not mounted by any pod
(
  count by (namespace, persistentvolumeclaim) (kube_persistentvolumeclaim_info)
  unless
  count by (namespace, persistentvolumeclaim) (kube_pod_spec_volumes_persistentvolumeclaims_info)
)
```

## Finding Unused Load Balancers

LoadBalancer services without backing pods waste money on cloud load balancer charges:

```bash
# Find LoadBalancer services
kubectl get svc --all-namespaces --field-selector spec.type=LoadBalancer -o json | \
  jq -r '.items[] | [.metadata.namespace, .metadata.name, .spec.selector] | @tsv' | \
  while read namespace svc selector; do
    # Check if any pods match the selector
    pod_count=$(kubectl get pods -n $namespace -l "$selector" --no-headers | wc -l)
    if [ $pod_count -eq 0 ]; then
      echo "$namespace/$svc has no backend pods"
    fi
  done
```

Monitor with Prometheus:

```promql
# LoadBalancer services with zero endpoints
(
  count by (namespace, service) (kube_service_info{type="LoadBalancer"})
  unless
  count by (namespace, service) (kube_endpoint_address_available > 0)
)
```

Each orphaned LoadBalancer typically costs $15-20 per month per cloud provider.

## Detecting Zombie Workloads

Find workloads with pods running but consuming no CPU for extended periods:

```promql
# Pods with zero CPU usage for 7 days
(
  avg_over_time(
    rate(container_cpu_usage_seconds_total{container!="POD",container!=""}[5m])[7d:]
  ) == 0
)
```

This identifies containers running but doing nothing. Common causes:
- Test deployments never cleaned up
- Sidecars for deleted applications
- Broken applications in crash loops with long restart delays

Find pods that have not restarted in months:

```bash
kubectl get pods --all-namespaces -o json | \
  jq -r '.items[] |
    select(.status.containerStatuses[0].restartCount == 0) |
    select(.status.startTime | fromdateiso8601 < (now - (90 * 86400))) |
    [.metadata.namespace, .metadata.name, .status.startTime] |
    @tsv'
```

Workloads unchanged for 90+ days warrant investigation.

## Identifying Abandoned Namespaces

Detect namespaces with resources but no activity:

```bash
#!/bin/bash
# find-idle-namespaces.sh

for ns in $(kubectl get ns -o jsonpath='{.items[*].metadata.name}'); do
  # Count pods
  pod_count=$(kubectl get pods -n $ns --no-headers 2>/dev/null | wc -l)

  # Count PVCs
  pvc_count=$(kubectl get pvc -n $ns --no-headers 2>/dev/null | wc -l)

  # Check recent events
  recent_events=$(kubectl get events -n $ns --field-selector type=Normal \
    --sort-by='.lastTimestamp' 2>/dev/null | \
    grep -v "LAST SEEN" | head -1)

  if [ $pod_count -eq 0 ] && [ $pvc_count -gt 0 ]; then
    echo "Namespace $ns has $pvc_count PVCs but no pods"
  fi
done
```

Combine multiple signals for confidence:
- Zero pods for 30+ days
- No recent events
- Still has PVCs, ConfigMaps, or Secrets
- No recent deployments or updates

## Automated Cleanup Policies

Implement policies to automatically clean up idle resources. Use Kyverno for policy enforcement:

```yaml
apiVersion: kyverno.io/v1
kind: ClusterPolicy
metadata:
  name: delete-idle-pvcs
spec:
  rules:
  - name: cleanup-unattached-pvcs
    match:
      resources:
        kinds:
        - PersistentVolumeClaim
    preconditions:
      all:
      - key: "{{ request.object.status.phase }}"
        operator: Equals
        value: "Bound"
    context:
    - name: podCount
      apiCall:
        urlPath: "/api/v1/namespaces/{{request.namespace}}/pods"
        jmesPath: "items[?spec.volumes[?persistentVolumeClaim.claimName=='{{request.object.metadata.name}}']].metadata.name | length(@)"
    validate:
      message: "PVC has been unattached for 30+ days and will be deleted"
      deny:
        conditions:
          all:
          - key: "{{podCount}}"
            operator: Equals
            value: 0
          - key: "{{ time_since('', '{{request.object.metadata.creationTimestamp}}', '') }}"
            operator: GreaterThan
            value: 2592000  # 30 days in seconds
```

This policy marks PVCs unattached for 30+ days for deletion.

For safer automation, label resources for review instead of deleting:

```yaml
apiVersion: kyverno.io/v1
kind: ClusterPolicy
metadata:
  name: label-idle-resources
spec:
  rules:
  - name: label-unused-pvcs
    match:
      resources:
        kinds:
        - PersistentVolumeClaim
    mutate:
      patchStrategicMerge:
        metadata:
          labels:
            resource-status: potentially-idle
            last-check: "{{time_now_utc}}"
```

Review labeled resources manually before deletion.

## Cost Impact Dashboard

Create a dashboard quantifying idle resource costs:

```promql
# Idle PVC storage costs
sum(
  kube_persistentvolumeclaim_resource_requests_storage_bytes{} *
  on(persistentvolumeclaim, namespace) group_left
  (
    count(kube_persistentvolumeclaim_info) unless
    count(kube_pod_spec_volumes_persistentvolumeclaims_info)
  )
) * $storage_cost_per_gb_month / (1024^3)

# Idle LoadBalancer costs
count(
  (
    count by (namespace, service) (kube_service_info{type="LoadBalancer"})
    unless
    count by (namespace, service) (kube_endpoint_address_available > 0)
  )
) * $lb_monthly_cost

# Zero-replica deployment costs
count(kube_deployment_spec_replicas{replicas="0"}) * $avg_deployment_overhead_cost
```

Display monthly waste amounts prominently to drive cleanup efforts.

## Implementing Cleanup Workflow

Establish a regular cleanup process:

**Week 1**: Run detection scripts, generate report of idle resources.

**Week 2**: Review report with resource owners. Tag resources for deletion or mark as intentionally idle.

**Week 3**: Delete resources tagged for removal. Monitor for any issues.

**Week 4**: Verify cost reductions in cloud billing.

Document the process:

```markdown
# Idle Resource Cleanup Process

## Detection
- Run detection scripts every Monday
- Generate report with resource details and cost impact
- Post report to #infrastructure-costs Slack channel

## Review
- Resource owners have 7 days to respond
- Mark resources as:
  - DELETE: Will be removed
  - KEEP: Intentionally idle, add label resource-status=intentionally-idle
  - INVESTIGATE: Needs more analysis

## Deletion
- Delete resources marked DELETE
- Add labels to resources marked KEEP
- Escalate resources marked INVESTIGATE

## Verification
- Track cost reductions month-over-month
- Document lessons learned
```

## Preventing Idle Resource Accumulation

Implement lifecycle policies to prevent accumulation:

```yaml
apiVersion: v1
kind: ResourceQuota
metadata:
  name: pvc-quota
  namespace: development
spec:
  hard:
    persistentvolumeclaims: "20"
    requests.storage: "500Gi"
```

Limited quotas force teams to clean up old resources before creating new ones.

Require expiration labels on temporary resources:

```yaml
apiVersion: kyverno.io/v1
kind: ClusterPolicy
metadata:
  name: require-expiration
spec:
  rules:
  - name: check-expiration-label
    match:
      resources:
        kinds:
        - Namespace
        namespaceSelector:
          matchLabels:
            environment: dev
    validate:
      message: "Development namespaces must have expiration date"
      pattern:
        metadata:
          labels:
            expires-on: "?*"
```

Automatically clean up expired resources:

```bash
#!/bin/bash
# cleanup-expired.sh

TODAY=$(date +%Y-%m-%d)

kubectl get ns -l expires-on -o json | \
  jq -r --arg today "$TODAY" '.items[] |
    select(.metadata.labels["expires-on"] < $today) |
    .metadata.name' | \
  while read ns; do
    echo "Deleting expired namespace: $ns"
    kubectl delete ns $ns
  done
```

Run this daily via CronJob.

## Metrics and Reporting

Track idle resource trends over time:

```promql
# Idle resources by type
sum by (resource_type) (idle_resource_count)

# Monthly waste reduction
(
  avg_over_time(idle_resource_cost[30d:1d] offset 30d) -
  avg_over_time(idle_resource_cost[30d:1d])
)

# Cleanup effectiveness
rate(idle_resources_deleted_total[7d])
```

Generate monthly reports showing:
- Total idle resources detected
- Resources cleaned up
- Cost savings achieved
- Top namespaces by waste

Share reports with leadership to demonstrate platform team value and justify continued optimization efforts.

Idle resource detection is not a one-time effort but an ongoing practice. Regular sweeps combined with preventive policies keep clusters lean and costs under control. Most organizations recover their first year's worth of platform engineering salary in idle resource savings alone.
