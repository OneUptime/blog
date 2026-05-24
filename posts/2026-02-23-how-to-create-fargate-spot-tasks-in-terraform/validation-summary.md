# Validation Summary: How to Create Fargate Spot Tasks in Terraform

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform (HCL)
- AWS ECS (Elastic Container Service)
- AWS Fargate / Fargate Spot
- AWS IAM
- AWS CloudWatch (log groups, metric alarms, Container Insights)
- AWS SQS (Simple Queue Service)
- AWS SNS (Simple Notification Service)
- AWS Application Auto Scaling
- AWS VPC / Security Groups

## Sources Consulted
- AWS ECS Developer Guide — Fargate capacity providers: https://docs.aws.amazon.com/AmazonECS/latest/developerguide/fargate-capacity-providers.html
- AWS ECS Developer Guide — Task placement constraints: https://docs.aws.amazon.com/AmazonECS/latest/developerguide/task-placement-constraints.html
- AWS ECS Developer Guide — Task definition parameters (stopTimeout): https://docs.aws.amazon.com/AmazonECS/latest/developerguide/task_definition_parameters.html
- AWS ECS Developer Guide — Fargate Spot termination notice: https://docs.aws.amazon.com/AmazonECS/latest/developerguide/fargate-capacity-providers.html#fargate-capacity-providers-termination
- Terraform AWS Provider docs for `aws_ecs_cluster`, `aws_ecs_cluster_capacity_providers`, `aws_ecs_service`, `aws_ecs_task_definition`, `aws_appautoscaling_policy`

## Issues Found

1. **Incorrect Fargate Spot interruption warning period (30 seconds → 2 minutes).**
   - Original text claimed tasks "can be interrupted with a 30-second warning" and that SIGTERM is followed by "a 30-second grace period before being stopped."
   - AWS docs state: "When tasks using Fargate Spot capacity are stopped due to a Spot interruption, a two-minute warning is sent before a task is stopped." The warning is sent both as an EventBridge task state change event and as a SIGTERM signal.
   - Updated the introduction and the "How Fargate Spot Works" section to reflect the correct two-minute warning, and clarified that the SIGTERM→SIGKILL gap is governed by `stopTimeout` (default 30s, max 120s for Fargate).

2. **`placement_constraints { type = "distinctInstance" }` is unsupported on Fargate services.**
   - Placement constraints apply to EC2 launch type. Fargate provides task isolation at the hypervisor level, and AWS explicitly recommends Fargate over `distinctInstance` for isolation. Including this block on a Fargate `aws_ecs_service` would cause a plan/apply error or be ignored.
   - Removed the `placement_constraints` block from the batch processing service example.

3. **`stopTimeout = 30` was misleadingly described as "matching Fargate Spot's 30-second warning."**
   - 30 seconds is just the default `stopTimeout`; the actual Spot warning is 2 minutes, and Fargate supports `stopTimeout` up to 120 seconds.
   - Changed the batch task definition to `stopTimeout = 120` with an accurate comment, and changed the worker task definition's `stopTimeout` from 30 to 120 as well. Updated the corresponding `GRACEFUL_SHUTDOWN_TIMEOUT` env var from 25 → 110 to keep the in-app/timeout buffer relationship consistent.

4. **Best Practices section repeated the same 30-second errors.**
   - Updated to reference the two-minute window and recommend `stopTimeout = 120` (the maximum allowed for Fargate) instead of 30.

## Review Notes

- The Terraform syntax for `aws_ecs_cluster`, `aws_ecs_cluster_capacity_providers`, `capacity_provider_strategy`, `aws_iam_role` / `aws_iam_role_policy_attachment`, `aws_ecs_task_definition` (with `jsonencode` for container definitions), `aws_ecs_service`, `aws_sqs_queue`, `aws_appautoscaling_target`, and `aws_appautoscaling_policy` (including the nested `customized_metric_specification` with `dimensions` block) all match the current Terraform AWS provider schemas.
- `containerInsights = "enabled"` is still valid; AWS has added an `"enhanced"` option more recently, but `"enabled"` continues to work.
- The example worker task uses an SQS `QUEUE_URL` env var but the task role has no SQS policies attached. This is example-completeness rather than a technical error — readers are expected to attach appropriate policies for their workload.
- `customized_metric_specification` with `ApproximateNumberOfMessagesVisible` works for queue-depth scaling, but AWS now recommends the `BacklogPerTask` math expression pattern for more responsive ECS-on-SQS scaling. Not incorrect, just suboptimal — left as written.
- The CloudWatch alarm uses `ECS/ContainerInsights` namespace with `RunningTaskCount`. This metric requires Container Insights to be enabled on the cluster, which the post does enable. Correct as written.
