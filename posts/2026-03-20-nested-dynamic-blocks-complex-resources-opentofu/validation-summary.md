# Validation Summary: How to Use Nested Dynamic Blocks for Complex Resources in OpenTofu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTofu / Terraform (HCL, dynamic blocks)
- AWS provider (`aws_iam_policy_document`, `aws_ecs_service`, `aws_cloudwatch_metric_alarm`)
- Kubernetes provider (`kubernetes_deployment`)

## Sources Consulted
- OpenTofu dynamic blocks: https://opentofu.org/docs/language/expressions/dynamic-blocks/
- `aws_iam_policy_document`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/data-sources/iam_policy_document
- `aws_ecs_service`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/ecs_service
- `aws_cloudwatch_metric_alarm`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/cloudwatch_metric_alarm
- `kubernetes_deployment`: https://registry.terraform.io/providers/hashicorp/kubernetes/latest/docs/resources/deployment

## Issues Found

1. **Broken `metric_query` dynamic block in the CloudWatch section.** The original example included:

   ```hcl
   dynamic "metric_query" {
     for_each = length(each.value.dimensions) > 0 ? [] : [1]
     content {
       # Simple alarm without metric queries
     }
   }
   ```

   This was incorrect for several reasons:
   - The `metric_query` block has a **required `id` argument** (per the AWS provider docs), so an empty `content {}` would fail validation.
   - The `for_each` logic was inverted: when `dimensions` had entries the block was skipped (`[]`), but when `dimensions` was empty a single empty block was produced — the opposite of what the surrounding comment implied.
   - The outer comment claimed it generated "one dimension block per dimension entry," but the block created is `metric_query`, not `dimensions`. The inner comment said the opposite ("Simple alarm without metric queries"). The two comments contradicted each other.
   - The section heading "Triple-Nested Dynamic … with Multiple Dimensions" was misleading because `dimensions` on `aws_cloudwatch_metric_alarm` is a `map(string)` *argument*, not a block, so it cannot be expressed as a dynamic block at all and the example never reaches three levels of dynamic-block nesting.

   **Fix:** Removed the broken `metric_query` block entirely (it served no functional purpose and would have failed at apply time) and renamed the section heading to "`for_each` with CloudWatch Metric Alarms and Dimensions" to accurately describe the example. Added a short comment clarifying that `dimensions` is a map argument and is therefore built with a `for` expression rather than a dynamic block.

## Review Notes

- The IAM policy document example is correct: `statement` blocks within `aws_iam_policy_document` accept nested `condition` blocks with required `test`, `variable`, and `values` arguments.
- The ECS service example is correct: `ordered_placement_strategy` (with `type` / `field`) and `placement_constraints` (plural — note the AWS provider uses the plural form for this block name) with `type` / `expression` are both valid.
- The Kubernetes deployment example is correct: the `spec > template > spec > container` nesting is valid, and the `port` (`container_port`, `protocol`) and `env` (`name`, `value`) blocks within `container` match the provider schema. The example omits required outer fields like `metadata` and `spec.selector`, but this is a deliberate illustrative trim that focuses on the dynamic-block usage.
- The OpenTofu dynamic-block syntax used throughout (the iterator name defaulting to the block label, accessed as `<label>.value.<field>`) matches the OpenTofu language reference. If a future revision needs to nest two dynamic blocks that share a label, the author may want to mention the `iterator` argument as a way to disambiguate.
- After the fix, the post no longer demonstrates a true three-level nested dynamic block example. A future revision could add one (for instance using `aws_cloudwatch_metric_alarm.metric_query` containing a nested `metric` block, or a Kubernetes container with nested `volume_mount`/`env_from` blocks), but adding such an example is outside the scope of a technical-correctness review.
