# Validation Summary: How to Implement Cost Controls with Terraform Policies

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Terraform
- HCP Terraform Sentinel policies
- Open Policy Agent (OPA) and Rego
- Infracost
- GitHub Actions
- Bash, jq, and bc

## Sources Consulted
- HashiCorp Terraform `tfplan/v2` Sentinel import documentation: https://developer.hashicorp.com/terraform/cloud-docs/workspaces/policy-enforcement/import-reference/tfplan-v2
- HashiCorp Sentinel language specification: https://developer.hashicorp.com/sentinel/docs/language/spec
- HashiCorp Sentinel `decimal` import documentation: https://developer.hashicorp.com/sentinel/docs/imports/decimal
- HashiCorp Terraform JSON output format documentation: https://developer.hashicorp.com/terraform/internals/json-format
- Open Policy Agent Terraform documentation: https://www.openpolicyagent.org/docs/terraform
- Open Policy Agent policy language documentation: https://www.openpolicyagent.org/docs/policy-language
- Open Policy Agent CLI documentation: https://www.openpolicyagent.org/docs
- Open Policy Agent setup action documentation: https://github.com/open-policy-agent/setup-opa
- Infracost CLI command documentation: https://www.infracost.io/docs/features/cli_commands/
- Infracost GitHub Actions documentation: https://github.com/marketplace/actions/infracost-actions
- HashiCorp setup-terraform action documentation: https://github.com/hashicorp/setup-terraform

## Issues Found
- The OPA/Rego policy used pre-OPA-1.0 partial set rule syntax (`deny[msg] { ... }`). Updated the policy to import `rego.v1` and use `deny contains msg if { ... }`, along with current `in` membership syntax.
- The OPA policy checked `input.configuration.root_module.variables.environment.default`, which reads the configured default expression rather than the variable value supplied to the plan. Updated it to read `input.variables.environment.value`, matching Terraform's plan JSON representation.
- The Infracost script attempted to enforce cost increase limits from `infracost breakdown` output, but `diffTotalMonthlyCost` is produced by `infracost diff` against a baseline. Updated the script to use `infracost diff --compare-to infracost-base.json` and adjusted the monthly-cost extraction to handle current JSON shapes.
- The GitHub Actions workflow used `open-policy-agent/opa-action@v2` as if it directly evaluated a Terraform plan JSON with `tests` and `input` fields. Replaced it with the official `open-policy-agent/setup-opa@v2` action and an explicit `opa eval --fail-defined` command.
- The GitHub Actions workflow used `hashicorp/setup-terraform` with the default Terraform wrapper, which can pollute redirected `terraform show -json` output in GitHub Actions. Added `terraform_wrapper: false`.
- The GitHub Actions workflow generated only current-branch Infracost output, so the diff gate had no base-branch comparison. Added a base-branch baseline generation step before running the cost gate.

## Review Notes
OPA syntax was verified locally with OPA 1.16.2 using `opa check --strict`. Terraform, Sentinel, and Infracost CLIs were not installed locally, so their examples were checked against official documentation. The Sentinel examples are structurally valid for HCP Terraform's `tfplan/v2` import, but the hard-coded EC2 pricing map is intentionally simplified and should be reviewed periodically against current cloud pricing.
