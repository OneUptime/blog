# Validation Summary: How to Reduce EC2 Costs with Right-Sizing

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- AWS EC2
- Amazon CloudWatch
- AWS Compute Optimizer
- AWS CLI
- Boto3 / Python
- Terraform AWS provider
- Amazon EventBridge / CloudWatch Events scheduled rules
- EC2 Auto Scaling instance refresh

## Sources Consulted
- AWS EC2 CloudWatch metrics: https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/viewing_metrics_with_cloudwatch.html
- AWS Compute Optimizer EC2 metrics: https://docs.aws.amazon.com/compute-optimizer/latest/ug/ec2-metrics-analyzed.html
- AWS Well-Architected Cost Optimization Pillar, right-sizing: https://docs.aws.amazon.com/wellarchitected/latest/cost-optimization-pillar/select-the-correct-resource-type-size-and-number.html
- Boto3 CloudWatch get_metric_statistics: https://docs.aws.amazon.com/boto3/latest/reference/services/cloudwatch/client/get_metric_statistics.html
- Boto3 EC2 describe_instances: https://docs.aws.amazon.com/boto3/latest/reference/services/ec2/client/describe_instances.html
- AWS CLI create-launch-template-version: https://docs.aws.amazon.com/cli/latest/reference/ec2/create-launch-template-version.html
- AWS CLI update-auto-scaling-group: https://docs.aws.amazon.com/cli/latest/reference/autoscaling/update-auto-scaling-group.html
- AWS CLI start-instance-refresh: https://docs.aws.amazon.com/cli/latest/reference/autoscaling/start-instance-refresh.html
- AWS CLI create-image: https://docs.aws.amazon.com/cli/latest/reference/ec2/create-image.html
- AWS CLI modify-instance-attribute: https://docs.aws.amazon.com/cli/latest/reference/ec2/modify-instance-attribute.html
- AWS EC2 change instance type guide: https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/change-instance-type-of-ebs-backed-instance.html
- AWS EC2 instance store data persistence: https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/instance-store-lifetime.html
- AWS EC2 burstable unlimited mode: https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/burstable-performance-instances-unlimited-mode.html
- AWS schedule expression reference: https://docs.aws.amazon.com/AmazonCloudWatch/latest/logs/scheduled-queries-schedule-reference.html
- Terraform AWS provider aws_cloudwatch_event_rule: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/cloudwatch_event_rule
- Terraform AWS provider aws_cloudwatch_event_target: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/cloudwatch_event_target

## Issues Found
- The post said the first script collected CPU, memory, and network metrics, but the script only queried EC2 CPU and network metrics. EC2 does not publish memory utilization in the `AWS/EC2` namespace by default. Updated the text to say the script collects CPU and network metrics, and noted that memory sizing requires CloudWatch agent or Compute Optimizer memory metrics.
- The `NetworkIn` calculation requested the `Average` statistic but labeled the result as MB/day. For daily received bytes, `Sum` is the appropriate statistic. Updated the script to request and average daily `Sum` datapoints.
- The downsizing example said "xlarge to small" was two sizes. In the common EC2 size sequence, `xlarge` to `small` skips through `large` and `medium`. Updated the example to `xlarge` to `medium`.
- The T-series recommendation referred to "unlimited credits", which could imply free unlimited CPU bursting. AWS unlimited mode can incur surplus credit charges above baseline. Updated the recommendation to monitor CPU credits and unlimited-mode surplus charges.
- The backup command for stateful instances used `--no-reboot` without caveat. AWS documents this as crash-consistent because buffered and in-memory data is not included. Removed `--no-reboot` from the default command and added a short note that it should only be used when crash-consistency is acceptable.
- The opening savings claim was too absolute. Updated it to state that right-sizing is one of the biggest EC2 cost opportunities and that 30-50% savings are possible when instances are significantly over-provisioned.

## Review Notes
- Python examples were checked for syntax with Python 3 compilation.
- AWS CLI was not installed in the local environment, so CLI examples were verified against official AWS CLI command references instead of local `--help`.
- The Terraform resources shown are still available in the Terraform AWS provider documentation. The snippet is minimal and assumes the referenced Lambda function and permissions exist elsewhere.
- Internal OneUptime links referenced in the post correspond to existing post directories in the repository.
