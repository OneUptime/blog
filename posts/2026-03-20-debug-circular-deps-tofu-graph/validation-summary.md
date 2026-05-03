# Validation Summary: How to Debug Circular Dependencies Using tofu graph

## Status
validated

## Post Type
Tutorial / Debugging Guide

## Technologies Covered
- OpenTofu (`tofu graph` command)
- HCL (HashiCorp Configuration Language)
- Graphviz `dot` rendering / DOT graph format
- AWS provider resources (`aws_instance`, `aws_security_group`, `aws_iam_role_policy_attachment`, `aws_lambda_function`)
- OpenTofu modules and `depends_on` meta-argument

## Sources Consulted
- OpenTofu `tofu graph` command documentation: https://opentofu.org/docs/cli/commands/graph/
- OpenTofu DAG DOT rendering source (`internal/dag/dot.go`, `cycleDot` function): https://github.com/opentofu/opentofu/blob/main/internal/dag/dot.go
- Terraform graph command reference (for behavioral parity): https://developer.hashicorp.com/terraform/cli/commands/graph
- Terraform AWS provider docs for `aws_instance`, `aws_security_group`, and IAM resources: https://registry.terraform.io/providers/hashicorp/aws/latest/docs

## Issues Found
1. **Incorrect DOT styling description for cycle edges.** The post originally claimed that `-draw-cycles` styles cycle edges as "dashed red arrows" with attributes `[style=dashed color=red]`. Verified against the OpenTofu source code (`cycleDot` in `internal/dag/dot.go`), which appends ``[color = "red", penwidth = "2.0"]`` to cycle edges. There is no `style=dashed` attribute - cycles are shown as thick (penwidth 2.0) red arrows, not dashed.
   - Updated the comment in the bash example from "highlights cyclic edges with a red dashed line" to "highlights cyclic edges with a thick red line".
   - Updated the prose "cycle edges appear as dashed red arrows" to "cycle edges appear as thick red arrows".
   - Updated the DOT-tracing section: changed the grep target from `grep "style"` to `grep "color"`, and corrected the documented attribute string from `[style=dashed color=red]` to `[color = "red", penwidth = "2.0"]`.

## Review Notes
- The cycle error format `Error: Cycle: <resource>, <resource>` matches OpenTofu/Terraform's actual output for dependency cycles.
- The HCL syntax used in the examples is valid. The `security_groups` attribute on `aws_instance` is legacy (EC2-Classic / default VPC by name); `vpc_security_group_ids` is preferred for VPC. Since the BAD example deliberately illustrates a problematic pattern and the GOOD example correctly uses `vpc_security_group_ids`, the contrast is appropriate.
- The `aws_instance.web.private_ip` and `aws_security_group.app.{id,name}` attribute references are all valid for the AWS provider.
- The `depends_on` example correctly demonstrates ordering without a data reference, which is the canonical workaround for cycles caused by attribute back-references.
- Minor wording inconsistency (not corrected): the prose introducing the SG fix says "allow the CIDR block using the subnet range instead", but the example uses `var.allowed_cidr` rather than a subnet CIDR. This is a stylistic issue, not a technical error, and was left intact per the no-stylistic-changes rule.
