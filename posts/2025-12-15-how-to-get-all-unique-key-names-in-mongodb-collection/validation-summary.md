# Validation Summary: How to Get All Unique Key Names in MongoDB Collection

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- MongoDB
- MongoDB aggregation framework
- mongosh JavaScript examples
- JSON Schema
- TypeScript interface generation

## Sources Consulted
- MongoDB `$objectToArray` aggregation operator: https://www.mongodb.com/docs/manual/reference/operator/aggregation/objecttoarray/
- MongoDB `$sample` aggregation stage: https://www.mongodb.com/docs/manual/reference/operator/aggregation/sample/
- MongoDB `$type` and BSON types: https://www.mongodb.com/docs/manual/reference/bson-types/
- MongoDB `$concat` aggregation operator: https://www.mongodb.com/docs/manual/reference/operator/aggregation/concat/
- MongoDB aggregation variables, including `$$REMOVE`: https://www.mongodb.com/docs/manual/reference/aggregation-variables/
- MongoDB `$rand` aggregation expression: https://www.mongodb.com/docs/v7.0/reference/operator/aggregation/rand/
- MongoDB `$setDifference` aggregation expression: https://www.mongodb.com/docs/v7.0/reference/operator/aggregation/setdifference/
- MongoDB `db.getCollection()` mongosh method: https://www.mongodb.com/docs/manual/reference/method/db.getcollection/
- MongoDB `cursor.forEach()` mongosh method: https://www.mongodb.com/docs/manual/reference/method/cursor.foreach/
- MongoDB map-reduce deprecation notice: https://www.mongodb.com/docs/v7.0/tutorial/troubleshoot-reduce-function/
- MongoDB mongosh compatibility notes for numeric values: https://www.mongodb.com/docs/mongodb-shell/reference/compatibility/

## Issues Found
- The description mentioned MapReduce even though the post does not provide a MapReduce method and correctly notes that map-reduce is deprecated. Removed the MapReduce mention from the description.
- The one-level nested-key aggregation could add `null` to `nestedKeys` for top-level fields that are not objects, because `$concat` returns `null` when an argument is missing. Added a `$project` stage with `$setDifference` to remove `null`.
- Several reusable mongosh examples used Node.js driver-style `db.collection(collectionName)`. Replaced them with `db.getCollection(collectionName)`, which is the documented mongosh method for dynamic collection names.
- The schema report example used `$$REMOVE` inside a `$group` accumulator expression. MongoDB documents `$$REMOVE` for excluding fields in `$addFields` and `$project`, so the example was changed to randomize documents before grouping and push real sample values.
- The sample output listed `price` as both `int` and `double`, but the sample data shown in current mongosh stores these whole-number literals as `int`. Updated the output to `["int"]`.
- The generated TypeScript and JSON Schema type maps omitted common `$type` results such as `long`, `decimal`, and `null`. Added mappings so generated output remains valid for those BSON types.
- The JSON Schema example sampled documents while comparing field counts against the full collection count to determine `required` fields. Removed sampling from that specific aggregation so the required-field calculation is accurate.

## Review Notes
The examples are technically valid as mongosh snippets. For very large collections, the full-scan JSON Schema generation can be expensive; the post already discusses using sampling when approximate schema discovery is acceptable.
