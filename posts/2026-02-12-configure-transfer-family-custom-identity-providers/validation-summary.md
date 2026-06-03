# Validation Summary: How to Configure Transfer Family Custom Identity Providers

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- AWS Transfer Family
- AWS Lambda
- Amazon API Gateway REST APIs
- Amazon DynamoDB
- AWS IAM
- Amazon S3 session policies
- AWS CLI
- Python 3.12

## Sources Consulted
- AWS Transfer Family User Guide: Using Amazon API Gateway to integrate your identity provider - https://docs.aws.amazon.com/transfer/latest/userguide/authentication-api-gateway.html
- AWS Transfer Family User Guide: Using AWS Lambda to integrate your identity provider - https://docs.aws.amazon.com/transfer/latest/userguide/custom-lambda-idp.html
- AWS Transfer Family API/CLI: create-server identity provider details - https://docs.aws.amazon.com/cli/latest/reference/transfer/create-server.html
- AWS Transfer Family User Guide: Creating a session policy for an Amazon S3 bucket - https://docs.aws.amazon.com/transfer/latest/userguide/users-policies-session.html
- AWS Lambda API Reference: AddPermission - https://docs.aws.amazon.com/lambda/latest/api/API_AddPermission.html
- AWS Lambda Developer Guide: Invoking a Lambda function using an Amazon API Gateway endpoint - https://docs.aws.amazon.com/lambda/latest/dg/services-apigateway.html
- AWS CLI Command Reference: lambda invoke - https://docs.aws.amazon.com/cli/latest/reference/lambda/invoke.html
- AWS CLI Command Reference: apigateway put-integration - https://docs.aws.amazon.com/cli/latest/reference/apigateway/put-integration.html
- AWS CLI Command Reference: dynamodb create-table - https://docs.aws.amazon.com/cli/latest/reference/dynamodb/create-table.html
- AWS CLI Command Reference: dynamodb put-item - https://docs.aws.amazon.com/cli/latest/reference/dynamodb/put-item.html

## Issues Found
- The sequence diagram showed Transfer Family calling API Gateway with `POST`. AWS Transfer Family custom identity provider APIs use a `GET` method on `/servers/{serverId}/users/{username}/config`, so the diagram was corrected.
- The API Gateway method used the older `Password` header and URL decoding. AWS's current Transfer Family API Gateway templates use `PasswordBase64` and base64 decoding, so the method request parameters and mapping template were updated.
- The API Gateway mapping omitted the `protocol` query string in the Lambda event. AWS documents `protocol` as part of the event/request context for custom identity providers, so the mapping and Lambda logging were updated to include it.
- The API Gateway CLI setup did not grant API Gateway permission to invoke Lambda. Added an `aws lambda add-permission` command for `apigateway.amazonaws.com`.
- The API Gateway CLI setup did not define the 200 method and integration responses for the REST API custom integration. Added `put-method-response` and `put-integration-response` commands before deployment.
- The API Gateway server URL used a literal `API_ID` string. Updated it to use the shell `$API_ID` variable.
- The custom identity provider examples were password-only, but the Transfer Family default for SFTP custom providers can allow public key or password. Added `SftpAuthenticationMethods: "PASSWORD"` to match the implementation.
- The direct Lambda identity provider setup omitted the Lambda resource-based permission required for Transfer Family invocation. Added an `aws lambda add-permission` command scoped to the created server ARN.
- The article recommended API Gateway caching as a reason to choose API Gateway. AWS explicitly warns not to enable API Gateway caching for Transfer Family authentication requests, so the text was corrected.
- The scope-down policy used `${transfer:HomeBucket}` and `${transfer:HomeFolder}` while the Lambda returns `HomeDirectoryType: LOGICAL`. AWS documents that these session policy variables are not supported with logical directories, so the policy example now uses explicit bucket and prefix values.
- The DynamoDB `put-item` command for the scope-down policy had malformed JSON and inserted raw JSON into a string attribute without escaping it. Updated the snippet to compact and quote the policy before passing it to `--item`.
- The Lambda invoke test omitted `--cli-binary-format raw-in-base64-out`, which is required for literal JSON payloads with AWS CLI v2. Added the flag and included `protocol` in the test payload.

## Review Notes
- The password hashing example is technically runnable, but plain unsalted SHA-256 should be replaced with a password hashing scheme such as bcrypt, scrypt, or Argon2 for production use.
- API Gateway request/response logging can expose passwords for this workflow; AWS recommends avoiding those logs in production for password-based custom identity providers.
