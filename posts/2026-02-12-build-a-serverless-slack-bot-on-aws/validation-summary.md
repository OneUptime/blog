# Validation Summary: How to Build a Serverless Slack Bot on AWS

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- AWS Lambda
- Amazon API Gateway REST APIs
- Amazon SQS
- AWS Secrets Manager
- AWS CLI
- Slack slash commands
- Slack Events API
- Slack interactive components
- Slack Web API
- Python

## Sources Consulted
- Slack Developer Docs: Implementing slash commands - https://docs.slack.dev/interactivity/implementing-slash-commands
- Slack Developer Docs: Handling user interaction - https://docs.slack.dev/interactivity/handling-user-interaction/
- Slack Developer Docs: Verifying requests from Slack - https://api.slack.com/docs/verifying-requests-from-slack
- Slack Developer Docs: URL verification event - https://docs.slack.dev/reference/events/url_verification/
- Slack Developer Docs: Interaction payloads - https://docs.slack.dev/reference/interaction-payloads/
- AWS CLI Command Reference: secretsmanager create-secret - https://docs.aws.amazon.com/cli/latest/reference/secretsmanager/create-secret.html
- AWS CLI Command Reference: sqs send-message - https://docs.aws.amazon.com/cli/latest/reference/sqs/send-message.html
- AWS CLI Command Reference: apigateway create-rest-api - https://docs.aws.amazon.com/cli/latest/reference/apigateway/create-rest-api.html
- AWS CLI Command Reference: apigateway create-resource - https://docs.aws.amazon.com/cli/latest/reference/apigateway/create-resource.html
- Amazon API Gateway Developer Guide: Set up Lambda proxy integration using the AWS CLI - https://docs.aws.amazon.com/apigateway/latest/developerguide/set-up-lambda-proxy-integration-using-cli.html
- AWS Lambda Developer Guide: Configuring provisioned concurrency - https://docs.aws.amazon.com/lambda/latest/dg/provisioned-concurrency.html

## Issues Found
- Slack request verification assumed exact header casing for `X-Slack-Request-Timestamp` and `X-Slack-Signature`. Slack documents these headers as case-insensitive, so the code now normalizes header keys before lookup.
- Slack signature verification used `event['body']` directly and did not handle API Gateway's `isBase64Encoded` body flag. The code now uses a `get_raw_body` helper so the signature is computed from the exact raw body Slack signed.
- Missing or malformed Slack request timestamps could raise `ValueError` instead of returning a clean authentication failure. The verification helper now rejects malformed timestamps safely.
- Interactive component callbacks were parsed before verifying Slack's signature. The interaction handler now verifies the request before parsing the URL-encoded payload.
- Events API callbacks were not verifying Slack's signature, even though Slack's URL verification guidance says to validate the request origin. The event handler now verifies before parsing the JSON body.
- The Events API snippet used `requests.post` without importing `requests`. Added the missing import.
- The API Gateway route snippet only created `/slack/commands` despite documenting `/slack/interactions` and `/slack/events`. The snippet now creates all three resource paths and notes that POST methods, Lambda proxy integrations, invoke permissions, and an API deployment are still required.

## Review Notes
- The code examples are illustrative and still assume placeholder functions such as `handle_status`, `handle_oncall`, `handle_modal_submission`, `handle_shortcut`, `approve_deployment`, `reject_deployment`, and `handle_message` will be implemented by the reader.
- The local workspace does not have the AWS CLI installed, so CLI validation was performed against the official AWS CLI command reference.
