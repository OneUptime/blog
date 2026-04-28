# Validation Summary: How to Explain OpenTofu Dependency Resolution

## Status
validated

## Post Type
Concept guide / tutorial

## Technologies Covered
- OpenTofu (CLI: `tofu graph`, `tofu apply`)
- HCL (HashiCorp Configuration Language)
- Terraform AWS provider resources (`aws_vpc`, `aws_subnet`, `aws_internet_gateway`, `aws_iam_role_policy`, `aws_lambda_function`, `aws_security_group`, `aws_security_group_rule`)
- Graphviz / DOT format
- Directed Acyclic Graph (DAG) concepts

## Sources Consulted
- OpenTofu `graph` command docs: https://opentofu.org/docs/cli/commands/graph/
- OpenTofu `apply` command docs (parallelism flag, default 10): https://opentofu.org/docs/cli/commands/apply/
- OpenTofu `depends_on` meta-argument docs: https://opentofu.org/docs/language/meta-arguments/depends_on/
- OpenTofu graph internals (destroy walks inverted dependency graph): https://opentofu.org/docs/internals/graph/
- Terraform AWS provider `aws_security_group_rule` docs: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/security_group_rule

## Issues Found
No technical issues found. All claims verified:
- `tofu graph` outputs DOT format — confirmed.
- Default parallelism is 10 — confirmed (`-parallelism=n` defaults to 10).
- `-parallelism=N` flag syntax — confirmed.
- Implicit dependencies via attribute references — confirmed.
- `depends_on` meta-argument semantics — confirmed.
- Cycle detection causes errors — confirmed.
- HCL examples (VPC, subnet, IAM, Lambda, security group) are syntactically valid for the dependency concepts illustrated.

## Review Notes
- The "destroy order is reversed" framing is technically a simplification: OpenTofu actually walks an inverted dependency graph rather than literally reversing creation timestamps. For a simple linear chain the result looks identical, and this phrasing is the standard way the concept is taught in introductory material, so it is acceptable in this concept-level post.
- `aws_security_group_rule` is not formally deprecated, but the AWS provider documentation now recommends `aws_vpc_security_group_ingress_rule` / `aws_vpc_security_group_egress_rule` as the current best practice. The example remains valid and functional; future readers writing greenfield configurations may prefer the newer resources.
- The security group cycle example omits the `to_port` and `protocol` arguments that would be required for an actually-applyable configuration. As an illustration of the cycle pattern (the focus of the section) this is acceptable, but copy-pasting the snippet would not produce a directly runnable configuration.
