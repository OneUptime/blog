# Validation Summary: How to Create ZIP Files for Lambda Deployment with Terraform

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform (>= 1.5.0)
- Terraform `hashicorp/archive` provider (~> 2.4)
- Terraform `hashicorp/aws` provider (~> 5.0)
- AWS Lambda
- AWS Lambda Layers
- AWS IAM (roles, trust policy, AWSLambdaBasicExecutionRole)
- Python 3.11 / 3.12 Lambda runtimes
- Node.js 20.x Lambda runtime
- AWS CloudWatch Alarms / SNS / Slack webhooks (example use case)

## Sources Consulted
- Terraform archive provider docs: https://registry.terraform.io/providers/hashicorp/archive/latest/docs/data-sources/file
- Terraform AWS provider — `aws_lambda_function`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/lambda_function
- Terraform AWS provider — `aws_lambda_layer_version`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/lambda_layer_version
- Terraform AWS provider — `aws_iam_role`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/iam_role
- AWS Lambda runtimes reference: https://docs.aws.amazon.com/lambda/latest/dg/lambda-runtimes.html
- AWS Lambda layer paths reference: https://docs.aws.amazon.com/lambda/latest/dg/configuration-layers.html
- AWS Lambda Python deployment package docs: https://docs.aws.amazon.com/lambda/latest/dg/python-package.html

## Issues Found
- **Intro mismatch — claimed Go coverage**: The introduction stated the guide would cover "Python, Node.js, and Go functions," but the post contains no Go example. Updated the sentence to "Python and Node.js functions" so the intro accurately reflects the post's content.

## Review Notes
- The `archive_file` data source usage (`type`, `source_file`, `source_dir`, `output_path`, `excludes`, and inline `source { content, filename }` blocks) matches the current `hashicorp/archive` provider (v2.4+) schema. Globstar (`**`) patterns in `excludes` are supported in modern versions of the provider.
- `output_base64sha256` paired with `source_code_hash` is the recommended pattern for triggering Lambda redeployment on code change — correctly used throughout the post.
- The Python layer ZIP places code under `python/utils.py`, which matches AWS's required path layout (`python/` or `python/lib/python3.x/site-packages/`) for Python runtimes.
- `compatible_runtimes = ["python3.11", "python3.12"]`, `runtime = "python3.11"`, and `runtime = "nodejs20.x"` are all valid Lambda runtimes as of the post's date.
- The IAM trust policy and `AWSLambdaBasicExecutionRole` managed policy ARN are correct.
- Minor caveat (not corrected — not a technical error): The `slack_webhook_url` variable is marked `sensitive = true` but has a non-sensitive `default` placeholder; in production users should supply via tfvars or a secret store. This is a reasonable tutorial simplification.
- The Python 3.11 runtime is still supported by Lambda as of the validation date but will eventually be deprecated; readers should track AWS Lambda runtime deprecation notices.
