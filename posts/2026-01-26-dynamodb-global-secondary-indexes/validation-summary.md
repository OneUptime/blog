# Validation Summary: How to Use DynamoDB Global Secondary Indexes

## Status
validated

## Post Type
Tutorial / practical guide

## Technologies Covered
- Amazon DynamoDB
- DynamoDB Global Secondary Indexes
- DynamoDB Local Secondary Indexes
- AWS CLI
- AWS CloudFormation
- AWS SDK for JavaScript v3
- boto3 for Python
- Amazon CloudWatch metrics and alarms

## Sources Consulted
- AWS DynamoDB Developer Guide: Using Global Secondary Indexes in DynamoDB: https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/GSI.html
- AWS DynamoDB Developer Guide: Improving data access with secondary indexes: https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/SecondaryIndexes.html
- AWS DynamoDB Developer Guide: General guidelines for secondary indexes: https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/bp-indexes-general.html
- AWS DynamoDB Developer Guide: Sparse indexes: https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/bp-indexes-general-sparse-indexes.html
- AWS DynamoDB Developer Guide: Managing Global Secondary Indexes: https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/GSI.OnlineOps.html
- AWS DynamoDB Developer Guide: Working with Global Secondary Indexes using AWS CLI: https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/GCICli.html
- AWS CLI Command Reference: dynamodb update-table: https://docs.aws.amazon.com/cli/latest/reference/dynamodb/update-table.html
- AWS CloudFormation Template Reference: AWS::DynamoDB::Table: https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-resource-dynamodb-table.html
- AWS DynamoDB API Reference: Query: https://docs.aws.amazon.com/amazondynamodb/latest/APIReference/API_Query.html
- boto3 DynamoDB Query documentation: https://boto3.amazonaws.com/v1/documentation/api/latest/reference/services/dynamodb/client/query.html

## Issues Found
- The CLI section said `createdAt` could be optionally "filter[ed] or sort[ed]". Because it is the GSI sort key, it is more precise to say it can be used in range key conditions or sort order. Updated the wording.
- The GSI capacity explanation said GSIs have their own throughput or "share the table's on-demand capacity". AWS documents that secondary indexes use the same capacity mode as the base table, and provisioned GSIs have separate throughput settings. Updated the wording.
- The WCU sequence diagram implied a fixed 3 WCU cost. DynamoDB write capacity depends on item and index-entry size and whether each GSI is affected. Added an example qualifier for small item/index entries.
- The eventual consistency section claimed GSI propagation is usually under 100 ms. AWS describes GSI propagation under normal conditions as usually within a fraction of a second, not a fixed sub-100 ms guarantee. Updated the text and diagram.
- The `eventual_consistency_patterns.py` snippet referenced `boto3`, `Key`, and `datetime` without importing them. Added the missing imports so the example is syntactically complete.
- The same Python snippet labeled a linear retry delay as exponential backoff. Updated the comment to "simple incremental backoff".
- The Python examples used `datetime.utcnow()`, which is deprecated in current Python. Updated the examples to use timezone-aware UTC timestamps with `datetime.now(timezone.utc)`.
- The cost-optimized CloudFormation example described `PAY_PER_REQUEST` as "Scale to zero when not in use". On-demand mode removes provisioned read/write capacity management, but storage and other charges can still apply. Updated the comment.
- The CloudWatch alarm comment described a throttling metric as an alarm for unexpected GSI costs. Updated it to identify the alarm as write-throttling monitoring.

## Review Notes
The examples are generally accurate for current DynamoDB, AWS CLI, CloudFormation, AWS SDK for JavaScript v3, and boto3 behavior. Future improvements could add pagination to the Node.js query example and make the sparse-index JavaScript snippet fully standalone by showing `docClient` initialization, but those are completeness improvements rather than technical errors in the current context.
