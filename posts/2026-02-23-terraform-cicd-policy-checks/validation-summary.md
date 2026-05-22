# Validation Summary: How to Implement Terraform CI/CD with Policy Checks

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Terraform CLI and plan JSON
- Open Policy Agent (OPA) and Rego
- HashiCorp Sentinel for Terraform Cloud/Enterprise
- Checkov
- Trivy and tfsec
- Infracost
- GitHub Actions

## Sources Consulted
- Terraform `show` command documentation: https://developer.hashicorp.com/terraform/cli/commands/show
- Terraform JSON output format documentation: https://developer.hashicorp.com/terraform/internals/json-format
- OPA documentation and CLI reference: https://www.openpolicyagent.org/docs
- OPA policy language documentation: https://www.openpolicyagent.org/docs/policy-language
- Terraform Sentinel policy set documentation: https://developer.hashicorp.com/terraform/cloud-docs/workspaces/policy-enforcement/manage-policy-sets/sentinel-vcs
- Sentinel enforcement levels documentation: https://developer.hashicorp.com/sentinel/docs/concepts/enforcement-levels
- Terraform `tfplan/v2` Sentinel import reference: https://docs.hashicorp.com/terraform/enterprise/workspaces/policy-enforcement/import-reference/tfplan-v2
- AWS provider S3 bucket documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/s3_bucket.html
- AWS provider S3 bucket server-side encryption configuration documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/s3_bucket_server_side_encryption_configuration
- Checkov custom Python policy documentation: https://www.checkov.io/3.Custom%20Policies/Python%20Custom%20Policies.html
- Checkov GitHub Action metadata: https://raw.githubusercontent.com/bridgecrewio/checkov-action/master/action.yml
- Trivy GitHub Action metadata: https://raw.githubusercontent.com/aquasecurity/trivy-action/master/action.yaml
- tfsec GitHub Action metadata: https://raw.githubusercontent.com/aquasecurity/tfsec-action/master/action.yml
- Infracost CLI command documentation: https://www.infracost.io/docs/features/cli_commands/

## Issues Found
- The OPA install step pinned `v0.62.0` and used the older static binary URL. Updated it to the official latest Linux AMD64 download URL and executable mode shown in current OPA docs.
- The Rego examples used pre-OPA-1.0 partial set rule syntax (`deny[msg]`). Updated them to current `deny contains msg if` syntax.
- The S3 encryption OPA and Sentinel examples checked `server_side_encryption_configuration` on `aws_s3_bucket`, which is no longer the recommended AWS provider model for managing bucket encryption. Updated the examples to validate `aws_s3_bucket_server_side_encryption_configuration` resources.
- The tag-related Rego examples assumed `tags` was always present. Updated them to use `object.get(..., "tags", {})` so resources without tags do not cause undefined lookups.
- The Checkov GitHub Actions example showed a custom policy file but did not load the custom checks directory. Added `external_checks_dirs: policies/custom_checks`.
- The combined OPA pipeline examples evaluated policies but would not fail the job when violations existed. Added `--fail-defined` and queried deny set elements.
- The Infracost JSON example redirected stdout. Updated it to use the documented `--out-file` option before running OPA against the generated JSON.

## Review Notes
The tfsec action remains usable in the example, but teams starting fresh should consider Trivy's Terraform/config scanning because tfsec functionality has been folded into Trivy in current Aqua guidance. The OPA S3 example validates encryption configuration resources; proving that every bucket has a matching standalone encryption resource can require additional plan/config correlation when bucket names are unknown until apply.
