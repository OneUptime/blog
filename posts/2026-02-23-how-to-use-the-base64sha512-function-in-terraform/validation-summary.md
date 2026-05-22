# Validation Summary: How to Use the base64sha512 Function in Terraform

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform language functions
- SHA-512 hashing
- Base64 encoding
- Terraform AWS provider resources
- AWS SSM Parameter Store
- Amazon S3 objects
- Amazon VPC

## Sources Consulted
- Terraform `base64sha512` function documentation: https://developer.hashicorp.com/terraform/language/functions/base64sha512
- Terraform `filebase64sha512` function documentation: https://developer.hashicorp.com/terraform/language/functions/filebase64sha512
- Terraform `file` function documentation: https://developer.hashicorp.com/terraform/language/functions/file
- Terraform `sha512` function documentation: https://developer.hashicorp.com/terraform/language/functions/sha512
- Terraform `timestamp` function documentation: https://developer.hashicorp.com/terraform/language/functions/timestamp
- Terraform `values` function documentation: https://developer.hashicorp.com/terraform/language/functions/values
- AWS provider `aws_s3_object` resource documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/s3_object
- AWS provider `aws_ssm_parameter` resource documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/ssm_parameter
- AWS provider `aws_vpc` resource documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/vpc

## Issues Found
- The deployment artifact example used `file()` to read a `.tar.gz` file before hashing it. Terraform's `file()` function only accepts valid UTF-8 text, so this would fail for typical binary archives. Changed the example to use `filebase64sha512()` directly.
- The file hashing section described `filebase64sha512()` as a streaming optimization and presented `base64sha512(file(...))` as equivalent for a `.zip` file. The official documentation frames the difference as binary-safe file hashing versus UTF-8 text-only `file()` usage. Updated the wording and changed the alternate example to a text file.
- The API payload example used `timestamp()` inside a resource payload, which would cause diffs on every Terraform run. Removed the volatile timestamp field from the example.
- Several sections used "signature" language for plain hashes. Updated those headings and comments to describe hashes rather than cryptographic signatures.
- The post overstated SHA-512 as "maximum security" and "strongest available hash." Updated the wording to describe it as a longer SHA-2 digest and the right choice when SHA-512 is required.

## Review Notes
Terraform was not installed in the local environment, so examples were reviewed by inspection against the official Terraform language documentation and AWS provider resource documentation rather than by running `terraform validate`.
