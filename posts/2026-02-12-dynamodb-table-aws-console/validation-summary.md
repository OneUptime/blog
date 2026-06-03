# Validation Summary: How to Create a DynamoDB Table from the AWS Console

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- AWS Management Console
- Amazon DynamoDB
- DynamoDB tables, primary keys, and sort keys
- DynamoDB capacity modes
- DynamoDB secondary indexes
- DynamoDB encryption at rest
- DynamoDB tags, queries, scans, streams, and backups

## Sources Consulted
- Amazon DynamoDB Developer Guide: Core components of Amazon DynamoDB - https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/HowItWorks.CoreComponents.html
- Amazon DynamoDB Developer Guide: Supported data types and naming rules - https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/HowItWorks.NamingRulesDataTypes.html
- Amazon DynamoDB Developer Guide: Constraints in Amazon DynamoDB - https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/Constraints.html
- Amazon DynamoDB Developer Guide: DynamoDB throughput capacity - https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/capacity-mode.html
- Amazon DynamoDB Developer Guide: DynamoDB provisioned capacity mode - https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/provisioned-capacity-mode.html
- Amazon DynamoDB Developer Guide: Improving data access with secondary indexes - https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/SecondaryIndexes.html
- Amazon DynamoDB API Reference: Query - https://docs.aws.amazon.com/amazondynamodb/latest/APIReference/API_Query.html
- Amazon DynamoDB Developer Guide: DynamoDB encryption at rest usage notes - https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/encryption.usagenotes.html

## Issues Found
- The GSI limit was stated as "up to 20 per table" without noting that AWS documents this as the default quota. Changed the sentence to "By default, you can add up to 20 per table."
- The query example used `userId` with a sort key condition even though the earlier user-profile example has no sort key. Updated the text to say sort key conditions apply only when the table or index has a sort key, and changed the example to `customerId` plus `orderTimestamp`, matching a valid composite-key query pattern.

## Review Notes
The remaining DynamoDB explanations and examples match AWS documentation at the time of review. The console UI wording can change over time, but the underlying DynamoDB concepts, capacity-unit examples, key schema constraints, index limits, and encryption options are accurate.
