# Validation Summary: How to Use the basename Function in Terraform

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform configuration language
- Terraform filesystem and string functions
- HCL
- AWS provider resources for IAM, Lambda, S3, ECS, CloudWatch Logs, and EC2 key pairs

## Sources Consulted
- Terraform `basename` function documentation: https://developer.hashicorp.com/terraform/language/functions/basename
- Terraform `dirname` function documentation: https://developer.hashicorp.com/terraform/language/functions/dirname
- Terraform `fileset` function documentation: https://developer.hashicorp.com/terraform/language/functions/fileset
- Terraform `regex` function documentation: https://developer.hashicorp.com/terraform/language/functions/regex
- Terraform AWS provider `aws_ecs_task_definition` resource documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/ecs_task_definition
- AWS Lambda runtime documentation: https://docs.aws.amazon.com/lambda/latest/dg/lambda-runtimes.html

## Issues Found
- The Lambda example used `runtime = "python3.9"`, which AWS lists as deprecated as of December 15, 2025. Updated it to `python3.13`, a current Python Lambda runtime.
- The file extension comment said the regex returned "everything after the last dot", but the Terraform expression returns the dot plus the extension, such as `.gz`. Updated the comment to match the actual result.
- The ARN example used a colon-separated Lambda ARN and claimed `basename` would return `my-function`. Terraform `basename` operates on filesystem path separators, so that ARN would be returned unchanged on Unix-like systems. Replaced it with a slash-separated IAM role ARN example and corrected the expected result.
- The Important Notes section claimed `basename` works with both forward and back slashes. Terraform documents that separator behavior depends on the host platform. Updated the note to describe Unix-like and Windows behavior accurately.

## Review Notes
Terraform is not installed in the local workspace, so examples were reviewed against official documentation rather than executed with `terraform console`. The companion OneUptime `dirname` link resolves to the expected post. The snippets are illustrative and omit surrounding provider configuration and referenced resources such as IAM roles and buckets, which is acceptable for this post's focus on the `basename` function.
