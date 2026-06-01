# Validation Summary: How to Write Unit Tests for Lambda Functions

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- AWS Lambda
- Amazon SQS event sources for Lambda
- Amazon DynamoDB
- AWS SDK for JavaScript v3
- Jest
- aws-sdk-client-mock
- npm
- Node.js CommonJS modules

## Sources Consulted
- AWS SDK for JavaScript v3 DynamoDB Document Client documentation: https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-lib-dynamodb/
- AWS SDK for JavaScript v3 DynamoDB ScanCommand documentation: https://docs.aws.amazon.com/goto/SdkForJavaScriptV3/dynamodb-2012-08-10/Scan
- AWS DynamoDB JavaScript programming guide: https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/programming-with-javascript.html
- AWS Lambda SQS event source documentation: https://docs.aws.amazon.com/lambda/latest/dg/with-sqs.html
- AWS Lambda SQS error handling and partial batch response documentation: https://docs.aws.amazon.com/lambda/latest/dg/services-sqs-errorhandling.html
- Jest configuration documentation: https://jestjs.io/docs/configuration
- Jest ES6 class mocks documentation: https://jestjs.io/docs/es6-class-mocks
- npm install documentation: https://docs.npmjs.com/cli-documentation/install
- Node.js crypto.randomUUID documentation: https://nodejs.org/api/crypto.html#cryptorandomuuidoptions
- uuid package documentation, checked for current CommonJS support caveat: https://www.npmjs.com/package/uuid
- Referenced OneUptime SAM CLI guide link: https://oneuptime.com/blog/post/2026-02-12-test-lambda-functions-locally-sam-cli/view

## Issues Found
- The dependency installation command installed AWS SDK packages as development dependencies. Changed the setup commands to install `@aws-sdk/client-dynamodb` and `@aws-sdk/lib-dynamodb` as regular dependencies, and install `jest` and `aws-sdk-client-mock` as development dependencies.
- The service example used the `uuid` package with CommonJS syntax, but current `uuid` releases no longer support CommonJS. Replaced it with Node.js `crypto.randomUUID()`, which is available in supported modern Node.js runtimes.
- The handler example called `orderService.listOrders`, but the service example did not implement `listOrders`. Added a `listOrders` method using `ScanCommand` from `@aws-sdk/lib-dynamodb`, including optional status filtering with expression attribute names and values.
- The service example imported `QueryCommand` but did not use it. Replaced it with `ScanCommand`, which matches the added list operation.
- The handler unit test mocked the service class through prototype reassignment after the handler module created its service instance. Replaced it with a Jest module factory returning a shared mock service object, which makes the test behavior deterministic.
- The SQS test imported `src/handlers/sqs-handler`, but the post did not show a matching handler implementation. Added a minimal SQS handler that parses records, calls `processOrder`, and returns `batchItemFailures` entries using each failed record's `messageId`.
- The SQS partial batch example did not mention the required Lambda event source mapping setting. Added a note that `ReportBatchItemFailures` must be configured for Lambda to retry only failed SQS messages.
- The SQS unit test used prototype reassignment for the mocked service. Updated it to the same explicit Jest module factory pattern used by the API Gateway handler test.

## Review Notes
- The DynamoDB `ScanCommand` example is suitable for a compact tutorial, but production listing endpoints should usually consider pagination and access patterns before scanning a whole table.
- The SQS partial batch response format is correct for standard queues. For FIFO queues, AWS recommends stopping processing after the first failure and returning failed and unprocessed messages to preserve ordering.
