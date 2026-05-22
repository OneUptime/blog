# Validation Summary: How to Use the filesha256 Function in Terraform

## Status
validated

## Post Type
Technical tutorial

## Technologies Covered
- Terraform
- HCL
- Terraform hash and crypto functions
- Terraform filesystem functions
- AWS S3 object resources
- AWS SSM Parameter Store
- AWS ECS task definitions
- AWS Lambda source code hashes

## Sources Consulted
- Terraform `filesha256` function documentation: https://developer.hashicorp.com/terraform/language/functions/filesha256
- Terraform `filebase64sha256` function documentation: https://developer.hashicorp.com/terraform/language/functions/filebase64sha256
- Terraform `sha256` function documentation: https://developer.hashicorp.com/terraform/language/functions/sha256
- Terraform `filemd5` function documentation: https://developer.hashicorp.com/terraform/language/functions/filemd5
- Terraform `fileset` function documentation: https://developer.hashicorp.com/terraform/language/functions/fileset
- Terraform `timestamp` function documentation: https://developer.hashicorp.com/terraform/language/functions/timestamp
- HashiCorp AWS Lambda tutorial showing `source_code_hash` with a base64 SHA-256 archive hash: https://developer.hashicorp.com/terraform/tutorials/aws/lambda-api-gateway
- Terraform AWS provider `aws_s3_object` resource documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/s3_object

## Issues Found
- Removed `LastUpdated = timestamp()` from the `aws_ssm_parameter` tags example because Terraform's official documentation warns that using `timestamp()` directly in resource attributes causes a diff on every Terraform run.
- Replaced truncated policy hash placeholders such as `abc123...` with full 64-character lowercase hexadecimal SHA-256 example values so the snippet matches its stated `map(string)` of SHA-256 hashes.

## Review Notes
Terraform was not installed in the local environment, so I could not run `terraform validate`. The review was performed against official HashiCorp Terraform documentation and Terraform AWS provider documentation.
