# How to Count Live Kubernetes Nodes and Alert on Unexpected Fleet-Size Changes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Prometheus, kube-state-metrics, Nodes, PromQL, Alerting

Description: Count registered and Ready Kubernetes nodes correctly with kube-state-metrics, then alert on fleet changes without confusing zero-valued condition series for healthy nodes.

---

“How many nodes do we have?” has at least three answers in Kubernetes:

- Node objects registered in the API;
- nodes whose `Ready` condition is currently true;
- machines the infrastructure provider intends to run.

Those counts can differ during provisioning, shutdown, autoscaling, and control-plane partitions. A useful alert names which count changed and compares it with the right source of truth.

## Understand the Condition Metric

kube-state-metrics exposes Kubernetes API object state. For each Node condition it emits labeled gauge series such as:

```text
kube_node_status_condition{
  node="worker-01",
  condition="Ready",
  status="true"
} 1

kube_node_status_condition{
  node="worker-01",
  condition="Ready",
  status="false"
} 0

kube_node_status_condition{
  node="worker-01",
  condition="Ready",
  status="unknown"
} 0
```

This means the following query is wrong:

```promql
count(kube_node_status_condition{condition="Ready"})
```

It counts all three status series per node, including zero-valued series.

## Count Registered and Ready Nodes

Count registered Node objects with the stable `kube_node_info` metric:

```promql
count(
  max by (node) (
    kube_node_info
  )
)
```

Count nodes whose Ready condition is true:

```promql
count(
  max by (node) (
    kube_node_status_condition{
      condition="Ready",
      status="true"
    } == 1
  )
)
```

The inner `max` deduplicates the same Node if multiple kube-state-metrics scrape targets expose it. For a multi-cluster Prometheus, preserve the external cluster label:

```promql
count by (cluster) (
  max by (cluster, node) (
    kube_node_info
  )
)
```

```promql
count by (cluster) (
  max by (cluster, node) (
    kube_node_status_condition{
      condition="Ready",
      status="true"
    } == 1
  )
)
```

Count unhealthy registered nodes directly:

```promql
count by (cluster) (
  max by (cluster, node) (
    kube_node_status_condition{
      condition="Ready",
      status=~"false|unknown"
    } == 1
  )
)
```

`Unknown` is important. Kubernetes sets Ready to `Unknown` when the node controller stops receiving heartbeats; that is not the same as a definite kubelet-reported `False`.

## Record the Counts Once

Fleet dashboards and alerts repeatedly need the same definitions. Recording rules keep them consistent:

```yaml
groups:
  - name: kubernetes-node-fleet
    interval: 30s
    rules:
      - record: cluster:kube_node_info:count
        expr: |
          count by (cluster) (
            max by (cluster, node) (
              kube_node_info
            )
          )

      - record: cluster:kube_node_ready:count
        expr: |
          count by (cluster) (
            max by (cluster, node) (
              kube_node_status_condition{
                condition="Ready",
                status="true"
              } == 1
            )
          )

      - record: cluster:kube_node_not_ready:count
        expr: |
          count by (cluster) (
            max by (cluster, node) (
              kube_node_status_condition{
                condition="Ready",
                status=~"false|unknown"
              } == 1
            )
          )
```

Keep `cluster` on every kube-state-metrics target. Without it, identically named nodes from different clusters can be combined.

## Alert on NotReady Nodes Separately

A node-health alert should identify each node:

```yaml
- alert: KubernetesNodeNotReady
  expr: |
    kube_node_status_condition{
      condition="Ready",
      status=~"false|unknown"
    } == 1
  for: 10m
  labels:
    severity: warning
  annotations:
    summary: "Node {{ $labels.node }} is not Ready"
```

The `for` duration should cover expected short transitions but remain shorter than the response objective. It does not change Kubernetes's own heartbeat or eviction timing.

## Alert Against a Fixed Expected Size

For a deliberately fixed 20-node cluster:

```yaml
- alert: KubernetesFleetSizeUnexpected
  expr: cluster:kube_node_info:count{cluster="payments-prod"} != 20
  for: 15m
  labels:
    severity: warning
  annotations:
    summary: "Registered node count is {{ $value }}, expected 20"
```

