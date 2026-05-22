# Validation Summary: How to Test Sentinel Policies Locally

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Sentinel policy language
- Sentinel CLI
- Sentinel test framework
- HCP Terraform Sentinel imports
- Terraform plan JSON output
- GitHub Actions

## Sources Consulted
- HashiCorp Sentinel CLI test command documentation: https://developer.hashicorp.com/sentinel/docs/commands/test
- HashiCorp Sentinel testing documentation: https://developer.hashicorp.com/sentinel/docs/writing/testing
- HashiCorp Sentinel CLI configuration file syntax: https://developer.hashicorp.com/sentinel/docs/configuration
- HashiCorp Terraform `tfplan/v2` Sentinel import reference: https://developer.hashicorp.com/terraform/cloud-docs/policy-enforcement/import-reference/tfplan-v2
- HashiCorp Terraform `tfrun` Sentinel import reference: https://developer.hashicorp.com/terraform/cloud-docs/policy-enforcement/sentinel/import/tfrun
- HashiCorp Sentinel releases page: https://releases.hashicorp.com/sentinel/

## Issues Found
- The installation and CI examples pinned Sentinel CLI v0.24.0 even though the current documented release is v0.40.0. Updated the download URLs and zip filenames to v0.40.0.
- The `tfrun` mock used `cost_estimation`, but the documented import namespace is `cost_estimate`. Updated the mock data key so policies using `tfrun.cost_estimate` work correctly.
- The `tfrun` mock included a root-level `source` field that is not listed in the current `tfrun` import reference. Removed it so the mock better matches the documented import shape.

## Review Notes
The core `enforce-tags.sentinel` example and the passing/failing test cases were also checked locally with Sentinel CLI v0.40.0 and passed as described. The macOS download example now explicitly says it is for Intel macOS; Apple Silicon users should use the corresponding `darwin_arm64` binary from the same release page.
