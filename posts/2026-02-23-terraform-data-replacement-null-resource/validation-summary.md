# Validation Summary: How to Use terraform_data as a Replacement for null_resource

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform
- `terraform_data`
- `null_resource`
- Terraform provisioners
- Terraform lifecycle meta-arguments
- Terraform state migration / moved blocks
- AWS CLI and kubectl command examples

## Sources Consulted
- HashiCorp Terraform `terraform_data` resource reference: https://developer.hashicorp.com/terraform/language/resources/terraform-data
- HashiCorp Terraform provisioners documentation: https://developer.hashicorp.com/terraform/language/provisioners
- HashiCorp Terraform lifecycle `replace_triggered_by` documentation: https://developer.hashicorp.com/terraform/language/meta-arguments/lifecycle
- HashiCorp Terraform refactoring / moved blocks documentation: https://developer.hashicorp.com/terraform/language/modules/develop/refactoring
- HashiCorp Terraform Registry `hashicorp/null` `null_resource` documentation: https://registry.terraform.io/providers/hashicorp/null/latest/docs/resources/resource
- HashiCorp Help Center article showing `terraform_data.input` updates in place: https://support.hashicorp.com/hc/en-us/articles/32410842099347-How-to-Allow-Destroy-time-Provisioners-Used-in-terraform-data-to-Access-Variables-in-Destroy-Jobs
- HashiCorp Terraform `filemd5` function documentation: https://developer.hashicorp.com/terraform/language/functions/filemd5
- HashiCorp Terraform `fileset` function documentation: https://developer.hashicorp.com/terraform/language/functions/fileset
- Linked OneUptime article on `null_resource` workarounds: https://oneuptime.com/blog/post/2026-02-23-terraform-null-resource-provisioner-workarounds/view
- Linked OneUptime article on provisioners with resources: https://oneuptime.com/blog/post/2026-02-23-terraform-provisioners-with-resources/view

## Issues Found
- The post incorrectly stated that changing `terraform_data.input` replaces the resource and reruns provisioners. HashiCorp documentation and support examples show `input` changes update the resource in place. I changed the explanation to state that `input` updates stored values in place and that `triggers_replace` is required when replacement and provisioner reruns are desired.
- Several provisioner examples used only `input` to imply reruns on changes. I changed those examples to use `triggers_replace` for the deployment, config-apply, database migration, and one-time setup patterns.
- The post stated that `triggers_replace` values are not stored. The official resource reference says `triggers_replace` stores a value in instance state and replaces the resource when the value changes. I changed the wording to say those values are stored for replacement tracking but are not exposed through `output`.
- The migration section incorrectly claimed that moved blocks do not support moving from `null_resource` to `terraform_data`. The current official `hashicorp/null` provider documentation states that Terraform 1.9 and later support this moved block path. I updated the section with a `moved` block example and a pre-1.9 caveat.

## Review Notes
- I could not run `terraform validate` locally because the Terraform CLI is not installed in this environment. The HCL snippets were reviewed against official Terraform syntax and documentation.
