# Validation Summary: How to Migrate from AWS SDK v2 to v3 in Node.js

## Status
validated

## Post Type
Tutorial / Migration guide

## Technologies Covered
- AWS SDK for JavaScript v2
- AWS SDK for JavaScript v3
- Node.js
- JavaScript / ES modules and CommonJS
- Amazon S3
- Amazon DynamoDB
- AWS Lambda
- AWS SDK credential providers
- AWS SDK migration codemods

## Sources Consulted
- AWS SDK for JavaScript v3 migration guide: https://docs.aws.amazon.com/sdk-for-javascript/v3/developer-guide/migrating.html
- AWS SDK for JavaScript v2 to v3 migration guide: https://docs.aws.amazon.com/sdk-for-javascript/v3/developer-guide/migrating-to-v3.html
- AWS S3 migration considerations for JavaScript SDK v3: https://docs.aws.amazon.com/sdk-for-javascript/v3/developer-guide/migrate-s3.html
- AWS SDK for JavaScript v3 `@aws-sdk/lib-storage` documentation: https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-lib-storage/
- AWS DynamoDB programming with JavaScript documentation: https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/programming-with-javascript.html
- AWS SDK for JavaScript v3 `@aws-sdk/lib-dynamodb` documentation: https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-lib-dynamodb/
- AWS Lambda SDK for JavaScript v3 code examples: https://docs.aws.amazon.com/code-library/latest/ug/javascript_3_lambda_code_examples.html
- AWS SDK for JavaScript v3 response and error handling documentation: https://docs.aws.amazon.com/sdk-for-javascript/v3/developer-guide/the-response-object.html
- AWS SDK for JavaScript v2 end-of-support announcement: https://aws.amazon.com/blogs/developer/announcing-end-of-support-for-aws-sdk-for-javascript-v2/
- `aws-sdk-js-codemod --help` output from published npm package version 3.0.2

## Issues Found
- The post said the v2 SDK "still works" without noting that v2 reached end-of-support on September 8, 2025. Updated the text to state that existing applications can still run, but v2 no longer receives updates or releases.
- The bundle-size bullet used a brittle `~70 MB` number and described v2 as importing the whole SDK. Reworded it to the stable technical point: v2 uses a large monolithic package, while v3 supports modular imports.
- The S3 `GetObject` section and best-practices list described v3 response bodies as `ReadableStream`s. AWS documents the migration as Buffer-to-Stream behavior, with runtime-specific stream types and helper methods such as `transformToString()`. Reworded both references to "stream-like" objects.
- The presigned URL v3 snippet used `GetObjectCommand` without importing it in that snippet. Added the missing import.
- The pagination example imported `paginateScan` from `@aws-sdk/client-dynamodb` while using a `DynamoDBDocumentClient`-style flow. Updated it to import `paginateScan` from `@aws-sdk/lib-dynamodb` and pass `docClient`, so returned items remain plain JavaScript objects.
- The coexistence example mixed CommonJS `require()` and static ES module `import` syntax in one snippet. Changed the v3 import to CommonJS destructuring so the example is syntactically valid.

## Review Notes
- The codemod command `npx aws-sdk-js-codemod -t v2-to-v3 path/to/your/files` matches the published CLI help.
- The Lambda invocation pattern using `Payload: JSON.stringify(...)` and `Buffer.from(result.Payload).toString()` matches AWS's JavaScript v3 Lambda examples.
- The internal OneUptime links point to post slugs that exist in the repository.
