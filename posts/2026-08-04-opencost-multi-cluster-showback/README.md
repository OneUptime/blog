# Build Reliable Multi-Cluster Showback with OpenCost

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenCost, Kubernetes, Prometheus, Multi-Cluster, Showback, FinOps, Thanos

Description: Design multi-cluster OpenCost showback with durable retention, consistent cluster identity, governed labels, and collision-free workload keys.

---

OpenCost can calculate Kubernetes allocations by cluster, namespace, controller, Pod, labels, and other dimensions. A multi-cluster deployment fails when those dimensions are not globally scoped: two clusters both contain `payments/api`, metrics arrive without a cluster label, or the shared backend retains only two weeks of a monthly correction window.

Reliable showback needs four contracts: cluster identity, telemetry routing, business-label semantics, and retention.

## Use an Immutable Cluster ID

Give every cluster an ID that is unique for its entire lifetime. Do not use `prod`, a display name that can be recycled, or the current cloud account alone.

A practical identity is:

```text
provider/organization/account/region/cluster-uid
```

Keep friendly attributes separately:

```text
cluster_id
cluster_name
environment
platform_owner
valid_from
valid_to
```

Every cost and metric row must carry `cluster_id` before it reaches a global aggregation. A workload key then becomes:

```text
cluster_id + namespace + controller_kind + controller_name
```

Pod-level keys also include Pod UID. Names are useful labels; they are not sufficient identities.

## Follow the OpenCost Shared-Backend Pattern

OpenCost documents a pattern with:

1. one OpenCost instance per Kubernetes cluster;
2. cluster metrics sent to a shared Prometheus-compatible backend such as Thanos, Cortex, or Mimir;
3. each OpenCost instance configured to query that backend;
4. cluster-scoped filtering so it reads only its own metrics.

The documented environment settings are:

```yaml
opencost:
  exporter:
    extraEnv:
      CURRENT_CLUSTER_ID_FILTER_ENABLED: "true"
      PROM_CLUSTER_ID_LABEL: "cluster"
      CLUSTER_ID: "globally-unique-cluster-id"
```

The value of `CLUSTER_ID` must exactly match the value stored under the configured Prometheus label. A mismatch produces empty or confusing results. Omitting the filter can mix clusters and increase query cost.

Configure Prometheus external labels or remote-write relabeling so every source series carries the same cluster label key. Validate at the shared query endpoint:

```promql
count by (cluster) (kube_node_info)
```

Unknown, blank, and duplicate cluster IDs should block financial publication.

## Aggregate Endpoints, Not Ambiguous Names

In the per-cluster pattern, a central showback collector queries each OpenCost endpoint and attaches its expected immutable cluster ID to the response. Query a bounded, explicit window:

```text
/allocation?window=<RFC3339-start>,<RFC3339-end>
  &aggregate=namespace,controllerKind,controller
  &includeIdle=true
  &step=1d
  &resolution=1m
```

The URL is shown on multiple lines for readability. Encode it as one request.

OpenCost accepts comma-separated aggregation dimensions. The central key still includes cluster ID even if the API response's aggregate label looks complete. Two clusters can legitimately contain the same namespace and controller.

Save the source endpoint, query parameters, OpenCost version, price-source version, and response hash. A rerun after a pricing or label change should be identifiable as a different calculation.

## Set Retention from the Finance Window

Prometheus retention controls whether OpenCost can query historical allocations. OpenCost cannot reconstruct a deleted Pod's resource samples after the backing time series has expired.

Set the requirement from the longest of:

- month-to-date reporting;
- invoice finalization delay;
- late billing adjustment window;
- dispute and correction period;
- audit or restatement policy.

For example, a requirement to rerun 13 months of showback is not met by 30 days of raw metrics. Choose one of two designs:

- retain queryable metrics for the full period in the shared backend; or
- calculate daily immutable allocation facts and retain those facts, plus the inputs needed to explain them, for the full period.

The second design is often cheaper, but it cannot support a new retrospective rule that requires raw metrics not present in the daily fact. State that limitation.

