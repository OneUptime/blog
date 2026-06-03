# Validation Summary: How to Build a Serverless Contact Form with Lambda and SES

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- AWS Lambda
- Amazon SES
- Amazon API Gateway REST APIs
- Amazon DynamoDB
- AWS CLI
- Python
- Boto3
- JavaScript Fetch API
- Google reCAPTCHA v3
- IAM policies

## Sources Consulted
- Amazon SES SendEmail API Reference: https://docs.aws.amazon.com/ses/latest/APIReference/API_SendEmail.html
- Amazon SES identity verification documentation: https://docs.aws.amazon.com/ses/latest/dg/creating-identities.html
- Amazon API Gateway Lambda proxy integration with AWS CLI: https://docs.aws.amazon.com/apigateway/latest/developerguide/set-up-lambda-proxy-integration-using-cli.html
- AWS CLI Lambda add-permission command reference: https://docs.aws.amazon.com/cli/latest/reference/lambda/add-permission.html
- AWS CLI DynamoDB create-table command reference: https://docs.aws.amazon.com/cli/latest/reference/dynamodb/create-table.html
- AWS CLI DynamoDB update-time-to-live command reference: https://docs.aws.amazon.com/cli/latest/reference/dynamodb/update-time-to-live.html
- AWS Lambda Python deployment package documentation: https://docs.aws.amazon.com/lambda/latest/dg/python-package.html
- Google reCAPTCHA v3 documentation: https://developers.google.com/recaptcha/docs/v3
- Python syntax validation via local Python 3 AST parser

## Issues Found
- SES verification steps omitted the follow-up required to complete identity verification. Added a note that domain verification requires adding the DNS record returned by SES, and email verification requires clicking the SES verification link.
- API Gateway setup created methods but did not configure Lambda proxy integrations, grant API Gateway permission to invoke Lambda, or deploy a stage. Added `put-integration`, `lambda add-permission`, and `create-deployment` commands so the frontend URL can actually invoke the Lambda handler.
- The reCAPTCHA example only rejected invalid tokens when a token was present, allowing submissions without a token. Changed the check to reject missing or invalid tokens.
- The reCAPTCHA snippet imported `requests` without noting Lambda packaging requirements. Added a note to package `requests` with the deployment or provide it through a Lambda layer.
- The DynamoDB submission-storage snippet used `uuid` and `datetime` without imports. Added the required imports and changed `datetime.utcnow()` to timezone-aware `datetime.now(timezone.utc)`.
- The IAM policy code block was marked as JSON but included a `//` comment, which made it invalid JSON. Moved the comment into prose before the code block.

## Review Notes
- The main Lambda, DynamoDB rate-limit table commands, SES `send_email` usage, CORS response shape for Lambda proxy integration, frontend `fetch` example, and IAM actions are technically valid after the corrections above.
- The AWS CLI was not installed in the local environment, so CLI command validation was performed against official AWS command references and developer documentation rather than local `--help` output.
