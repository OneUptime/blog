# Validation Summary: How to Choose the Right Sort Key for DynamoDB

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Amazon DynamoDB
- DynamoDB primary keys and sort keys
- DynamoDB Query key condition expressions
- DynamoDB Global Secondary Indexes
- AWS SDK for JavaScript v3
- Python

## Sources Consulted
- AWS DynamoDB Developer Guide: Key condition expressions for Query - https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/Query.KeyConditionExpressions.html
- AWS DynamoDB Developer Guide: Supported data types and naming rules - https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/HowItWorks.NamingRulesDataTypes.html
- AWS DynamoDB Developer Guide: Constraints in DynamoDB - https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/Constraints.html
- AWS DynamoDB Developer Guide: Best practices for using sort keys - https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/bp-sort-keys.html
- AWS SDK for JavaScript v3: DynamoDB examples - https://docs.aws.amazon.com/sdk-for-javascript/v3/developer-guide/javascript_dynamodb_code_examples.html
- AWS SDK for JavaScript v3: @aws-sdk/lib-dynamodb API Reference - https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-lib-dynamodb/
- AWS Developer Tools Blog: AWS SDK for JavaScript v2 end-of-support announcement - https://aws.amazon.com/blogs/developer/announcing-end-of-support-for-aws-sdk-for-javascript-v2/

## Issues Found
- The single-table design JavaScript example used AWS SDK for JavaScript v2 `docClient.get(...).promise()` and `docClient.query(...).promise()` calls. AWS SDK for JavaScript v2 reached end of support on September 8, 2025, so the example was updated to AWS SDK for JavaScript v3 `GetCommand` and `QueryCommand` calls with `docClient.send(...)`.
- The composite sort key product example described the sort key as `price#productId`, listed item attributes as `sort`, and queried `sk`. The example was corrected to consistently name the sort key attribute `sk`.
- The random UUID anti-pattern claimed range and prefix queries were impossible. DynamoDB supports sort key comparison operators and `begins_with` for compatible key types, so the wording was corrected to explain that such queries are syntactically possible but do not map to useful access patterns for random UUIDs.
- The sort key size example labeled `ORDER#2026-02-12#ord-12345` as 34 bytes. Because the ASCII string is 26 bytes, the count was corrected.

## Review Notes
The remaining DynamoDB claims about sort key operators, UTF-8 string ordering, numeric ordering, binary unsigned byte comparison, ISO 8601 timestamp strings, 1024-byte sort key limits, reverse query order with `ScanIndexForward: false`, and GSI sort key behavior match AWS documentation.
