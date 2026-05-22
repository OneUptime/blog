# Validation Summary: How to Use the sha512 Function in Terraform

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Terraform
- HCL
- Terraform hash and crypto functions
- SHA-512
- AWS SSM Parameter Store
- Amazon S3 objects with the Terraform AWS provider

## Sources Consulted
- Terraform `sha512` function documentation: https://developer.hashicorp.com/terraform/language/functions/sha512
- Terraform `filesha512` function documentation: https://developer.hashicorp.com/terraform/language/functions/filesha512
- Terraform `file` function documentation: https://developer.hashicorp.com/terraform/language/functions/file
- Terraform `base64sha512` function documentation: https://developer.hashicorp.com/terraform/language/functions/base64sha512
- Terraform `timestamp` function documentation: https://developer.hashicorp.com/terraform/language/functions/timestamp
- Terraform AWS provider `aws_s3_object` resource documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/s3_object
- RFC 6234, SHAs, HMAC-SHAs, and HKDF: https://www.rfc-editor.org/rfc/rfc6234.html

## Issues Found
- The `filesha512` section described `sha512(file("${path.module}/artifacts/release.tar.gz"))` as an equivalent but less efficient way to hash a `.tar.gz` file. Terraform's `file()` function interprets file contents as UTF-8 text and errors on invalid UTF-8, so it is not suitable for arbitrary binary archives. Changed the manual comparison to use a UTF-8 text file and clarified that it is only similar for UTF-8 text files.

## Review Notes
- `timestamp()` is technically valid in the audit example, but Terraform documents that it changes every second and can cause diffs on every run when used directly in resource attributes. In this post it is part of an audit-record example, so no correction was required, but a future revision could call out that behavior explicitly.
