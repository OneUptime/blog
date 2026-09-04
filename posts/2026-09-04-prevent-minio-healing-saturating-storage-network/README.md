# How to Prevent MinIO Healing from Saturating the Storage Network

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MinIO, Erasure Coding, Performance, Monitoring, Recovery

Description: Control MinIO healing impact with measured network headroom, direct heal pacing, scanner controls, and foreground SLO gates without extending risk blindly.

---

MinIO healing reads surviving shards across an erasure set and writes reconstructed shards to the affected drive. On a busy cluster, that traffic competes with S3 requests, replication, lifecycle work, and other internode operations. The goal is not to make healing arbitrarily slow. It is to finish inside the durability window while preserving enough bandwidth for foreground objectives.

First determine which healing path is active. MinIO can heal during `GET` and `HEAD`, through its background scanner, and aggressively after a replacement drive appears. Scanner controls affect discovery and scanner-driven work. Heal settings pace healing work directly, but neither mechanism is a precise network-rate limiter.

## Establish a Before-Healing Baseline

Capture a normal peak interval before a failure whenever possible:

```bash
mc admin info --uncached production
mc admin scanner status production -n 5
mc admin prometheus metrics production system --api-version v3 \
  >/tmp/minio-system-before.prom
mc admin prometheus metrics production api --api-version v3 \
  >/tmp/minio-api-before.prom
```

Measure both ends of each link. Host counters can show traffic leaving a node, while switch telemetry reveals rack-uplink congestion, drops, pause frames, and an oversubscribed fabric.

Record:

- S3 request rate and p95/p99 latency by operation;
- foreground error and timeout rate;
- per-node and internode transmit and receive rates;
- drive utilization, latency, and queue depth;
- CPU, memory, and network retransmissions;
- erasure-set write tolerance and healing-drive count;
- scanner and replication backlog.

Reserve an explicit headroom target. For example, if a 25 Gb/s rack link must retain 8 Gb/s for peak foreground traffic and 2 Gb/s for bursts, the healing budget is at most 15 Gb/s. Use service measurements rather than assuming line rate is usable payload throughput.

## Observe the Active Recovery

Current v3 metrics expose healing and per-set state:

```bash
mc admin prometheus metrics production cluster --api-version v3 |
  grep 'minio_cluster_erasure_set_'

mc admin prometheus metrics production --api-version v3 |
  grep -E 'minio_(heal|debug_heal)_'

mc admin scanner status production
```

Correlate rates over the same timestamps. A cumulative objects-healed counter alone does not say whether the healer is currently saturating a link. Calculate deltas and compare them with network and foreground latency.

## Pace Healing with the Heal Settings

Inspect and record the current `heal` subsystem before changing it:

```bash
mc admin config get production heal
```

Current AIStor exposes `max_sleep` and `max_io` together to control healing throughput. A longer maximum sleep reduces the I/O impact between objects. The I/O threshold participates in deciding when that sleep applies. Test a conservative change on the same server release outside production, then change one variable at a time during an approved recovery event. For example:

```bash
mc admin config set production heal max_sleep=100ms
mc admin config get production heal
```

Do not copy these example values blindly. Object size, drive type, foreground concurrency, and network topology all affect the result. Compare time-series deltas for healed objects, foreground latency, disk queues, and link use before making another adjustment.

Fresh-drive healing also has a `drive_workers` setting, while scanner or Most Recently Failed queue repairs use `background_workers`. Their default value of `0` lets AIStor choose worker counts from `GOMAXPROCS`. Reducing concurrency can relieve a constrained drive or network, but it also extends the degraded window. Change worker counts only after observing that concurrency, rather than per-object pacing, is the bottleneck.

Configuration changes made with `mc admin config set` are dynamic for the heal subsystem. An environment-variable override takes precedence and requires a process restart to change, so confirm the effective value. Roll back by restoring the exact values captured before the incident, not by assuming a documented default matches this deployment.

## Pace Scanner-Driven Healing

