# Validation Summary: EFS Throughput Suddenly Collapses: Reading `BurstCreditBalance`, `PercentIOLimit`, and `PermittedThroughput` Together

## Status
validated

## Post Type
Technical troubleshooting guide

## Technologies Covered
- Amazon Elastic File System (EFS): throughput modes, performance modes, storage classes, and burst credits.
- Amazon CloudWatch: EFS metrics, statistics, dimensions, and metric math.
- AWS CLI and JMESPath queries.
- Linux NFS clients and application performance diagnosis.

## Sources Consulted
- [EFS CloudWatch metric definitions](https://docs.aws.amazon.com/efs/latest/ug/efs-metrics.html)
- [EFS metric-math guidance](https://docs.aws.amazon.com/efs/latest/ug/monitoring-metric-math.html)
- [CloudWatch expression syntax and IDs](https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/using-metric-math.html)
- [EFS performance specifications and throughput restrictions](https://docs.aws.amazon.com/efs/latest/ug/performance.html)
- [AWS CLI: describe-file-systems](https://docs.aws.amazon.com/cli/latest/reference/efs/describe-file-systems.html)
- [AWS CLI: get-metric-statistics](https://docs.aws.amazon.com/cli/latest/reference/cloudwatch/get-metric-statistics.html)
- [EFS performance tips](https://docs.aws.amazon.com/efs/latest/ug/performance-tips.html)
- [EFS performance troubleshooting](https://docs.aws.amazon.com/efs/latest/ug/troubleshooting-efs-general.html)
- [JMESPath specification](https://jmespath.org/specification.html)
- [Author profile](https://github.com/nawazdhandala)

## Issues Found
- The metric-math example presented each calculation as an assignment (`name = formula`). CloudWatch requires the ID and expression to be entered separately; pasting an entire assignment is not valid expression syntax. Replaced the assignment block with an ID/expression table and clarified the instruction. The calculations themselves were correct and remain unchanged.

## Review Notes
- Confirmed both CLI operations, options, response field names, and JMESPath query structure against their official references. Both Bash snippets passed local shell syntax checks. No requests were made against a live AWS file system; account permissions, actual telemetry, and workload behavior were not tested.
- Confirmed the metric namespace, dimension, statistics, units, read-discount accounting, and conversion from period totals to bytes per second. The utilization formula matches AWS guidance.
- Confirmed Standard-storage dependence of Bursting capacity, the relevance of burst credits to Bursting, General Purpose operation-limit monitoring, and the separation of performance and throughput modes. The diagnostic patterns are evidence to investigate, not guarantees of a unique cause.
- Confirmed AWS guidance on throughput-constrained Bursting workloads and the 24-hour restrictions after switching to Provisioned throughput or changing its amount.
- For older incidents, CloudWatch requires coarser periods: one-minute data is retained for 15 days, five-minute data for 63 days, and hourly data for 455 days. The example is suitable for a recent one-hour incident and explicitly asks readers to substitute the actual window.
- `ProvisionedThroughputInMibps` applies to Provisioned mode; it can be absent and therefore appear as null in the query for other modes. `PercentIOLimit` describes General Purpose performance capacity.
- The post's documentation links and author link resolved to the intended resources. No deprecated CLI operations or explicit software-version dependencies were found.
