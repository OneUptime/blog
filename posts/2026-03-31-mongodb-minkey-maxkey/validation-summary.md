# Validation Summary: How to Work with MinKey and MaxKey in MongoDB

## Status
validated

## Post Type
Tutorial / Reference Guide

## Technologies Covered
- MongoDB (BSON types, sharding, queries)
- mongosh (MongoDB Shell)
- Node.js MongoDB driver / `bson` package

## Sources Consulted
- MongoDB BSON Type Comparison Order documentation: https://www.mongodb.com/docs/manual/reference/bson-type-comparison-order/
- MongoDB `sh.addTagRange()` documentation: https://www.mongodb.com/docs/manual/reference/method/sh.addTagRange/
- MongoDB `sh.updateZoneKeyRange()` documentation: https://www.mongodb.com/docs/manual/reference/method/sh.updateZoneKeyRange/
- MongoDB `$type` operator documentation: https://www.mongodb.com/docs/manual/reference/operator/query/type/
- MongoDB MinKey/MaxKey BSON type reference: https://www.mongodb.com/docs/manual/reference/mongodb-extended-json/#minkey

## Issues Found
1. **BSON Comparison Order — Symbol and String listed as separate tiers**: The post listed `Symbol < String` as two distinct comparison tiers. According to the official MongoDB BSON comparison order documentation, Symbol and String share the same comparison tier and should be grouped together. Fixed to `Symbol/String`.

2. **Deprecated `sh.addTagRange()` method**: The post used `sh.addTagRange()` for zone sharding examples. This is the older tag-aware sharding API that has been superseded by zone sharding since MongoDB 3.4. While `sh.addTagRange()` still functions as an alias, the modern and recommended method is `sh.updateZoneKeyRange()`. Updated both calls to use the current API. Also adjusted the introductory text from "tag ranges" to just "zone sharding" to match the modern terminology.

## Review Notes
- The `sh.addTagRange()` method still functions as an alias for `sh.updateZoneKeyRange()`, so the original code would technically work, but using the modern API is best practice for a current tutorial.
- The Node.js section correctly uses `require("bson")` and the `new MinKey()`/`new MaxKey()` constructor syntax.
- The `$type: "minKey"` and `$type: "maxKey"` query syntax is correct per the MongoDB `$type` operator docs.
- The mongosh examples correctly use `MinKey()` and `MaxKey()` without `new`, which is valid in mongosh.