Prometheus supports time- and size-based retention. Size pressure can remove blocks sooner than a time-only expectation. Monitor the oldest queryable timestamp and run a synthetic historical OpenCost query, not just a disk-capacity alert.

## Govern Business Labels as Data

OpenCost can aggregate by `label:LABEL_NAME`, but Kubernetes label values are local conventions unless governed. Standardize a small schema such as:

```text
cost.example.com/team
cost.example.com/service
cost.example.com/environment
cost.example.com/cost-center
```

Define:

- allowed values and registry source;
- which controller template must carry the label;
- whether Pods may override the controller;
- effective dates for ownership changes;
- behavior for missing and conflicting labels;
- whether historical values come from time series or today's catalog.

Kubernetes labels are key-value metadata used for selection and organization; Kubernetes does not assign financial meaning to them. The meaning and precedence above are organizational policy.

Use admission controls for prospective quality and a daily drift report for existing workloads. Never convert a missing label to a likely team name based on namespace text.

## Handle High Availability and Duplicate Series

Two Prometheus replicas can remote-write the same logical Kubernetes series. Preserve labels required by the shared backend's deduplication, often including a replica label, while retaining the cluster label. Configure the global query layer's documented deduplication behavior.

Test that a known Pod has one logical CPU and memory series after query-layer deduplication. A doubled series can double usage and eliminate idle. Dropping the cluster label to make replicas deduplicate can instead merge two clusters.

Do not solve this in the cost layer with `sum / 2`. Replica counts and failures change.

## Preserve Idle and Shared Cost Policy

The OpenCost Allocation API can return a separate `__idle__` allocation with `includeIdle=true`. `shareIdle=true` distributes idle proportionally to non-idle allocations, and `idleByNode=true` changes the boundary from cluster to node.

Choose and record these parameters. For a multi-cluster report:

- keep idle by cluster when cluster teams control capacity;
- keep shared platform workloads separate before optional distribution;
- avoid spreading one cluster's idle across tenants in another cluster unless that cross-cluster subsidy is explicit;
- retain the original idle and shared categories after any distribution.

API options are capabilities, not a mandate to charge idle to applications.

## Validate Multi-Cluster Completeness

Maintain a cluster registry and check every run:

- all active clusters returned data for the whole window;
- no retired cluster returned data outside its lifetime;
- every metric source has exactly one valid cluster ID;
- per-cluster API totals reconcile to collected central totals;
- duplicate workload names remain separate by cluster;
- label coverage is reported by cost, not only object count;
- idle and shared parameters are consistent with policy;
- the oldest queryable timestamp exceeds the correction horizon;
- daily output is idempotent for an unchanged input snapshot.

If one cluster is unavailable, publish the report as incomplete or carry a clearly marked estimate. Do not renormalize the other clusters to the expected company total.

## Official Documentation

- [OpenCost: Multi-cluster with a single source of data](https://opencost.io/docs/installation/multi-cluster-single-source-of-data/)
- [OpenCost: Allocation API dimensions, windows, resolution, and idle](https://opencost.io/docs/integrations/api/)
- [OpenCost: Cost allocation specification](https://opencost.io/docs/specification/)
- [Prometheus: Configuration and external labels](https://prometheus.io/docs/prometheus/latest/configuration/configuration/)
- [Prometheus: Storage and retention](https://prometheus.io/docs/prometheus/latest/storage/)
- [Kubernetes: Labels and selectors](https://kubernetes.io/docs/concepts/overview/working-with-objects/labels/)
- [Kubernetes: Pod lifecycle and UID identity](https://kubernetes.io/docs/concepts/workloads/pods/pod-lifecycle/)

## Conclusion

Multi-cluster OpenCost showback depends on globally unique cluster identity, cluster-scoped queries, governed labels, and retention that matches the correction window. Aggregate with cluster-qualified workload keys, deduplicate telemetry in the query layer, and persist calculation inputs. Duplicate names are harmless when identity is designed; missing cluster labels are not.
