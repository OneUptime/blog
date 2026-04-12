# Validation Summary: How to Compare MongoDB vs DynamoDB for Document Storage

## Status
validated

## Post Type
Comparison Guide

## Technologies Covered
- MongoDB (document database, Atlas managed service)
- Amazon DynamoDB (AWS managed NoSQL)
- MongoDB Aggregation Pipeline
- DynamoDB Global Secondary Indexes (GSIs)
- DynamoDB Transactions (TransactWriteItems / TransactGetItems)
- MongoDB Atlas Search
- AWS Lambda, AppSync, API Gateway, IAM

## Sources Consulted
- AWS DynamoDB Developer Guide — Service quotas: https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/ServiceQuotas.html (GSI default limit is 20 per table)
- AWS DynamoDB Developer Guide — Transactions: https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/transaction-apis.html (100 actions per transaction since November 2022)
- MongoDB Manual — insertOne: https://www.mongodb.com/docs/manual/reference/method/db.collection.insertOne/
- MongoDB Manual — Aggregation Pipeline: https://www.mongodb.com/docs/manual/core/aggregation-pipeline/
- MongoDB Manual — $lookup: https://www.mongodb.com/docs/manual/reference/operator/aggregation/lookup/
- AWS DynamoDB Pricing: https://aws.amazon.com/dynamodb/pricing/

## Issues Found

### 1. DynamoDB GSI limit stated as 5 (should be 20)
- **What was wrong:** The mermaid diagram label said "GSI - 5 max" and the Data Modeling section stated "GSIs extend access to 5 additional access patterns per table." The default quota for GSIs per DynamoDB table has been 20 since 2018.
- **What was changed:** Updated the diagram label to "GSI - 20 max" and the text to "up to 20 additional access patterns per table."
- **Why:** The 5-GSI limit was a very early DynamoDB constraint. AWS raised it to 20 GSIs per table years ago. Stating 5 significantly understates DynamoDB's flexibility.

### 2. DynamoDB transaction limit stated as 25 items (should be 100 actions)
- **What was wrong:** The Query Capabilities table stated "TransactWriteItems / TransactGetItems (up to 25 items)." AWS increased the transaction limit from 25 to 100 actions in November 2022.
- **What was changed:** Updated to "up to 100 actions."
- **Why:** The 25-item limit is outdated. The current limit is 100 unique items per transaction request.

## Review Notes
- MongoDB Atlas Serverless Instances were deprecated in late 2024 in favor of Flex clusters. The post mentions "MongoDB Serverless" in the pricing section. The concept of per-operation pricing still exists with Flex clusters, so the comparison remains valid, but the product name has changed.
- DynamoDB storage pricing ($0.25/GB/month) is accurate for US East (N. Virginia) standard table class but varies by region and table class. This is acceptable for a general comparison.
- All MongoDB code examples (insertOne, aggregate pipeline) use correct syntax and current APIs.
- The DynamoDB single-table design JSON examples correctly illustrate the PK/SK pattern.
- The claim that DynamoDB has "no cold start" is reasonable for database operations, though DynamoDB on-demand mode can experience brief throttling on sudden large traffic spikes due to adaptive capacity behavior. This is a nuance that doesn't warrant a correction in a comparison article.
