# Validation Summary: How to Create Lambda Event Source Mappings for SQS with OpenTofu

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- OpenTofu
- AWS Lambda
- Amazon SQS
- IAM
- Python 3.12
- Lambda event source mappings

## Sources Consulted
- AWS Lambda: Creating and configuring an Amazon SQS event source mapping - https://docs.aws.amazon.com/lambda/latest/dg/services-sqs-configure.html
- AWS Lambda: Lambda parameters for Amazon SQS event source mappings - https://docs.aws.amazon.com/lambda/latest/dg/services-sqs-parameters.html
- AWS Lambda: Using event filtering with an Amazon SQS event source - https://docs.aws.amazon.com/lambda/latest/dg/with-sqs-filtering.html
- AWS Lambda: Control which events Lambda sends to your function - https://docs.aws.amazon.com/lambda/latest/dg/invocation-eventfiltering.html
- AWS Managed Policy Reference: AWSLambdaSQSQueueExecutionRole - https://docs.aws.amazon.com/aws-managed-policy/latest/reference/AWSLambdaSQSQueueExecutionRole.html
- AWS Lambda: Lambda runtimes - https://docs.aws.amazon.com/lambda/latest/dg/lambda-runtimes.html
- OpenTofu CLI: init - https://opentofu.org/docs/cli/init/
- OpenTofu CLI: plan - https://opentofu.org/docs/cli/commands/plan/
- OpenTofu CLI: apply - https://opentofu.org/docs/cli/commands/apply
- HashiCorp AWS provider source docs: aws_lambda_event_source_mapping - https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/lambda_event_source_mapping.html.markdown

## Issues Found
- The queue visibility timeout was set to `180` seconds with a `30` second Lambda timeout and a `5` second batching window. AWS recommends setting SQS visibility timeout to six times the function timeout, plus `MaximumBatchingWindowInSeconds` when a batch window is used. I changed the example to `185` seconds and updated the related comments and conclusion text.
- The filter example comment said it processed messages with specific attributes, but Amazon SQS event source mappings support filtering on the message `body` key for SQS. I changed the comment to describe JSON body filtering accurately.
- The conclusion said message filtering could be used to route different event types to specialized Lambda functions. For SQS, messages that do not match filter criteria are removed from the queue, so that wording was incorrect for routing semantics. I changed the conclusion to describe filtering as a way to ensure a Lambda only processes relevant JSON message bodies.

## Review Notes
- The snippets are technically valid but assume supporting resources such as `var.queue_name`, `aws_iam_role.lambda`, and `data.archive_file.zip` are defined elsewhere in the OpenTofu configuration.
- CLI command syntax was validated against official OpenTofu documentation. The `tofu` binary was not installed in the review environment, so local `--help` output was not available.
