# Validation Summary: How to Build Human Approval Workflows with Step Functions

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- AWS Step Functions
- Amazon States Language
- AWS Lambda
- API Gateway
- Amazon SES
- Amazon DynamoDB
- Slack Block Kit
- Python
- Boto3

## Sources Consulted
- AWS Step Functions Developer Guide: Invoke an AWS Lambda function with Step Functions - https://docs.aws.amazon.com/step-functions/latest/dg/connect-lambda.html
- AWS Step Functions Developer Guide: Discover service integration patterns in Step Functions - https://docs.aws.amazon.com/step-functions/latest/dg/connect-to-resource.html
- AWS Step Functions Developer Guide: Choosing workflow type in Step Functions - https://docs.aws.amazon.com/step-functions/latest/dg/choosing-workflow-type.html
- AWS Step Functions API Reference: SendTaskSuccess - https://docs.aws.amazon.com/step-functions/latest/apireference/API_SendTaskSuccess.html
- Boto3 SES Client Reference: send_email - https://docs.aws.amazon.com/boto3/latest/reference/services/ses/client/send_email.html
- Slack Developer Docs: Button element - https://docs.slack.dev/reference/block-kit/block-elements/button-element/

## Issues Found
- The API Gateway callback example used `event.get('queryStringParameters', {})`, which can still return `None` for API Gateway proxy events with no query parameters. Changed it to `event.get('queryStringParameters') or {}` so invalid requests return the intended 400 response instead of raising an exception.
- The callback example populated `approvedAt` with `context.get_remaining_time_in_millis()`, which is Lambda execution time remaining, not an approval timestamp. Changed it to an ISO 8601 UTC timestamp using `datetime.now(timezone.utc).isoformat()`.
- The Slack approval example placed the raw Step Functions task token in the Slack button `value`. AWS documents task tokens as up to 2,048 characters, while Slack button values are limited to 2,000 characters. Changed the example to store the full token server-side in DynamoDB and place a shorter approval ID in the Slack button value.

## Review Notes
The Step Functions `.waitForTaskToken` integration pattern, `$$.Task.Token` context reference, `SendTaskSuccess` and `SendTaskFailure` callback behavior, custom task failure catch path, 24-hour `TimeoutSeconds`, and one-year Standard Workflow duration claim match AWS documentation. The examples assume required IAM permissions, verified SES identities, a suitable DynamoDB key schema, and Slack app scopes/interactivity configuration.
