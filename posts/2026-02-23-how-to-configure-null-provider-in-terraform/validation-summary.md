# Validation Summary: How to Configure Null Provider in Terraform

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Terraform
- HashiCorp Null provider
- `null_resource`
- Terraform provisioners (`local-exec` and `remote-exec`)
- `terraform_data`
- AWS Terraform resource examples
- Kubernetes `kubectl` command examples

## Sources Consulted
- HashiCorp Null provider documentation: https://registry.terraform.io/providers/hashicorp/null/latest/docs
- HashiCorp Null provider `null_resource` documentation: https://registry.terraform.io/providers/hashicorp/null/latest/docs/resources/resource
- Terraform `terraform_data` resource reference: https://developer.hashicorp.com/terraform/language/resources/terraform-data
- Terraform provisioners documentation: https://developer.hashicorp.com/terraform/language/provisioners
- Terraform `file` function documentation: https://developer.hashicorp.com/terraform/language/functions/file
- Terraform `pathexpand` function documentation: https://developer.hashicorp.com/terraform/language/functions/pathexpand

## Issues Found
- The SSH private key example used `file("~/.ssh/id_rsa")`. Terraform does not perform shell-style home directory expansion inside string paths, so I changed it to `file(pathexpand("~/.ssh/id_rsa"))`.
- The post said `triggers` can be tied to any value. The Null provider documents `triggers` as a map of strings, so I clarified that trigger values should be strings derived from expressions.
- The destroy-time provisioner note said only `self.triggers` can be referenced. Terraform's general rule is that destroy-time provisioners should reference the parent resource through `self`; for `null_resource`, `self.triggers` is the common way to carry values. I updated the wording to reflect that more accurately.

## Review Notes
The example snippets are illustrative and include partial AWS resources with omitted required arguments. That is acceptable for the post's tutorial style, but the snippets would need full provider and resource configuration before being run as complete Terraform modules.
