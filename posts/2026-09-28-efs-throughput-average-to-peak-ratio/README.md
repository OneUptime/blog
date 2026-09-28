# Elastic, Provisioned, or Bursting EFS Throughput? Choose from the Workload’s Average-to-Peak Ratio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, EFS, Performance, Storage

Description: Measure an EFS workload’s average-to-peak ratio and use it with storage size, quotas, and costs to choose a throughput mode.

Two EFS workloads can peak at the same throughput and need different configurations. A daily ten-minute export leaves most of the day idle. A processing service may sustain almost its peak throughout business hours. Provisioning both for their maximum hides that difference.

Average-to-peak ratio makes the distinction measurable. It is a starting point for choosing throughput mode, followed by a capacity test and a cost comparison for the target Region.

## Interpret the AWS recommendation carefully

AWS recommends Elastic for unpredictable workloads or an average-to-peak ratio of 5% or less, and Provisioned for known requirements or a ratio of 5% or more. Bursting ties throughput to Standard storage size. The recommendations overlap at 5%; that is a decision boundary to investigate, not an exact billing break-even formula. [Choosing EFS throughput mode](https://docs.aws.amazon.com/efs/latest/ug/performance.html).

First check the existing file system:

```bash
aws efs describe-file-systems \
  --region us-east-1 \
  --file-system-id fs-0123456789abcdef0 \
  --query 'FileSystems[0].{Throughput:ThroughputMode,Performance:PerformanceMode,Standard:SizeInBytes.ValueInStandard,Provisioned:ProvisionedThroughputInMibps}'
```

Also identify every workload that shares it. A quiet web application and a nightly analytics export contribute to the same file-system demand.

## Measure a representative operating cycle

Choose a window containing busy days, idle periods, scheduled exports, and recovery jobs. Calculate throughput from the `Sum` of `MeteredIOBytes` divided by the period in seconds. Using `Average` for this metric measures average operation size, not average throughput. [EFS CloudWatch metrics](https://docs.aws.amazon.com/efs/latest/ug/efs-metrics.html).

For an illustrative seven-day analysis, export one-minute values through CloudWatch `GetMetricData`, or use five-minute values with `get-metric-statistics`. The latter accepts at most 1,440 returned datapoints, so split a longer window into requests rather than silently dropping intervals. [GetMetricStatistics API](https://docs.aws.amazon.com/AmazonCloudWatch/latest/APIReference/API_GetMetricStatistics.html).

With a complete series of equally spaced rates:

```python
# Illustrative MiB/s observations from equal-duration intervals.
rates = [2.0] * 1380 + [400.0] * 60
average = sum(rates) / len(rates)
peak = max(rates)
ratio = average / peak if peak else 0.0
print(f"average={average:.2f}, peak={peak:.2f}, ratio={ratio:.1%}")
```

This example gives about 4.6%. Treat missing observations separately: a collection gap is not known idle time. Keep the read/write mix and metadata workload alongside the ratio, because a future write-heavy deployment may not resemble today's read-heavy workload.

The interval also changes what “peak” means. A five-minute rate can hide a ten-second upload surge. Keep the measurement resolution in the decision record and use application telemetry for bursts that CloudWatch aggregates away. A capped file system measures delivered throughput, so a flat maximum during backlog growth is a lower bound on demand.

## Compare the three candidates

| Workload evidence | Candidate | What to prove |
|---|---|---|
| Short, unpredictable peaks; long idle periods | Elastic | Limits and spending fit the workload |
| Stable, forecastable demand | Provisioned | Capacity covers representative peaks with headroom |
| Large Standard dataset and moderate demand | Bursting | Baseline and credit recovery sustain the complete cycle |

For Bursting, inspect `BurstCreditBalance` through repeated cycles. A single successful run can spend credits accumulated over many idle days. Also model lifecycle transitions: data moving out of Standard can reduce the baseline even when total file-system size barely changes.

For Provisioned, size against metered demand and review the included baseline contribution. For Elastic, budget for actual read, write, and metadata activity. Use the current [EFS pricing page](https://aws.amazon.com/efs/pricing/) for the Region and storage configuration; the ratio alone cannot produce an invoice.

## Change one setting and observe

For an eligible General Purpose file system, this example selects Elastic:

```bash
aws efs update-file-system \
  --region us-east-1 \
  --file-system-id fs-0123456789abcdef0 \
  --throughput-mode elastic
```

Check `describe-file-systems` after the update and compare job duration, queue growth, throughput utilization, and cost over the same operating cycle. Verify current Region and per-client quotas before assuming the service can satisfy a larger peak. One client can hit its limit while the file system still has aggregate headroom.

There are configuration constraints: Max I/O does not support Elastic, and Archive lifecycle/storage requirements constrain switching away from Elastic. Provisioned also has a 24-hour restriction after switching into it or changing its amount before decreasing it or changing mode. Review [throughput restrictions](https://docs.aws.amazon.com/efs/latest/ug/performance.html) and [storage-class compatibility](https://docs.aws.amazon.com/efs/latest/ug/features.html) before scheduling the change.

A useful decision record contains the observation window, sampling interval, ratio, read/write mix, Standard bytes, expected growth, and measured application result. Revisit it when the workload changes; an average calculated before a new tenant or export pipeline is weak evidence for current capacity.
