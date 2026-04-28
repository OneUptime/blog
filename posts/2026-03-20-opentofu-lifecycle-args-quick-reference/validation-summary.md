# Validation Summary: How to Use the OpenTofu Lifecycle Arguments Quick Reference

## Status
validated

## Post Type
Reference / Quick Reference Guide

## Technologies Covered
- OpenTofu (lifecycle meta-argument block)
- HCL (HashiCorp Configuration Language)
- Terraform AWS provider resources used in examples (aws_db_instance, aws_instance, aws_launch_template, aws_acm_certificate, aws_rds_cluster, aws_autoscaling_group, aws_iam_policy)

## Sources Consulted
- OpenTofu — Resource Behavior / Lifecycle Customizations: https://opentofu.org/docs/language/resources/behavior/#lifecycle-customizations
- OpenTofu — Lifecycle meta-argument: https://opentofu.org/docs/language/meta-arguments/lifecycle/
- OpenTofu — Custom Conditions (precondition/postcondition, `self`): https://opentofu.org/docs/language/expressions/custom-conditions/
- OpenTofu — `startswith` function: https://opentofu.org/docs/language/functions/startswith/
- Terraform AWS provider — `aws_db_instance` attribute reference: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/db_instance#attribute-reference

## Issues Found
- **prevent_destroy removal procedure was incorrect.** The original post stated: "To destroy, you must first remove prevent_destroy from config then run tofu apply, THEN tofu destroy". Per the OpenTofu docs (resources/behavior — Lifecycle Customizations), `prevent_destroy` only applies as long as the argument is present in the configuration; the setting is config-only and not persisted in state. The intermediate `tofu apply` step is unnecessary — you can remove (or set to `false`) the argument and run `tofu destroy` directly. Updated the comment to: "To destroy, remove prevent_destroy from config (or set it to false), then run tofu destroy".

All other technical content was verified as correct:
- `ignore_changes = [ami, user_data, tags["LastModified"]]` — valid; map-key indexing in ignore_changes is supported.
- `ignore_changes = all` (bareword keyword, no quotes) — valid.
- `replace_triggered_by = [aws_launch_template.app.latest_version]` — valid; takes a list of resource/attribute references.
- `self.status` and `self.multi_az` in `aws_db_instance` postconditions — both are exported attributes of `aws_db_instance` and `self` is the correct reference within postcondition.
- `startswith()` — available in OpenTofu (introduced in Terraform 1.5, available in all OpenTofu releases).
- `precondition` / `postcondition` block syntax with `condition` and `error_message` — correct.
- Combining `prevent_destroy` and `ignore_changes` in the same lifecycle block (Pattern 2) — valid.

## Review Notes
- The introduction and description claim the post covers "all" lifecycle arguments. Strictly speaking, OpenTofu also supports two arguments not present in upstream Terraform: `destroy` (bool) and `enabled` (bool). These are niche/OpenTofu-specific and not commonly used; not adding new sections per the review guidelines, but worth noting for a future update if completeness is the goal.
- The reproduced `prevent_destroy` error message is a paraphrase rather than a verbatim quote of OpenTofu's actual output. The substantive content is accurate; readers should not pattern-match exact text against this snippet.
