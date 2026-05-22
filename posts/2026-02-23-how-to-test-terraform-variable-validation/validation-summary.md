# Validation Summary: How to Test Terraform Variable Validation

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Terraform input variable validation
- Terraform native test framework
- HCL test files
- Terraform built-in functions: `contains`, `regex`, `can`, `cidrhost`
- Terratest for Go-based Terraform testing

## Sources Consulted
- Terraform Tests documentation: https://developer.hashicorp.com/terraform/language/tests
- Terraform validation and custom conditions documentation: https://developer.hashicorp.com/terraform/language/validate
- Terraform input variables documentation: https://developer.hashicorp.com/terraform/language/values/variables
- Terraform `can` function documentation: https://developer.hashicorp.com/terraform/language/functions/can
- Terraform `cidrhost` function documentation: https://developer.hashicorp.com/terraform/language/functions/cidrhost
- Terraform `regexall` documentation, including `regex` behavior notes: https://developer.hashicorp.com/terraform/language/functions/regexall
- Terratest Terraform package documentation: https://pkg.go.dev/github.com/gruntwork-io/terratest/modules/terraform
- Linked OneUptime posts were checked with HTTP HEAD requests and returned HTTP 200.

## Issues Found
- The original CIDR validation used `tonumber(split("/", var.cidr_block)[1])` outside an error-catching expression. For malformed input such as `not-a-cidr`, that can raise an expression evaluation error instead of producing the intended variable validation failure. Changed the condition to keep CIDR parsing and prefix matching inside `can(...)` checks.
- The post referred to `expect_failures` as a block. Terraform test syntax defines it as an optional attribute on a `run` block. Updated the wording to say "attribute."
- The Terratest valid-input example deferred `terraform.Destroy` after only running `InitAndPlan`. Since the example does not apply infrastructure, destroy cleanup is unnecessary and can be misleading for a plan-only validation test. Removed the deferred destroy call.
- The Terratest example only passed `environment`, while the surrounding Terraform examples also require `instance_type` and `cidr_block`. Added valid companion values so the validation being tested is isolated to the intended variable.

## Review Notes
Terraform CLI was not installed in the review environment, so examples were validated against official documentation and by static review rather than by executing `terraform test`. The article correctly uses `command = plan` with `expect_failures`, which is the recommended pattern for testing input variable validation failures.
