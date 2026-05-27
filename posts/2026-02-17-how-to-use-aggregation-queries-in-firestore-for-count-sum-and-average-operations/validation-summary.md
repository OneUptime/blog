# Validation Summary: How to Use Aggregation Queries in Firestore for Count Sum and Average Operations

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Google Cloud Firestore
- Firebase Web SDK
- Firebase Admin SDK for Node.js
- Google Cloud Firestore Python client
- JavaScript
- Python

## Sources Consulted
- Firebase documentation: Summarize data with aggregation queries, https://firebase.google.com/docs/firestore/query-data/aggregation-queries
- Google Cloud documentation: Firestore in Native mode aggregation queries, https://docs.cloud.google.com/firestore/native/docs/query-data/aggregation-queries
- Google Cloud documentation: Firestore pricing, https://cloud.google.com/firestore/pricing

## Issues Found
- The introductory count example said aggregation count was billed as a single aggregation read regardless of collection size. Firestore bills aggregation queries based on index entries read, with a one document-read minimum for aggregation queries that read 0 to 1000 index entries. I changed the comment to describe index-entry-based billing.
- The Python sum example imported `SumAggregation` and called `query.sum(...)` directly. Current official Python examples use `aggregation.AggregationQuery(query)` and add aggregations with methods such as `.sum(...)`, and the current filter style uses `FieldFilter`. I updated the snippet accordingly.
- The combined aggregation example said the query was billed as one operation, not three. The single request is accurate, but the billing statement was misleading because charges are based on index entries read. I changed the comment to say the query returns all three aggregate values in one request.
- The post did not mention the Firestore caveat that combined aggregations include only documents that contain all fields used by the aggregations. I added a short note after the combined aggregation example because this can affect count, sum, and average results.

## Review Notes
The remaining examples and explanations match the current Firestore aggregation documentation: `count()`, `sum()`, and `average()` are supported; aggregation queries transmit only aggregate results; they rely on existing indexes; they scale with index entries scanned; they have a 60-second deadline; and non-numeric values are ignored by `sum()` and `average()`.
