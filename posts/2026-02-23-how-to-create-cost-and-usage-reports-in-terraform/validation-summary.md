# Validation Summary: How to Create Cost and Usage Reports in Terraform

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform
- AWS Cost and Usage Reports
- Amazon S3
- Amazon Athena
- AWS Glue
- Amazon SNS
- AWS Budgets

## Sources Consulted
- AWS Cost and Usage Reports User Guide: https://docs.aws.amazon.com/cur/latest/userguide/what-is-cur.html
- AWS Cost and Usage Reports S3 bucket setup and bucket policy requirements: https://docs.aws.amazon.com/cur/latest/userguide/cur-s3.html
- AWS Cost and Usage Reports Athena setup with CloudFormation: https://docs.aws.amazon.com/cur/latest/userguide/use-athena-cf.html
- AWS Billing and Cost Management cost allocation tags documentation: https://docs.aws.amazon.com/awsaccountbilling/latest/aboutv2/cost-alloc-tags.html
- HashiCorp Terraform AWS provider `aws_cur_report_definition` documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/cur_report_definition
- HashiCorp Terraform AWS provider `aws_athena_workgroup` documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/athena_workgroup
- HashiCorp Terraform AWS provider `aws_athena_named_query` documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/athena_named_query
- HashiCorp Terraform AWS provider `aws_s3_bucket_notification` documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/s3_bucket_notification
- HashiCorp Terraform AWS provider `aws_sns_topic_policy` documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/sns_topic_policy

## Issues Found
- The prerequisites incorrectly suggested delegated administrator access as sufficient for consolidated billing reports. Updated the text to state that AWS Organizations management account access is required for consolidated billing reports, while member accounts can create reports only for their own account data.
- The CUR S3 bucket policy allowed `s3:GetBucketAcl` but omitted `s3:GetBucketPolicy`, which AWS documents as part of the required validation permissions for report delivery. Added `s3:GetBucketPolicy`.
- The Athena section incorrectly said CUR with Athena integration automatically creates a usable Glue database and table. AWS delivers a CloudFormation template that creates the Glue crawler, database, Lambda functions, and S3 notification. Updated the explanation and replaced the misleading Terraform Glue database snippet with variables for the database and table created by that template.
- The Athena workgroup wrote query results to the CUR data bucket while also defining a separate Athena results bucket that was unused. Updated the workgroup output location to use the Athena results bucket.
- The named queries referenced a placeholder `cur_database.cur_table` and a Terraform Glue database resource that did not create a CUR table. Updated the named queries to use the CloudFormation-created database and table names supplied by variables.
- The tag query implied the `Environment` tag would always be present. Updated the description to clarify that it requires the tag to be activated as a cost allocation tag.
- The SNS notification example could conflict with the AWS-provided Athena CloudFormation template because that template manages S3 notifications for the CUR bucket. Updated the section intro to scope it to cases where the Athena CloudFormation template is not deployed on the same bucket.
- The AWS Budgets section implied CUR directly feeds AWS Budgets. Updated the wording to say AWS Budgets uses the same underlying billing data.

## Review Notes
The `idle_resources` named query is only a starting point for cost investigation. CUR usage amounts are billing usage records, not direct utilization metrics, so production right-sizing analysis should combine CUR with CloudWatch metrics or AWS Compute Optimizer data.
