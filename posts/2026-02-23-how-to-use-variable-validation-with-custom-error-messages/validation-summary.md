# Validation Summary: How to Use Variable Validation with Custom Error Messages

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Terraform
- HCL
- Terraform input variable validation
- Terraform built-in functions: `contains`, `regex`, `can`, `cidrhost`, `length`, `substr`, `alltrue`, `lower`
- AWS account IDs, regions, and S3 bucket naming
- TCP/UDP port ranges

## Sources Consulted
- Terraform variable block reference: https://developer.hashicorp.com/terraform/language/block/variable
- Terraform validation documentation: https://developer.hashicorp.com/terraform/language/validate
- Terraform `regex` function documentation: https://developer.hashicorp.com/terraform/language/functions/regex
- Terraform `can` function documentation: https://developer.hashicorp.com/terraform/language/functions/can
- Terraform `cidrhost` function documentation: https://developer.hashicorp.com/terraform/language/functions/cidrhost
- Terraform `contains` function documentation: https://developer.hashicorp.com/terraform/language/functions/contains
- Terraform `alltrue` function documentation: https://developer.hashicorp.com/terraform/language/functions/alltrue
- Terraform sensitive values documentation: https://developer.hashicorp.com/terraform/language/block/variable#sensitive
- AWS account identifiers documentation: https://docs.aws.amazon.com/accounts/latest/reference/manage-acct-identifiers.html
- Amazon S3 bucket naming rules: https://docs.aws.amazon.com/AmazonS3/latest/userguide/bucketnamingrules.html
- IANA Service Name and Transport Protocol Port Number Registry: https://www.iana.org/assignments/service-names-port-numbers/service-names-port-numbers.xhtml

## Issues Found
- The AWS region validation example used a regex that checks only the region string format, but the error message said the region was "not valid." Updated the message to say the value does not match the expected format.
- The sensitive variable section said Terraform would expose a sensitive value in the output if included in an error message. Current Terraform treats expressions derived from sensitive variables as sensitive and does not display the resulting message. Updated the explanation accordingly.
- The multiple validation block example implied that `My-Bucket` would produce only one validation message. In Terraform 1.14.1, that value fails both the first-character and allowed-character validation blocks. Updated the text to show multiple specific messages.

## Review Notes
Terraform CLI was not installed in the workspace, so Terraform 1.14.1 was downloaded to a temporary directory and used to verify the multiple-validation and sensitive-error-message behavior. The S3 bucket validation examples are useful for demonstrating message granularity, but they are not a complete implementation of every current S3 bucket naming restriction, such as reserved prefixes and suffixes or IP-address-style names.
