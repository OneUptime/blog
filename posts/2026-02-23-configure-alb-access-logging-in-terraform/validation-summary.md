# Validation Summary: How to Configure ALB Access Logging in Terraform

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform
- AWS Application Load Balancer
- Amazon S3
- Amazon Athena
- AWS Glue Data Catalog

## Sources Consulted
- AWS Elastic Load Balancing documentation: Enable access logs for your Application Load Balancer - https://docs.aws.amazon.com/elasticloadbalancing/latest/application/enable-access-logging.html
- AWS Elastic Load Balancing documentation: Access logs for your Application Load Balancer - https://docs.aws.amazon.com/elasticloadbalancing/latest/application/load-balancer-access-logs.html
- Amazon Athena documentation: Create the table for ALB access logs - https://docs.aws.amazon.com/athena/latest/ug/create-alb-access-logs-table.html
- Terraform AWS provider documentation: aws_lb resource - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/lb
- Terraform AWS provider documentation: aws_athena_database resource - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/athena_database
- Terraform AWS provider documentation: aws_glue_catalog_table resource - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/glue_catalog_table

## Issues Found
- The bucket policy used the legacy regional ELB service account and an unrelated `delivery.logs.amazonaws.com` principal. Updated the policy examples to use the current AWS-recommended `logdelivery.elasticloadbalancing.amazonaws.com` service principal.
- The bucket policy resources used `AWSLogs/*`, which omits the load balancer account ID. Updated the resource ARNs to include `${data.aws_caller_identity.current.account_id}` under `AWSLogs`, as AWS recommends and documents.
- The multi-ALB bucket policy used a wildcard for all prefixes and account IDs. Replaced it with explicit `public` and `private` prefixes and account-specific `AWSLogs` paths.
- The post referenced `data.aws_caller_identity.current` and `data.aws_region.current` in the Athena table location without declaring them. Added both data sources to the Athena snippet.
- The ALB log field list and Glue table schema omitted current documented fields, including `conn_trace_id`. Added the current ALB fields and updated the Athena RegexSerDe pattern to match AWS's current documented pattern, including the future-compatible trailing capture.
- The "Top 10 slowest requests in the last 24 hours" Athena query did not filter to the last 24 hours. Added a `from_iso8601_timestamp(time)` time filter.
- The summary and troubleshooting text still referred to regional ELB service accounts as the primary setup model. Updated the language to refer to log delivery permissions and the current service principal approach.

## Review Notes
The encryption example correctly uses SSE-S3 (`AES256`), which is the only server-side encryption option AWS documents as supported for ALB access log buckets. The snippets remain illustrative and still assume surrounding resources such as subnets and security groups are defined elsewhere.
