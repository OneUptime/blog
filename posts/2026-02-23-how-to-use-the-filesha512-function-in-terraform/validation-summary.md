# Validation Summary: How to Use the filesha512 Function in Terraform

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform
- HCL
- Terraform file hash functions
- SHA-512 / SHA-2 hashing
- AWS Systems Manager Parameter Store
- AWS S3 objects
- Terraform AWS provider resources

## Sources Consulted
- Terraform `filesha512` function documentation: https://developer.hashicorp.com/terraform/language/functions/filesha512
- Terraform `filebase64sha512` function documentation: https://developer.hashicorp.com/terraform/language/functions/filebase64sha512
- Terraform `filebase64sha256` function documentation: https://developer.hashicorp.com/terraform/language/functions/filebase64sha256
- Terraform `sha512` function documentation: https://developer.hashicorp.com/terraform/language/functions/sha512
- Terraform `fileset` function documentation: https://developer.hashicorp.com/terraform/language/functions/fileset
- Terraform `timestamp` function documentation: https://developer.hashicorp.com/terraform/language/functions/timestamp
- Terraform `alltrue` function documentation: https://developer.hashicorp.com/terraform/language/functions/alltrue
- Terraform AWS Provider `aws_ssm_parameter` documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/ssm_parameter
- Terraform AWS Provider `aws_s3_object` documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/s3_object
- NIST FIPS 180-4 Secure Hash Standard: https://csrc.nist.gov/pubs/fips/180-4/upd1/final
- RFC 4634, US Secure Hash Algorithms: https://www.rfc-editor.org/rfc/rfc4634

## Issues Found
- The post described the comparison table as covering all Terraform file hashing functions, but it omitted `filebase64sha512`. Changed the wording to "common file hashing functions" and added a `filebase64sha512` example.
- The compliance manifest example included `timestamp()` in a managed resource value. Terraform documents that `timestamp()` changes over time and can cause repeated diffs when used directly in resource attributes. Removed the changing timestamp from that manifest.
- The deployment ID example used only the first 16 hex characters while describing it as very unique/high entropy. Changed the example to use 32 hex characters, representing a compact 128-bit prefix.
- The audit S3 object example used `timestamp()` in the object key. Replaced it with a deterministic hash-derived key based on the audit record content to avoid a timestamp-driven new object on every run.
- The important notes said `filesha512` reads at plan time. Updated this to match Terraform's broader file function behavior: the file must already exist before Terraform takes actions.
- The summary described `filesha512` as the strongest hash available in Terraform's full built-in function set. Narrowed the statement to the strongest file hash algorithm in Terraform's built-in function set.

## Review Notes
Terraform was not installed in the local environment, so examples were reviewed statically against official Terraform and Terraform AWS provider documentation rather than by running `terraform validate`.
