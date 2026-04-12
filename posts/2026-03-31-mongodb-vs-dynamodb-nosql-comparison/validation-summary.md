# Validation Summary: MongoDB vs DynamoDB: Comparing NoSQL Databases

## Status
validated

## Post Type
Comparison Guide

## Technologies Covered
- MongoDB (document-oriented NoSQL database)
- Amazon DynamoDB (key-value and document NoSQL database)
- MongoDB Shell (JavaScript query examples)
- Python boto3 SDK (DynamoDB query example)
- MongoDB Atlas (managed service)
- AWS Lambda (mentioned in use-case recommendations)

## Sources Consulted
- AWS DynamoDB Developer Guide — https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/
- AWS DynamoDB API Reference (KeySchema, KeyType HASH/RANGE) — https://docs.aws.amazon.com/amazondynamodb/latest/APIReference/API_CreateTable.html
- Boto3 DynamoDB Table.query documentation — https://boto3.amazonaws.com/v1/documentation/api/latest/reference/services/dynamodb/table/query.html
- MongoDB Manual (Query Documents) — https://www.mongodb.com/docs/manual/tutorial/query-documents/
- MongoDB Manual (sort cursor method) — https://www.mongodb.com/docs/manual/reference/method/cursor.sort/
- AWS DynamoDB product page (key-value and document classification) — https://aws.amazon.com/dynamodb/

## Issues Found
1. **Inaccurate classification of DynamoDB as "document-oriented"**: The overview stated "MongoDB and DynamoDB are both document-oriented NoSQL databases." AWS explicitly categorizes DynamoDB as a "key-value and document database" — its primary data model is key-value, with document support as an additional capability. Fixed to: "MongoDB is a document-oriented NoSQL database, while DynamoDB is a key-value and document NoSQL database."

## Review Notes
- The DynamoDB Python query example uses `orderId BETWEEN :start AND :end` with date-like string values ("2024-01-01", "2024-12-31"). While technically valid (DynamoDB compares strings lexicographically), it is semantically confusing since `orderId` suggests an order identifier, not a date. This is a pedagogical clarity issue rather than a technical error.
- The claim that "secondary indexes must be planned in advance" is accurate for Local Secondary Indexes (LSIs), which must be defined at table creation. Global Secondary Indexes (GSIs) can be added after table creation, though they still require upfront design consideration for efficient access patterns. The statement is an acceptable simplification.
- All code examples (DynamoDB KeySchema JSON, boto3 Python query, MongoDB shell queries) are syntactically correct and use current, non-deprecated APIs.
