# Validation Summary: How to Create CloudWatch Alarms for EC2 in Terraform

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Terraform
- HashiCorp AWS Provider
- Amazon CloudWatch alarms
- Amazon EC2 metrics
- Amazon SNS notifications

## Sources Consulted
- AWS EC2 User Guide: CloudWatch metrics available for EC2 instances: https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/viewing_metrics_with_cloudwatch.html
- Amazon CloudWatch User Guide: Stop, terminate, reboot, or recover an EC2 instance: https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/UsingAlarmActions.html
- Amazon CloudWatch API Reference: PutMetricAlarm: https://docs.aws.amazon.com/AmazonCloudWatch/latest/APIReference/API_PutMetricAlarm.html
- Terraform AWS Provider documentation: aws_cloudwatch_metric_alarm: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/cloudwatch_metric_alarm
- Terraform AWS Provider documentation: aws_sns_topic_subscription: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/sns_topic_subscription
- Terraform language documentation: for_each meta-argument: https://developer.hashicorp.com/terraform/language/meta-arguments/for_each
- Amazon SNS documentation: Subscribe API confirmation behavior: https://docs.aws.amazon.com/sns/latest/dg/example_sns_Subscribe_section.html

## Issues Found
- The post description claimed the tutorial covered memory alarms, but the post does not configure memory metrics. Updated the description to list CPU, status checks, disk, and network monitoring.
- The high CPU alarm comment said it triggered after 5 minutes, but `period = 300` and `evaluation_periods = 2` require two 5-minute periods. Updated the comment to 10 minutes.
- The network byte alarms described a 500 MB total over 5 minutes but used `Average`. Changed those alarms to `Sum`, which matches counter-style byte thresholds over the alarm period.
- The EBS section used `DiskReadOps` and `DiskWriteOps`, which AWS documents as instance store metrics, not EBS metrics. Changed them to `EBSReadOps` and `EBSWriteOps` and clarified that these per-instance EBS metrics apply to Nitro-based instances.
- The EBS read alarm was described as a latency alarm even though it monitors operation count. Updated the comment to read operations.
- The EBS operation alarms used `Average` for period operation totals. Changed them to `Sum` to match the operation-count thresholds.

## Review Notes
- Terraform was not installed in the local environment, so I could not run `terraform fmt` or `terraform validate`. The HCL snippets were reviewed against the Terraform AWS Provider and AWS CloudWatch documentation instead.
- Email SNS subscriptions require recipient confirmation outside Terraform; the resource configuration is valid, but unconfirmed subscriptions have lifecycle caveats documented by the Terraform AWS Provider.
- AWS recommends using `treat_missing_data = "missing"` for EC2 stop, terminate, reboot, or recover alarm actions to avoid actions during temporary missing metric data. The current examples are valid, but this would be a useful future hardening improvement.
