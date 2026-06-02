# Validation Summary: Monitor Step Functions Executions in the Console

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- AWS Step Functions
- Amazon CloudWatch metrics, dashboards, alarms, and Logs Insights
- AWS CLI
- AWS X-Ray
- AWS SDK for JavaScript v3
- Amazon SNS
- Amazon EventBridge

## Sources Consulted
- AWS Step Functions Developer Guide: Monitoring Step Functions metrics using Amazon CloudWatch, https://docs.aws.amazon.com/step-functions/latest/dg/procedure-cw-metrics.html
- AWS Step Functions Developer Guide: Viewing execution details in the Step Functions console, https://docs.aws.amazon.com/step-functions/latest/dg/concepts-view-execution-details.html
- AWS Step Functions Developer Guide: Using CloudWatch Logs to log execution history in Step Functions, https://docs.aws.amazon.com/step-functions/latest/dg/cw-logs.html
- AWS CLI Command Reference: stepfunctions update-state-machine, https://docs.aws.amazon.com/cli/latest/reference/stepfunctions/update-state-machine.html
- AWS Step Functions API Reference: UpdateStateMachine, https://docs.aws.amazon.com/step-functions/latest/apireference/API_UpdateStateMachine.html
- AWS CLI Command Reference: cloudwatch put-metric-alarm, https://docs.aws.amazon.com/cli/latest/reference/cloudwatch/put-metric-alarm.html
- AWS SDK for JavaScript v3: Sfn ListExecutionsCommand, https://docs.aws.amazon.com/goto/SdkForJavaScriptV3/states-2016-11-23/ListExecutions

## Issues Found
- The example ARNs used a 9-digit account ID, which is not a valid AWS account ID format. Updated the sample ARNs to use the 12-digit placeholder account ID `123456789012`.
- The slow execution alarm used `--statistic p90`. CloudWatch percentile alarms must use `--extended-statistic p90` when configuring a single metric alarm, so the command was corrected.
- The `update-state-machine` examples for logging and tracing omitted both `definition` and `roleArn`. The AWS API returns `MissingRequiredParameter` if both are omitted, so the examples now pass a placeholder existing state machine role ARN.
- The CloudWatch Logs destination used a valid-looking log group name, but AWS recommends the `/aws/vendedlogs/states` prefix to avoid CloudWatch Logs resource policy size issues. Updated the example log group ARN to that prefix.
- The JavaScript stuck-execution checker said it got all running executions but only read one `ListExecutions` page. Updated it to follow `nextToken` until all pages are checked.

## Review Notes
The AWS CLI was not installed in the local environment, so CLI validation was performed against official AWS CLI and API documentation rather than local `--help` output. The post remains a practical guide and the remaining examples are illustrative; users still need to substitute their actual state machine ARN, IAM role ARN, log group ARN, SNS topic ARN, and Region.
