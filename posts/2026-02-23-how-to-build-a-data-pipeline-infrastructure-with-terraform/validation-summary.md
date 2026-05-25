# Validation Summary: How to Build a Data Pipeline Infrastructure with Terraform

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform
- AWS S3
- AWS Glue Data Catalog
- AWS Glue crawlers
- AWS Glue ETL jobs
- Amazon Athena
- AWS Step Functions
- Amazon EventBridge / CloudWatch Events scheduled rules
- AWS KMS

## Sources Consulted
- Terraform AWS provider documentation: `aws_s3_bucket`, `aws_s3_bucket_versioning`, `aws_s3_bucket_server_side_encryption_configuration`, and `aws_s3_bucket_lifecycle_configuration`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs
- Terraform AWS provider documentation for Glue crawlers: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/glue_crawler
- Terraform AWS provider documentation for Glue jobs: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/glue_job
- AWS Glue job parameter reference: https://docs.aws.amazon.com/glue/latest/dg/aws-glue-programming-etl-glue-arguments.html
- AWS Glue versions documentation: https://docs.aws.amazon.com/glue/latest/dg/release-notes.html
- AWS Glue crawler API documentation for `StartCrawler` and `GetCrawler`: https://docs.aws.amazon.com/glue/latest/dg/aws-glue-api-crawler-crawling.html
- Terraform AWS provider documentation for Athena workgroups and named queries: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/athena_workgroup and https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/athena_named_query
- AWS Step Functions optimized AWS Glue integration documentation: https://docs.aws.amazon.com/step-functions/latest/dg/connect-glue.html
- AWS Step Functions AWS SDK integration documentation: https://docs.aws.amazon.com/step-functions/latest/dg/supported-services-awssdk.html
- Amazon EventBridge scheduled rule and cron expression documentation: https://docs.aws.amazon.com/eventbridge/latest/userguide/eb-scheduled-rule-pattern.html

## Issues Found
- The Step Functions definition used `arn:aws:states:::glue:startCrawler.sync` for Glue crawlers. The official optimized Glue integration supports `StartJobRun` with `.sync`, but does not list `StartCrawler` as an optimized `.sync` integration. I changed the crawler states to use Step Functions AWS SDK integrations for `glue:startCrawler` and `glue:getCrawler`, with `Wait` and `Choice` states that poll until the crawler state is `READY`.
- The `quality_check` Glue job referenced `s3://.../scripts/quality_check.py`, but the Terraform snippet only uploaded `transform.py`. I added an `aws_s3_object` resource for `scripts/quality_check.py` so the referenced script exists in S3.

## Review Notes
- Terraform was not installed in the local environment, so I could not run `terraform fmt` or `terraform validate`. The reviewed snippets were checked manually against the current Terraform AWS provider and AWS service documentation.
- The snippets still assume supporting resources exist elsewhere, including IAM roles, permissions, the KMS key, and local Glue scripts. That is acceptable for the post's excerpted tutorial format, but a complete runnable module would need those resources.
- Because the Step Functions workflow now uses AWS SDK integrations for crawler operations, the Step Functions execution role must include permissions such as `glue:StartCrawler` and `glue:GetCrawler` in addition to the Glue job permissions.
