# Validation Summary: How to Build a SOC2 Compliant Infrastructure with Terraform

## Status
validated

## Post Type
Tutorial / technical guide

## Technologies Covered
- Terraform
- AWS KMS
- Amazon VPC, security groups, and VPC Flow Logs
- AWS IAM password policies and MFA enforcement
- Amazon Aurora PostgreSQL / RDS
- Amazon EC2 Auto Scaling
- Amazon Route 53 health checks
- AWS Backup
- AWS CloudTrail
- Amazon S3 encryption, versioning, public access block, server access logging, and Object Lock
- AWS Config managed rules
- Amazon GuardDuty
- AWS Security Hub
- Amazon SNS
- Amazon EventBridge / CloudWatch Events
- SOC 2 Trust Services Criteria

## Sources Consulted
- AICPA, 2017 Trust Services Criteria with Revised Points of Focus - 2022: https://www.aicpa.com/resources/download/2017-trust-services-criteria-with-revised-points-of-focus-2022
- HashiCorp Terraform AWS Provider documentation for `aws_cloudtrail`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/cloudtrail
- AWS CloudTrail API Reference, `EventSelector`: https://docs.aws.amazon.com/awscloudtrail/latest/APIReference/API_EventSelector.html
- HashiCorp Terraform AWS Provider documentation for `aws_guardduty_detector`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/guardduty_detector
- HashiCorp Terraform AWS Provider documentation for `aws_guardduty_detector_feature`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/guardduty_detector_feature
- AWS GuardDuty documentation for enabling S3 Protection: https://docs.aws.amazon.com/guardduty/latest/ug/data-source-configure.html
- HashiCorp Terraform AWS Provider documentation for `aws_s3_bucket_object_lock_configuration`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/s3_bucket_object_lock_configuration
- Amazon S3 User Guide, Object Lock overview: https://docs.aws.amazon.com/AmazonS3/latest/userguide/object-lock-overview.html
- AWS Config managed rule documentation for `CLOUD_TRAIL_ENABLED`: https://docs.aws.amazon.com/config/latest/developerguide/cloudtrail-enabled.html
- AWS Config managed rule documentation for `S3_BUCKET_SERVER_SIDE_ENCRYPTION_ENABLED`: https://docs.aws.amazon.com/config/latest/developerguide/s3-bucket-server-side-encryption-enabled.html
- AWS Config events reference for EventBridge: https://docs.aws.amazon.com/eventbridge/latest/ref/events-ref-config.html
- Amazon Aurora PostgreSQL release documentation: https://docs.aws.amazon.com/AmazonRDS/latest/AuroraPostgreSQLReleaseNotes/AuroraPostgreSQL.Updates.html

## Issues Found
- The CloudTrail S3 data event selector used `values = ["arn:aws:s3"]`, which is not a valid S3 ARN for object data events. Changed it to `values = ["arn:aws:s3:::"]` for all S3 object data events.
- The audit log bucket was described as immutable but only enabled S3 versioning. Added `object_lock_enabled = true` and an `aws_s3_bucket_object_lock_configuration` resource using COMPLIANCE mode retention so the example matches the immutability claim.
- The GuardDuty example used the deprecated `datasources` block on `aws_guardduty_detector`. Replaced it with `aws_guardduty_detector_feature` using `S3_DATA_EVENTS` and `ENABLED`, which is the current Terraform AWS provider pattern.

## Review Notes
The examples are illustrative and reference surrounding resources such as IAM roles, subnet groups, launch templates, load balancer target groups, KMS key policies, and bucket policies that are not shown in the post. Those dependencies would still need to be defined in a complete Terraform module. Local Terraform validation could not be run because the `terraform` binary is not installed in the review environment.
