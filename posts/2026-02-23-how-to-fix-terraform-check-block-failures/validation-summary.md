# Validation Summary: How to Fix Terraform Check Block Failures

## Status
validated

## Post Type
Tutorial / Troubleshooting Guide

## Technologies Covered
- Terraform (>= 1.5)
- HashiCorp HCL syntax
- Terraform `check` blocks (introduced in Terraform 1.5)
- `hashicorp/http` provider data source
- `hashicorp/dns` provider data source
- AWS provider (`aws_instance`, `aws_lb`, `aws_acm_certificate`)
- Terraform built-in functions: `try()`, `can()`, `jsondecode()`, `contains()`

## Sources Consulted
- Terraform docs: Checks - https://developer.hashicorp.com/terraform/language/checks
- Terraform 1.5 release notes / changelog (check blocks introduced June 2023)
- Terraform docs: Custom Conditions (preconditions/postconditions) - https://developer.hashicorp.com/terraform/language/expressions/custom-conditions
- HashiCorp `http` provider data source docs - https://registry.terraform.io/providers/hashicorp/http/latest/docs/data-sources/http (verified `retry` block with `attempts`, `min_delay_ms`, `max_delay_ms`)
- HashiCorp `dns` provider data source docs - https://registry.terraform.io/providers/hashicorp/dns/latest/docs/data-sources/dns_a_record_set
- Terraform docs: `try` and `can` functions - https://developer.hashicorp.com/terraform/language/functions/try
- AWS provider docs for `aws_acm_certificate` (status attribute) and `aws_instance` (instance_state)

## Issues Found

1. **Incorrect claim about string truthiness in Terraform conditions.** The post originally stated, "If `var.environment` is a string, this works because non-empty strings are truthy in Terraform." This is technically incorrect — Terraform's assert/condition expressions require a boolean value. Passing a string produces an error: `Invalid condition result: The condition expression must return either true or false, not a string.` I updated the example comment and the surrounding prose to reflect that this is an actual error, not a "works but unexpected" situation, and to explain the explicit `!= ""` form is required.

2. **Contradictory note about retry support for the HTTP data source.** The post showed a working `retry` block on the `hashicorp/http` data source, then immediately said, "For the HTTP data source, you might need to accept the initial failure and re-run plan later." The `hashicorp/http` provider does support the `retry` block (`attempts`, `min_delay_ms`, `max_delay_ms`). I reworded the note to refer to "data sources that do not support a retry block" generally, which preserves the author's caveat without contradicting the example.

## Review Notes

- The HCL syntax in all examples is valid for Terraform 1.5+.
- The `retry` block fields (`attempts`, `min_delay_ms`) match the current `hashicorp/http` provider schema.
- The comparison table (`check` vs `precondition` vs `postcondition`) accurately reflects current Terraform behavior — checks emit warnings and run after apply, while pre/postconditions emit errors and run per-resource.
- The claim that all assertions in a check block continue to be evaluated even after one fails is consistent with Terraform's documented behavior.
- The AMI ID `ami-0c55b159cbfafe1f0` used in the example is an illustrative placeholder; it is not guaranteed to exist in any specific AWS region today, but this is standard for example code.
- The `aws_acm_certificate.main.status == "ISSUED"` check is valid — `ISSUED` is a documented status value.
- The post correctly describes scoped data sources within check blocks and the recommendation to use distinct names is good practice.
