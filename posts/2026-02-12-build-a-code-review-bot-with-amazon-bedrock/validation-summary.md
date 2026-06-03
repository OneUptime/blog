# Validation Summary: How to Build a Code Review Bot with Amazon Bedrock

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Amazon Bedrock
- AWS Lambda
- Amazon SQS
- Amazon DynamoDB
- AWS Secrets Manager
- GitHub webhooks
- GitHub REST API
- Python
- boto3

## Sources Consulted
- Amazon Bedrock Anthropic Claude Messages request and response documentation: https://docs.aws.amazon.com/bedrock/latest/userguide/model-parameters-anthropic-claude-messages-request-response.html
- Amazon Bedrock model lifecycle documentation: https://docs.aws.amazon.com/bedrock/latest/userguide/model-lifecycle.html
- Amazon Bedrock Claude Sonnet 4.6 model card and sample code: https://docs.aws.amazon.com/bedrock/latest/userguide/model-card-anthropic-claude-sonnet-4-6.html
- GitHub webhook signature validation documentation: https://docs.github.com/en/webhooks/using-webhooks/validating-webhook-deliveries
- GitHub REST API pull request reviews documentation: https://docs.github.com/en/rest/pulls/reviews?apiVersion=2022-11-28
- GitHub REST API pull request review comments documentation: https://docs.github.com/en/rest/pulls/comments?apiVersion=2022-11-28
- boto3 Bedrock Runtime invoke_model documentation: https://boto3.amazonaws.com/v1/documentation/api/latest/reference/services/bedrock-runtime/client/invoke_model.html
- boto3 Secrets Manager get_secret_value documentation: https://docs.aws.amazon.com/boto3/latest/reference/services/secretsmanager/client/get_secret_value.html
- boto3 DynamoDB Table put_item documentation: https://docs.aws.amazon.com/boto3/latest/reference/services/dynamodb/table/put_item.html

## Issues Found
- The Bedrock example used `anthropic.claude-3-sonnet-20240229-v1:0`, which is in Legacy status on Amazon Bedrock as of the validation date and has an EOL date of July 30, 2026. Updated the snippet to use the active Claude Sonnet 4.6 model ID, `anthropic.claude-sonnet-4-6`, which is documented by AWS as active and supported by `bedrock-runtime`.
- The review processor snippet used `datetime.utcnow()` without importing `datetime`. Added `from datetime import datetime` so the code is syntactically complete.
- The GitHub diff and review API snippets used older `token` authorization and older media type spelling. Updated them to use `Bearer`, `application/vnd.github+json` where appropriate, and `X-GitHub-Api-Version: 2022-11-28`, matching current GitHub REST API examples.
- The diff sent to Bedrock did not include actual new-file line numbers, even though the prompt asked the model to return line numbers for GitHub inline comments. Updated the diff reconstruction to annotate added and context lines with new-file line numbers.
- The GitHub review posting snippet claimed a hard 50-comment review limit that was not supported by the consulted GitHub documentation. Reworded the comment to present the 50-comment cap as a conservative batch-size choice to reduce secondary rate-limit risk.
- The HTTP request snippets did not check for non-2xx GitHub responses before using the response body or status. Added `response.raise_for_status()` after the GitHub diff fetch and review creation calls.

## Review Notes
The implementation remains a simplified tutorial example. A production bot should also validate API Gateway base64-encoded bodies before GitHub signature verification, handle GitHub comments that target deleted lines or lines outside the diff, retry transient Bedrock and GitHub API failures, and use partial batch responses for SQS-triggered Lambda functions.
