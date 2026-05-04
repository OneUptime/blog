# Validation Summary: How to Create AWS Budgets with OpenTofu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTofu / Terraform (HCL)
- AWS Budgets (`aws_budgets_budget`)
- AWS Budget Actions (`aws_budgets_budget_action`)
- AWS IAM (for budget action execution)
- AWS Cost Allocation Tags

## Sources Consulted
- Terraform AWS Provider docs — `aws_budgets_budget`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/budgets_budget
- Terraform AWS Provider docs — `aws_budgets_budget_action`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/budgets_budget_action
- Source markdown for `aws_budgets_budget_action`: https://github.com/hashicorp/terraform-provider-aws/blob/main/website/docs/r/budgets_budget_action.html.markdown
- AWS Budgets API Reference — `IamActionDefinition` (Roles field accepts role names, not ARNs)
- AWS Budgets API Reference — `Action` (valid `ActionType` values)

## Issues Found
The "Budget with Automatic Action" example contained multiple errors in the `aws_budgets_budget_action` block. The following changes were made:

1. **Invalid `action_type` value.** The post used `action_type = "STOP_EC2_INSTANCES"`, which is not a valid value. AWS Budget Actions only accept `APPLY_IAM_POLICY`, `APPLY_SCP_POLICY`, or `RUN_SSM_DOCUMENTS`. Since the example uses `iam_action_definition`, this was changed to `"APPLY_IAM_POLICY"`. The section heading was also updated from "(Stop EC2 instances)" to "(Apply restrictive IAM policy)" so it accurately describes the mechanism, and the inline comment was adjusted similarly.
2. **Missing required argument `notification_type`.** Added `notification_type = "ACTUAL"`. This argument is required by the resource schema.
3. **Missing required argument `execution_role_arn`.** Added `execution_role_arn = aws_iam_role.budget_action.arn`. This argument is required and specifies the role Budgets assumes to perform the action.
4. **Wrong attribute on `iam_action_definition.roles`.** The post passed `aws_iam_role.budget_action.arn`, but the underlying AWS API field accepts only role names (its regex `^[a-zA-Z0-9+=,.@_-]+$` excludes ARNs). Changed to `aws_iam_role.budget_action.name`.

## Review Notes
- All `aws_budgets_budget` examples are correct: the `cost_filter` block syntax (with `name`/`values`), the `Service` filter values for EC2 (`Amazon Elastic Compute Cloud - Compute`) and RDS (`Amazon Relational Database Service`), the `TagKeyValue` filter format (`user:Key$Value`), and the escaped HCL interpolation `user:Team$${each.key}` (which renders as `user:Team$<value>`) are all valid.
- All `notification` blocks use valid values: `comparison_operator = "GREATER_THAN"`, `threshold_type = "PERCENTAGE"`, and `notification_type` of `"ACTUAL"` or `"FORECASTED"`.
- A forecasted threshold above 100 (the post uses 110) is permitted by AWS Budgets and is a reasonable pattern for triggering on projected overage.
- The conclusion's claim about using budget actions to "automatically stop non-production instances" is still achievable: an `APPLY_IAM_POLICY` action could attach a policy denying EC2 actions on non-production tags, or alternatively an action with `action_type = "RUN_SSM_DOCUMENTS"` could invoke `AWS-StopEC2Instance`. The corrected example demonstrates the IAM-policy approach.
- The example assumes `aws_iam_policy.stop_instances` and `aws_iam_role.budget_action` are defined elsewhere; this is consistent with the post's snippet-style approach and not a defect.
