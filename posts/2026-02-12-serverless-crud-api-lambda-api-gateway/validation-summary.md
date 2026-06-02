# Validation Summary: Build a Serverless CRUD API with Lambda and API Gateway

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- AWS Lambda
- Amazon API Gateway
- Amazon DynamoDB
- AWS Serverless Application Model (SAM)
- AWS CLI
- Node.js
- AWS SDK for JavaScript v3

## Sources Consulted
- AWS Lambda Node.js runtime documentation: https://docs.aws.amazon.com/lambda/latest/dg/lambda-nodejs.html
- AWS Lambda Invoke API payload limits: https://docs.aws.amazon.com/lambda/latest/api/API_Invoke.html
- AWS CLI DynamoDB create-table command reference: https://docs.aws.amazon.com/cli/latest/reference/dynamodb/create-table.html
- Amazon DynamoDB JavaScript programming guide: https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/programming-with-javascript.html
- Amazon DynamoDB UpdateItem API reference: https://docs.aws.amazon.com/amazondynamodb/latest/APIReference/API_UpdateItem.html
- Amazon DynamoDB constraints: https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/Constraints.html
- AWS SAM AWS::Serverless::Function documentation: https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/sam-resource-function.html
- AWS SAM policy template list: https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/serverless-policy-template-list.html
- AWS SAM Globals documentation: https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/sam-specification-template-anatomy-globals.html
- Amazon API Gateway CloudWatch metrics documentation: https://docs.aws.amazon.com/apigateway/latest/developerguide/api-gateway-metrics-and-dimensions.html

## Issues Found
- The SAM template used `nodejs20.x`, which is no longer appropriate for newly created Lambda functions as of the current AWS runtime table. Changed it to `nodejs22.x`.
- The Lambda snippets hard-coded `TableName: 'Items'` while the SAM template defined `TABLE_NAME`. Updated the snippets to use `process.env.TABLE_NAME || 'Items'`.
- The create handler allowed a caller-supplied `id` to override the generated UUID because `...body` came after `id`. Reordered the object so the generated `id` wins.
- The update handler used DynamoDB `UpdateItem` without a condition. DynamoDB can add a new item when the key does not exist, which contradicted the post's description of modifying an existing item. Added `ConditionExpression: 'attribute_exists(#id)'` and a 404 response for `ConditionalCheckFailedException`.
- The update handler could try to update protected metadata or key fields from the request body. Filtered `id`, `createdAt`, and `updatedAt` from the dynamic update fields.
- The SAM template connected API Gateway routes to Lambda functions but did not grant the functions DynamoDB permissions. Added `DynamoDBCrudPolicy` to each function resource. Verified that `Policies` is not supported under `Globals.Function`, so the policy was added per function.

## Review Notes
- The JavaScript snippets were parsed locally with Node.js and passed syntax checks.
- The AWS CLI was not installed locally, so CLI syntax was verified against official AWS CLI documentation instead of `aws --help`.
- A local YAML parser was not available, so the SAM snippet was checked against official SAM resource and policy template documentation.
