# Validation Summary: How to Use the replace Function in Terraform

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform
- HCL
- Terraform string functions
- Terraform regular expressions
- Docker image tags
- AWS S3 and ECR examples

## Sources Consulted
- Terraform `replace` function documentation: https://developer.hashicorp.com/terraform/language/functions/replace
- Terraform `regex` function and RE2 syntax documentation: https://developer.hashicorp.com/terraform/language/functions/regex
- Terraform `regexall` function documentation: https://developer.hashicorp.com/terraform/language/functions/regexall
- Terraform `substr` function documentation: https://developer.hashicorp.com/terraform/language/functions/substr
- Terraform strings and escape sequences documentation: https://developer.hashicorp.com/terraform/language/expressions/strings
- Docker image tag documentation: https://docs.docker.com/reference/cli/docker/image/tag/

## Issues Found
- The regex replacement example described replacing non-alphanumeric characters with hyphens as "Remove all non-alphanumeric characters." Changed the comment to say it replaces those characters with hyphens, matching the code and result.
- The Docker tag sanitization comment said the second regex removed "other invalid chars," but Docker tags can allow additional characters such as underscores and periods. Changed the comment to clarify that the expression keeps a stricter lowercase letters/digits/hyphens format.
- The masked API key example showed 14 asterisks before `cdef`, but the example key has 19 characters and masking all but the last 4 produces 15 asterisks. Corrected the expected result.

## Review Notes
Terraform was not installed in the local environment, so examples were reviewed against official Terraform documentation rather than executed with `terraform console`. The S3 bucket example is accurate for the demonstrated input, but production bucket-name sanitization may need additional validation for length, leading/trailing hyphens, dots, and other AWS-specific naming constraints.
