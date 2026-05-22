# Validation Summary: How to Target Specific Resources with terraform apply -target

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform CLI
- Terraform resource addressing
- Terraform modules
- Terraform state and planning behavior
- Terraform lifecycle meta-arguments
- AWS provider resource examples

## Sources Consulted
- Terraform CLI `plan` command reference: https://developer.hashicorp.com/terraform/cli/commands/plan
- Terraform CLI `apply` command reference: https://developer.hashicorp.com/terraform/cli/commands/apply
- Terraform CLI `destroy` command reference: https://developer.hashicorp.com/terraform/cli/commands/destroy
- Terraform resource address reference: https://developer.hashicorp.com/terraform/cli/state/resource-addressing
- Terraform lifecycle meta-argument reference: https://developer.hashicorp.com/terraform/language/meta-arguments/lifecycle
- HashiCorp Target Resources tutorial: https://developer.hashicorp.com/terraform/tutorials/state/resource-targeting

## Issues Found
- The original "State Inconsistency" example used an AWS security group ingress-rule change and said an instance might not pick up the change. That is a weak and potentially misleading example because an EC2 instance commonly references only the security group ID, and an ingress-rule update usually does not require updating the instance. Replaced the example with the `random_pet.bucket_name` and S3 bucket module pattern used in HashiCorp's targeting tutorial, where changing the targeted upstream value can leave downstream bucket resources and outputs inconsistent until a full apply runs.
- The "Missing Downstream Updates" example targeted an AWS VPC and said subnets referencing it would be skipped. The downstream-skipping concept is correct, but the specific VPC/subnet example could imply a subnet update is required just because it references the VPC. Replaced it with the same generated-name and bucket dependency example to show a concrete downstream effect.

## Review Notes
- Terraform was not installed in the local workspace, so command verification was performed against current official HashiCorp documentation rather than local `terraform --help` output.
- The documented CLI flags and examples for `terraform plan`, `terraform apply`, `terraform destroy`, `-target`, `-replace`, `-var`, `-var-file`, `-auto-approve`, count indexes, for_each keys, and module addresses are consistent with current Terraform documentation.
- Terraform's official documentation states that `-target` is for exceptional use only and can lead to undetected drift or confusion about the true relationship between state and configuration; the post's warnings and recommended follow-up full plan/apply are consistent with that guidance.
