# How to Verify EFS Replication Initial Sync and Recovery-Point Readiness Before a Disaster-Recovery Test

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, EFS, Replication, Disaster Recovery

Description: Verify EFS replication timestamps, initial data availability, recovery dependencies, and application consistency before a disaster-recovery drill.

A replication configuration that exists is not yet proof of a usable disaster-recovery copy. Before switching an application to an EFS replica, establish that its initial sync completed, its recovery point is recent enough, and the recovery environment can actually read the required data.

EFS replication is asynchronous. AWS describes a 15-minute recovery point objective for most file systems after initial replication, with exceptions for some large and frequently changing datasets. Initial sync duration varies with data size and file count; it is not covered by a fixed “wait fifteen minutes” rule. [EFS replication behavior](https://docs.aws.amazon.com/efs/latest/ug/efs-replication.html).

## Record the actual replication pair

Use the source account and Region:

```bash
aws efs describe-replication-configurations \
  --region us-east-1 \
  --file-system-id fs-0123456789abcdef0 \
  --query 'Replications[0].{Source:SourceFileSystemId,SourceRegion:SourceFileSystemRegion,Destination:Destinations[0]}'
```

Save both file-system IDs, destination Region, status, `StatusMessage`, and `LastReplicatedTimestamp`. Verify direction explicitly if this pair has been used in a previous failback exercise.

`ENABLED` means the configuration is healthy. The last replicated timestamp identifies the completed synchronization boundary; changes after it might be missing. A healthy status by itself does not establish the recovery-point age that your application requires. [Viewing replication details](https://docs.aws.amazon.com/efs/latest/ug/monitoring-replication-status.html).

If the timestamp is absent, do not infer that initial sync completed. Wait for a successful synchronization boundary and demonstrate destination data availability. If the configuration is `PAUSED` or `ERROR`, read its message and resolve the cause, such as permissions, Region opt-in, or inaccessible KMS keys. Do not repeatedly recreate replication as a substitute for diagnosing it.

## Measure the lag instead of guessing

CloudWatch's `TimeSinceLastSync` uses both source and destination file-system dimensions. Locate the published series with `aws cloudwatch list-metrics --namespace AWS/EFS --metric-name TimeSinceLastSync` in the pair's Regions, then use that Region below:

```bash
aws cloudwatch get-metric-statistics \
  --region REPLACE_WITH_METRIC_REGION \
  --namespace AWS/EFS --metric-name TimeSinceLastSync \
  --dimensions \
    Name=FileSystemId,Value=fs-0123456789abcdef0 \
    Name=DestinationFileSystemId,Value=fs-0fedcba9876543210 \
  --start-time 2026-09-28T08:00:00Z \
  --end-time 2026-09-28T09:00:00Z \
  --period 60 --statistics Maximum \
  --query 'sort_by(Datapoints,&Timestamp)'
```

Substitute the actual drill window. Use the metric's published Region and the exact pair of dimensions. Missing data is not zero lag: inspect the replication API, metric discovery, and initial-sync state. [EFS CloudWatch metrics](https://docs.aws.amazon.com/efs/latest/ug/efs-metrics.html).

Compare the newest synchronized boundary with the application's permitted data-loss window. Keep a recent trend, since one fresh sample can hide a pattern of stalled replication during peak writes.

## Verify the recovery environment while the replica is read-only

Prepare destination mount targets and networking, DNS, client software, IAM policies, and application-specific access points. Mount from an isolated recovery client using the same identity model the real service will use. Treat those dependencies as deployed infrastructure; successful data replication does not validate client authorization.

EFS makes replicated data accessible after the initial sync completes. Check representative paths, numeric ownership, file modes, symlinks, and trusted checksums. A service that mounts successfully but cannot traverse its access-point root is not ready for failover.

Keep this phase read-only. For a non-disruptive drill, run read-only application checks or restore a backup into an isolated writable file system. Deleting replication to test writes changes the protection state and requires a full failover/failback plan.

## Add a canary without mistaking it for consistency

An approved canary file can demonstrate that one known write arrived. Write unique content on the source, flush it using the application's normal durability mechanism, and record the time. Later, read and compare that content on the destination.

Seeing the canary is only evidence about that file. It does not prove that all files from a business transaction are consistent. EFS documents that replication changes are not transferred as a point-in-time-consistent snapshot. For a planned cutover, quiesce all writers, flush/checkpoint the application, record the completed write boundary, and wait until `LastReplicatedTimestamp` covers it before changing roles. [Replication consistency model](https://docs.aws.amazon.com/efs/latest/ug/efs-replication.html).

Use synchronized clocks for timestamp comparisons and retain the final API response. If writers cannot be stopped during an outage, document the known synchronization boundary and potential loss instead of claiming zero-loss recovery.

## Define a go/no-go record

A practical readiness record includes:

- Correct source/destination identity and a healthy configuration.
- A completed initial sync with readable representative data.
- A recovery timestamp within the accepted objective.
- Verified mount, authorization, and application read checks.
- A writer-fencing plan, cutover owner, and failback procedure.

For a planned writable drill, freeze changes before the final gate and keep the original application fenced until one side is deliberately selected as the writer. A replica is ready when the data boundary and application dependencies are understood, not when a console badge turns green.
