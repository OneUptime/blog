# Validation Summary: How to Use the regex Function in Terraform

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Terraform
- HCL
- Terraform string functions
- Regular expressions
- AWS resource identifiers
- Kubernetes namespace naming
- Semantic version strings

## Sources Consulted
- HashiCorp Terraform `regex` function documentation: https://developer.hashicorp.com/terraform/language/functions/regex
- HashiCorp Terraform `regexall` function documentation: https://developer.hashicorp.com/terraform/language/functions/regexall
- HashiCorp Terraform `can` function documentation: https://developer.hashicorp.com/terraform/language/functions/can
- HashiCorp Terraform strings and templates documentation: https://developer.hashicorp.com/terraform/language/expressions/strings
- AWS S3 general purpose bucket naming rules: https://docs.aws.amazon.com/AmazonS3/latest/userguide/bucketnamingrules.html
- Kubernetes object names documentation: https://kubernetes.io/docs/concepts/overview/working-with-objects/names/
- Semantic Versioning 2.0.0 specification: https://semver.org/

## Issues Found
- The single unnamed capture group example showed `regex("server-([0-9]+)", "server-42")` returning a string. Terraform returns a list for one or more unnamed capture groups, so the example result was changed to `["42"]`.
- The AWS S3 ARN bucket extraction assigned a one-capture `regex` result directly to `bucket_name` while describing it as a string. Added `[0]` to select the captured bucket name from Terraform's returned list.
- The safe-regex guidance said to always use `can()` for conditional logic. HashiCorp documents `can()` primarily for validation rules and recommends `try()` for fallback-style error handling, so the wording was adjusted.
- The IPv4 validation regex accepted invalid octets such as `999`. Replaced it with a stricter IPv4 octet pattern.
- The S3 bucket and semantic version pattern comments overstated what the examples validate. Updated the comments to describe them as a basic bucket-name shape and version tag format.

## Review Notes
Terraform was not installed in the workspace, so examples were reviewed against official documentation rather than executed with `terraform console`. The post uses regex for parsing examples where provider-specific or built-in parsing functions may be preferable in production, but this is acceptable for a Terraform regex tutorial.
