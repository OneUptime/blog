# Disk Busy but Not Full: How to Alert on I/O Saturation, Queueing, and Latency

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Linux, Prometheus, Node Exporter, Disk I/O, Latency, Infrastructure Monitoring

Description: Detect storage contention from active time, outstanding work, request latency, throughput, and workload impact instead of confusing capacity with performance.

---

A filesystem with plenty of free space can still be an I/O bottleneck. Byte capacity answers “can more data be stored?” I/O saturation answers “can the storage complete current work fast enough?”

Linux exposes block-device counters through `/proc/diskstats` and `/sys/block/<device>/stat`. The node exporter translates them into Prometheus counters and gauges. A useful alert combines several views:

- active time;
- average outstanding I/O;
- completion latency;
- operation rate and throughput;
- application or system pressure.

No single `disk_busy > 80%` rule works for every HDD, SSD, NVMe device, RAID set, logical volume, and cloud disk.

## Know the Main node_exporter Metrics

| Question | Metric |
| --- | --- |
| How many reads completed? | `node_disk_reads_completed_total` |
| How many writes completed? | `node_disk_writes_completed_total` |
| How many bytes were read? | `node_disk_read_bytes_total` |
| How many bytes were written? | `node_disk_written_bytes_total` |
| How much cumulative time did reads take? | `node_disk_read_time_seconds_total` |
| How much cumulative time did writes take? | `node_disk_write_time_seconds_total` |
| Was at least one I/O in progress? | `node_disk_io_time_seconds_total` |
| What was time weighted by in-progress I/O? | `node_disk_io_time_weighted_seconds_total` |
| How many I/Os are in progress now? | `node_disk_io_now` |

All metrics except `node_disk_io_now` are cumulative counters. Use `rate()` or `increase()` rather than alerting on their raw values.

## Active Time Is a Clue, Not a Complete Saturation Metric

```promql
rate(node_disk_io_time_seconds_total[5m])
```

Linux increments the underlying active-time field while at least one I/O is in progress. A rate near `1` therefore means the device had outstanding work for nearly the whole range.

That does not mean every device has delivered 100% of its possible throughput:

- a parallel NVMe device can have continuous I/O and still accept more work;
- one slow request can keep a device active with very low throughput;
- virtual and stacked devices can report time at several layers;
- current kernels update active time with documented jiffy-based behavior that can miss time during concurrent requests.

Treat it as an active-time ratio, not a universal “percent capacity” gauge.

## Weighted I/O Time Approximates Average Outstanding Work

```promql
rate(node_disk_io_time_weighted_seconds_total[5m])
```

The kernel increments weighted time by the number of I/Os in progress multiplied by elapsed time. Its rate over a window is therefore a useful estimate of mean outstanding I/O, including work being serviced and work queued in the block layer.

Examples:

- approximately `0.2`: an average of 0.2 I/Os outstanding;
- approximately `1`: one I/O outstanding on average;
- approximately `8`: eight I/Os outstanding on average.

Eight is not automatically bad. It may overwhelm a single rotating disk but be normal for a device designed for deep parallel queues. Establish baselines by device class and correlate queue growth with latency.

`node_disk_io_now` is an instantaneous sample of the in-progress field. It is useful on a dashboard but can change entirely between scrapes, so the weighted counter is generally more stable for alerts.

## Calculate Completion Latency

Average read completion time:

```promql
rate(node_disk_read_time_seconds_total[5m])
/
rate(node_disk_reads_completed_total[5m])
```

Average write completion time:

```promql
rate(node_disk_write_time_seconds_total[5m])
/
rate(node_disk_writes_completed_total[5m])
```

Combined average read/write completion time:

```promql
(
  rate(node_disk_read_time_seconds_total[5m])
  +
  rate(node_disk_write_time_seconds_total[5m])
)
/
(
  rate(node_disk_reads_completed_total[5m])
  +
  rate(node_disk_writes_completed_total[5m])
)
```

The unit is seconds per completed operation. Multiply by 1000 only when a panel needs milliseconds:

```promql
1000 * (
  rate(node_disk_read_time_seconds_total[5m])
  /
  rate(node_disk_reads_completed_total[5m])
)
```

When no operations complete, the denominator is zero and the result is not useful. Require a minimum operation rate in an alert rather than forcing an artificial denominator.

These are means derived from aggregate kernel counters, not latency percentiles. A mean can hide a smaller population of very slow operations. Use application or storage-system histograms when percentile latency is required.

## Measure Load Placed on the Device

IOPS:

```promql
rate(node_disk_reads_completed_total[5m])
+
rate(node_disk_writes_completed_total[5m])
```

Throughput:

```promql
rate(node_disk_read_bytes_total[5m])
+
rate(node_disk_written_bytes_total[5m])
```

Average completed operation size:

