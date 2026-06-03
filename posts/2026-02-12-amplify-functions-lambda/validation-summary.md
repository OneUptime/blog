# Validation Summary: How to Use Amplify Functions (Lambda)

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- AWS Amplify CLI
- AWS Amplify JavaScript REST API
- AWS Lambda
- Amazon API Gateway REST APIs
- AWS AppSync GraphQL Lambda resolvers
- Amazon Cognito Lambda triggers
- Amazon S3 event triggers
- Amazon DynamoDB Streams
- AWS SDK for JavaScript v3
- AWS Systems Manager Parameter Store
- Amazon CloudWatch Logs

## Sources Consulted
- AWS Amplify Gen 1 documentation: Set up a function - https://docs.amplify.aws/gen1/angular/build-a-backend/functions/set-up-function/
- AWS Amplify Gen 1 documentation: Configure REST API - https://docs.amplify.aws/gen1/javascript/build-a-backend/restapi/configure-rest-api/
- AWS Amplify Gen 1 documentation: Fetch data for REST APIs - https://docs.amplify.aws/gen1/javascript/build-a-backend/restapi/fetch-data/
- AWS Amplify Gen 1 documentation: Configure Lambda resolvers with @function - https://docs.amplify.aws/gen1/react/tools/cli-legacy/function-directive/
- AWS Amplify Gen 1 documentation: Lambda triggers - https://docs.amplify.aws/gen1/react/tools/cli/usage/lambda-triggers/
- AWS Amplify Gen 1 documentation: Access secret values - https://docs.amplify.aws/gen1/react/build-a-backend/functions/secrets/
- AWS Amplify Gen 1 documentation: Mocking and testing - https://docs.amplify.aws/gen1/react-native/tools/cli/usage/mock/
- AWS Amplify Gen 1 documentation: CLI commands - https://docs.amplify.aws/gen1/javascript/tools/cli/commands/
- AWS Amplify Gen 1 documentation: Migrate from Amplify JavaScript v5 to v6 - https://docs.amplify.aws/gen1/javascript/build-a-backend/troubleshooting/migrate-from-javascript-v5-to-v6/
- AWS Lambda documentation: S3 trigger JavaScript example - https://docs.aws.amazon.com/lambda/latest/dg/with-s3-example.html
- AWS Lambda documentation: Configure Lambda function timeout - https://docs.aws.amazon.com/lambda/latest/dg/configuration-timeout.html
- AWS Developer Tools Blog: AWS SDK for JavaScript v2 end-of-support announcement - https://aws.amazon.com/blogs/developer/announcing-end-of-support-for-aws-sdk-for-javascript-v2/

## Issues Found
- The frontend REST example used the older Amplify JavaScript v5 `API.get` import from `aws-amplify`. Updated it to the current v6 functional `get` import from `aws-amplify/api` and consumed the response body with `body.json()`.
- The S3 trigger example decoded object keys with `decodeURIComponent` only. Updated it to replace `+` with spaces before decoding, matching AWS Lambda's S3 event examples.
- The DynamoDB and S3 service example used AWS SDK for JavaScript v2 (`aws-sdk`), which reached end of support on September 8, 2025. Updated it to use AWS SDK for JavaScript v3 clients and commands.
- The secrets section suggested setting secrets directly in `parameters.json`, which conflicts with Amplify guidance that secret values are not stored locally and are stored in Parameter Store as `SecureString` values. Updated the text and example to use Amplify's secret values configuration and retrieve the Parameter Store name from an environment variable.
- The monitoring section described `amplify console function processOrder` as tailing logs. Updated the snippet to the documented `amplify function console` command and clarified that it opens the Lambda console for functions.
- The timeout section stated that the default timeout for Amplify functions is 25 seconds. Updated it to Lambda's documented default timeout of 3 seconds and maximum of 15 minutes.

## Review Notes
The tutorial is written for the Amplify Gen 1 CLI workflow. That workflow is still documented, but future updates could make the Gen 1 scope explicit or add a separate Gen 2 version using code-first backend definitions.
