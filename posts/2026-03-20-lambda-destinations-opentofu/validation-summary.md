# Validation Summary: How to Set Up Lambda Destinations with OpenTofu

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- OpenTofu
- AWS Lambda
- AWS Lambda Destinations
- Amazon SQS
- Amazon SNS
- Amazon EventBridge
- IAM
- Python

## Sources Consulted
- AWS Lambda Developer Guide: Capturing records of Lambda asynchronous invocations - https://docs.aws.amazon.com/lambda/latest/dg/invocation-async-retain-records.html
- AWS Lambda API Reference: UpdateFunctionEventInvokeConfig - https://docs.aws.amazon.com/lambda/latest/api/API_UpdateFunctionEventInvokeConfig.html
- AWS provider docs: `aws_lambda_function_event_invoke_config` - https://github.com/hashicorp/terraform-provider-aws/blob/main/website/docs/r/lambda_function_event_invoke_config.html.markdown
- AWS provider docs: `aws_cloudwatch_event_bus` - https://github.com/hashicorp/terraform-provider-aws/blob/main/website/docs/r/cloudwatch_event_bus.html.markdown
- AWS provider docs: `aws_lambda_function` - https://github.com/hashicorp/terraform-provider-aws/blob/main/website/docs/r/lambda_function.html.markdown
- AWS provider docs: `aws_sns_topic_subscription` - https://github.com/hashicorp/terraform-provider-aws/blob/main/website/docs/r/sns_topic_subscription.html.markdown
- OpenTofu CLI docs: `tofu init` - https://opentofu.org/docs/cli/commands/init/
- OpenTofu CLI docs: `tofu plan` - https://opentofu.org/docs/cli/commands/plan/
- OpenTofu CLI docs: `tofu apply` - https://opentofu.org/docs/cli/commands/apply/

## Issues Found
- The post defined a second `aws_lambda_function_event_invoke_config` resource for the same Lambda function without a qualifier. I replaced that example with an EventBridge bus resource and a commented alternative destination snippet because async invoke config is managed as a single configuration per function, version, or alias.
- The EventBridge example referenced `aws_cloudwatch_event_bus.results.arn` without defining the event bus resource. I added the missing `aws_cloudwatch_event_bus` resource.
- The IAM policy example was missing the `events:PutEvents` permission required when using EventBridge as a destination. I added that permission to the execution-role policy.
- The prerequisites mentioned Lambda, SQS, and EventBridge permissions but the post also creates and uses SNS resources. I updated the prerequisites to include SNS permissions.
- The post referenced `var.alert_email`, `aws_iam_role.lambda`, and `data.archive_file.zip` without defining them in the example flow. I added the missing variable, IAM role, and archive data source so the snippets are internally consistent.
- The Python consumer example attempted to `json.loads()` the `responsePayload` field even though Lambda destination records already include `responsePayload` as JSON in the invocation record. I corrected the example to use the field directly.
- The comment on `maximum_event_age_in_seconds` described the setting as retrying for one hour. I adjusted the comment to match AWS behavior more accurately: Lambda retains the async event for up to that age.

## Review Notes
- The `tofu init`, `tofu plan`, and `tofu apply` commands are correct as written.
- SNS destinations have a 256 KB message size limit. If the original event plus invocation metadata is large, SQS or EventBridge is a safer destination choice.
