# Validation Summary: How to Create Lambda Functions with OpenTofu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTofu (Terraform-compatible IaC)
- HCL (HashiCorp Configuration Language)
- AWS provider `hashicorp/aws` (v5.x)
- AWS Archive provider `hashicorp/archive`
- AWS Lambda (Node.js 20.x runtime)
- AWS IAM (roles, managed policies, trust relationships)
- AWS S3 (artifact storage and event notifications)
- Amazon CloudWatch Logs
- Amazon API Gateway (REST API)
- Amazon VPC (security groups, subnets)

## Sources Consulted
- AWS provider `aws_lambda_function` resource: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/lambda_function
- AWS provider `aws_lambda_permission` resource: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/lambda_permission
- AWS provider `aws_iam_role` and `aws_iam_role_policy_attachment` resources: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/iam_role
- AWS provider `aws_iam_policy_document` data source: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/data-sources/iam_policy_document
- AWS provider `aws_s3_object` resource: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/s3_object
- AWS provider `aws_s3_bucket_notification` resource: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/s3_bucket_notification
- AWS provider `aws_cloudwatch_log_group` resource: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/cloudwatch_log_group
- AWS provider `aws_security_group` resource: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/security_group
- Archive provider `archive_file` data source: https://registry.terraform.io/providers/hashicorp/archive/latest/docs/data-sources/file
- AWS Lambda Runtimes documentation: https://docs.aws.amazon.com/lambda/latest/dg/lambda-runtimes.html
- AWS Lambda IAM execution role / managed policies (`AWSLambdaBasicExecutionRole`, `AWSLambdaVPCAccessExecutionRole`): https://docs.aws.amazon.com/lambda/latest/dg/lambda-intro-execution-role.html
- AWS Lambda S3 event source documentation: https://docs.aws.amazon.com/lambda/latest/dg/with-s3.html
- `terraform-aws-modules/lambda/aws` module: https://registry.terraform.io/modules/terraform-aws-modules/lambda/aws/latest

## Issues Found
No technical issues found.

All resource names, argument names, and attribute references match the official `hashicorp/aws` v5.x provider schema and the `hashicorp/archive` provider schema:
- `aws_iam_policy_document` data source: `statement`, `actions`, `principals { type, identifiers }` are correctly used to construct the Lambda trust policy.
- The trust principal `lambda.amazonaws.com` and the `sts:AssumeRole` action are the correct trust relationship for a Lambda execution role.
- The managed policy ARNs `arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole` and `arn:aws:iam::aws:policy/service-role/AWSLambdaVPCAccessExecutionRole` are correct and current.
- `archive_file` data source: `type`, `source_dir`, `output_path`, and the computed attributes `output_path`, `output_base64sha256`, and `output_md5` are all valid.
- `aws_lambda_function` arguments `function_name`, `filename`, `source_code_hash`, `role`, `handler`, `runtime`, `timeout`, `memory_size`, `environment { variables }`, `s3_bucket`, `s3_key`, `vpc_config { subnet_ids, security_group_ids }`, and `tags` are all valid in the v5.x AWS provider.
- The Node.js 20.x runtime identifier `nodejs20.x` is a current, supported AWS Lambda runtime (Node.js 20 LTS).
- `aws_s3_object` is the current, non-deprecated resource (replacing the older `aws_s3_bucket_object`); the `bucket`, `key`, `source`, and `etag` arguments are all valid.
- `aws_lambda_permission` arguments `statement_id`, `action`, `function_name`, `principal`, and `source_arn` are correct, and the principals `apigateway.amazonaws.com` and `s3.amazonaws.com` are the correct service principals for those event sources.
- `aws_s3_bucket_notification` with the `lambda_function { lambda_function_arn, events, filter_suffix }` block matches the provider schema; `s3:ObjectCreated:*` is a valid event pattern.
- The `aws_cloudwatch_log_group` name format `/aws/lambda/<function_name>` is the convention Lambda itself uses, so importing/managing it as IaC is the correct pattern.
- The output attributes `arn`, `function_name`, and `invoke_arn` on `aws_lambda_function` are all exposed by the provider.

## Review Notes
- The post correctly recommends `source_code_hash = data.archive_file.lambda_zip.output_base64sha256` to trigger redeployment on code changes — this is the canonical idiom for Lambda + Terraform/OpenTofu.
- The S3-upload example uses `output_md5` as the S3 object key suffix and as the `etag`. Either `output_base64sha256` or `output_md5` works for cache-busting; the example is internally consistent and valid.
- The CloudWatch log group section creates `/aws/lambda/<function_name>` explicitly. This is good practice (otherwise Lambda creates it implicitly with no retention), but readers should be aware that if the log group already exists from a prior invocation, OpenTofu will need to import it before applying.
- The VPC Lambda example does not show declaring or wiring `var.private_subnet_ids` / `var.vpc_id`; this is a typical tutorial omission rather than a technical error.
- The post mentions `terraform-aws-modules/lambda/aws` as a higher-level option in the conclusion, which is accurate and a commonly recommended community module for more complex setups.
- No deprecation warnings: all resources used (`aws_s3_object`, `aws_lambda_function`, `aws_lambda_permission`, etc.) are the current names in the v5.x AWS provider.