MinIO documents a scanner speed setting with `fastest`, `fast`, `default`, `slow`, and `slowest` values. The default balances scanning with reads and writes. Slower values add more wait time and favor foreground I/O, while faster values consume more IOPS and can reduce request performance.

Inspect the current setting before changing it:

```bash
mc admin config get production scanner
```

Test a slower setting in a nonproduction cluster with the same release, then apply it through change control if foreground latency crosses its gate:

```bash
mc admin config set production scanner speed=slow
mc admin config get production scanner
```

Scanner speed also affects lifecycle processing and replication checks. Watch those backlogs while it is reduced. Restore the previous value when healing and SLOs permit:

```bash
mc admin config set production scanner speed=default
```

Changing this setting may not throttle foreground read-triggered healing or every aggressive replacement workflow. Confirm the effect in metrics instead of assuming the configuration succeeded.

## Avoid Multiplying Recovery Work

`mc admin heal` starts a resource-intensive scan when the target does not already have one. Current MinIO guidance says manual full-system healing is normally unnecessary after drive replacement. Do not launch multiple broad scans in an attempt to make recovery finish sooner.

When support or a runbook calls for a manual check, scope it to a bucket or prefix:

```bash
mc admin heal --verbose production/critical-bucket/known-prefix
```

If an active scan exists, this reports its status. Otherwise it creates work, so run it only after calculating the network and foreground budget.

Replace and heal one failed member per affected set at a time unless MinIO engineering directs otherwise. Parallel replacements can increase reconstruction fan-in and consume the remaining failure tolerance.

## Reduce Avoidable Competing Traffic

During the bounded recovery window:

- pause nonessential bulk imports, exports, and benchmark jobs;
- defer pool rebalancing, decommissioning, and lifecycle backfills;
- cap application batch concurrency while keeping latency-sensitive traffic prioritized;
- schedule optional replication resync outside the peak interval;
- keep clients from repeatedly reading known huge objects solely to force healing;
- isolate internode traffic on the designed storage network where the topology supports it.

Do not apply ad hoc Linux traffic control to MinIO ports without a tested design. Excessive shaping can delay heartbeats, make drives or nodes appear offline, and turn congestion into quorum loss. Network-level QoS should preserve control traffic and be validated under failure conditions.

## Use Two Safety Gates

Balance availability and recovery with two independent limits:

```text
foreground gate: p99 latency, error rate, and timeout budget
durability gate: remaining set tolerance and maximum recovery completion time
```

If the foreground gate fails, increase heal pacing, reduce worker concurrency or scanner speed where appropriate, or reduce competing workload. If the durability gate fails, healing is too slow; restore the recorded settings, restore bandwidth, reduce other traffic, or escalate. Never optimize one gate while ignoring the other.

After completion, require online drive count and set tolerance to return to design values, healing-drive count to reach zero, and heal-error counters to stop increasing. Then run representative S3 reads against trusted SHA-256 manifests.

## Conclusion

Preventing saturation is a feedback-control problem, not a single throttle. Measure the shared fabric, distinguish healing paths, adjust direct heal pacing or scanner discovery only as far as the durability window allows, and remove avoidable competing jobs. Keep explicit foreground and recovery gates so protecting request latency never leaves the erasure set degraded indefinitely.

## Official Documentation

- [MinIO AIStor: Scanner](https://docs.min.io/aistor/reference/aistor-server/scanner/)
- [MinIO AIStor: Heal Settings](https://docs.min.io/aistor/reference/aistor-server/settings/heal/)
- [MinIO AIStor: Core Settings](https://docs.min.io/aistor/reference/aistor-server/settings/core/)
- [MinIO AIStor: Healing](https://docs.min.io/aistor/operations/core-concepts/healing/)
- [MinIO AIStor: Metrics and Alerts](https://docs.min.io/aistor/operations/monitoring/metrics-and-alerts/)
- [MinIO AIStor: mc admin heal](https://docs.min.io/aistor/reference/cli/admin/mc-admin-heal/)
