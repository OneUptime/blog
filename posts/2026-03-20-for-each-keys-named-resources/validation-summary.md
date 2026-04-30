# Validation Summary: How to Use for_each with Keys to Create Named Resources in OpenTofu

## Status
validated

## Post Type
Guide / Tutorial

## Technologies Covered
- OpenTofu
- Terraform-compatible HCL
- `for_each`
- `count`
- `moved` blocks
- AWS provider resources and data sources

## Sources Consulted
- OpenTofu docs, "The `for_each` Meta-Argument": https://opentofu.org/docs/language/meta-arguments/for_each/
- OpenTofu docs, "The `count` Meta-Argument": https://opentofu.org/docs/language/meta-arguments/count/
- OpenTofu docs, "Refactoring": https://opentofu.org/docs/language/modules/develop/refactoring/
- Terraform AWS Provider docs, `aws_security_groups` data source: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/data-sources/security_groups
- Terraform AWS Provider docs, `aws_security_group_rule` resource: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/security_group_rule
- Terraform AWS Provider docs, `aws_vpc_security_group_ingress_rule` resource: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/vpc_security_group_ingress_rule
- Terraform AWS Provider docs, `aws_route53_record` resource: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/route53_record
- Terraform AWS Provider docs, `aws_instance` resource: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/instance
- Terraform AWS Provider docs, `aws_subnet` resource: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/subnet
- Terraform AWS Provider docs, `aws_iam_user` resource: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/iam_user
- Terraform AWS Provider docs, `aws_s3_bucket` resource: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/s3_bucket

## Issues Found
- The comparison table said `count` works with "Numbers, lists". OpenTofu's `count` meta-argument accepts a whole number, so I corrected that row to `Whole numbers`.
- The "Dynamic Keys from Data Sources" example used `aws_security_group_rule`, which the current AWS provider documentation says to avoid in favor of `aws_vpc_security_group_ingress_rule` / `aws_vpc_security_group_egress_rule`. I updated the example to `aws_vpc_security_group_ingress_rule` and changed the arguments from `type` / `protocol` / `source_security_group_id` to the current `ip_protocol` / `referenced_security_group_id` form.
- The best-practices and conclusion text overstated that `for_each` should replace `count` for any collection of similar resources. OpenTofu's official guidance is narrower: `count` is still appropriate for almost-identical instances, while `for_each` is safer when instances need stable keys or distinct values. I revised that wording to match the docs.

## Review Notes
- The snippets are technically valid patterns, but several are partial examples rather than standalone configurations. They assume surrounding definitions such as `data.aws_ami.ubuntu`, `aws_vpc.main`, `aws_route53_zone.main`, and `aws_security_group.db` already exist.
