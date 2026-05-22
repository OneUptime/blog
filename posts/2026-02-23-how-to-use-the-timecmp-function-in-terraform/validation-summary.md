# Validation Summary: How to Use the timecmp Function in Terraform

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform
- Terraform HCL
- Terraform date and time functions: `timecmp`, `timestamp`, `plantimestamp`, `timeadd`, `formatdate`
- Terraform variable validation
- Terraform resource `count` meta-argument

## Sources Consulted
- Terraform `timecmp` function documentation: https://developer.hashicorp.com/terraform/language/functions/timecmp
- Terraform `timeadd` function documentation: https://developer.hashicorp.com/terraform/language/functions/timeadd
- Terraform `timestamp` function documentation: https://developer.hashicorp.com/terraform/language/functions/timestamp
- Terraform `plantimestamp` function documentation: https://developer.hashicorp.com/terraform/language/functions/plantimestamp
- Terraform `formatdate` function documentation: https://developer.hashicorp.com/terraform/language/functions/formatdate
- Terraform functions overview: https://developer.hashicorp.com/terraform/language/functions
- Terraform custom conditions and validation documentation: https://developer.hashicorp.com/terraform/language/validate

## Issues Found
- The certificate status example used `formatdate("YYYY-MM-DD HH:mm 'UTC'", local.now)`. In Terraform `formatdate`, `HH` is a 12-hour clock token and `hh` is the 24-hour clock token. Changed it to `formatdate("YYYY-MM-DD hh:mm 'UTC'", local.now)` so the formatted timestamp matches the intended UTC 24-hour display.
- The conditional resource deployment example used `timestamp()` to calculate a `count` value. Terraform documents `timestamp()` as apply-time and not predictable during planning, while `count` must be known during planning. Changed the example to use `plantimestamp()` and added a short comment explaining why.
- The post used `plantimestamp()` in validation examples without noting its version availability. Added a concise note that `plantimestamp()` is available in Terraform v1.5 and later.

## Review Notes
- Terraform was not installed in the local environment, so examples were reviewed against official HashiCorp documentation and static HCL syntax rather than executed with `terraform validate`.
- The remaining examples are consistent with Terraform's documented behavior for RFC 3339 timestamps, `timecmp` return values, `timeadd` duration syntax, `formatdate` tokens, and validation blocks.
