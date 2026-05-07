# Validation Summary: How to Avoid Circular Dependencies in OpenTofu

## Status
validated

## Post Type
Guide

## Technologies Covered
- OpenTofu CLI
- OpenTofu language and dependency graph behavior
- HCL
- AWS Provider security group resources
- AWS VPC security groups

## Sources Consulted
- OpenTofu `graph` command docs: https://opentofu.org/docs/cli/commands/graph/
- OpenTofu `depends_on` meta-argument docs: https://opentofu.org/docs/language/meta-arguments/depends_on/
- OpenTofu resource dependency behavior docs: https://opentofu.org/docs/v1.11/language/resources/behavior/
- OpenTofu module block docs: https://opentofu.org/docs/language/modules/syntax/
- OpenTofu references and implicit dependency docs: https://opentofu.org/docs/v1.9/language/expressions/references/
- OpenTofu `terraform_data` docs: https://opentofu.org/docs/language/resources/tf-data/
- AWS Provider `aws_security_group` docs: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/security_group
- AWS Provider `aws_security_group_rule` docs: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/security_group_rule
- AWS Provider `aws_vpc_security_group_ingress_rule` docs: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/vpc_security_group_ingress_rule
- AWS Provider `aws_vpc_security_group_egress_rule` docs: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/vpc_security_group_egress_rule
- Amazon VPC security group rules docs: https://docs.aws.amazon.com/vpc/latest/userguide/security-group-rules.html

## Issues Found
- The diagnostic command claimed to "visualize" the dependency graph using `tofu graph | grep ...`, which only filters DOT text and does not render a visual graph. I changed it to `tofu graph -draw-cycles | dot -Tsvg > graph.svg`, matching the documented OpenTofu graph output and cycle-highlighting behavior.
- The security group fix used `aws_security_group_rule`, but the current AWS provider documentation recommends `aws_vpc_security_group_ingress_rule` and `aws_vpc_security_group_egress_rule` as the best-practice resources for standalone rules. I updated the example to use those current resources.
- The `depends_on` section used incomplete `aws_iam_role` and `aws_lambda_function` examples that omitted required arguments, so the snippet would not actually work as written. I replaced it with a valid `terraform_data` example that demonstrates the same explicit-cycle problem and the correct implicit-dependency fix.
- The introduction and error-output text used overly specific cycle-error wording. I changed it to generic cycle-error phrasing so it remains accurate across current OpenTofu versions.

## Review Notes
The inline security group example was left in place as the intentionally broken example because the AWS provider still supports inline `ingress` and `egress` blocks, and mutual security group references remain a real source of dependency cycles. However, current provider guidance prefers dedicated VPC security group rule resources for new configurations.
