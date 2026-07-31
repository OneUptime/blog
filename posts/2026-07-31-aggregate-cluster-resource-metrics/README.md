# How to Aggregate CPU, Memory, and Disk Metrics Across a Cluster Without Averaging Percentages Incorrectly

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Prometheus, PromQL, Node Exporter, Infrastructure Metrics, Capacity Planning, Clusters

Description: Build capacity-weighted cluster CPU, memory, and disk rollups by aggregating numerators and denominators instead of averaging host percentages.

---

An average of host percentages gives every host equal weight. A two-core VM at 100% CPU affects that average as much as a 64-core server at 20%. That may answer “what is the typical host percentage?” but it does not answer “what fraction of cluster CPU capacity is busy?”

For capacity rollups, keep the numerator and denominator, aggregate each to the desired level, and divide only at the end.

## The General Rule

Given host ratios:

```text
host ratio = used capacity / total capacity
```

Do not calculate:

```text
cluster ratio = average(host ratio)
```

Calculate:

```text
cluster ratio = sum(host used capacity) / sum(host total capacity)
```

Prometheus's recording-rule guidance explicitly recommends aggregating ratio numerators and denominators separately. It also warns against averaging ratios or averages.

## CPU: Weight by Logical CPU Capacity

`node_cpu_seconds_total` is a counter for each logical CPU and mode. Calculate a rate before aggregating so counter resets remain detectable.

A per-host utilization ratio based on idle time is:

```promql
1
-
avg by (cluster, instance) (
  rate(node_cpu_seconds_total{mode="idle"}[5m])
)
```

The `avg` is across logical CPUs for one host. For a capacity-weighted cluster ratio, sum idle CPU-seconds per second and divide by the number of logical CPU series:

```promql
1
-
(
  sum by (cluster) (
    rate(node_cpu_seconds_total{mode="idle"}[5m])
  )
  /
  count by (cluster) (
    node_cpu_seconds_total{mode="idle"}
  )
)
```

Why this works:

- each idle CPU contributes between roughly 0 and 1 CPU-second per second;
- summing gives idle logical cores;
- counting the idle-mode series gives observed logical-core capacity;
- subtracting the idle ratio from 1 gives busy capacity.

Do not sum every non-idle mode without understanding exporter semantics. On Linux, guest time is accounted for within user or nice time by the kernel, so naïvely adding all non-idle modes can double count virtualization-related modes. The idle complement avoids that trap for a general utilization view.

### Example

| Host | Logical CPUs | Utilization | Busy CPUs |
| --- | ---: | ---: | ---: |
| small | 2 | 100% | 2 |
| large | 64 | 20% | 12.8 |

The unweighted average is 60%. The capacity-weighted result is:

```text
(2 + 12.8) / (2 + 64) = 22.4%
```

Both values can be useful, but they describe different questions.

## Memory: Sum Bytes Before Dividing

For Linux availability, node_exporter exposes `node_memory_MemAvailable_bytes` and `node_memory_MemTotal_bytes`.

Per-host utilization:

```promql
1
-
(
  node_memory_MemAvailable_bytes
  /
  node_memory_MemTotal_bytes
)
```

Capacity-weighted cluster utilization:

```promql
1
-
(
  sum by (cluster) (node_memory_MemAvailable_bytes)
  /
  sum by (cluster) (node_memory_MemTotal_bytes)
)
```

This treats reclaimable memory represented by Linux's `MemAvailable` estimate as available. It is generally more meaningful than `1 - MemFree / MemTotal`, which counts healthy cache as used.

Still keep per-host alerts. A cluster can have plenty of memory overall while one node is under severe pressure and cannot move its workload immediately.

## Disk: Aggregate Only Comparable Filesystems

For a single filesystem, non-root-available utilization is:

```promql
1
-
(
  node_filesystem_avail_bytes
  /
  node_filesystem_size_bytes
)
```

For a capacity summary across a defined storage class:

```promql
1
-
(
  sum by (cluster) (
    node_filesystem_avail_bytes{
      fstype!~"tmpfs|devtmpfs|overlay|squashfs",
      mountpoint=~"/|/data"
    }
  )
  /
  sum by (cluster) (
    node_filesystem_size_bytes{
      fstype!~"tmpfs|devtmpfs|overlay|squashfs",
      mountpoint=~"/|/data"
    }
  )
)
```

The filters are examples, not a universal filesystem policy. Validate them against your mounts.

Never sum every filesystem blindly:

