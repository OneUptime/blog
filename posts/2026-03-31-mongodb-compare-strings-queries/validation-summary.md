# Validation Summary: How to Compare Strings in MongoDB Queries

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB (query language, aggregation framework)
- MongoDB Collation
- MongoDB Aggregation Operators ($strcasecmp, $cmp, $expr, $toLower)

## Sources Consulted
- MongoDB Manual: Comparison/Sort Order — https://www.mongodb.com/docs/manual/reference/bson-type-comparison-order/
- MongoDB Manual: $eq operator — https://www.mongodb.com/docs/manual/reference/operator/query/eq/
- MongoDB Manual: Collation — https://www.mongodb.com/docs/manual/reference/collation/
- MongoDB Manual: $strcasecmp — https://www.mongodb.com/docs/manual/reference/operator/aggregation/strcasecmp/
- MongoDB Manual: $cmp — https://www.mongodb.com/docs/manual/reference/operator/aggregation/cmp/
- MongoDB Manual: $expr — https://www.mongodb.com/docs/manual/reference/operator/query/expr/
- MongoDB Manual: $toLower — https://www.mongodb.com/docs/manual/reference/operator/aggregation/toLower/

## Issues Found
No technical issues found.

## Review Notes
- All code examples use correct MongoDB shell syntax and current (non-deprecated) APIs.
- The explanation that collation strength 2 ignores case is accurate per the ICU collation specification that MongoDB uses.
- The claim that `"Z" < "a"` in binary comparison is correct (ASCII/UTF-8: Z=0x5A, a=0x61).
- The note about `$expr` with computed expressions not using standard indexes is an important and accurate performance caveat.
- The advice to create collation-aware indexes to support case-insensitive queries is a valid best practice.
