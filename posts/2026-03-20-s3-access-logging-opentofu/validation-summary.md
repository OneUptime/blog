# Validation Summary: How to Configure S3 Access Logging with OpenTofu

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- OpenTofu
- AWS S3 server access logging
- AWS CloudTrail data events
- Amazon CloudWatch Logs
- Amazon CloudWatch metric filters and alarms
- AWS IAM policies and roles
- Terraform AWS Provider resources

## Sources Consulted
- AWS S3: Logging requests with server access logging: https://docs.aws.amazon.com/AmazonS3/latest/userguide/ServerLogs.html
- AWS S3: Enabling Amazon S3 server access logging: https://docs.aws.amazon.com/AmazonS3/latest/userguide/enable-server-access-logging.html
- AWS S3: Lifecycle transition considerations: https://docs.aws.amazon.com/AmazonS3/latest/userguide/lifecycle-transition-general-considerations.html
- AWS CloudTrail: Amazon S3 bucket policy for CloudTrail: https://docs.aws.amazon.com/awscloudtrail/latest/userguide/create-s3-bucket-policy-for-cloudtrail.html
- AWS CloudTrail: Sending events to CloudWatch Logs: https://docs.aws.amazon.com/awscloudtrail/latest/userguide/send-cloudtrail-events-to-cloudwatch-logs.html
- AWS CloudTrail: Role policy document for CloudTrail to use CloudWatch Logs: https://docs.aws.amazon.com/awscloudtrail/latest/userguide/cloudtrail-required-policy-for-cloudwatch-logs.html
- Amazon CloudWatch Logs: Filter pattern syntax: https://docs.aws.amazon.com/AmazonCloudWatch/latest/logs/FilterAndPatternSyntax.html
- Terraform AWS Provider: aws_s3_bucket_logging: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/s3_bucket_logging
- Terraform AWS Provider: aws_s3_bucket_lifecycle_configuration: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/s3_bucket_lifecycle_configuration
- Terraform AWS Provider: aws_cloudtrail: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/cloudtrail
- Terraform AWS Provider: aws_cloudwatch_log_metric_filter: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/cloudwatch_log_metric_filter
- Terraform AWS Provider: aws_cloudwatch_metric_alarm: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/cloudwatch_metric_alarm
- OpenTofu CLI commands: https://opentofu.org/docs/cli/commands/

## Issues Found
- The post stated that S3 server access logging captures every request. AWS documents server access log delivery as best-effort, with completeness and timeliness not guaranteed. Updated the description and introduction to avoid claiming complete request coverage.
- The prerequisites only mentioned S3 permissions, but the tutorial also creates CloudTrail, CloudWatch, IAM, and alarm action resources. Updated the prerequisite permissions list.
- The CloudTrail example referenced `aws_s3_bucket.cloudtrail_logs` without defining the bucket or the required bucket policy. Added a dedicated CloudTrail log bucket and an S3 bucket policy that allows CloudTrail `s3:GetBucketAcl` and `s3:PutObject` with the required `bucket-owner-full-control` ACL condition and `aws:SourceArn` restriction.
- The CloudWatch metric filter would not receive CloudTrail events because the CloudTrail resource was not configured to deliver to CloudWatch Logs. Added `cloud_watch_logs_group_arn`, `cloud_watch_logs_role_arn`, and the IAM role/policy that allows CloudTrail to create log streams and put log events.
- The Step 3 heading and comments described CloudTrail as "S3 Access Logging." Updated them to refer to S3 data events and API-level audit logging, which is the correct CloudTrail feature.

## Review Notes
- The S3 server access logging bucket uses the ACL-based `log-delivery-write` approach. This remains valid because the example enables ACLs with S3 Object Ownership set to `ObjectWriter`, but AWS and the current Terraform AWS Provider documentation recommend bucket policies for new configurations.
- The lifecycle transition rule is valid, but Amazon S3 prevents objects smaller than 128 KB from transitioning by default in current lifecycle configurations. Small access log objects may remain in S3 Standard unless the lifecycle rule is adjusted with an object-size filter.
- Local OpenTofu/Terraform validation was not run because neither `tofu` nor `terraform` is installed in this workspace.
