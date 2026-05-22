# Validation Summary: How to Test Terraform Provider Updates

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Terraform CLI
- Terraform providers
- Terraform dependency lock file
- Terraform Registry provider API
- GitHub Actions
- Terratest
- Go
- jq
- Bash

## Sources Consulted
- Terraform dependency lock file documentation: https://developer.hashicorp.com/terraform/language/files/dependency-lock
- Terraform provider requirements documentation: https://developer.hashicorp.com/terraform/language/providers/requirements
- Terraform version constraints documentation: https://developer.hashicorp.com/terraform/language/expressions/version-constraints
- Terraform provider registry protocol: https://developer.hashicorp.com/terraform/internals/provider-registry-protocol
- Terraform JSON output format documentation: https://developer.hashicorp.com/terraform/internals/json-format
- Terraform `init` command reference: https://developer.hashicorp.com/terraform/cli/commands/init
- Terraform `version` command reference: https://developer.hashicorp.com/terraform/cli/commands/version
- Terraform `test` command reference: https://developer.hashicorp.com/terraform/cli/commands/test
- Terratest Terraform module API documentation: https://pkg.go.dev/github.com/gruntwork-io/terratest/modules/terraform

## Issues Found
- The provider update detection script parsed provider lock-file addresses as `namespace/type`, but `.terraform.lock.hcl` entries commonly use fully qualified addresses such as `registry.terraform.io/hashicorp/aws`. I updated the script to strip the public registry hostname before extracting namespace and provider name, skip non-public registry hosts, and report unknown lookups instead of treating them as current.
- The AWS provider version example used `~> 5.30` while describing a minor-version pin that allows only patches. Terraform's pessimistic constraint operator allows the rightmost specified component to increment, so `~> 5.30` allows versions below `6.0.0`. I changed it to `~> 5.30.0`, which allows patch releases within the `5.30.x` minor line.

## Review Notes
- Terraform was not installed in the local workspace, so CLI flags were verified against the current official Terraform CLI documentation instead of local `--help` output.
- The Terraform Registry public metadata endpoint used in the script returned current provider metadata during validation. The official provider registry protocol documents the `/versions` endpoint for listing available versions; using Terraform's own `init -upgrade` remains the most accurate way to select the newest version allowed by configured constraints.
