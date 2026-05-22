# Validation Summary: How to Verify Imported Resources in Terraform

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform CLI and state management
- Terraform import workflows
- AWS CLI for EC2 verification
- Azure CLI for VM verification
- Google Cloud CLI for Compute Engine verification
- Open Policy Agent Rego policies for Terraform plans

## Sources Consulted
- HashiCorp Terraform import overview: https://developer.hashicorp.com/terraform/cli/import
- HashiCorp Terraform import single resource documentation: https://developer.hashicorp.com/terraform/language/import/single-resource
- HashiCorp Terraform plan command reference: https://developer.hashicorp.com/terraform/cli/commands/plan
- HashiCorp Terraform show command reference: https://developer.hashicorp.com/terraform/cli/commands/show
- HashiCorp Terraform refresh command reference: https://developer.hashicorp.com/terraform/cli/commands/refresh
- HashiCorp Terraform resource targeting tutorial: https://developer.hashicorp.com/terraform/tutorials/state/resource-targeting
- AWS CLI describe-instances command reference: https://docs.aws.amazon.com/cli/latest/reference/ec2/describe-instances.html
- Microsoft Azure CLI az vm command reference: https://learn.microsoft.com/en-us/cli/azure/vm
- Microsoft Azure CLI query documentation: https://learn.microsoft.com/en-us/cli/azure/use-azure-cli-successfully-query
- Google Cloud CLI compute instances describe reference: https://cloud.google.com/sdk/gcloud/reference/compute/instances/describe
- Open Policy Agent Terraform documentation: https://www.openpolicyagent.org/docs/latest/terraform/

## Issues Found
- The post recommended `terraform refresh`, which is deprecated in current Terraform documentation. Updated the section to use `terraform plan -refresh-only`, mention normal `terraform plan` refresh behavior, and recommend `terraform apply -refresh-only` when state-only changes need to be persisted.
- The post recommended `terraform apply -target` as an import verification step. Updated it to use `terraform plan -target` as a diagnostic and added a note to run a full `terraform plan` afterward because resource targeting can exclude related changes.
- The OPA policy used older Rego rule syntax. Updated the `deny` and `warn` rules to the current `contains ... if` style and changed the deletion rule description to cover deletions and replacements.

## Review Notes
The cloud CLI examples and Terraform state/plan/show commands are consistent with the official command references. Local Terraform, AWS CLI, Azure CLI, gcloud, and OPA binaries were not installed in the review environment, so command behavior was verified against official documentation rather than local `--help` output.
