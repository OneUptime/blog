# EFS Throughput Suddenly Collapses: Reading `BurstCreditBalance`, `PercentIOLimit`, and `PermittedThroughput` Together

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, EFS, CloudWatch, Performance

Description: Diagnose EFS throughput drops by correlating burst credits, permitted throughput, I/O utilization, and workload behavior.

A batch job starts quickly, then slows while its input queue grows. CPU is idle and the EFS mount still responds. Before increasing worker counts, determine whether the file system ran out of burst credits, reached its throughput ceiling, or exhausted its operation budget. Those failures can look similar to the application but call for different changes.

The following workflow assumes a Linux client and AWS CLI credentials with read access to EFS and CloudWatch. Use the same account, Region, file-system ID, and time window throughout the investigation.

## Establish the configuration

```bash
aws efs describe-file-systems \
  --region us-east-1 \
  --file-system-id fs-0123456789abcdef0 \
  --query 'FileSystems[0].{Mode:ThroughputMode,Performance:PerformanceMode,ProvisionedMiBps:ProvisionedThroughputInMibps,StandardBytes:SizeInBytes.ValueInStandard}'
```

`BurstCreditBalance` is relevant to Bursting throughput. Do not diagnose an Elastic file system from an old burst-credit alarm. Bursting's capacity depends on data in **Standard**, so a large total dataset does not necessarily imply a large baseline after lifecycle transitions.

## Put four signals on one timeline

In CloudWatch, select namespace `AWS/EFS` and the `FileSystemId` dimension. Start with one-minute periods and these statistics:

| Metric | Statistic | Diagnostic question |
|---|---|---|
| `BurstCreditBalance` | Minimum | Did credits reach zero at the slowdown? |
| `PermittedThroughput` | Average | Did the allowed bytes per second change? |
| `PercentIOLimit` | Maximum | Is General Purpose operation capacity saturated? |
| `MeteredIOBytes` | Sum | How much capacity did the workload consume? |

AWS defines `MeteredIOBytes` as throughput-accounted work, including metadata and the read discount. `TotalIOBytes` has different accounting, so using it as the numerator can produce misleading utilization. [EFS metric definitions](https://docs.aws.amazon.com/efs/latest/ug/efs-metrics.html).

Assign `m1` to the `MeteredIOBytes` sum and `m2` to average `PermittedThroughput`. Add these metric-math expressions, setting each ID separately from its expression:

| ID | Expression |
|---|---|
| `metered_bytes_per_second` | `m1 / PERIOD(m1)` |
| `throughput_utilization_percent` | `100 * (m1 / PERIOD(m1)) / m2` |

The units matter: one metric contains bytes over a period and the other already contains bytes per second. Do not divide both by 60. Keep both inputs at the same period. [AWS metric-math guidance](https://docs.aws.amazon.com/efs/latest/ug/monitoring-metric-math.html).

For a CLI spot check, substitute the actual UTC incident window:

```bash
aws cloudwatch get-metric-statistics \
  --region us-east-1 --namespace AWS/EFS \
  --metric-name PermittedThroughput \
  --dimensions Name=FileSystemId,Value=fs-0123456789abcdef0 \
  --start-time 2026-09-28T08:00:00Z \
  --end-time 2026-09-28T09:00:00Z \
  --period 60 --statistics Average \
  --query 'sort_by(Datapoints,&Timestamp)'
```

An empty result means to check the window, dimension, Region, and metric availability. It does not establish zero utilization.

## Recognize the failure pattern

**Credits empty, permitted throughput falls, utilization stays high:** this is strong evidence of Bursting depletion. Compare Standard storage before and after recent lifecycle or deletion changes. If a workload needs sustained capacity above the baseline, reducing concurrency only spreads the backlog over more time. Consider Elastic or an appropriately sized Provisioned configuration after checking compatibility and cost.

**Credits remain, utilization approaches 100%, operation utilization is moderate:** the workload is likely reaching throughput capacity. Look for larger transfers, additional clients, a backup export, or another application sharing the file system. Remember that these metrics describe every client together.

**`PercentIOLimit` approaches 100% while metered throughput remains relatively low:** investigate many small requests or metadata calls. An application that repeatedly opens files or scans directories can spend its operation budget without moving much useful payload. Compare `MetadataIOBytes` and data-operation counts with the same healthy period.

**All three capacity indicators have headroom:** examine the client. A serial program, CPU-bound TLS processing, instance network limits, retransmissions, locks, and cold-file reads can limit throughput independently. A quiet EFS graph cannot prove the network or application is healthy.

AWS recommends Elastic or Provisioned when Bursting is throughput constrained, including depleted credits. Throughput and performance mode are separate settings; current guidance recommends General Purpose for performance. [EFS performance specifications](https://docs.aws.amazon.com/efs/latest/ug/performance.html).

## Verify the repair against useful work

Record completed files or jobs per minute and application p95 latency alongside the storage metrics. Repeat the workload long enough to include the interval where the original collapse occurred. A five-minute benchmark does not validate a two-hour batch.

If switching to Provisioned or changing its amount, account for the documented 24-hour restrictions on decreasing it or switching away. After any change, verify that queue depth stabilizes, the same work finishes within its target, and throughput spending is acceptable. Alert on sustained capacity pressure plus application impact; a single low-credit threshold cannot explain every slow EFS workload.
