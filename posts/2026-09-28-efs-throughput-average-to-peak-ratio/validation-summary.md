# Validation Summary: Choose EFS Throughput Modes Using the Workload's Average-to-Peak Ratio

## Status
validated

## Post Type
Technical guide with AWS CLI commands and a Python calculation example.

## Technologies Covered
- Amazon Elastic File System (EFS): throughput modes, performance modes, storage classes, lifecycle policies, and quotas.
- Amazon CloudWatch: EFS metrics, aggregation, and metric retrieval APIs.
- AWS CLI and JMESPath output filtering.
- Python 3.

## Sources Consulted
- [Amazon EFS performance specifications](https://docs.aws.amazon.com/efs/latest/ug/performance.html): mode recommendations, baseline and burst credits, metering, and switching restrictions.
- [CloudWatch metrics for Amazon EFS](https://docs.aws.amazon.com/efs/latest/ug/efs-metrics.html): MeteredIOBytes statistics and BurstCreditBalance.
- [Features of Amazon EFS](https://docs.aws.amazon.com/efs/latest/ug/features.html): Archive compatibility and billing considerations.
- [Amazon EFS quotas](https://docs.aws.amazon.com/efs/latest/ug/limits.html): Region, aggregate, and client limits.
- [Amazon EFS pricing](https://aws.amazon.com/efs/pricing/): Elastic usage charges and included Provisioned baseline.
- [AWS CLI describe-file-systems](https://docs.aws.amazon.com/cli/latest/reference/efs/describe-file-systems.html): flags and response fields.
- [AWS CLI update-file-system](https://docs.aws.amazon.com/cli/latest/reference/efs/update-file-system.html): throughput-mode option and supported values.
- [Filtering output in the AWS CLI](https://docs.aws.amazon.com/cli/latest/userguide/cli-usage-filter.html): JMESPath indexing and multiselect hashes.
- [CloudWatch GetMetricStatistics API](https://docs.aws.amazon.com/AmazonCloudWatch/latest/APIReference/API_GetMetricStatistics.html): datapoint limits and failure behavior.
- [CloudWatch GetMetricData API](https://docs.aws.amazon.com/AmazonCloudWatch/latest/APIReference/API_GetMetricData.html): retrieval capacity and pagination.
- [AWS CLI get-metric-statistics](https://docs.aws.amazon.com/cli/latest/reference/cloudwatch/get-metric-statistics.html): supported periods and retention.
- [Python built-in functions](https://docs.python.org/3/library/functions.html): sum, len, and max.
- [Python format specification](https://docs.python.org/3/library/string.html#format-specification-mini-language): decimal and percentage formatting.

## Issues Found
- Clarified CloudWatch request-limit behavior. The original instruction to split requests “rather than silently dropping intervals” could suggest that GetMetricStatistics silently truncates oversized responses. AWS documents an error when a request exceeds 1,440 datapoints. Updated that sentence to state the error explicitly while preserving the advice to split the window. No other technical errors were found.

## Review Notes
- Confirmed the overlapping AWS recommendations at 5%; the post correctly avoids treating this as an exact pricing break-even point.
- Verified Standard-storage-dependent Bursting capacity, credit recovery, Provisioned baseline contribution, Max I/O incompatibility with Elastic, Archive constraints, and the documented 24-hour Provisioned restriction.
- Verified that MeteredIOBytes Sum divided by seconds gives metered bytes per second, whereas Average describes operation size. Convert bytes per second to MiB/s by dividing by 1,048,576 when preparing observations in the example’s units.
- Executed the Python example successfully: `average=18.58, peak=400.00, ratio=4.6%`. The synthetic list is illustrative and does not claim to contain seven days of one-minute observations.
- Both shell examples passed `bash -n`. Command flags, output field names, and the JMESPath projection were checked against AWS documentation. Commands were not executed against a live AWS account; the example file-system ID must be replaced, with suitable credentials and permissions.
- Seven days contain 10,080 one-minute or 2,016 five-minute intervals. The latter exceeds a single GetMetricStatistics request; the post correctly calls for splitting the window. One-minute data is retained for 15 days; older observation windows require coarser periods. Follow GetMetricData pagination when a response includes NextToken.
- All six external link occurrences in the post resolve to appropriate official AWS resources. No deprecated API usage or explicit software-version claims were identified. Current pricing and quotas remain deployment-specific checks.
