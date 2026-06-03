# Validation Summary: How to Configure EFS Throughput Modes (Bursting vs Provisioned)

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Amazon Elastic File System (Amazon EFS)
- EFS Bursting, Provisioned, and Elastic throughput modes
- AWS CLI
- Amazon CloudWatch metrics and alarms
- Python
- boto3
- AWS Lambda

## Sources Consulted
- Amazon EFS performance specifications: https://docs.aws.amazon.com/efs/latest/ug/performance.html
- Managing file system throughput: https://docs.aws.amazon.com/efs/latest/ug/managing-throughput.html
- Amazon EFS quotas: https://docs.aws.amazon.com/efs/latest/ug/limits.html
- AWS CLI `efs create-file-system` command reference: https://docs.aws.amazon.com/cli/latest/reference/efs/create-file-system.html
- AWS CLI `efs update-file-system` command reference: https://docs.aws.amazon.com/cli/latest/reference/efs/update-file-system.html
- CloudWatch metrics for Amazon EFS: https://docs.aws.amazon.com/efs/latest/ug/efs-metrics.html
- AWS CLI `cloudwatch get-metric-statistics` command reference: https://docs.aws.amazon.com/cli/latest/reference/cloudwatch/get-metric-statistics.html
- Amazon EFS pricing: https://aws.amazon.com/efs/pricing/

## Issues Found
- The post described Bursting as the default without qualification. Updated this to clarify that Bursting is the AWS CLI/API default when omitted, while Elastic is the AWS-recommended default in the EFS console.
- The Bursting throughput explanation used an oversimplified 100 MB/s limit and said larger file systems' burst throughput equals baseline. Updated the read/write-specific limits, TiB-based scaling, and 10 TiB example to match AWS EFS documentation.
- The Provisioned and Elastic throughput limits were outdated. Updated the limits to the current Regional ranges documented by AWS.
- The throughput-mode cooldown statement was incomplete. Updated it to reflect the AWS restriction after switching to Provisioned throughput or changing the provisioned amount.
- Several units used decimal GB/TB/MB wording where AWS documents EFS throughput in GiB/TiB/MiB. Updated the affected examples, comments, and descriptions.
- The burst duration code used a fixed 2.1 TiB maximum credit balance for all file systems and subtracted baseline from the burst rate. Updated it to use the AWS-documented 2.1 TiB per TiB rule for larger file systems and to match AWS's documented burst-duration calculation.
- The Lambda example used fixed February 2026 CloudWatch timestamps and selected the last returned datapoint, even though CloudWatch datapoints are not returned in chronological order. Updated it to query the last hour using timezone-aware datetimes and select the newest datapoint by timestamp.
- The best-practice and wrap-up advice said to start with Bursting by default. Updated it to recommend Elastic for unpredictable workloads and Bursting when the user specifically wants throughput tied to stored data.

## Review Notes
The AWS CLI commands and boto3 API names are current. The cost examples remain approximate and region-specific; future reviews should re-check pricing because AWS pricing and Regional throughput quotas can change.
