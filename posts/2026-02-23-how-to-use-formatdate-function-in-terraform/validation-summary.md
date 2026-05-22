# Validation Summary: How to Use formatdate Function in Terraform

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform
- Terraform date and time functions: `formatdate`, `timestamp`, `plantimestamp`, and `timeadd`
- Terraform HCL
- AWS provider examples

## Sources Consulted
- HashiCorp Terraform `formatdate` function documentation: https://developer.hashicorp.com/terraform/language/functions/formatdate
- HashiCorp Terraform `timestamp` function documentation: https://developer.hashicorp.com/terraform/language/functions/timestamp
- HashiCorp Terraform `plantimestamp` function documentation: https://developer.hashicorp.com/terraform/language/functions/plantimestamp
- HashiCorp Terraform `timeadd` function documentation: https://developer.hashicorp.com/terraform/language/functions/timeadd
- HashiCorp Terraform built-in functions overview: https://developer.hashicorp.com/terraform/language/functions
- HashiCorp Time provider documentation: https://registry.terraform.io/providers/hashicorp/time/latest/docs
- HashiCorp AWS provider `aws_acm_certificate` data source documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/data-sources/acm_certificate

## Issues Found
- The post had the 24-hour and 12-hour format specifiers reversed. Terraform uses `hh` for 24-hour time and `HH` for 12-hour time, so the affected examples and summary text were corrected.
- The format specifier list included unsupported `EE` and `WW` examples. The unsupported short day-of-week example was removed, and the weekly backup example was changed to a supported monthly naming example using `MM`.
- The timezone examples used the wrong sequences for UTC names and numeric offsets. They were corrected to use `Z`, `ZZZZ`, and `ZZZ` according to Terraform's documented behavior.
- The lifecycle policy example claimed to build an expiry date but did not calculate one. It now uses `timeadd` with `2160h` to calculate a 90-day expiry timestamp and formats it as an `ExpiryDate` tag.
- The external certificate example referenced `data.aws_acm_certificate.main.not_after`, which is not exported by the current official AWS provider data source. It was changed to use an external input variable containing an RFC 3339 timestamp.
- The `timestamp()` gotcha overstated the behavior and implied `plantimestamp()` should be used for stable resource attributes. It was corrected to explain that `timestamp()` is evaluated during apply, `plantimestamp()` is useful for plan-time comparisons, and the Time provider is the appropriate option for timestamps stored in state.
- The UTC gotcha incorrectly implied all input timestamps are UTC. It now states specifically that `timestamp()` returns UTC.

## Review Notes
Terraform was not installed in the local environment, so examples were reviewed against official documentation rather than executed with `terraform console`. The post still uses `timestamp()` in resource attribute examples; this is technically valid HCL, but the gotchas now warn that direct use in resource attributes causes recurring diffs and that the Time provider is better for stable state-backed timestamps.
