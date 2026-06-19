# Validation Summary: How to Configure Lifecycle Rules in Terraform

## Status
validated

## Post Type
Guide

## Technologies Covered
- Terraform lifecycle meta-arguments
- Terraform provisioners
- Terraform built-in `terraform_data` resource
- AWS provider resource examples

## Sources Consulted
- Terraform lifecycle meta-argument reference: https://developer.hashicorp.com/terraform/language/meta-arguments/lifecycle
- Terraform resource block reference: https://developer.hashicorp.com/terraform/language/block/resource
- Terraform provisioners documentation: https://developer.hashicorp.com/terraform/language/provisioners
- Terraform AWS provider `aws_launch_template` resource documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/launch_template

## Issues Found
- The conditional `prevent_destroy` example used `count` to switch between protected and unprotected `aws_db_instance` resources. Changing the flag from protected to unprotected would still plan to destroy the protected resource while `prevent_destroy` is present, so Terraform would reject the plan. I changed the section to describe separate module composition and avoiding toggles without deliberate state migration.
- The destroy instructions for a `prevent_destroy` resource said to run `terraform apply` to update state after removing the lifecycle rule. Terraform does not explicitly record `prevent_destroy` in state, so that apply step is unnecessary. I changed the instructions to remove the rule from configuration and then destroy or remove the resource block and apply.
- The `replace_triggered_by` module example referenced `module.network.vpc_id`. Terraform only allows managed resources, resource instances, or resource attributes in `replace_triggered_by`; module outputs are plain values and are not valid replacement triggers. I changed the example to wrap the module output in `terraform_data` and reference that managed resource.
- The configuration-change trigger used `null_resource`. While still commonly seen, Terraform's official lifecycle documentation recommends `terraform_data` for giving plain values a resource-like lifecycle for `replace_triggered_by`. I changed the example to `terraform_data`.
- The provisioner section did not mention that `create_before_destroy` prevents destroy-time provisioners from running. I added that caveat before the example.

## Review Notes
- `create_before_destroy` can fail for resources with uniqueness constraints unless the resource names allow old and new objects to coexist.
- `prevent_destroy` only applies while the resource block remains in configuration.
- Terraform CLI was not installed in the local environment, so syntax was reviewed against official documentation rather than validated with `terraform validate`.
