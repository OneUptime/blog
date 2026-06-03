# Validation Summary: How to Model Hierarchical Data in DynamoDB

## Status
validated

## Post Type
Tutorial / technical guide

## Technologies Covered
- Amazon DynamoDB
- DynamoDB data modeling
- DynamoDB Query key condition expressions
- DynamoDB global secondary indexes
- AWS SDK for JavaScript v3
- JavaScript

## Sources Consulted
- AWS DynamoDB Developer Guide: Key condition expressions for Query operations: https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/Query.KeyConditionExpressions.html
- AWS DynamoDB Developer Guide: DynamoDB constraints: https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/Constraints.html
- AWS DynamoDB Developer Guide: Programming Amazon DynamoDB with JavaScript: https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/programming-with-javascript.html
- AWS SDK for JavaScript v2 README / end-of-support notice: https://docs.aws.amazon.com/AWSJavaScriptSDK/latest/
- OneUptime blog link referenced by the post: https://oneuptime.com/blog/post/2026-02-06-aws-cloudwatch-logs-exporter-opentelemetry-collector/view

## Issues Found
- The JavaScript examples used the AWS SDK for JavaScript v2 `AWS.DynamoDB.DocumentClient` and `.promise()` API. AWS SDK for JavaScript v2 reached end-of-support on September 8, 2025, so the examples were updated to use the AWS SDK for JavaScript v3 `DynamoDBDocumentClient`, `GetCommand`, and `QueryCommand`.
- The materialized-path section showed a `begins_with` query against a path index before noting that this does not work on a partition key. DynamoDB `Query` requires equality on the partition key and only supports `begins_with` as a sort-key condition, so the invalid example was replaced with the fixed `pk = :pk AND begins_with(sk, :prefix)` design.
- The materialized-path sample item shape did not match the fixed `pk`/`sk` query design. The sample items were updated to store `pk: "CATEGORY"` and the path in `sk`.
- The composite-sort-key section included an unused invalid `OR` key condition expression. DynamoDB key condition expressions do not support `OR`, so the snippet now directly queries the node item collection by partition key and splits relationship item types in memory.
- The nested-set snippet still used the v2 `docClient.get(...).promise()` API and had a comment implying both `lft` and `rgt` were queried. It was updated to `GetCommand`, and the comment now matches the actual GSI query on `lft BETWEEN`.

## Review Notes
- The fixed-partition-key materialized-path example is technically valid for demonstrating prefix queries, but a production design should consider partition heat and item collection size based on expected tree size and traffic.
