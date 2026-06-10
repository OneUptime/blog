# Validation Summary: How to Use DynamoDB with Lambda

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Amazon DynamoDB
- AWS Lambda
- AWS SDK for JavaScript v3 (`@aws-sdk/client-dynamodb`, `@aws-sdk/lib-dynamodb`, `@aws-sdk/util-dynamodb`)
- `@smithy/node-http-handler`
- boto3 / botocore (Python AWS SDK)
- AWS SAM (Serverless Application Model)
- Serverless Framework (`serverless.yml`)
- DynamoDB Streams
- Global Secondary Indexes (GSI)
- IAM policies for DynamoDB
- Mermaid diagrams

## Sources Consulted
- AWS SDK for JavaScript v3 — DynamoDB Client docs: https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/dynamodb/
- AWS SDK for JavaScript v3 — DynamoDBDocumentClient (lib-dynamodb): https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-lib-dynamodb/
- AWS SDK for JavaScript v3 — request handlers / `NodeHttpHandler`: https://github.com/aws/aws-sdk-js-v3/tree/main/packages/node-http-handler
- AWS announcement: DynamoDB now supports empty strings/binary attribute values (May 2020): https://aws.amazon.com/about-aws/whats-new/2020/05/amazon-dynamodb-now-supports-empty-values-for-non-key-string-and-binary-attributes-in-dynamodb-tables/
- DynamoDB Reserved Words list (`NAME`, `STATUS` are reserved): https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/ReservedWords.html
- DynamoDB BatchWriteItem (25 items per request): https://docs.aws.amazon.com/amazondynamodb/latest/APIReference/API_BatchWriteItem.html
- DynamoDB BatchGetItem (100 items / 16 MB per request): https://docs.aws.amazon.com/amazondynamodb/latest/APIReference/API_BatchGetItem.html
- DynamoDB Transactions (100-item / 4 MB limit since Sept 2022): https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/transaction-apis.html
- DynamoDB Streams record format (`eventName`: INSERT/MODIFY/REMOVE): https://docs.aws.amazon.com/amazondynamodb/latest/APIReference/API_streams_Record.html
- AWS Lambda runtime support policy (`nodejs18.x` end-of-support 2025-09-01; `nodejs20.x` / `nodejs22.x` active): https://docs.aws.amazon.com/lambda/latest/dg/lambda-runtimes.html
- boto3 `Config` object (`retries.mode='adaptive'`, `connect_timeout`, `read_timeout`): https://botocore.amazonaws.com/v1/documentation/api/latest/reference/config.html
- AWS SAM policy templates (`DynamoDBCrudPolicy`, `DynamoDBStreamReadPolicy`): https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/serverless-policy-templates.html
- AWS SAM DynamoDB event source (`BatchSize`, `StartingPosition`, `BisectBatchOnFunctionError`, `MaximumRetryAttempts`): https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/sam-property-function-dynamodb.html
- Serverless Framework `provisionedConcurrency` function property: https://www.serverless.com/framework/docs/providers/aws/guide/functions

## Issues Found
1. **Invalid top-level `requestTimeout` on `DynamoDBClient`.** AWS SDK v3 does not accept `requestTimeout` (or `connectionTimeout`) as direct config options on the service client; these belong on the HTTP handler. Replaced the broken config with a `NodeHttpHandler` from `@smithy/node-http-handler` and added the required `require` statement. Updated the surrounding comment, which had also incorrectly claimed that `maxAttempts` controls connection reuse (it sets the retry count).
2. **Outdated comment on `convertEmptyValues`.** The comment claimed "DynamoDB doesn't support empty strings". DynamoDB has supported empty strings/binary for non-key String and Binary attributes since May 2020. Updated the comment to reflect current behavior and changed the value to `false` so empty strings are preserved rather than silently coerced to NULL — matching the documented SDK default and current best practice.
3. **Invalid `keepAlive: true` top-level option in the Connection Reuse section.** `keepAlive` is not a valid `DynamoDBClient` constructor option. The Node.js HTTP handler in AWS SDK v3 enables keep-alive by default, so the code was misleading. Removed the option and updated the comment to explain that initializing the client outside the handler is what actually delivers connection reuse on warm invocations.
4. **Deprecated Lambda runtime `nodejs18.x` in the SAM template.** Node.js 18 reached end of support on 2025-09-01 per the AWS Lambda runtime support policy, so a post dated 2026 should not recommend it for new code. Updated to `nodejs20.x`.

## Review Notes
- The IAM policy, BatchWriteItem (25) / BatchGetItem (100) limits, transaction 100-item cap, DynamoDB Streams event types, and SAM table/index/stream definitions all match current AWS documentation.
- `NAME` and `STATUS` are correctly handled as DynamoDB reserved words via `ExpressionAttributeNames`.
- Python `boto3` `Config` snippet (`retries.mode='adaptive'`, `connect_timeout`, `read_timeout`) is valid.
- `error.name === 'ConditionalCheckFailedException'` and `error.CancellationReasons` on `TransactionCanceledException` are the correct shapes in AWS SDK v3.
- `nodejs20.x` is current at time of validation, but `nodejs22.x` is also supported; readers running this in late 2026/2027 should check the Lambda runtime support page for the latest LTS.
- The SAM `DynamoDBStreamReadPolicy` is given `StreamName: !GetAtt UsersTable.StreamArn`. SAM accepts this in practice (it interpolates into a resource pattern), but the parameter name suggests the trailing stream label rather than a full ARN. Left as-is since it is a widely used pattern in real templates and not an outright error.
