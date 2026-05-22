# Validation Summary: How to Use the sha256 Function in Terraform

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform built-in hash and file functions
- SHA-256 hashing
- HashiCorp archive provider
- AWS Lambda
- AWS Systems Manager Parameter Store
- Amazon ECS task definitions

## Sources Consulted
- Terraform `sha256` function documentation: https://developer.hashicorp.com/terraform/language/functions/sha256
- Terraform `filesha256` function documentation: https://developer.hashicorp.com/terraform/language/functions/filesha256
- Terraform `file` function documentation: https://developer.hashicorp.com/terraform/language/functions/file
- Terraform built-in functions documentation: https://developer.hashicorp.com/terraform/language/functions
- HashiCorp archive provider `archive_file` documentation: https://registry.terraform.io/providers/hashicorp/archive/latest/docs/resources/file
- AWS provider `aws_lambda_function` documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/lambda_function
- AWS provider `aws_ssm_parameter` documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/ssm_parameter
- AWS provider `aws_ecs_task_definition` documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/ecs_task_definition
- NIST FIPS 180-4 Secure Hash Standard: https://csrc.nist.gov/pubs/fips/180-4/upd1/final
- RFC 4634, US Secure Hash Algorithms: https://datatracker.ietf.org/doc/html/rfc4634

## Issues Found
- The Lambda example used `sha256(file(data.archive_file.lambda.output_path))` to verify a generated ZIP archive. Terraform's `file` function reads UTF-8 text and is not suitable for binary ZIP data or dynamically generated files. Changed the output to use `data.archive_file.lambda.output_sha256`, which is the archive provider's SHA-256 checksum attribute.
- The deterministic identifier example described truncated SHA-256 strings as UUIDs. A truncated hexadecimal digest is not a UUID. Updated the heading and comments to call them deterministic IDs.
- The secret-value example implied Terraform could generate a security token while storing it as an SSM `SecureString`. Added a note that Terraform-managed values can be stored in state, including `SecureString` values when using the `value` argument.
- The `sha256(file(...))` versus `filesha256(...)` comparison used `data.bin` with `file(...)`. Since `file` requires UTF-8 text, changed the two-step example to a text file and clarified that `filesha256` should be used for binary files.
- The comparison section said SHA-256 is short enough for resource names without truncation issues. This was too broad because service-specific length limits vary. Reworded it to say it is suitable for tags and resource names when target service limits allow it.

## Review Notes
The remaining examples are illustrative and omit surrounding provider configuration, variables, IAM roles, and service-specific settings that a complete Terraform module would need. The Terraform function behavior, AWS provider attributes, and SHA-256 descriptions now align with the consulted documentation.
