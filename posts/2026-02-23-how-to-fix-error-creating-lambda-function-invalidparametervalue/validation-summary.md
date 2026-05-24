# Validation Summary: How to Fix Error Creating Lambda Function InvalidParameterValue

## Status
validated

## Post Type
Tutorial / Troubleshooting Guide

## Technologies Covered
- AWS Lambda
- Terraform (HCL)
- AWS IAM (trust policies, managed policies)
- AWS VPC (subnets, security groups)
- Lambda runtimes (Node.js, Python, Java)
- Lambda Layers
- S3 (for deployment packages)
- `time_sleep` resource (hashicorp/time provider)

## Sources Consulted
- AWS Lambda runtimes documentation: https://docs.aws.amazon.com/lambda/latest/dg/lambda-runtimes.html
- AWS Lambda quotas / package size limits: https://docs.aws.amazon.com/lambda/latest/dg/gettingstarted-limits.html
- AWS Lambda environment variables documentation: https://docs.aws.amazon.com/lambda/latest/dg/configuration-envvars.html
- AWS Lambda handler documentation (Node.js / Python / Java): https://docs.aws.amazon.com/lambda/latest/dg/foundation-progmodel.html
- AWS Lambda VPC configuration / `AWSLambdaVPCAccessExecutionRole`: https://docs.aws.amazon.com/lambda/latest/dg/configuration-vpc.html
- Terraform AWS Provider `aws_lambda_function` resource: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/lambda_function
- Terraform `time_sleep` resource: https://registry.terraform.io/providers/hashicorp/time/latest/docs/resources/sleep
- AWS Lambda runtime deprecation schedule (Node.js 12.x EOL March 2023, Node.js 14.x EOL Nov 2023, Python 3.7 EOL Nov 2023)

## Issues Found
No technical issues found.

Verified specific claims:
- The trust policy principal `lambda.amazonaws.com` is correct.
- Deprecated runtimes listed (nodejs14.x, nodejs12.x, python3.7) match AWS's actual deprecation list.
- Current runtimes shown (nodejs20.x, python3.12, java21) are valid as of the publication date.
- Handler format examples for Node.js, Python, and Java match the official AWS handler conventions.
- Package size limits are accurate: 50 MB direct upload (zipped), 250 MB unzipped, 10 GB for container images. The unzipped limit of 262,144,000 bytes shown in the error message matches exactly (250 × 1024 × 1024 = 262144000).
- The `AWSLambdaVPCAccessExecutionRole` managed policy ARN is correct.
- The environment variable name pattern `[a-zA-Z]([a-zA-Z0-9_])+` matches AWS's documented constraint.
- Memory range (128 MB – 10240 MB, 1 MB increments) and timeout range (1 – 900 seconds) are accurate.
- The complete working example uses valid Terraform AWS provider syntax (`source_code_hash` paired with `filename`, `archive_file` data source, IAM role attachment) and would deploy successfully.

## Review Notes
- The "WRONG" runtime block in section 2 shows three `runtime = ...` lines in a single resource block, which is illustrative only — real HCL would reject duplicate attribute keys. Reasonable as a teaching device, not a correctness issue.
- Lambda runtime deprecation is ongoing; the "current runtimes" list (nodejs20.x, python3.12, java21) will eventually need refreshing. As of the post's date, all three are supported. Future readers should consult the linked AWS runtimes page.
- Node.js 22 (`nodejs22.x`) and Python 3.13 (`python3.13`) are also available as of the validation date but not mentioned; this is a stylistic omission, not an error.
- The IAM role propagation delay is a real and well-known issue; the 10-second `time_sleep` is a common workaround.
