# Validation Summary: How to Use Terrascan for Policy Compliance

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terrascan
- Terraform
- Terraform plan JSON
- Open Policy Agent (OPA)
- Rego
- GitHub Actions
- pre-commit
- TOML configuration
- Docker

## Sources Consulted
- Terrascan v1.19.9 CLI help from the official `tenable/terrascan` Docker image: `terrascan scan -h` and `terrascan server -h`
- Terrascan GitHub README and install/feature reference - https://github.com/tenable/terrascan
- Terrascan policy documentation - https://raw.githubusercontent.com/tenable/terrascan/master/docs/policies.md
- Terrascan built-in policy metadata examples - https://github.com/tenable/terrascan/tree/master/pkg/policies/opa/rego
- Terrascan configuration model and test data - https://github.com/tenable/terrascan/tree/master/pkg/config
- Terrascan pre-commit hook definition - https://raw.githubusercontent.com/tenable/terrascan/master/.pre-commit-hooks.yaml
- Terrascan GitHub Action metadata - https://github.com/tenable/terrascan-action
- Terrascan Terraform plan provider source - https://github.com/tenable/terrascan/tree/master/pkg/iac-providers/tfplan/v1
- HashiCorp Terraform `plan` command reference - https://developer.hashicorp.com/terraform/cli/commands/plan
- HashiCorp Terraform `show` command reference - https://developer.hashicorp.com/terraform/cli/commands/show

## Issues Found
- The CLI examples used `-p aws` to select AWS policies, but `-p` is the policy path flag. Changed those examples to use `-t aws`, which is the Terrascan policy type flag.
- The Terraform plan scan example used `-i terraform` with `--config-only`, which outputs normalized resource config for debugging instead of scanning a Terraform plan. Changed it to `terrascan scan -i tfplan -f tfplan.json -t aws`.
- The custom policy example included two Rego rules but only one metadata file, and the metadata `name` did not match the exported rule. Reduced the example to one EBS encryption rule and aligned the metadata name, resource type, and description.
- The server-mode `curl` example manually set `Content-Type: multipart/form-data`, which can omit the multipart boundary when used with `curl -F`. Removed the explicit header and let curl generate the multipart content type.
- The in-file skip directive was shown before the Terraform resource. Moved it inside the resource block to match Terrascan's documented Terraform instrumentation format.
- The TOML notification config used a flat `webhook-url` key. Changed it to Terrascan's documented nested notifier format with `[notifications.webhook]` and `[notifications.webhook.config]`.
- The pre-commit example used a nonexistent hook id `terrascan` and passed unsupported arguments. Changed the hook id to `terraform-pre-commit` and kept the supported `-i terraform` arguments as separate argv entries.

## Review Notes
Terrascan v1.19.9 was verified via the official Docker image because a local Go toolchain was not installed. A minimal Docker-based Terrascan JSON scan was also run to confirm the current JSON output shape includes `results.violations`.
