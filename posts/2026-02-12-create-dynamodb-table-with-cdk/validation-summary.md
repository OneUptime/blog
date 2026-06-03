# Validation Summary: How to Create a DynamoDB Table with CDK

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- AWS CDK v2
- Amazon DynamoDB
- TypeScript
- DynamoDB global secondary indexes
- DynamoDB local secondary indexes
- DynamoDB provisioned and on-demand capacity
- DynamoDB auto scaling
- DynamoDB Streams
- DynamoDB TTL
- AWS IAM grants

## Sources Consulted
- AWS CDK v2 API Reference: `aws-cdk-lib.aws_dynamodb.Table` - https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_dynamodb.Table.html
- AWS CDK v2 DynamoDB module README - https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_dynamodb-readme.html
- AWS CDK v2 CLI `cdk init` reference - https://docs.aws.amazon.com/cdk/v2/guide/ref-cli-cmd-init.html
- Amazon DynamoDB Developer Guide: Using time to live (TTL) - https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/TTL.html
- Amazon DynamoDB Developer Guide: Using Global Secondary Indexes - https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/GSI.html
- Local TypeScript compile check with current `aws-cdk-lib`, `constructs`, and `typescript`

## Issues Found
- The basic table example used the deprecated CDK `pointInTimeRecovery: true` property. Updated it to `pointInTimeRecoverySpecification: { pointInTimeRecoveryEnabled: true }`, which is the current CDK v2 API.
- The TTL example comment said items with an expired `ttl` attribute would be deleted, but the configured TTL attribute was `expiresAt`. Updated the comment to match the actual attribute.
- The TTL explanation said expired items can take up to 48 hours to delete. Current DynamoDB documentation says expired items are typically deleted within a few days, so the wording was updated.
- The IAM grant examples called grant methods on handler variables and passed the table as an argument. CDK grant methods are called on the table with the grantee as the argument, so the examples were corrected to `table.grantReadData(listItemsHandler)`, `table.grantWriteData(createItemHandler)`, and `table.grantReadWriteData(adminHandler)`.

## Review Notes
The corrected TypeScript snippets compile against current CDK dependencies. The LSI example is technically valid as CDK code for a newly created table, but readers should understand that adding an LSI in a later stack update to an existing DynamoDB table is not supported by DynamoDB.
