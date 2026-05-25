# Validation Summary: How to Create Macie Classification Jobs in Terraform

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform
- HashiCorp AWS Provider
- Amazon Macie
- Amazon S3
- AWS KMS
- Amazon EventBridge
- Amazon SNS
- AWS Organizations

## Sources Consulted
- Terraform AWS Provider documentation: `aws_macie2_account` - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/macie2_account
- Terraform AWS Provider documentation: `aws_macie2_classification_job` - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/macie2_classification_job
- Terraform AWS Provider documentation: `aws_macie2_custom_data_identifier` - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/macie2_custom_data_identifier
- Terraform AWS Provider documentation: `aws_macie2_findings_filter` - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/macie2_findings_filter
- Terraform AWS Provider documentation: `aws_macie2_classification_export_configuration` - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/macie2_classification_export_configuration
- Terraform AWS Provider documentation: `aws_macie2_organization_admin_account` and `aws_macie2_organization_configuration` - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/macie2_organization_configuration
- Amazon Macie API Reference: Classification Job Creation - https://docs.aws.amazon.com/macie/latest/APIReference/jobs.html
- Amazon Macie User Guide: Severity scoring for findings - https://docs.aws.amazon.com/macie/latest/user/findings-severity.html
- Amazon Macie User Guide: Fields for filtering findings - https://docs.aws.amazon.com/macie/latest/user/findings-filter-fields.html
- Amazon Macie User Guide: Storing and retaining sensitive data discovery results - https://docs.aws.amazon.com/macie/latest/user/discovery-results-repository-s3.html
- Amazon EventBridge documentation: Amazon Macie events - https://docs.aws.amazon.com/eventbridge/latest/ref/events-ref-macie.html

## Issues Found
- The scheduled classification job examples used `schedule_frequency_details`, which is an AWS CLI/API-style name, not the Terraform AWS provider resource argument. Changed both examples to `schedule_frequency`.
- The weekly job comment claimed the schedule ran at 2 AM UTC, but Macie weekly schedules specify only a day of week in Terraform. Removed the unsupported time-of-day claim.
- A scoping comment said the example only scanned objects uploaded since the last scan, but the code scoped by `OBJECT_KEY` prefix. Updated the comment to describe prefix-based scoping.
- The organization-wide section claimed auto-enablement but did not include the Terraform resource for it. Added `aws_macie2_organization_configuration` with `auto_enable = true`.
- The findings filter example used `resourcesAffected.s3Bucket.tags.Environment`, which is not a supported Macie finding filter field. Changed it to supported `resourcesAffected.s3Bucket.tags.key` and `resourcesAffected.s3Bucket.tags.value` criteria.
- The EventBridge example attempted to match `Critical` severity, but Macie finding severity descriptions are only `Low`, `Medium`, and `High`. Updated the rule and surrounding text to match `High`.
- The export section described exporting findings, but `aws_macie2_classification_export_configuration` configures storage for sensitive data discovery results. Updated the heading, text, bucket name, prefix, and best-practice wording accordingly.
- The discovery results S3 export example created a bucket and KMS key but did not grant Macie bucket access for an existing bucket. Added an S3 bucket policy and KMS confused-deputy conditions based on AWS guidance.
- A custom data identifier comment described keywords as increasing confidence, but Macie requires a keyword to be in proximity when keywords are configured. Updated the comment to state that the keyword must appear near the regex match.

## Review Notes
The snippets still reference example S3 bucket resources and account variables that readers must define in their own Terraform configuration. The multi-account examples also require the appropriate provider/account context, as noted in the comments.
