# Validation Summary: How to Configure Lambda Provisioned Concurrency with OpenTofu

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- OpenTofu
- AWS Lambda
- AWS Lambda Provisioned Concurrency
- AWS Application Auto Scaling
- HCL / infrastructure as code

## Sources Consulted
- AWS Lambda Developer Guide, "Configuring provisioned concurrency for a function": https://docs.aws.amazon.com/lambda/latest/dg/provisioned-concurrency.html
- AWS Application Auto Scaling User Guide, "AWS Lambda and Application Auto Scaling": https://docs.aws.amazon.com/autoscaling/application/userguide/services-that-can-integrate-lambda.html
- AWS Application Auto Scaling User Guide, "Scheduled scaling for Application Auto Scaling": https://docs.aws.amazon.com/autoscaling/application/userguide/application-auto-scaling-scheduled-scaling.html
- AWS Application Auto Scaling User Guide, "Target tracking scaling policies for Application Auto Scaling": https://docs.aws.amazon.com/autoscaling/application/userguide/application-auto-scaling-target-tracking.html
- AWS provider documentation, `aws_lambda_function`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/lambda_function
- AWS provider documentation, `aws_lambda_alias`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/lambda_alias
- AWS provider documentation, `aws_lambda_provisioned_concurrency_config`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/lambda_provisioned_concurrency_config
- AWS provider documentation, `aws_appautoscaling_target`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/appautoscaling_target
- AWS provider documentation, `aws_appautoscaling_policy`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/appautoscaling_policy
- AWS provider documentation, `aws_appautoscaling_scheduled_action`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/appautoscaling_scheduled_action
- OpenTofu CLI docs, `init`: https://opentofu.org/docs/cli/commands/init/
- OpenTofu CLI docs, `plan`: https://opentofu.org/docs/cli/commands/plan/
- OpenTofu CLI docs, `apply`: https://opentofu.org/docs/cli/commands/apply/
- OpenTofu language docs, resource lifecycle behavior: https://opentofu.org/docs/language/resources/behavior/

## Issues Found
1. **Auto Scaling bootstrap ordering was unsafe**: AWS documents that Lambda provisioned concurrency should have an initial value before Application Auto Scaling manages it. The original `aws_appautoscaling_target` had no dependency on `aws_lambda_provisioned_concurrency_config`, so OpenTofu could create them in the wrong order. Added `depends_on = [aws_lambda_provisioned_concurrency_config.live]` to enforce the required sequencing.

2. **The provisioned concurrency resource would drift against Application Auto Scaling**: The original example hard-coded `provisioned_concurrent_executions = 10` while also letting Application Auto Scaling change that same setting later. On subsequent applies, OpenTofu would try to reset the count back to 10. Added `lifecycle { ignore_changes = [provisioned_concurrent_executions] }` so the resource bootstraps the initial value and then yields ongoing adjustments to Application Auto Scaling.

3. **Cold start wording was too absolute**: The original description and conclusion said provisioned concurrency "eliminates" cold starts. AWS documents that requests above the provisioned amount can spill over to on-demand environments, and those invocations can still incur initialization delay. Updated the wording to describe reduced or avoided cold starts for the configured concurrency level.

## Review Notes
- The HCL resource names, arguments, and Lambda runtime used in the post are current and valid.
- The target tracking example correctly uses `LambdaProvisionedConcurrencyUtilization` with `target_value = 0.7`, which AWS documents as 70% utilization.
- Scheduled scaling cron expressions are valid for Application Auto Scaling, and the post's UTC comments match the provider default timezone.
- AWS notes that Lambda emits provisioned concurrency utilization metrics only while the function is actively receiving requests. During inactive periods, target tracking alarms can remain in `INSUFFICIENT_DATA`, which is one reason scheduled scaling is useful for predictable traffic patterns.
- The `tofu` binary was not installed in this workspace, so the deploy commands were validated against the official OpenTofu documentation rather than local `--help` output.
