# Validation Summary: How to Use the log Function in Terraform

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform
- HCL
- Terraform numeric functions: `log`, `ceil`, `floor`, `pow`, and `max`
- Terraform IP network function: `cidrsubnet`
- Terraform collection function: `range`
- Terraform input variable validation

## Sources Consulted
- HashiCorp Terraform `log` function documentation: https://developer.hashicorp.com/terraform/language/functions/log
- HashiCorp Terraform `pow` function documentation: https://developer.hashicorp.com/terraform/language/functions/pow
- HashiCorp Terraform `ceil` function documentation: https://developer.hashicorp.com/terraform/language/functions/ceil
- HashiCorp Terraform `floor` function documentation: https://developer.hashicorp.com/terraform/language/functions/floor
- HashiCorp Terraform `max` function documentation: https://developer.hashicorp.com/terraform/language/functions/max
- HashiCorp Terraform `cidrsubnet` function documentation: https://developer.hashicorp.com/terraform/language/functions/cidrsubnet
- HashiCorp Terraform `range` function documentation: https://developer.hashicorp.com/terraform/language/functions/range
- HashiCorp Terraform input variables documentation: https://developer.hashicorp.com/terraform/language/values/variables
- Terraform source mapping of built-in functions to `go-cty` stdlib: https://raw.githubusercontent.com/hashicorp/terraform/main/internal/lang/functions.go
- `go-cty` numeric function implementation used by Terraform: https://raw.githubusercontent.com/zclconf/go-cty/main/cty/function/stdlib/number.go
- Terraform 1.15.2 console checks from official HashiCorp release binary.

## Issues Found
- The console output for `log(50, 10)` showed `1.6989700043360187`, but Terraform 1.15.2 returns `1.6989700043360185`, matching the official HashiCorp documentation example. Updated the displayed result.
- The statement "log of 1 is always 0 regardless of base" was mathematically too broad because invalid bases are excluded. Changed it to "for any valid base."
- The notes said `log(0, base)` will cause an error. Terraform 1.15.2 returns `-Inf` for `log(0, 2)`, while negative inputs can error due to a NaN result. Updated the note to reflect Terraform behavior and added base validation guidance.
- The validation example only validated the logarithm number, not the base. Added a `log_base` validation example requiring a positive base that is not 1.
- The summary only mentioned validating positive inputs. Updated it to include the valid base requirement.

## Review Notes
Terraform was not installed in the workspace, so I downloaded and used the official Terraform 1.15.2 Linux AMD64 release binary for console checks. The main HCL examples are syntactically consistent with Terraform's documented function signatures. Several examples are illustrative calculations rather than complete provider-backed infrastructure configurations.
