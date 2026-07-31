# How to Choose Infrastructure Metric Retention Without Overloading Prometheus

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Prometheus, TSDB, Metric Retention, Capacity Planning, Infrastructure Monitoring, Storage

Description: Size Prometheus retention from investigation needs, measured ingestion, series count, WAL and head overhead, and a disk safety limit.

---

Metric retention is a product requirement constrained by storage and query capacity. “Keep everything for a year” is not a sizing plan, and “15 days because that is the default” is not a statement of operational need.

For host metrics, begin by assigning each use case a horizon:

| Use case | Typical question | Possible horizon |
| --- | --- | ---: |
| Active incident | What changed before this failure? | Hours to days |
| Deployment regression | Did this release change resource use? | Days to weeks |
| Capacity planning | What are growth and seasonal peaks? | Months |
| Audit or billing | What evidence must be retained? | Policy-defined |

A common architecture keeps several weeks locally for fast PromQL and sends selected data to a remote system for longer retention. The exact boundary must come from measured query behavior, cost, durability, and recovery requirements.

## Understand What Local Retention Controls

Prometheus writes incoming samples to its head block and write-ahead log (WAL), then creates persistent blocks and compacts them in the background.

Current Prometheus configuration supports runtime-reloadable TSDB retention settings:

```yaml
storage:
  tsdb:
    retention:
      time: 30d
      size: 160GB
```

The current command-line flags remain documented but are deprecated in favor of the configuration fields:

```text
--storage.tsdb.retention.time
--storage.tsdb.retention.size
```

Check the documentation for the deployed Prometheus version before migrating configuration. Deployment wrappers and operators may still expose retention through their own fields or command-line arguments.

If both time and size policies are set, Prometheus uses whichever triggers first. In the example, data can disappear before 30 days if the size limit is reached.

## Start with the Official Sample Formula

Prometheus documents an average of roughly 1–2 bytes per stored sample and offers this first estimate:

```text
needed disk space
  = retention seconds
    × ingested samples per second
    × bytes per sample
```

For 100,000 samples per second, 30 days, and an assumed 1.5 bytes per sample:

```text
100,000 × 2,592,000 × 1.5
  = 388,800,000,000 bytes
  ≈ 362 GiB
```

This is a rough sample-storage estimate, not a disk-allocation guarantee. Actual use depends on:

- label and index data;
- series count and churn;
- native and classic histograms;
- compression characteristics;
- WAL and head chunks;
- block-compaction workspace and timing;
- tombstones;
- filesystem overhead;
- version and enabled features.

Measure a representative Prometheus under representative load before committing capacity.

## Measure the Real Ingestion Rate

Prometheus self-monitoring exposes:

```promql
sum(
  rate(prometheus_tsdb_head_samples_appended_total[5m])
)
```

This is the total recent append rate. The source counter has a `type` label, so the `sum` combines float and native-histogram appends. A native histogram is one structured sample containing a count, sum, and buckets, so do not assume that it has the same bytes-per-sample cost as a float sample. Inspect the rates by `type` and measure actual disk use if native histograms contribute materially. Observe normal, peak, deployment, and service-discovery churn periods rather than using one quiet snapshot.

Also track:

```promql
prometheus_tsdb_head_series
```

```promql
rate(prometheus_tsdb_head_series_created_total[5m])
```

```promql
rate(prometheus_tsdb_head_series_removed_total[5m])
```

The head series count drives memory requirements, while high creation and removal rates reveal churn. Two environments with the same samples per second can have very different memory and index costs if one constantly creates new label sets.

At scrape scope, inspect:

```promql
sum by (job) (
  scrape_samples_post_metric_relabeling
)
```

and:

```promql
sum by (job) (
  scrape_series_added
)
```

These identify jobs contributing large sample sets or new series.

## Leave Disk Space for More Than Persistent Blocks

Prometheus's size-retention policy deletes persistent blocks to honor its limit, but the WAL and memory-mapped head chunks count toward total use and cannot simply be deleted as old blocks at the limit. The official storage documentation says the disk must at minimum accommodate the peak combined `wal` and `chunks_head` directories.

Prometheus recommends setting size retention to at most **80–85%** of the disk allocated to Prometheus. For a dedicated 200 GiB volume, a 160 GiB limit is the conservative 80% end:

```yaml
storage:
  tsdb:
    retention:
      time: 30d
      size: 160GB
```

Prometheus configuration size units are based on powers of two even though the suffix is written `KB`, `MB`, or `GB`.

The remaining capacity is for head and WAL peaks, compaction behavior, filesystem overhead, and response time before the volume itself fills. More margin may be required for high churn, backfill, snapshots, or slow disks.

Alert on the actual filesystem too:

```promql
node_filesystem_avail_bytes{mountpoint="/var/lib/prometheus"}
/
node_filesystem_size_bytes{mountpoint="/var/lib/prometheus"}
< 0.15
```

Adapt the mountpoint and labels to the deployment. A retention limit is not a substitute for disk monitoring.

## Time Retention Does Not Downsample Local Data

