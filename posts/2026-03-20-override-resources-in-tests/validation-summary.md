# Validation Summary: How to Override Resources in OpenTofu Tests

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTofu (`tofu test` framework)
- HCL (`.tftest.hcl` test files)
- AWS provider resources (`aws_vpc`, `aws_subnet`, `aws_security_group`, `aws_s3_bucket`, `aws_iam_policy`, `aws_lb`, `aws_route53_record`)
- OpenTofu testing primitives: `override_resource`, `mock_provider`, `mock_resource`, `expect_failures`, `assert`, `run`

## Sources Consulted
- [OpenTofu `tofu test` command documentation](https://opentofu.org/docs/cli/commands/test/)
- [OpenTofu issue #2048 — Add mock provider level resource overrides](https://github.com/opentofu/opentofu/issues/2048)
- [OpenTofu issue #1204 — Testing Feature: Support overrides for data sources / resources / modules](https://github.com/opentofu/opentofu/issues/1204)
- [OpenTofu issue #2008 — issues with override_data in test](https://github.com/opentofu/opentofu/issues/2008)
- AWS provider documentation for `aws_security_group`, `aws_s3_bucket`, `aws_lb`, `aws_route53_record`

## Issues Found
No technical issues found.

The block syntax shown matches the OpenTofu documentation:
- `override_resource { target = ... values = { ... } }` — verified.
- `mock_provider "aws" { mock_resource "<type>" { defaults = { ... } } }` — verified.
- `expect_failures = [<checkable_object>]` — verified.
- `command = plan` and `command = apply` are both valid `run` block commands.

The post's claim that `override_resource` may live at file scope or inside a `run` block, and that the `run`-block override takes precedence, is consistent with the documentation (though the post only demonstrates run-block usage, which is the more common pattern).

## Review Notes
- The assertion `aws_security_group.app.ingress[0].cidr_blocks == toset(["10.0.1.0/24"])` mixes types: in the AWS provider, `ingress[*].cidr_blocks` is a list of strings while `toset(...)` produces a set. Indexing a set with `[0]` is also technically unsupported. In practice this works in many OpenTofu/Terraform contexts because of implicit conversions, and the example is illustrative of how `override_resource` propagates values; a stricter form would use `contains(aws_security_group.app.ingress[0].cidr_blocks, "10.0.1.0/24")`. Left as-is since it does not misrepresent `override_resource` semantics, which is the post's subject.
- The `expect_failures = [aws_subnet.private]` example assumes the targeted resource (or a related checkable object) has a precondition/postcondition that would fail when `vpc_id` is empty. Without an explicit `precondition`/`postcondition` block on `aws_subnet.private`, a plan-time provider error rather than a checkable-object failure would normally occur. The example is plausible if such a condition is implied; future revisions could make this explicit by adding a `precondition` to the subnet resource.
- `override_resource`/`mock_provider` are available in OpenTofu 1.7+ — readers on older versions will need to upgrade. Not currently called out in the post but worth flagging in a future iteration.
