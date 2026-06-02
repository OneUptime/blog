# Validation Summary: How to Implement Post-Migration Optimization on AWS

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- AWS Compute Optimizer
- Amazon EC2
- Amazon CloudWatch
- Amazon EBS
- Amazon S3 Lifecycle
- Amazon EC2 Auto Scaling
- AWS Cost Explorer / Cost Management
- AWS Savings Plans
- Amazon ElastiCache
- AWS Cost Anomaly Detection
- Python and boto3
- AWS CLI

## Sources Consulted
- AWS CLI Command Reference: Compute Optimizer `get-ec2-instance-recommendations` - https://docs.aws.amazon.com/cli/latest/reference/compute-optimizer/get-ec2-instance-recommendations.html
- AWS CLI Command Reference: EC2 `describe-volumes` - https://docs.aws.amazon.com/cli/latest/reference/ec2/describe-volumes.html
- AWS CLI Command Reference: EC2 `modify-volume` - https://docs.aws.amazon.com/cli/latest/reference/ec2/modify-volume.html
- Amazon EBS User Guide: General Purpose SSD volumes - https://docs.aws.amazon.com/ebs/latest/userguide/general-purpose.html
- Amazon S3 User Guide: Lifecycle configuration elements - https://docs.aws.amazon.com/AmazonS3/latest/userguide/intro-lifecycle-rules.html
- AWS CLI Command Reference: Auto Scaling `create-auto-scaling-group` - https://docs.aws.amazon.com/cli/latest/reference/autoscaling/create-auto-scaling-group.html
- AWS CLI Command Reference: Auto Scaling `put-scaling-policy` - https://docs.aws.amazon.com/cli/latest/reference/autoscaling/put-scaling-policy.html
- AWS CLI Command Reference: Cost Explorer `start-savings-plans-purchase-recommendation-generation` - https://docs.aws.amazon.com/cli/latest/reference/ce/start-savings-plans-purchase-recommendation-generation.html
- AWS CLI Command Reference: Cost Explorer `get-savings-plans-purchase-recommendation` - https://docs.aws.amazon.com/cli/latest/reference/ce/get-savings-plans-purchase-recommendation.html
- AWS CLI Command Reference: Cost Explorer `create-anomaly-monitor` - https://docs.aws.amazon.com/cli/latest/reference/ce/create-anomaly-monitor.html
- AWS CLI Command Reference: Cost Explorer `create-anomaly-subscription` - https://docs.aws.amazon.com/cli/latest/reference/ce/create-anomaly-subscription.html
- AWS CLI Command Reference: ElastiCache `create-replication-group` - https://docs.aws.amazon.com/cli/latest/reference/elasticache/create-replication-group.html
- Boto3 CloudWatch `get_metric_statistics` API reference - https://boto3.amazonaws.com/v1/documentation/api/latest/reference/services/cloudwatch/client/get_metric_statistics.html
- Boto3 EC2 `describe_instances` API reference - https://boto3.amazonaws.com/v1/documentation/api/latest/reference/services/ec2/client/describe_instances.html

## Issues Found
- The Compute Optimizer command used `OVER_PROVISIONED` as a filter value. The CLI filter value for EC2 instance recommendations is `Overprovisioned`, so the command was updated.
- The Compute Optimizer query used metric names `CPU_MAXIMUM` and `MEMORY_MAXIMUM`, but the response uses utilization metric names such as `Cpu` and `Memory` with a `Maximum` statistic. The query was updated to use the current metric names.
- The Compute Optimizer query read savings from `recommendationOptions[0].estimatedMonthlySavings.value`, but the current response nests this under `recommendationOptions[0].savingsOpportunity.estimatedMonthlySavings.value`. The query was corrected.
- The Python CloudWatch helper docstring said it returned CPU and network utilization, but the code only retrieves CPU utilization. The docstring was corrected.
- The EC2 Auto Scaling target tracking example included `ScaleInCooldown` and `ScaleOutCooldown`, which are not fields in EC2 Auto Scaling `TargetTrackingConfiguration`. The invalid fields were removed and `--estimated-instance-warmup 300` was added for the valid EC2 Auto Scaling warm-up setting.
- The Savings Plans recommendation command used `aws cost-explorer`, but the AWS CLI namespace is `aws ce`. The command was corrected.
- The Savings Plans recommendation section did not request generation before retrieving recommendations. Added `aws ce start-savings-plans-purchase-recommendation-generation`, which AWS documents as the first step for a fresh recommendation set.
- The Cost Anomaly Detection subscription used deprecated `Threshold`. It was replaced with `ThresholdExpression` using `ANOMALY_TOTAL_IMPACT_ABSOLUTE` and the required `GREATER_THAN_OR_EQUAL` match option.

## Review Notes
The broad cost percentage claims are plausible guidance but are not AWS API-level facts and should be treated as unsourced estimates. Compute Optimizer memory recommendations require memory metrics from the CloudWatch Agent; the post's Compute Optimizer query will show memory only where that telemetry is available.
