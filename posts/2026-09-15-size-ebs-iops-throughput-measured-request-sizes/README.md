# How to Size EBS IOPS and Throughput from Measured I/O Request Sizes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: AWS, Amazon EBS, Capacity Planning, Storage Performance, Monitoring

Description: Translate aligned EBS operation and byte measurements into separate IOPS and throughput budgets while accounting for request splitting and workload peaks.

---

A volume processing 8 KiB random reads needs a different performance configuration from one streaming 1 MiB chunks, even if both applications report the same number of read calls. Start at the EBS measurement boundary, preserve the workload's time profile, and size IOPS and throughput separately.

The examples below use SSD-backed EBS semantics and invented measurements. They are calculations to adapt, not benchmark results for a particular instance.

## Choose one measurement boundary

Application requests, operating-system block requests, and EBS operations are not interchangeable. Caches can avoid disk reads, and storage layers can merge or split requests. AWS documents a maximum counted I/O size of 256 KiB for SSD volumes; larger operations are split, and eligible sequential operations can merge. [EBS I/O characteristics](https://docs.aws.amazon.com/ebs/latest/userguide/ebs-io-characteristics.html)

For example, 500 application reads per second at 1 MiB each represent 500 MiB/s. If all those reads reach an SSD EBS volume and splitting is the only change in request shape, the workload implies 2,000 counted EBS IOPS. Increasing only provisioned IOPS cannot solve a 125 MiB/s throughput ceiling.

Measure demand during normal peaks, checkpoints, compaction, backups, and recovery. If the volume is already throttled, completed-operation metrics describe delivered throughput, not all offered demand. Combine them with queue growth and application delay or repeat the measurement on an unconstrained representative configuration.

## Derive rates from aligned CloudWatch sums

For one volume and one interval, collect `VolumeReadOps`, `VolumeWriteOps`, `VolumeReadBytes`, and `VolumeWriteBytes` using the same timestamps, period, and dimension set. Use each metric's documented dimensions for the deployment, particularly with Multi-Attach. [Amazon EBS CloudWatch metrics](https://docs.aws.amazon.com/ebs/latest/userguide/using_cloudwatch_ebs.html)

Given sums over `T` seconds:

```text
IOPS = (read_ops + write_ops) / T
MiB/s = (read_bytes + write_bytes) / T / 1,048,576
mean KiB per EBS operation = total_bytes / total_ops / 1,024
```

Return no mean when `total_ops` is zero. Do not average per-interval mean sizes without weighting them by operation count. For one minute with 120,000 read operations, 60,000 write operations, and a combined 4,320 MiB transferred:

```python
seconds = 60
ops = 120_000 + 60_000
bytes_total = 4_320 * 1024**2
print(ops / seconds)                    # 3000.0 IOPS
print(bytes_total / seconds / 1024**2)   # 72.0 MiB/s
print(bytes_total / ops / 1024)          # 24.576 KiB/op
```

That mean does not say every operation is approximately 25 KiB. A mix of small random reads and large writes can have the same average. Preserve read/write statistics and obtain an operation-size distribution from suitable OS or application diagnostics when the mixture matters.

## Keep separate peak requirements

Suppose representative aligned intervals show:

| Workload phase | Delivered EBS IOPS | Delivered throughput |
| --- | ---: | ---: |
| Transaction peak | 6,000 | 90 MiB/s |
| Export | 2,000 | 500 MiB/s |
| Checkpoint overlap | 7,000 | 350 MiB/s |

With an explicitly chosen 25% uncertainty allowance, the volume must accommodate at least 8,750 IOPS and 625 MiB/s across these scenarios. The independent maxima occur in different rows; provisioning both dimensions is still necessary if the same volume must handle every row. Also test their overlap if it can occur operationally.

Use short enough intervals to see the saturation period. One-minute EBS metrics can hide sub-minute bursts, so inspect higher-resolution local measurements where necessary. Include peak duration; a brief startup test cannot establish sustained capacity.

## Check a candidate configuration

`gp3` lets you provision performance separately from GiB within its supported constraints. The current AWS documentation describes baseline 3,000 IOPS and 125 MiB/s, additional IOPS up to 500 per GiB, and provisioned throughput up to 0.25 MiB/s per provisioned IOPS, subject to service maxima and platform differences. [General Purpose SSD performance](https://docs.aws.amazon.com/ebs/latest/userguide/general-purpose.html)

For the illustrative demand above, 100 GiB, 9,000 IOPS, and 625 MiB/s pass those ratio checks. The 100 GiB choice must independently satisfy the data, growth, and maintenance-space budget. It is not selected by the traffic calculation.

Check the attached EC2 instance's aggregate EBS IOPS and bandwidth across all volumes, including the root volume, and distinguish sustained performance from burst allowances. A configuration that fits one volume can still exceed the host's path. [EBS-optimized instance limits](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/ebs-optimized.html)

## Prove latency at the proposed setting

Use a disposable volume and a representative dataset, filesystem, encryption configuration, instance type, and read/write mix. Test ordinary traffic plus the identified maintenance and recovery phases. Generic storage benchmarks are useful only when they preserve relevant I/O size, concurrency, locality, and caching behavior.

Accept the configuration when useful application throughput, latency, queue stability, and storage metrics agree. Low IOPS alone is inconclusive: the application may be idle, serialized, cached, or blocked elsewhere. Retain the measurement interval and configuration with the capacity decision so later changes in request sizes trigger a new calculation.
