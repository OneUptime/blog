# Validation Summary: How to Understand Resource Creation Order in OpenTofu

## Status
validated

## Post Type
Guide

## Technologies Covered
- OpenTofu
- HCL
- OpenTofu CLI
- Graphviz DOT rendering
- AWS provider resources

## Sources Consulted
- OpenTofu Resource Behavior: https://opentofu.org/docs/v1.11/language/resources/behavior/
- OpenTofu Resource Graph internals: https://opentofu.org/docs/internals/graph/
- OpenTofu `depends_on` meta-argument: https://opentofu.org/docs/v1.11/language/meta-arguments/depends_on/
- OpenTofu `tofu graph` command: https://opentofu.org/docs/cli/commands/graph/
- OpenTofu `tofu plan` command: https://opentofu.org/docs/cli/commands/plan/
- OpenTofu `tofu apply` command: https://opentofu.org/docs/cli/commands/apply/
- OpenTofu data sources: https://opentofu.org/docs/language/data-sources/
- OpenTofu debugging and `TF_LOG`: https://opentofu.org/docs/internals/debugging/
- AWS provider `aws_instance` docs: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/instance.html.markdown
- AWS provider security group docs: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/security_group.html.markdown
- AWS provider `aws_security_group_rule` docs: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/security_group_rule.html.markdown
- AWS provider `aws_vpc_security_group_ingress_rule` docs: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/vpc_security_group_ingress_rule.html.markdown

## Issues Found
- The `aws_instance` examples omitted `instance_type`, which is required unless a launch template supplies it. Added `instance_type = "t3.micro"` to the instance examples.
- The `create_before_destroy` example claimed it "Allows zero-downtime updates." Updated the wording to say it can support zero-downtime replacement when both target groups can coexist, matching OpenTofu lifecycle constraints.
- The module dependency comments described whole modules as being created only after another module completes. Updated the comments to describe dependency on module outputs, because OpenTofu tracks graph dependencies rather than treating modules as atomic execution units.
- The debugging section said `tofu plan` shows proposed changes "and their order." Updated it to say `tofu plan` shows proposed changes; ordering is governed by the dependency graph and visible with graph/logging tools.
- The circular dependency solution used `aws_security_group_rule`, which current AWS provider documentation advises avoiding for new configurations. Replaced it with `aws_vpc_security_group_ingress_rule` and the current `referenced_security_group_id`/`ip_protocol` arguments.

## Review Notes
The local `tofu` binary was not installed in this environment, so CLI details were verified against current official OpenTofu documentation rather than local `--help` output.
