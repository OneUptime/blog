# Validation Summary: How to Fix Cycle Error in Terraform Resource Dependencies

## Status
validated

## Post Type
Troubleshooting Guide / Tutorial

## Technologies Covered
- Terraform (HashiCorp Configuration Language / HCL)
- Terraform's dependency graph (DAG)
- `terraform graph` CLI subcommand and its flags (`-draw-cycles`, `-type`)
- Graphviz (`dot`) for rendering the dependency graph
- AWS provider resources: `aws_vpc`, `aws_subnet`, `aws_security_group`, `aws_security_group_rule`, `aws_iam_role`, `aws_iam_instance_profile`, `aws_iam_role_policy`, `aws_instance`, `aws_db_instance`
- Terraform modules and inter-module references
- Terraform `depends_on` meta-argument

## Sources Consulted
- Terraform CLI docs — `terraform graph`: https://developer.hashicorp.com/terraform/cli/commands/graph (confirms `-draw-cycles` and `-type` flags, valid `-type` values include `plan`, `plan-refresh-only`, `plan-destroy`, `apply`, `validate`)
- Terraform Resource Graph documentation: https://developer.hashicorp.com/terraform/internals/graph (confirms DAG architecture)
- AWS Provider — `aws_security_group`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/security_group
- AWS Provider — `aws_security_group_rule`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/security_group_rule (confirms `type`, `from_port`, `to_port`, `protocol`, `security_group_id`, `source_security_group_id` arguments)
- AWS Provider — `aws_iam_role`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/iam_role (confirms `inline_policy` block exists; note: deprecated in v5.42+ in favor of `aws_iam_role_policy`)
- AWS Provider — `aws_iam_instance_profile`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/iam_instance_profile
- AWS Provider — `aws_iam_role_policy`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/iam_role_policy
- Terraform Modules documentation — module composition and outputs: https://developer.hashicorp.com/terraform/language/modules
- Terraform `depends_on` documentation: https://developer.hashicorp.com/terraform/language/meta-arguments/depends_on

## Issues Found
No technical issues found.

All technical content was verified accurate:
- The Terraform cycle error message format (`Error: Cycle: ...`) matches actual Terraform output.
- The `terraform graph`, `terraform graph -draw-cycles`, and `terraform graph -type=plan` commands and flags are valid.
- The Graphviz install commands (`brew install graphviz`, `sudo apt-get install graphviz`) are correct.
- The security-group cross-reference cycle pattern and the `aws_security_group_rule` fix are both correctly described and match real Terraform behavior.
- The IAM role / instance profile cycle and its fix with `aws_iam_role_policy` are correct.
- The module cross-reference cycle pattern and the fix (lifting the shared resource to the root module) are correct.
- The `depends_on` hidden-cycle pattern is correctly explained.
- HCL syntax in all examples is valid.

## Review Notes
- The `inline_policy` argument inside `aws_iam_role` (used in the "bad" example for Pattern 2) is deprecated as of AWS provider v5.42.0 (March 2024) in favor of the standalone `aws_iam_role_policy` resource. The post's recommended fix already uses `aws_iam_role_policy`, which is the modern best practice — so the deprecation does not undermine the post's correctness, but readers should be aware they will see a deprecation warning if they try the "bad" example verbatim on a current provider.
- The `aws_security_group_rule` resource is being gradually superseded by `aws_vpc_security_group_ingress_rule` and `aws_vpc_security_group_egress_rule` (introduced in AWS provider v5.0). `aws_security_group_rule` is still fully supported and works correctly for breaking cycles; the newer resources would also work. This is worth a future update but is not currently incorrect.
- The `aws_db_instance` example uses a minimal stub (`# ...`) which is fine in context since the post is about cycle structure rather than provisioning a working RDS instance.