This is appropriate only if 20 is truly the desired state. Put the expectation in version-controlled configuration and update it with planned capacity changes.

For several fixed clusters, expose an expectation metric instead of embedding a large table in PromQL:

```text
kubernetes_expected_nodes{cluster="payments-prod"} 20
kubernetes_expected_nodes{cluster="search-prod"} 12
```

Then compare:

```promql
cluster:kube_node_info:count
!= on (cluster)
kubernetes_expected_nodes
```

Also alert when the expectation itself is absent; otherwise a broken source can make the comparison empty.

## Dynamic Fleets Need Desired-State Context

In an autoscaled cluster, a node-count change is often normal. A static count alert will page during every scale event. Better questions are:

- Are registered nodes below the autoscaler's current desired capacity?
- Has a new machine failed to register within the provisioning objective?
- Are too many registered nodes NotReady?
- Is the fleet outside approved minimum or maximum bounds?
- Did capacity fall while pending workload increased?

The exact desired-capacity metric depends on the autoscaler or cloud provider. Join it by stable cluster and node-pool labels, and keep separate alerts for:

1. desired versus actual machines;
2. registered versus Ready nodes;
3. workload capacity or pending Pods.

Do not treat `count(kube_node_info)` as the cloud provider's desired count. kube-state-metrics reports API objects, not provider intent.

## Detect a Sudden Count Change Without Paging on Every Change

For an informational annotation:

```promql
changes(cluster:kube_node_info:count[30m]) > 0
```

This says the recorded count changed, not that the change was bad. Route it to a dashboard or event stream. Page only when a policy is violated, such as falling below a resilience floor:

```yaml
- alert: KubernetesReadyNodesBelowSafetyFloor
  expr: cluster:kube_node_ready:count{cluster="payments-prod"} < 15
  for: 5m
  labels:
    severity: critical
```

## Guard Against Monitoring Failures

If kube-state-metrics is down, node series can disappear and a broad comparison can produce an empty result. Monitor the collector:

```promql
up{job="kube-state-metrics"} == 0
```

Check metric presence independently:

```promql
absent_over_time(kube_node_info[10m])
```

In a multi-cluster system, compare expected clusters against an inventory metric so that one healthy cluster cannot hide another cluster's missing series.

## Preserve Node Identity

Kubernetes assumes a Node object with the same name represents the same node. The official documentation recommends re-registering the node when significant configuration changes. For infrastructure correlation, `kube_node_info` also exposes fields such as `provider_id` and `system_uuid`.

Use them carefully:

- `node` is the Kubernetes scheduling identity;
- `provider_id` identifies the provider resource when available;
- `system_uuid` can correlate the underlying system;
- internal IP is an address, not a durable identity.

A replacement VM with a reused friendly name should still be visible as a replacement in infrastructure analysis.

## Validation Checklist

- Verify that kube-state-metrics is scraped successfully.
- Inspect raw Ready condition series and their zero/one values.
- Use `== 1` before counting condition series.
- Preserve a cluster label in every aggregation.
- Separate registered, Ready, and desired counts.
- Treat count changes as events unless they violate a defined bound.
- Test collector failure and complete cluster disappearance.
- Rehearse planned scale-up, scale-down, and node replacement.

The safest fleet alert is not “the number changed.” It is “the observed state no longer matches an explicit resilience or desired-capacity policy.”

## Official Documentation

- [kube-state-metrics: Node metrics](https://github.com/kubernetes/kube-state-metrics/blob/main/docs/metrics/cluster/node-metrics.md)
- [Kubernetes: Nodes](https://kubernetes.io/docs/concepts/architecture/nodes/)
- [Kubernetes API: Node v1](https://kubernetes.io/docs/reference/kubernetes-api/cluster-resources/node-v1/)
- [Prometheus: Alerting rules](https://prometheus.io/docs/prometheus/latest/configuration/alerting_rules/)
- [Prometheus: Query operators](https://prometheus.io/docs/prometheus/latest/querying/operators/)
