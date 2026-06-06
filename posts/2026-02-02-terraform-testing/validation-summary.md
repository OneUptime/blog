# Validation Summary: How to Implement Infrastructure Testing with Terraform

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform (CLI, native `terraform test`, `.tftest.hcl`, `mock_provider`)
- TFLint (with AWS plugin, `terraform_naming_convention`, `terraform_documented_variables`, `terraform_documented_outputs`, `terraform_deprecated_interpolation` rules)
- Checkov (Terraform static security scanner)
- Terratest (Go library: `terraform`, `aws`, `http-helper` modules; `testify` assertions)
- HashiCorp Sentinel (`tfplan/v2` import, list iteration, `filter`, `rule`)
- Open Policy Agent / Rego / Conftest
- GitHub Actions (`actions/checkout@v4`, `hashicorp/setup-terraform@v3`, `terraform-linters/setup-tflint@v4`, `bridgecrewio/checkov-action@v12`, `github/codeql-action/upload-sarif`, `actions/setup-go@v5`, `aws-actions/configure-aws-credentials@v4`)
- AWS resources (S3, VPC, EC2, ALB, RDS Postgres, Budgets)

## Sources Consulted
- Terraform 1.7 release notes (mock provider): https://www.hashicorp.com/en/blog/terraform-1-7-adds-test-mocking-and-config-driven-remove
- Terraform test command docs: https://developer.hashicorp.com/terraform/cli/commands/test
- Terratest aws module source: https://github.com/gruntwork-io/terratest/blob/master/modules/aws/ec2.go
- Terratest http-helper module docs: https://pkg.go.dev/github.com/gruntwork-io/terratest/modules/http-helper
- TFLint ruleset-terraform: https://github.com/terraform-linters/tflint-ruleset-terraform/tree/main/docs/rules
- TFLint AWS ruleset: https://github.com/terraform-linters/tflint-ruleset-aws
- Checkov CLI docs: https://www.checkov.io/2.Basics/CLI%20Command%20Reference.html
- Conftest CLI docs: https://www.conftest.dev/
- HashiCorp Sentinel language spec / loops: https://developer.hashicorp.com/sentinel/docs/language/loops
- Sentinel `tfplan/v2` import: https://developer.hashicorp.com/sentinel/docs/extending-terraform/plan-import
- GitHub CodeQL Action deprecation notice (v2 retired, v4 current): https://github.blog/changelog/2025-10-28-upcoming-deprecation-of-codeql-action-v3/
- `bridgecrewio/checkov-action` releases: https://github.com/bridgecrewio/checkov-action/releases
- `open-policy-agent/setup-opa`: https://github.com/open-policy-agent/setup-opa
- `open-policy-agent/conftest` releases: https://github.com/open-policy-agent/conftest/releases

## Issues Found

1. **`TF_VERSION: "1.6.0"` in the GitHub Actions workflow contradicted the mocks example.**
   `mock_provider "aws" {}` (used earlier in the post) requires **Terraform 1.7+** — it was introduced in 1.7.0 (Jan 2024). With 1.6.0 the workflow would fail when executing the mock test.
   **Fix:** bumped `TF_VERSION` to `"1.7.0"`.

2. **`aws.GetInstanceState(t, "us-east-1", instanceID)` is not a real Terratest function.**
   The `gruntwork-io/terratest/modules/aws/ec2.go` module exposes `GetPrivateIPOfEc2Instance`, `GetPublicIpOfEc2Instance`, `GetEc2InstanceIdsByTag`, `GetEc2InstanceIdsByFilters`, `GetTagsForEc2Instance`, `TerminateInstance` — but no `GetInstanceState`. The example would not compile.
   **Fix:** replaced the call with `aws.GetPublicIpOfEc2Instance(t, instanceID, "us-east-1")` and asserted it equals the Terraform output — this both verifies the instance is queryable in AWS and is a real, idiomatic Terratest call.

3. **`github/codeql-action/upload-sarif@v2` is retired** (retired January 2025).
   **Fix:** updated to `@v3` (v3 remains supported through Dec 2026; v4 is current but v3 is a safe choice for stability and still receives security updates).

4. **`open-policy-agent/conftest-action@v2` does not exist.** The `open-policy-agent` org has no `conftest-action` repository — the workflow would fail at action resolution time. (There is a community `instrumenta/conftest-action` but it is also unmaintained.)
   **Fix:** replaced the step with two run steps that download the official `open-policy-agent/conftest` binary release and execute `conftest test`. This is the canonical pattern recommended by the conftest project.

5. **Unused Go imports** in three test files would fail `go test` with `imported and not used` errors:
   - `ec2_instance_test.go`: imported `"time"` but never referenced — removed.
   - `alb_test.go`: imported `"net/http"` but never referenced — removed. Also added an explicit `http_helper` alias for the dashed import path `github.com/gruntwork-io/terratest/modules/http-helper`, since Go would otherwise pick `http-helper` as the identifier (illegal).
   - `parallel_test.go`: imported `"time"` but never referenced — removed.

## Review Notes

- The blog correctly states Terraform 1.6 introduced `terraform test`. The mocks example correctly demonstrates 1.7+ syntax; after the fix the CI version is consistent.
- TFLint rule names (`terraform_naming_convention`, `terraform_documented_variables`, `terraform_documented_outputs`, `terraform_deprecated_interpolation`) are all real rules in `tflint-ruleset-terraform`.
- Sentinel `for required_tags as tag` correctly binds `tag` to the **value** when iterating a list (single-identifier form gives the value; two-identifier form would give `idx, value`). The code is correct as written.
- The Rego policy example uses `resource.change.after.acl == "public-read"` on `aws_s3_bucket`. The AWS provider 4.x+ deprecated the inline `acl` argument in favor of the separate `aws_s3_bucket_acl` resource, but the inline form still works for legacy configurations and the example is illustrative — not flagged as an error.
- `bridgecrewio/checkov-action@v12` is a real, current major version.
- `open-policy-agent/setup-opa@v2` exists and is current.
- `aws.GetPublicIpOfEc2Instance` in Terratest accepts arguments in `(t, instanceID, region)` order (instance ID first, then region) — matched in the fix.
- The example budget module sets `limit_amount = "100"` and `time_unit = "MONTHLY"`, which are valid `aws_budgets_budget` arguments per the AWS provider docs.
- The `terraform test -filter=tests/...` flag and `tflint --recursive`, `tflint --init`, `checkov -d`, `--framework`, `-o junitxml`, `--skip-check` flags are all current and correct.
