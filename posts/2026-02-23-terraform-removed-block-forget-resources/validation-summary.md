# Validation Summary: How to Use the removed Block to Forget Resources in Terraform

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform configuration language
- Terraform state management
- Terraform `removed` blocks
- Terraform `moved` blocks
- Terraform CLI `state rm`
- AWS provider resources

## Sources Consulted
- HashiCorp Terraform `removed` block reference: https://developer.hashicorp.com/terraform/language/block/removed
- HashiCorp Terraform remove resource from state guide: https://developer.hashicorp.com/terraform/language/state/remove
- HashiCorp Terraform module configuration guide, removing modules: https://developer.hashicorp.com/terraform/language/modules/configuration#remove-modules-from-your-configuration
- HashiCorp Terraform `state rm` command reference: https://developer.hashicorp.com/terraform/cli/commands/state/rm
- HashiCorp Terraform refactor modules guide, `moved` blocks: https://developer.hashicorp.com/terraform/language/modules/develop/refactoring
- HashiCorp announcement for Terraform 1.7 config-driven remove: https://www.hashicorp.com/en/blog/terraform-1-7-adds-test-mocking-and-config-driven-remove
- Terraform Registry AWS provider `aws_s3_bucket` resource documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/s3_bucket

## Issues Found
- The post said deleting an `aws_s3_bucket` resource would make Terraform delete the bucket and all its contents. The AWS provider only deletes bucket objects during bucket destruction when `force_destroy = true` has been successfully applied, so the wording was changed to say Terraform plans to delete the bucket and can delete objects when `force_destroy = true` is set.
- The post showed `removed` blocks using specific `count` and `for_each` instance keys such as `aws_instance.web[2]` and `aws_instance.web["us-west-2"]`. HashiCorp's remove-from-state documentation states that `removed.from` cannot include instance keys for resources configured with multiple instances. The section was corrected to show only whole-resource removal and to recommend `terraform state rm` for a single specific instance.
- The post claimed Terraform handles dependency ordering for removed resources. This was too broad because remaining references to the removed resource must be updated or Terraform can fail validation or planning. The wording was changed to say the `removed` block is planned with the rest of the configuration and can surface remaining references.

## Review Notes
Terraform CLI was not installed in the local environment, so command behavior was verified against official HashiCorp documentation rather than local `terraform` execution. The remaining examples and claims match the documented `removed` block behavior for Terraform 1.7 and later.
