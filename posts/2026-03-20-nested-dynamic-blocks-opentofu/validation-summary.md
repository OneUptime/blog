# Validation Summary: How to Use Nested Dynamic Blocks in OpenTofu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTofu / Terraform (HCL)
- Dynamic blocks (`dynamic`, `for_each`, `iterator`, `content`)
- Google Cloud provider (`google_compute_instance`)
- AWS provider (`aws_wafv2_web_acl`, `aws_codepipeline`, `aws_iam_policy_document`)
- Kubernetes provider (`kubernetes_deployment`)

## Sources Consulted
- OpenTofu/Terraform dynamic blocks documentation: https://developer.hashicorp.com/terraform/language/expressions/dynamic-blocks
- Google `google_compute_firewall`: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/compute_firewall
- Google `google_compute_instance`: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/compute_instance
- AWS `aws_cloudformation_stack`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/cloudformation_stack
- AWS `aws_codepipeline`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/codepipeline
- AWS `aws_wafv2_web_acl`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/wafv2_web_acl
- AWS `aws_iam_policy_document`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/data-sources/iam_policy_document
- Kubernetes `kubernetes_deployment`: https://registry.terraform.io/providers/hashicorp/kubernetes/latest/docs/resources/deployment_v1

## Issues Found

1. **Basic Nested Dynamic Block — invalid nested block on `google_compute_firewall`.** The original example wrapped a `dynamic "ports"` inside the `allow` block of `google_compute_firewall`, but in the Google provider `ports` is a list-of-strings attribute (not a nested block). `dynamic "ports"` would fail at plan time. Replaced the example with `google_compute_instance` using its real nested structure `network_interface > access_config` (where `access_config` is a genuine repeatable nested block with `nat_ip`).

2. **Iterator Names section — invalid nested block on `aws_cloudformation_stack`.** The original example used `dynamic "parameter"` (and a nested `dynamic "parameter"` inside it) on `aws_cloudformation_stack`. The `parameters` argument is a map of strings, not a repeatable block, so `dynamic "parameter"` is not a valid syntax form for this resource. Replaced with `aws_codepipeline` using its real nested `stage > action` block structure with explicit `iterator = pipeline_stage` and `iterator = pipeline_action` names, preserving the section's pedagogical intent.

## Review Notes

- The AWS WAFv2 example uses two separate `dynamic "action"` blocks with mutually exclusive `for_each` conditions (one for "block", one for "allow"). This pattern produces 0 or 1 action blocks total depending on input. It is syntactically valid and works for the constrained input shown, but a cleaner alternative would be a single `action` block containing two `dynamic "block"` / `dynamic "allow"` sub-blocks. Left as-is since the post's pattern is technically correct.
- The "Best Practices" section sets `iterator = rule_group` (matching the outer `dynamic "rule_group"` label) and `iterator = rule` (matching the inner `dynamic "rule"` label). These are the same as the default iterator names, so the explicit declarations are redundant. The author's intent ("be explicit about iterator names") is reasonable, but the example would be more illustrative if it used distinct names like `iterator = rg` / `iterator = r`. Left as-is — stylistic, not a technical error.
- WAFv2 `action` block actually supports five sub-blocks (`allow`, `block`, `captcha`, `count`, `challenge`). The post only references `allow` and `block`, which is fine for the scope shown.
- All other examples (Kubernetes Deployment, IAM Policy Document, AWS WAF) use real nested blocks correctly with attributes that match the official provider schemas.
