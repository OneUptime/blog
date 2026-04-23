# Validation Summary: How to Replace null_resource with terraform_data in OpenTofu

## Status
validated

## Post Type
Guide

## Technologies Covered
- OpenTofu
- Terraform compatibility and migration patterns
- `terraform_data`
- `null_resource`
- Provisioners (`local-exec`)
- State refactoring with `moved`

## Sources Consulted
- OpenTofu `terraform_data` managed resource docs: https://opentofu.org/docs/language/resources/tf-data/
- OpenTofu built-in provider docs: https://opentofu.org/docs/language/providers/builtin/
- OpenTofu provisioner docs: https://opentofu.org/docs/v1.7/language/resources/provisioners/syntax/
- OpenTofu `state mv` command docs: https://opentofu.org/docs/cli/commands/state/mv/
- OpenTofu 1.10 release notes (`moved` support across resource types): https://opentofu.org/docs/v1.10/intro/whats-new/
- HashiCorp `null_resource` docs: https://registry.terraform.io/providers/hashicorp/null/latest/docs/resources/resource.html
- HashiCorp `terraform_data` migration guide for the `null` provider: https://registry.terraform.io/providers/hashicorp/null/3.2.3/docs/guides/terraform-migration
- Terraform `terraform_data` resource reference: https://developer.hashicorp.com/terraform/language/resources/terraform-data

## Issues Found
- The introduction incorrectly said OpenTofu 1.4+ introduced `terraform_data`. I corrected this to say Terraform 1.4 introduced it and OpenTofu includes it as a built-in resource.
- The post treated `self.triggers_replace` as if `terraform_data` exported it. I corrected the examples to use source-resource references where appropriate and `input`/`output` when values need to be stored on the `terraform_data` instance itself.
- The destroy provisioner example used `self.triggers_replace`, which is not an exported attribute. I changed it to persist the instance ID in `input` and read it back through `self.output`.
- The state migration section used `tofu state mv null_resource.example terraform_data.example`. I replaced this with a `moved` block and documented the OpenTofu 1.10+ requirement, because `tofu state mv` only supports moves to the same resource type.
- The multi-trigger example mixed `aws_db_instance.main.endpoint` and `aws_db_instance.main.address` between the old and new snippets. I normalized the example to use `address` consistently so the migration remains equivalent for the `DB_HOST` variable.

## Review Notes
- OpenTofu still documents provisioners as a last resort. That caveat is technically relevant, but the examples are appropriate because the post is specifically about replacing `null_resource` provisioner workflows.
- The `always_run` example intentionally uses `timestamp()` to force replacement on every apply. The `deployment_info` example also stores `timestamp()`, which means that resource will change on every apply as written.