- bind mounts can expose the same backing storage more than once;
- overlay and container mounts can duplicate layers;
- network filesystems may be mounted on many hosts;
- root and data filesystems can have different operational owners;
- read-only images and pseudo-filesystems are not usable capacity.

Cluster-wide free disk is a planning metric. Low-space pages should normally retain `instance`, `device`, and `mountpoint`, because free bytes on another disk do not rescue a full filesystem.

## Keep Fleet Coverage Visible

All three ratios become optimistic if a heavily loaded or failed host disappears from the query. Put coverage beside the aggregate:

```promql
count by (cluster) (up{job="node"} == 1)
```

```promql
count by (cluster) (up{job="node"})
```

And alert on missing expected targets. A ratio computed from 19 of 20 nodes is a ratio of observed capacity, not necessarily the fleet.

## Avoid Label Mismatches

Before aggregating, check that the inputs have the intended identity labels:

```promql
count by (cluster, instance) (
  node_memory_MemTotal_bytes
)
```

Each host should normally contribute one total-memory series. Unexpected duplicates often indicate:

- two Prometheus replicas queried without replica-label deduplication;
- duplicate scrape targets;
- inconsistent external labels;
- multiple exporters using the same `instance`;
- a join that multiplied series.

Use `by` or `without` deliberately. Dropping every label with a bare `sum()` can mix environments, regions, operating systems, or storage classes.

## Build Reusable Recording Rules

Record components as well as the final ratios:

```yaml
groups:
  - name: fleet-resource-rollups
    interval: 1m
    rules:
      - record: cluster:node_cpu_idle_seconds:rate5m
        expr: |
          sum by (cluster) (
            rate(node_cpu_seconds_total{mode="idle"}[5m])
          )

      - record: cluster:node_cpu_logical:count
        expr: |
          count by (cluster) (
            node_cpu_seconds_total{mode="idle"}
          )

      - record: cluster:node_cpu_utilization:ratio
        expr: |
          1
          -
          (
            cluster:node_cpu_idle_seconds:rate5m
            /
            cluster:node_cpu_logical:count
          )

      - record: cluster:node_memory_available_bytes:sum
        expr: sum by (cluster) (node_memory_MemAvailable_bytes)

      - record: cluster:node_memory_total_bytes:sum
        expr: sum by (cluster) (node_memory_MemTotal_bytes)

      - record: cluster:node_memory_utilization:ratio
        expr: |
          1
          -
          (
            cluster:node_memory_available_bytes:sum
            /
            cluster:node_memory_total_bytes:sum
          )
```

Rules in a group run sequentially at the same evaluation time, so later rules can use earlier results. Test label sets and zero denominators before rollout.

## Decide Which Question the Dashboard Answers

Use capacity-weighted ratios for:

- overall headroom;
- infrastructure cost and capacity planning;
- comparing used resources with purchased resources;
- fleet-level trends.

Use host distributions for:

- skew and hotspots;
- “how many hosts exceed 80%?”;
- noisy-neighbor investigations;
- replacement or rebalancing decisions.

Useful companion queries include:

```promql
count by (cluster) (
  (
    1
    - avg by (cluster, instance) (
        rate(node_cpu_seconds_total{mode="idle"}[5m])
      )
  ) > 0.8
)
```

and per-host tables rather than a single fleet line.

## Validation Checklist

1. State whether the chart represents a typical host or total capacity.
2. Calculate counter rates before aggregation.
3. Aggregate numerator and denominator separately.
4. Preserve cluster, environment, and storage-class boundaries.
5. Exclude duplicate and pseudo-filesystems.
6. Put observed-host coverage beside every fleet ratio.
7. Keep per-host saturation and low-space alerts.
8. Compare a hand-calculated heterogeneous-host example with PromQL.

A single cluster percentage is useful only when its denominator is honest. Preserve capacity units until the final division, and the rollup will continue to mean the same thing as the fleet changes shape.

## Official Documentation

- [Prometheus: Recording rule best practices](https://prometheus.io/docs/practices/rules/)
- [Prometheus: Query functions](https://prometheus.io/docs/prometheus/latest/querying/functions/)
- [Prometheus: Query operators](https://prometheus.io/docs/prometheus/latest/querying/operators/)
- [Prometheus: Monitoring Linux host metrics with node_exporter](https://prometheus.io/docs/guides/node-exporter/)
- [node_exporter: Collector and deployment documentation](https://github.com/prometheus/node_exporter)