```promql
(
  rate(node_disk_read_bytes_total[5m])
  +
  rate(node_disk_written_bytes_total[5m])
)
/
(
  rate(node_disk_reads_completed_total[5m])
  +
  rate(node_disk_writes_completed_total[5m])
)
```

Two workloads with the same IOPS can behave very differently if one performs small random writes and the other large sequential reads. Keep IOPS, bytes per second, operation size, latency, and read/write mix visible together.

## Build a Multi-Signal Warning

The following is an **illustrative** rule for a device class whose tested unacceptable point is 50 ms mean read/write completion time with more than two outstanding I/Os and meaningful traffic:

```yaml
groups:
  - name: host-disk-io
    rules:
      - alert: BlockDeviceIOSaturation
        expr: |
          (
            (
              rate(node_disk_read_time_seconds_total{device=~"nvme[0-9]+n[0-9]+|sd[a-z]+"}[5m])
              +
              rate(node_disk_write_time_seconds_total{device=~"nvme[0-9]+n[0-9]+|sd[a-z]+"}[5m])
            )
            /
            (
              rate(node_disk_reads_completed_total{device=~"nvme[0-9]+n[0-9]+|sd[a-z]+"}[5m])
              +
              rate(node_disk_writes_completed_total{device=~"nvme[0-9]+n[0-9]+|sd[a-z]+"}[5m])
            )
            > 0.050
          )
          and
          (
            rate(node_disk_io_time_weighted_seconds_total{device=~"nvme[0-9]+n[0-9]+|sd[a-z]+"}[5m])
            > 2
          )
          and
          (
            rate(node_disk_reads_completed_total{device=~"nvme[0-9]+n[0-9]+|sd[a-z]+"}[5m])
            +
            rate(node_disk_writes_completed_total{device=~"nvme[0-9]+n[0-9]+|sd[a-z]+"}[5m])
            > 5
          )
        for: 10m
        labels:
          severity: warning
        annotations:
          summary: "Sustained I/O contention on {{ $labels.instance }} {{ $labels.device }}"
```

Replace the device filter and thresholds with values validated for each storage class. A 50 ms limit may be far too loose for a latency-sensitive NVMe database and too strict for an archival rotating disk.

Use recording rules for the derived latency, queue, and IOPS expressions if many dashboards and alerts evaluate them repeatedly.

## Add Workload and PSI Evidence

The node exporter pressure collector exposes Linux I/O PSI totals:

```promql
rate(node_pressure_io_waiting_seconds_total[5m])
```

This measures time during which at least some tasks were stalled by I/O congestion.

```promql
rate(node_pressure_io_stalled_seconds_total[5m])
```

This measures time during which all non-idle tasks were stalled and no process could make progress because of I/O congestion.

PSI describes the effect on tasks, while diskstats describes block-device work. Together they are much stronger than either alone. Also correlate:

- database or application request latency;
- queue depth inside the application;
- filesystem writeback and dirty-memory behavior;
- cloud-volume burst credits or throttling;
- RAID, multipath, controller, and device error metrics.

CPU `iowait` can support an investigation, but Linux documents it as difficult to calculate reliably. It is not a substitute for device latency, queueing, and PSI.

## Choose the Correct Device Layer

One application write may appear on several devices:

```text
filesystem
  -> logical volume or device mapper
    -> RAID or multipath device
      -> physical or virtual block device
```

Summing every `node_disk_*` series can count the same operation more than once. Partition and whole-device counters can also overlap.

Alert at the layer where the bottleneck and ownership are meaningful:

- the cloud-volume device when cloud limits are enforced there;
- the RAID or multipath layer for service seen by the filesystem;
- physical members for hardware imbalance and failures;
- the application for user-visible latency.

Keep topology labels or inventory so an alert on `dm-3` can be mapped to its volume and workload.

## Summary

Free bytes do not measure I/O performance. Use disk active time to show continuous work, weighted I/O time to estimate outstanding work, cumulative read/write completion time divided by completed read/write operations for mean latency, and IOPS plus throughput to explain the load. Tune all thresholds by device class, avoid double counting stacked devices, and require sustained queueing, latency, PSI, or service impact before calling a disk saturated.

## Official Documentation

- [Linux kernel I/O statistics field definitions](https://docs.kernel.org/admin-guide/iostats.html)
- [Linux kernel Pressure Stall Information](https://docs.kernel.org/accounting/psi.html)
- [Prometheus node exporter diskstats collector source](https://github.com/prometheus/node_exporter/blob/master/collector/diskstats_linux.go)
- [Prometheus node exporter common disk metric definitions](https://github.com/prometheus/node_exporter/blob/master/collector/diskstats_common.go)
- [Prometheus `rate()` documentation](https://prometheus.io/docs/prometheus/latest/querying/functions/#rate)
- [Prometheus recording rule documentation](https://prometheus.io/docs/prometheus/latest/configuration/recording_rules/)
