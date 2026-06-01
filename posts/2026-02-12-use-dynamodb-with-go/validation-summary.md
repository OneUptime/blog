# Validation Summary: How to Use DynamoDB with Go

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Go
- AWS SDK for Go v2
- Amazon DynamoDB
- DynamoDB expressions
- DynamoDB batch writes

## Sources Consulted
- AWS SDK for Go v2 Developer Guide: https://docs.aws.amazon.com/sdk-for-go/v2/developer-guide/getting-started.html
- AWS SDK for Go v2 endpoint configuration: https://docs.aws.amazon.com/sdk-for-go/v2/developer-guide/configure-endpoints.html
- AWS SDK for Go v2 DynamoDB examples: https://docs.aws.amazon.com/sdk-for-go/v2/developer-guide/go_dynamodb_code_examples.html
- AWS SDK for Go v2 `attributevalue` package reference: https://pkg.go.dev/github.com/aws/aws-sdk-go-v2/feature/dynamodb/attributevalue
- AWS SDK for Go v2 `expression` package reference: https://pkg.go.dev/github.com/aws/aws-sdk-go-v2/feature/dynamodb/expression
- AWS SDK for Go v2 DynamoDB service reference: https://pkg.go.dev/github.com/aws/aws-sdk-go-v2/service/dynamodb
- Amazon DynamoDB BatchWriteItem API Reference: https://docs.aws.amazon.com/amazondynamodb/latest/APIReference/API_BatchWriteItem.html
- Amazon DynamoDB read consistency documentation: https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/HowItWorks.ReadConsistency.html

## Issues Found
- The `BatchCreate` example did not check or retry `UnprocessedItems` from `BatchWriteItem`. DynamoDB can return unprocessed writes in a successful response when throughput is exceeded or an internal processing failure occurs. Updated the example to retry returned unprocessed items with exponential backoff and a bounded retry count.
- The sample reads an item immediately after creating it, but `GetItem` uses eventually consistent reads by default. Updated `GetByID` to set `ConsistentRead: aws.Bool(true)` so the immediate read-after-write demo is reliable for the base table.

## Review Notes
- The post assumes a `Users` table with `user_id` as the partition key and a `status-index` GSI with `status` as its partition key. That table and index setup is not shown, but the repository code is correct under those assumptions.
- `BatchWriteItem` does not support conditional puts and overwrites existing items with the same key. The batch example is appropriate for bulk insertion when overwrites are acceptable or keys are known to be unique.
