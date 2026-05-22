# Validation Summary: How to Implement Infrastructure as Code Testing Pyramid with Terraform

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform CLI
- Terraform JSON plan output
- Terratest
- Go
- AWS SDK for Go v2
- Open Policy Agent / Rego
- TFLint
- Checkov
- GitHub Actions

## Sources Consulted
- HashiCorp Terraform CLI `fmt` command reference: https://developer.hashicorp.com/terraform/cli/commands/fmt
- HashiCorp Terraform CLI `validate` command reference: https://developer.hashicorp.com/terraform/cli/commands/validate
- HashiCorp Terraform CLI `init` command reference: https://developer.hashicorp.com/terraform/cli/commands/init
- HashiCorp Terraform JSON output format: https://developer.hashicorp.com/terraform/internals/json-format
- Terratest Terraform package Go documentation: https://pkg.go.dev/github.com/gruntwork-io/terratest/modules/terraform
- Terratest AWS package Go documentation: https://pkg.go.dev/github.com/gruntwork-io/terratest/modules/aws
- HashiCorp `terraform-json` Go package documentation: https://pkg.go.dev/github.com/hashicorp/terraform-json
- Open Policy Agent policy reference and testing syntax: https://www.openpolicyagent.org/docs/policy-reference
- Open Policy Agent v1.0 upgrade guide: https://www.openpolicyagent.org/docs/v0-upgrade
- TFLint CLI documentation: https://github.com/terraform-linters/tflint
- Checkov CLI command reference: https://www.checkov.io/2.Basics/CLI%20Command%20Reference.html
- GitHub Actions workflow syntax documentation: https://docs.github.com/actions/learn-github-actions/workflow-syntax-for-github-actions
- AWS EC2 VPC attribute documentation: https://docs.aws.amazon.com/cli/latest/reference/ec2/describe-vpc-attribute.html

## Issues Found
- The contract-test Go snippet imported `encoding/json` but did not use it, which would fail compilation. Removed the unused import.
- The contract-test snippet treated `plan.ResourceChangesMap["aws_vpc.main"]` as a slice. Terratest exposes `ResourceChangesMap` as `map[string]*tfjson.ResourceChange`, so the example now reads the single mapped resource change and checks its action using `tfjson.ActionCreate`.
- The security-group contract test attempted to range over `plan.ResourceChangesMap["aws_security_group_rule"]`, but the map is keyed by resource address, not resource type. Updated the example to iterate over all resource changes, filter by `change.Type`, and only reject `0.0.0.0/0` when the ingress rule covers port 22.
- The Rego policy tests used legacy rule-body syntax. Added `import rego.v1` and changed test rules to `test_name if { ... }` syntax for current OPA/Rego compatibility.
- The VPC integration-test Go snippet used `fmt.Sprintf` without importing `fmt`. Added the missing import.
- The VPC integration-test snippet compared a string directly to Terratest's `*string` `Vpc.CidrBlock` field. Updated it to compare against the dereferenced CIDR block.
- The VPC integration-test snippet referenced `vpc.EnableDnsSupport` and `vpc.EnableDnsHostnames`, which are not fields on Terratest's `Vpc` type. Updated the example to query those attributes with the EC2 `DescribeVpcAttribute` API through Terratest's EC2 client helper.
- The end-to-end Go snippet used `fmt.Errorf` without importing `fmt`. Added the missing import.
- The CI workflow described integration tests on pushes to `main` and E2E tests on a schedule, but the workflow only triggered on pull requests. Added `push` and `schedule` triggers.
- The policy-test CI job only ran `opa test policies/ -v`, which would omit the shown `tests/policy/encryption_test.rego` file. Updated it to run `opa test policies/ tests/policy/ -v`.

## Review Notes
- The workflow snippets assume Terraform, TFLint, Checkov, OPA, Go, and any required credentials are available in the CI environment. In a production workflow, setup/install actions and explicit cloud credential configuration should be added.
- I could not run the code snippets locally because the workspace does not include the referenced Terraform modules or the required CLI tools; validation was performed against official documentation and package references.
