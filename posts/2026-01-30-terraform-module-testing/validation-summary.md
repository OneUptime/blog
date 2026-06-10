# Validation Summary: How to Build Terraform Module Testing

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform (1.6+ native test framework, `.tftest.hcl`)
- Terratest (Go library)
- HashiCorp HCL test syntax (`run`, `assert`, `expect_failures`, `module` blocks, setup modules)
- Go testing (`testing.T`, `t.Parallel`, table-driven tests)
- AWS SDK for Go (`aws-sdk-go`: `ec2.DescribeVpcs`, `ec2.DescribeNatGateways`)
- testify (`assert`, `require`)
- GitHub Actions (`hashicorp/setup-terraform@v3`, `aws-actions/configure-aws-credentials@v4`, `actions/setup-go@v5`, `aquasecurity/tfsec-action`, `bridgecrewio/checkov-action`)
- tfsec, Checkov

## Sources Consulted
- Terraform `test` command reference — https://developer.hashicorp.com/terraform/cli/commands/test
- Terraform tests language docs — https://developer.hashicorp.com/terraform/language/tests
- Terratest `modules/terraform` — https://pkg.go.dev/github.com/gruntwork-io/terratest/modules/terraform
- Terratest `modules/random` — https://pkg.go.dev/github.com/gruntwork-io/terratest/modules/random
- Terratest `modules/test-structure` — https://pkg.go.dev/github.com/gruntwork-io/terratest/modules/test-structure
- Terratest iterating with test stages — https://terratest.gruntwork.io/docs/testing-best-practices/iterating-locally-using-test-stages/
- `bridgecrewio/checkov-action` releases — https://github.com/bridgecrewio/checkov-action/releases
- `aquasecurity/tfsec-action` — https://github.com/aquasecurity/tfsec-action

## Issues Found
1. **`random.UniqueId()` is deprecated.** Terratest exposes `random.UniqueID()` (Go-idiomatic capitalization) as the current API. Changed `uniqueId := random.UniqueId()` to `uniqueId := random.UniqueID()` in the "Use Unique Resource Names" best-practice example.
2. **Misleading `SKIP_terraform_destroy=true` example.** The post implied that `SKIP_terraform_destroy=true go test ...` would skip the `defer terraform.Destroy(t, terraformOptions)` call. That is incorrect: the `SKIP_<stage>` convention only works when destroy is wrapped in `test_structure.RunTestStage(t, "<stage>", ...)`. A bare `defer terraform.Destroy(...)` is not affected by any `SKIP_*` env var. Replaced the misleading shell example with a short clarifying paragraph that points readers at the Terratest "iterating locally using test stages" guide and explains the actual requirement.

## Review Notes
- `terraform test` flags shown (`-filter`, `-verbose`) are valid in 1.6+. `-var-file` is not enumerated on the official `terraform test` command reference page; tfvars files are typically auto-loaded based on the configuration under test, so readers may see different behavior than other commands. The post's usage is plausible but worth a future caveat.
- `expect_failures = [ var.cidr_block ]` syntax matches the official docs.
- Setup module reference `module { source = "./tests/setup" }` and downstream reference `run.setup.kms_key_arn` are correct.
- All Terratest function signatures (`WithDefaultRetryableErrors`, `InitAndApply`, `Destroy`, `Output`, `OutputList`, `PlanExitCode`) are accurate, including the exit code interpretation (`0` = no changes, `2` = changes present).
- GitHub Actions versions are valid majors. `aquasecurity/tfsec-action@v1.0.0` is pinned to a stale patch — the action's current tag is `v1.0.3`, and tfsec itself is now in maintenance-only mode after merging into Trivy. Future revisions should consider migrating to `aquasecurity/trivy-action`.
- The nested markdown code-fence sequence near "Document Test Requirements" renders awkwardly (a `markdown` block containing a `bash` block, closed with `\`\`\`bash` then `\`\`\`text`), but is a cosmetic rendering quirk rather than a technical inaccuracy and was left unchanged.
- The two stray empty code fences at the very end of the file are also cosmetic and were left unchanged.
