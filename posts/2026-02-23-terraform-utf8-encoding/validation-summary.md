# Validation Summary: How to Use UTF-8 Encoding and Character Sets in Terraform

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Terraform configuration language
- HCL syntax
- UTF-8 and Unicode
- Terraform string, file, template, JSON, and Base64 functions
- AWS provider `aws_instance` user data arguments
- EditorConfig
- Unix command-line encoding tools

## Sources Consulted
- Terraform configuration syntax: https://developer.hashicorp.com/terraform/language/syntax/configuration
- Terraform files and configuration structure: https://developer.hashicorp.com/terraform/language/files
- Terraform strings and templates: https://developer.hashicorp.com/terraform/language/expressions/strings
- Terraform `file` and `templatefile` functions: https://developer.hashicorp.com/terraform/language/functions/file and https://developer.hashicorp.com/terraform/language/functions/templatefile
- Terraform `length`, `substr`, `upper`, and `jsonencode` functions: https://developer.hashicorp.com/terraform/language/functions/length, https://developer.hashicorp.com/terraform/language/functions/substr, https://developer.hashicorp.com/terraform/language/functions/upper, and https://developer.hashicorp.com/terraform/language/functions/jsonencode
- Terraform Base64 functions: https://developer.hashicorp.com/terraform/language/functions/base64encode, https://developer.hashicorp.com/terraform/language/functions/filebase64, and https://developer.hashicorp.com/terraform/language/functions/textencodebase64
- Terraform state push documentation for BOM handling: https://developer.hashicorp.com/terraform/cli/commands/state/push
- AWS provider `aws_instance` documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/instance
- Local command help for `file`, `iconv`, and GNU `sed`

## Issues Found
- The post incorrectly said Terraform identifiers must be ASCII. Terraform implements Unicode identifier syntax and extends it with the ASCII hyphen, so the identifier section and wrap-up were corrected.
- The identifier examples listed valid names as invalid. The examples were rewritten to show valid identifiers, hyphen support, and spaces as invalid.
- The Japanese string example contained English text. It was changed to Japanese text so the example actually demonstrates UTF-8.
- The direct Unicode escape example omitted the copyright character in the direct string. It was corrected to include `©`.
- The string function section said functions operate on Unicode code points and that `upper`/`lower` are ASCII-only. It was corrected to describe character-oriented behavior and Unicode case handling.
- The post claimed string comparison is byte-level and that composed/decomposed Unicode forms may not match. Terraform applies Unicode normalization to strings, so this was corrected to focus on exact byte representation when exchanging data with external systems.
- The Base64 section implied `base64encode()` handles arbitrary binary/non-UTF-8 data and used `user_data` with already encoded content. It now distinguishes text encoding from raw file bytes, uses `user_data_base64`, and adds `filebase64()` for binary files.
- The BOM section claimed Terraform handles UTF-8 BOM gracefully in most cases without official documentation support. It now states the conservative guidance that UTF-8 does not require a BOM and Terraform state files must not include one.
- The UTF-8 file requirement was tightened to say Terraform rejects non-UTF-8 byte sequences, avoiding the misleading implication that ASCII-only files saved under a different single-byte encoding are distinguishable.

## Review Notes
Terraform CLI was not installed in the local environment, so examples were checked against official Terraform documentation and local shell command help rather than by running `terraform validate`.
