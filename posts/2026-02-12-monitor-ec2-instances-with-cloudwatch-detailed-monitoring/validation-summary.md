# Validation Summary: How to Monitor EC2 Instances with CloudWatch Detailed Monitoring

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Amazon EC2
- Amazon CloudWatch metrics, alarms, and dashboards
- AWS CLI
- Amazon EC2 Auto Scaling
- Terraform AWS provider

## Sources Consulted
- AWS EC2 User Guide: Manage detailed monitoring for your EC2 instances - https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/manage-detailed-monitoring.html
- AWS EC2 User Guide: CloudWatch metrics that are available for your instances - https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/viewing_metrics_with_cloudwatch.html
- AWS CLI Command Reference: ec2 run-instances - https://docs.aws.amazon.com/cli/latest/reference/ec2/run-instances.html
- AWS CLI Command Reference: cloudwatch put-metric-alarm - https://docs.aws.amazon.com/cli/latest/reference/cloudwatch/put-metric-alarm.html
- AWS EC2 Auto Scaling User Guide: Example scaling policies for the AWS CLI - https://docs.aws.amazon.com/autoscaling/ec2/userguide/examples-scaling-policies.html
- AWS CloudWatch User Guide: Dashboard body structure and syntax - https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/CloudWatch-Dashboard-Body-Structure.html
- AWS CloudWatch Pricing - https://aws.amazon.com/cloudwatch/pricing/
- Terraform AWS Provider: aws_instance resource - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/instance
- Terraform AWS Provider: aws_launch_template resource - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/launch_template

## Issues Found
- The post stated that EC2 instances send metrics every 5 minutes by default. Updated this to "most metrics" because AWS documents status check metrics as available at 1-minute periods even with basic monitoring.
- The comparison table and explanation said detailed monitoring has the same metrics with finer granularity. Updated this to refer to supported metrics, because AWS documents CPU credit metrics as 5-minute only and packet count metrics as basic-monitoring 5-minute metrics.
- The metrics section said CPU credit metrics and network packet metrics arrive every minute with detailed monitoring. Removed those from the 1-minute list and added a note explaining their documented frequencies.
- The disk metric descriptions did not mention that EC2 `DiskRead*` and `DiskWrite*` instance metrics are for instance store volumes. Updated those descriptions to avoid implying EBS disk I/O coverage.
- The post used an outdated approximate cost of $3.50 per instance per month. Updated it to AWS's current per-metric pricing model and the official EC2 detailed monitoring pricing example of 7 metrics at $0.30 per metric per month.

## Review Notes
The AWS CLI commands, Terraform arguments, CloudWatch alarm period/evaluation settings, Auto Scaling target tracking policy shape, and dashboard body syntax matched current official documentation. The example AMI, subnet, security group, instance, account, and SNS identifiers are placeholders and must be replaced before use.
