# Validation Summary: How to Use Sentinel Mock Data for Testing

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- HashiCorp Sentinel
- Sentinel test mocks
- Terraform Sentinel imports: `tfplan/v2`, `tfconfig/v2`, `tfstate/v2`, `tfrun`
- Terraform CLI plan JSON output
- HCP Terraform policy enforcement

## Sources Consulted
- HashiCorp Sentinel testing documentation: https://developer.hashicorp.com/sentinel/docs/writing/testing
- HashiCorp Terraform Sentinel feature documentation: https://developer.hashicorp.com/sentinel/docs/features/terraform
- HashiCorp `tfplan/v2` Sentinel import reference: https://developer.hashicorp.com/terraform/cloud-docs/policy-enforcement/import-reference/tfplan-v2
- HashiCorp `tfconfig/v2` Sentinel import reference: https://developer.hashicorp.com/sentinel/docs/features/terraform/tfconfig-v2
- HashiCorp `tfstate/v2` Sentinel import reference: https://developer.hashicorp.com/terraform/cloud-docs/policy-enforcement/import-reference/tfstate-v2
- HashiCorp `tfrun` Sentinel import reference: https://developer.hashicorp.com/terraform/cloud-docs/policy-enforcement/sentinel/import/tfrun
- Terraform `plan` command reference: https://developer.hashicorp.com/terraform/cli/commands/plan
- Terraform `show` command reference: https://developer.hashicorp.com/terraform/cli/commands/show

## Issues Found
- The `tfrun` examples used `cost_estimation`, but the documented import namespace is `cost_estimate`. Updated both examples.
- The `tfrun` examples included a top-level `source` value that is not part of the current official `tfrun` import reference. Removed it from both examples.
- The `tfplan/v2` section called the example a complete structure even though it only showed selected import fields. Changed the description and comment to call it representative.
- The `tfplan/v2` output change example included `sensitive`, which belongs to other output structures but not the documented `tfplan/v2` `output_changes` collection. Removed it.
- Several Terraform import examples omitted documented low-noise metadata fields such as `mode` on resources and provider/module metadata in `tfconfig/v2`. Added those fields where they improve accuracy without changing the article's scope.
- The `tfconfig/v2` variable examples included `sensitive`, which is not listed in the documented `tfconfig/v2` variables collection. Removed it.
- The `tfconfig/v2` example showed a separate `datasources` collection, but `tfconfig/v2` represents data sources in the resources collection using resource mode. Removed the empty `datasources` example.
- The plan-generation section implied local plan JSON can generate all import mocks. Updated it to clarify that local `terraform show -json` can provide source data for `tfplan/v2`, `tfconfig/v2`, and `tfstate/v2`, while `tfrun` comes from HCP Terraform run metadata.
- Code fences for Sentinel mock files were labeled as Python. Changed them to `sentinel` to reflect the actual language.

## Review Notes
The `sentinel` and `terraform` CLIs are not installed in this workspace, so local command execution was not possible. Commands and schema details were validated against HashiCorp's official documentation instead.
