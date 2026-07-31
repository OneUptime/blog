# How to Preserve Host Identity Across Autoscaling, Reboots, and Changing IP Addresses

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Prometheus, Service Discovery, Relabeling, Autoscaling, Host Identity, Infrastructure Metrics

Description: Model durable machine and logical fleet identity in Prometheus so reboots remain continuous while replacements and reused IP addresses do not corrupt time series.

---

Prometheus sets a target's `instance` label to its scrape address by default if relabeling did not set it. That is convenient for static servers. It is dangerous in autoscaled fleets where IP addresses are reassigned and hostnames are reused.

An address answers “where do I scrape now?” Identity answers “which resource produced this sample?” They should not be assumed to be the same.

## Define Two Kinds of Continuity

Infrastructure dashboards often need both:

### Machine identity

An immutable identifier for one VM or physical machine:

- AWS EC2 instance ID;
- GCE numeric instance ID;
- Azure machine ID;
- provider ID or system UUID for a Kubernetes node;
- asset UUID from a bare-metal inventory.

A reboot should normally retain this identity. Replacing the machine should create a new identity.

### Logical fleet identity

A stable grouping that survives replacement:

- cluster;
- node pool or autoscaling group;
- environment;
- region and zone;
- service role.

Capacity views should aggregate by logical fleet labels. They should not pretend replacement machines are the same physical host.

## Keep the Scrape Address and Resource ID Separate

For AWS service discovery:

```yaml
scrape_configs:
  - job_name: node
    ec2_sd_configs:
      - region: eu-west-2
        port: 9100
    relabel_configs:
      - source_labels: [__meta_ec2_instance_id]
        target_label: host_id

      - source_labels: [__meta_ec2_tag_Name]
        target_label: host_name

      - source_labels: [__meta_ec2_tag_NodePool]
        target_label: node_pool

      - source_labels: [__meta_ec2_availability_zone]
        target_label: availability_zone

      - source_labels: [__meta_ec2_instance_id]
        target_label: instance
```

Prometheus still uses `__address__` to connect. Setting `instance` changes the public series label, not the network destination.

Using the immutable ID for both `host_id` and `instance` gives familiar queries stable per-machine identity. Keeping a dedicated `host_id` also makes the contract explicit and supports environments where `instance` must retain another convention.

## Examples for Other Discovery Systems

Prometheus's official configuration reference exposes provider metadata during relabeling.

GCE:

```yaml
- source_labels: [__meta_gce_instance_id]
  target_label: host_id
- source_labels: [__meta_gce_instance_name]
  target_label: host_name
```

Azure:

```yaml
- source_labels: [__meta_azure_machine_id]
  target_label: host_id
- source_labels: [__meta_azure_machine_name]
  target_label: host_name
```

Kubernetes node discovery:

```yaml
- source_labels: [__meta_kubernetes_node_provider_id]
  target_label: host_id
- source_labels: [__meta_kubernetes_node_name]
  target_label: node
```

For Kubernetes's `node` discovery role, Prometheus already sets `instance` to the Kubernetes node name. Preserve `provider_id` separately so an underlying replacement is still visible.

Not every provider ID is present in every environment. Alert on an empty `host_id` rather than silently falling back to a recycled address.

## Static and File-Based Discovery

Put identity in the target inventory:

```yaml
- targets:
    - 10.20.4.17:9100
  labels:
    host_id: asset-7f35c9
    host_name: db-worker-07
    node_pool: database
    cluster: payments-prod
```

File-based service discovery reloads target groups as files change. Have the inventory system update the address while retaining the machine ID for a reboot or address change. Assign a new ID when hardware or VM identity changes.

Write discovery files atomically so Prometheus never observes a partial inventory.

## Do Not Reuse a Friendly Name as Machine Identity

Names such as `worker-07` or `payments-node-a` are often logical slots. Autoscaling or reprovisioning can attach the same name to a new machine.

If the name is the only series identity:

