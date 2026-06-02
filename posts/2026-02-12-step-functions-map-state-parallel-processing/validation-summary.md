# Validation Summary: Use Step Functions Map State for Parallel Processing

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- AWS Step Functions
- Amazon States Language
- Step Functions Inline Map
- Step Functions Distributed Map
- AWS Lambda
- Amazon S3
- Amazon CloudWatch
- JavaScript

## Sources Consulted
- AWS Step Functions: Map workflow state: https://docs.aws.amazon.com/step-functions/latest/dg/state-map.html
- AWS Step Functions: Using Map state in Inline mode: https://docs.aws.amazon.com/step-functions/latest/dg/state-map-inline.html
- AWS Step Functions: Using Map state in Distributed mode: https://docs.aws.amazon.com/step-functions/latest/dg/state-map-distributed.html
- AWS Step Functions: ItemReader for Map states: https://docs.aws.amazon.com/step-functions/latest/dg/input-output-itemreader.html
- AWS Step Functions: ItemBatcher for Map states: https://docs.aws.amazon.com/step-functions/latest/dg/input-output-itembatcher.html
- AWS Step Functions: Processing batch data with a Lambda function: https://docs.aws.amazon.com/step-functions/latest/dg/tutorial-itembatcher-param-task.html
- AWS Step Functions: Monitoring Step Functions metrics using CloudWatch: https://docs.aws.amazon.com/step-functions/latest/dg/procedure-cw-metrics.html
- Referenced OneUptime link checked: https://oneuptime.com/blog/post/2026-02-12-monitor-step-functions-executions-console/view

## Issues Found
- The Inline Map examples used the deprecated `Iterator` field. Replaced those examples with `ItemProcessor` and `ProcessorConfig` set to `INLINE`, matching current AWS Step Functions documentation.
- The post said `MaxConcurrency` set to `0` meant unlimited concurrency without noting Inline Map's service cap. Clarified that `0` means no additional limit while Inline Map still supports up to 40 concurrent iterations.
- The error handling section showed `ToleratedFailurePercentage` on an Inline Map example. AWS documents tolerated failure thresholds for Distributed Map states, so the example was changed to Distributed Map with `ProcessorConfig.Mode` set to `DISTRIBUTED` and an `ExecutionType`.
- The post described `ItemProcessor` as replacing `Iterator` only in Distributed Map. Updated the wording because `ItemProcessor` is the current field for both Inline and Distributed Map states.
- The CloudWatch monitoring wording implied direct per-iteration status metrics. Adjusted it to say the Step Functions console and CloudWatch metrics help track execution and Map Run behavior, including failures and throttling.

## Review Notes
Validated the JSON snippets with `JSON.parse` and the JavaScript snippets with the Node.js function parser. The examples use direct Lambda ARN task resources, which remain valid, though AWS examples often use the optimized `arn:aws:states:::lambda:invoke` integration for newer workflows.
