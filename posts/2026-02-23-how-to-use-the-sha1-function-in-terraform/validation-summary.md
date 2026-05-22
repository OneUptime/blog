# Validation Summary: How to Use the sha1 Function in Terraform

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Terraform
- HashiCorp Configuration Language (HCL)
- SHA-1 hashing
- Terraform AWS Provider resources
- AWS Lambda, S3, SQS, and EC2 examples

## Sources Consulted
- Terraform `sha1` function documentation: https://developer.hashicorp.com/terraform/language/functions/sha1
- Terraform `filesha1` function documentation: https://developer.hashicorp.com/terraform/language/functions/filesha1
- Terraform `file` function documentation: https://developer.hashicorp.com/terraform/language/functions/file
- Terraform `tonumber` function documentation: https://developer.hashicorp.com/terraform/language/functions/tonumber
- Terraform `parseint` function documentation: https://developer.hashicorp.com/terraform/language/functions/parseint
- Terraform AWS Provider `aws_lambda_function` documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/lambda_function
- Google Online Security Blog, "Announcing the first SHA1 collision": https://security.googleblog.com/2017/02/announcing-first-sha1-collision.html

## Issues Found
- The conditional-logic example used `tonumber("0x...")` to convert hexadecimal hash characters to a number. Terraform's `tonumber` only converts decimal representations, so this would fail. Changed the example to use `parseint(substr(sha1(member), 0, 4), 16)`, which is the Terraform function intended for parsing integers in a specified base.
- The `sha1` vs `filesha1` section described `filesha1` as equivalent to `sha1(file(...))` without qualification. Terraform's `file()` function only accepts UTF-8 text, while `filesha1` can hash file contents directly, including binary files. Updated the wording to say the expressions are equivalent for UTF-8 text files and noted that `filesha1` can hash binary files.

## Review Notes
The post's core explanation of `sha1` is accurate: Terraform encodes the input string as UTF-8, applies SHA-1, and returns lowercase hexadecimal output. The AWS Lambda example uses `source_code_hash` as a change trigger; current AWS Provider documentation treats this as a user-defined local source-code hash, while `code_sha256` is available when matching Lambda's base64-encoded SHA-256 package hash is required.