Prometheus compaction combines blocks; it does not automatically turn old raw host samples into hourly rollups. Keeping a 15-second series for a year keeps its samples at that resolution in local TSDB blocks.

If long-range queries only need hourly capacity summaries, create recording rules for the required aggregates and send or retain them according to the long-term architecture. Do not assume shortening local raw retention will preserve older recording-rule history unless those recorded series are stored somewhere with the desired policy.

Prometheus local retention applies at the TSDB level, not as a different retention duration for each metric name. A remote system may offer per-tenant, per-resolution, or downsampling policies, but those are product-specific.

## Retention Is Not Backup or High Availability

Prometheus local storage is not clustered or replicated. Thirty days of retention on one disk does not protect against disk loss or node loss.

The official storage documentation recommends snapshots for backups. Copying a live TSDB directory without a snapshot risks an incoherent backup because the head and WAL are being mutated.

Similarly, two highly available Prometheus replicas each need their own storage. Replication increases availability but roughly duplicates local storage consumption; retention does not deduplicate replicas.

Define separately:

- how long data remains queryable;
- how Prometheus survives a process or node failure;
- how data is backed up and restored;
- whether remote write is required;
- what recovery point and recovery time are acceptable.

## Remote Write Does Not Eliminate Local Cost

Prometheus remote write forwards ingested samples to a remote endpoint. Those samples still enter the local ingestion path first. Configuring remote write does not by itself remove local head, WAL, CPU, or memory cost.

To reduce local disk history, set a shorter local retention after confirming:

- remote delivery is monitored;
- remote query access works for the required use cases;
- alert and dashboard queries use the intended data source;
- outages and backpressure have a runbook;
- durability and deletion behavior meet policy.

`write_relabel_configs` can reduce what is sent remotely, but because it is applied on the remote-write path, it does not reduce local scrape ingestion. Use `metric_relabel_configs` or exporter filtering when the series should not enter local Prometheus at all.

## Prefer Fewer Series Before Coarser Scraping

The Prometheus storage guide notes that reducing the number of scraped series is generally more effective than increasing the scrape interval because samples within one series compress well.

Prioritize:

1. remove unbounded or rapidly changing labels;
2. disable unused collectors and metric families;
3. exclude ephemeral mounts and devices;
4. aggregate where raw dimensions are not needed;
5. then consider a slower interval for slow-changing signals;
6. shorten local retention only after defining the required horizon.

These controls solve different costs:

- fewer series lowers head memory and index pressure;
- fewer samples lowers WAL, block, and remote-write volume;
- shorter retention lowers persistent historical blocks;
- recording rules can improve repeated query cost but add their own stored series.

## Roll Out a Retention Change Safely

1. Record current sample rate, head series, churn, disk use, compaction health, and query latency.
2. Estimate the new steady-state size with the documented formula.
3. Leave the official disk buffer plus environment-specific margin.
4. Test configuration syntax against the deployed Prometheus version.
5. Change one shard or replica first where the architecture permits.
6. Watch WAL, head, compaction, block size, and filesystem headroom.
7. Confirm the oldest queryable timestamp after the system reaches steady state.
8. Test long-range dashboards, recording rules, and incident workflows.

Reducing retention does not necessarily release every expected byte immediately. Prometheus removes whole expired blocks through background retention and compaction behavior.

## A Practical Decision

For a fleet whose incidents are normally investigated within seven days, deployment comparisons use 30 days, and quarterly trends need only hourly aggregates:

- retain 30 days of raw local metrics if the measured TSDB fits safely;
- record the small set of hourly capacity signals;
- send required raw or recorded series to a durable long-term system;
- cap local TSDB at no more than 80–85% of its dedicated disk;
- alert on actual disk headroom and remote-write health;
- review series cardinality before buying more storage.

The numbers are an example. The important part is connecting each retained dataset to a query and owner.

## Summary

Choose host-metric retention from real investigation and planning horizons, then size it with measured append rate and Prometheus's 1–2-byte-per-sample estimate. Add head-series, churn, WAL, head-chunk, compaction, and filesystem margin; when using size retention, Prometheus recommends at most 80–85% of allocated disk. Use remote storage for requirements local single-node TSDB cannot meet, and reduce unnecessary series before trading away useful time resolution.

## Official Documentation

- [Prometheus local storage, sizing formula, retention, and disk-buffer guidance](https://prometheus.io/docs/prometheus/latest/storage/)
- [Prometheus current TSDB retention configuration](https://prometheus.io/docs/prometheus/latest/configuration/configuration/#tsdb)
- [Prometheus command-line storage options](https://prometheus.io/docs/prometheus/latest/command-line/prometheus/)
- [Prometheus remote write configuration](https://prometheus.io/docs/prometheus/latest/configuration/configuration/#remote_write)
- [Prometheus TSDB status API for cardinality statistics](https://prometheus.io/docs/prometheus/latest/querying/api/#tsdb-stats)
- [Prometheus storage snapshot API](https://prometheus.io/docs/prometheus/latest/querying/api/#snapshot)