- counters from different machines can appear contiguous;
- a higher starting counter can create a false spike;
- a lower starting counter looks like a reset;
- old and new targets can collide during replacement overlap;
- incident history attributes behavior to the wrong machine.

Keep the name as a label for humans, but use a unique resource ID for machine timelines.

## Reboots, Replacements, and Address Changes

Apply these rules:

| Event | `host_id` | `host_name` | scrape address |
| --- | --- | --- | --- |
| process restart | same | same | usually same |
| host reboot | same | same | may change |
| DHCP or network change | same | same | changes |
| VM replacement | new | may be reused | may be reused |
| scale-out | new per machine | new or generated | new |
| scale-in | retired | retired | may later be reused |

This preserves real counter resets from reboot while preventing replacement resources from sharing one apparent history.

## Build Fleet Views from Logical Labels

Per-machine investigation:

```promql
rate(
  node_cpu_seconds_total{
    host_id="i-0123456789abcdef0",
    mode!="idle"
  }[5m]
)
```

Node-pool capacity:

```promql
sum by (cluster, node_pool) (
  rate(node_cpu_seconds_total{mode="idle"}[5m])
)
```

Autoscaling naturally adds and removes machine series while the pool aggregate remains the logical continuity boundary.

Do not aggregate by `host_name` when names can be reused. Use it for display annotations:

```yaml
summary: "Host {{ $labels.host_name }} ({{ $labels.host_id }}) is down"
```

## Detect Broken Identity

Missing ID:

```promql
count by (job) (
  up{job="node", host_id=""}
) > 0
```

Duplicate active identity:

```promql
count by (cluster, host_id) (
  up{job="node"}
) > 1
```

Unexpected churn:

```promql
rate(prometheus_tsdb_head_series_created_total[15m])
```

Also inspect the Prometheus service-discovery page after relabeling. Confirm that two live targets never end with identical complete label sets.

## Plan Label Migration

Changing `instance` creates new time series because labels define identity. Migrate deliberately:

1. add `host_id` while retaining the current `instance`;
2. update dashboards, rules, and alerts to preserve `host_id`;
3. verify every target has a valid unique ID;
4. decide whether changing `instance` adds enough value;
5. deploy during a documented boundary;
6. annotate dashboards;
7. retain compatibility recording rules temporarily if needed.

Do not try to rewrite historical Prometheus labels in place. Treat the migration as a schema change.

## Control Label Cardinality

Stable identity does not mean copying every cloud tag onto every series. Promote only bounded, governed labels used in queries:

- cluster;
- node pool;
- environment;
- region and zone;
- host ID;
- human-readable name.

Avoid volatile deployment timestamps, owner email addresses, arbitrary tag maps, and configuration hashes. Each change to a target label creates a new set of series for every metric on that target.

## Identity Contract Checklist

- Is the scrape address separate from resource identity?
- Does a reboot keep `host_id`?
- Does a replacement receive a new `host_id`?
- Can friendly names and IP addresses be reused safely?
- Are logical fleet labels stable and bounded?
- Does every target have exactly one nonempty ID?
- Can two simultaneously active targets collide?
- Are alerts annotated with both human name and immutable ID?
- Are identity schema changes treated as migrations?

Good identity makes host history truthful. Preserve a resource ID for the life of one machine, aggregate by logical pool for fleet continuity, and let addresses change without redefining what a time series represents.

## Official Documentation

- [Prometheus: Configuration, service discovery, and relabeling](https://prometheus.io/docs/prometheus/latest/configuration/configuration/)
- [Prometheus: File-based service discovery](https://prometheus.io/docs/guides/file-sd/)
- [kube-state-metrics: Node identity labels](https://github.com/kubernetes/kube-state-metrics/blob/main/docs/metrics/cluster/node-metrics.md)
- [Kubernetes: Nodes and node-name uniqueness](https://kubernetes.io/docs/concepts/architecture/nodes/)
- [Prometheus: Instrumentation and label cardinality](https://prometheus.io/docs/practices/instrumentation/)
