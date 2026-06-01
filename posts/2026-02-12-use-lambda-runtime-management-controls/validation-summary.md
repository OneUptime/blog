# Validation Summary: How to Use Lambda Runtime Management Controls

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- AWS Lambda
- Lambda runtime management controls
- AWS CLI
- AWS Organizations Service Control Policies
- AWS Config
- Amazon CloudWatch
- Python boto3

## Sources Consulted
- AWS Lambda Developer Guide: Understanding how Lambda manages runtime version updates: https://docs.aws.amazon.com/lambda/latest/dg/runtimes-update.html
- AWS Lambda Developer Guide: Configuring Lambda runtime management settings: https://docs.aws.amazon.com/lambda/latest/dg/runtime-management-configure-settings.html
- AWS Lambda Developer Guide: Identifying Lambda runtime version changes: https://docs.aws.amazon.com/lambda/latest/dg/runtime-management-identify.html
- AWS Lambda Developer Guide: Rolling back a Lambda runtime version: https://docs.aws.amazon.com/lambda/latest/dg/runtime-management-rollback.html
- AWS Lambda Developer Guide: Lambda runtimes and runtime deprecation policy: https://docs.aws.amazon.com/lambda/latest/dg/lambda-runtimes.html
- AWS CLI Command Reference: put-runtime-management-config: https://docs.aws.amazon.com/cli/latest/reference/lambda/put-runtime-management-config.html
- AWS CLI Command Reference: get-runtime-management-config: https://docs.aws.amazon.com/cli/latest/reference/lambda/get-runtime-management-config.html
- AWS Lambda API Reference: PutRuntimeManagementConfig: https://docs.aws.amazon.com/lambda/latest/api/API_PutRuntimeManagementConfig.html
- AWS Service Authorization Reference: Actions, resources, and condition keys for AWS Lambda: https://docs.aws.amazon.com/service-authorization/latest/reference/list_awslambda.html
- AWS Lambda Developer Guide: Types of metrics for Lambda functions: https://docs.aws.amazon.com/lambda/latest/dg/monitoring-metrics-types.html
- Boto3 Lambda documentation: https://docs.aws.amazon.com/boto3/latest/reference/services/lambda.html

## Issues Found
- The post described runtime version ARNs as date-based values such as `arn:aws:lambda:us-east-1::runtime:python3.12:20240101`. AWS documents runtime version ARNs as opaque identifiers, and runtime version numbers are distinct from runtime identifiers such as `python3.12`. Updated the explanation and all example ARNs to use the documented opaque runtime ARN shape.
- The post said Auto mode applies updates within roughly two weeks. AWS documents a two-phase rollout whose total duration varies by factors such as patch severity. Updated the text and diagram to refer to Lambda's two-phase runtime rollout instead of a fixed timing.
- The `get-runtime-management-config` section said the response includes the current `RuntimeVersionArn` for Auto mode. AWS CLI documentation says `RuntimeVersionArn` is returned only for Manual mode and is `null` for Auto and FunctionUpdate. Updated the explanation and JSON example.
- The post said each invocation logs runtime version information in `INIT_START`. AWS documents that Lambda emits `INIT_START` when it creates a new execution environment, not for every invocation. Updated the statement.
- The SCP example used a non-documented `lambda:UpdateRuntimeOn` condition key to require Manual mode. AWS Lambda does not list that condition key in the Service Authorization Reference. Replaced the policy with a valid SCP pattern that restricts who can call `lambda:PutRuntimeManagementConfig` for production-prefixed functions.
- The runtime deprecation section compressed the deprecation lifecycle in a way that implied creation and updates are immediately blocked at deprecation. AWS documents separate deprecation, block-function-create, and block-function-update phases. Updated the numbered list to reflect that lifecycle.
- The monitoring section treated Init Duration as a standard Lambda CloudWatch metric. Standard Lambda metrics include metrics such as Duration, Errors, and Throttles, while init duration is available in logs or Lambda Insights. Updated the text accordingly.

## Review Notes
- The Python boto3 sample is syntactically valid and uses documented Lambda client methods and paginators. It leaves `update_mode` unused, which is harmless but could be cleaned up in a future readability pass.
- The local environment did not have the AWS CLI installed, so CLI validation was performed against the official AWS CLI command reference instead of local `aws --help` output.
