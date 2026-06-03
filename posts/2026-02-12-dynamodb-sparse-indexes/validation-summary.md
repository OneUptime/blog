# Validation Summary: How to Use DynamoDB Sparse Indexes

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Amazon DynamoDB
- DynamoDB Global Secondary Indexes
- DynamoDB sparse indexes
- DynamoDB Time to Live (TTL)
- AWS CLI for DynamoDB
- AWS SDK for JavaScript v3
- Node.js

## Sources Consulted
- Amazon DynamoDB Developer Guide: Take advantage of sparse indexes: https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/bp-indexes-general-sparse-indexes.html
- Amazon DynamoDB Developer Guide: Using Global Secondary Indexes in DynamoDB: https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/GSI.html
- Amazon DynamoDB Developer Guide: Using update expressions in DynamoDB: https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/Expressions.UpdateExpressions.html
- Amazon DynamoDB Developer Guide: Using time to live (TTL) in DynamoDB: https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/TTL.html
- AWS CLI Command Reference: dynamodb update-table: https://docs.aws.amazon.com/cli/latest/reference/dynamodb/update-table.html
- AWS SDK for JavaScript v3 Developer Guide: Migrate from version 2.x to 3.x: https://docs.aws.amazon.com/sdk-for-javascript/v3/developer-guide/migrating.html
- AWS SDK for JavaScript v2 API Reference: end-of-support notice: https://docs.aws.amazon.com/AWSJavaScriptSDK/latest/
- AWS SDK for JavaScript v3 API Reference: @aws-sdk/lib-dynamodb: https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-lib-dynamodb/

## Issues Found
- The opening sparse-index description only mentioned the GSI partition key. AWS documentation states that an item appears in a GSI only when all index key attributes are present, including the sort key if the index defines one. Updated the explanation to include both partition and sort key attributes.
- The JavaScript examples used AWS SDK for JavaScript v2 (`aws-sdk` and `.promise()`), which reached end of support on September 8, 2025. Updated the examples to use AWS SDK for JavaScript v3 with `DynamoDBClient`, `DynamoDBDocumentClient`, `PutCommand`, `UpdateCommand`, and `QueryCommand`.
- The cost section said a query "scans" the sparse index. DynamoDB `Query` reads matching items by key condition; it is not a `Scan` operation. Changed the wording to "query reads from a tiny index."
- The TTL section said DynamoDB removes item attributes when TTL expires. DynamoDB TTL deletes the expired item, and the delete removes corresponding index entries. Updated the wording and clarified that this pattern is appropriate only when the whole item should expire.
- The TTL example did not mention that TTL must be enabled on the table with the configured TTL attribute. Added that prerequisite to the paragraph introducing the example.

## Review Notes
- The AWS CLI was not installed in the local workspace, so CLI syntax was verified against the current AWS CLI command reference instead of local `aws dynamodb update-table help` output.
- The combined JavaScript snippets were syntax-checked with Node.js v22.22.0 using `node --check`.
- The linked OneUptime blog post path exists in the repository.
