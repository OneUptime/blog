# Validation Summary: How to Implement Logging and Monitoring Best Practices on AWS

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- AWS CloudTrail
- Amazon CloudWatch Logs
- CloudWatch Logs Insights
- Amazon VPC Flow Logs
- Amazon GuardDuty
- AWS Security Hub
- Amazon S3 Object Lock
- Terraform AWS provider
- AWS CloudFormation
- Python logging
- boto3

## Sources Consulted
- AWS CloudTrail documentation: EventSelector API and data event selector guidance: https://docs.aws.amazon.com/awscloudtrail/latest/APIReference/API_EventSelector.html
- AWS CloudTrail documentation: validating log file integrity: https://docs.aws.amazon.com/en_en/awscloudtrail/latest/userguide/cloudtrail-log-file-validation-intro.html
- AWS CloudTrail documentation: creating CloudWatch alarms for CloudTrail events: https://docs.aws.amazon.com/awscloudtrail/latest/userguide/cloudwatch-alarms-for-cloudtrail.html
- Amazon S3 documentation: configuring S3 Object Lock: https://docs.aws.amazon.com/AmazonS3/latest/userguide/object-lock-configure.html
- Terraform AWS provider documentation: aws_cloudtrail resource: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/cloudtrail.html
- Terraform AWS provider documentation: aws_s3_bucket resource: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/s3_bucket.html
- Terraform AWS provider documentation: aws_s3_bucket_object_lock_configuration resource: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/s3_bucket_object_lock_configuration
- Amazon CloudWatch Logs documentation: filter pattern syntax: https://docs.aws.amazon.com/AmazonCloudWatch/latest/logs/FilterAndPatternSyntax.html
- Amazon CloudWatch Logs documentation: creating metrics from log events using filters: https://docs.aws.amazon.com/AmazonCloudWatch/latest/logs/MonitoringLogData.html
- AWS CloudFormation documentation: AWS::Logs::MetricFilter and MetricTransformation: https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-resource-logs-metricfilter.html
- Amazon CloudWatch API documentation: dashboard body structure and log widget query syntax: https://docs.aws.amazon.com/AmazonCloudWatch/latest/APIReference/CloudWatch-Dashboard-Body-Structure.html
- Amazon GuardDuty boto3 documentation: create_detector: https://docs.aws.amazon.com/boto3/latest/reference/services/guardduty/client/create_detector.html
- Amazon GuardDuty boto3 documentation: update_organization_configuration: https://docs.aws.amazon.com/boto3/latest/reference/services/guardduty/client/update_organization_configuration.html
- Amazon GuardDuty documentation: GuardDuty integrations with Security Hub CSPM: https://docs.aws.amazon.com/guardduty/latest/ug/guardduty_integrations.html
- Python documentation: datetime timezone-aware timestamps and logging formatter APIs: https://docs.python.org/3/library/datetime.html and https://docs.python.org/3/library/logging.html

## Issues Found
- The post said CloudTrail records every API call. I changed this to "supported API activity" because CloudTrail coverage depends on supported event types, event selectors, and service integration.
- The Terraform S3 bucket did not explicitly enable Object Lock at bucket creation time. I added `object_lock_enabled = true` to the bucket and `object_lock_enabled = "Enabled"` to the Object Lock configuration so the retention rule is valid for new buckets.
- The Terraform CloudTrail example used `insight_selectors` blocks. I changed them to the Terraform provider's `insight_selector` block name.
- The Python structured logging example used `datetime.utcnow()`, which is deprecated in current Python. I changed it to `datetime.now(timezone.utc)`.
- The CloudFormation alarm for root account usage referenced a metric that the template did not create. I added a `RootAccountUsageFilter` metric filter for CloudTrail events where the user identity type is `Root`.
- The GuardDuty section claimed the script configured publishing to Security Hub and accepted an unused `admin_account_id` parameter. I corrected the wording, removed the unused parameter, and updated the organization configuration call to use `AutoEnableOrganizationMembers='ALL'` with feature auto-enable settings.
- The CloudWatch dashboard log widget query did not include the required `SOURCE` log group prefix. I added `SOURCE '/app/production'` to the widget query.

## Review Notes
The snippets are still examples, not a complete deployable module. A production CloudTrail setup also needs correctly scoped S3 bucket policies, IAM roles for CloudWatch Logs delivery, KMS key policies, and organization delegated-administrator prerequisites where applicable.
