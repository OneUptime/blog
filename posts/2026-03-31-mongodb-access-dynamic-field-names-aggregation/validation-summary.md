# Validation Summary: How to Access Dynamic Field Names in MongoDB Aggregation

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB aggregation framework
- `$getField` operator (MongoDB 5.0+, dynamic expressions in 7.2+)
- `$objectToArray` operator (MongoDB 3.4.4+)
- `$let` aggregation variable binding
- `$concat`, `$filter`, `$arrayElemAt` aggregation operators

## Sources Consulted
- [MongoDB $getField documentation (latest)](https://www.mongodb.com/docs/manual/reference/operator/aggregation/getfield/)
- [MongoDB $getField documentation (v8.0)](https://www.mongodb.com/docs/v8.0/reference/operator/aggregation/getfield/)
- [MongoDB $getField documentation (v7.0)](https://www.mongodb.com/docs/v7.0/reference/operator/aggregation/getfield/)
- [MongoDB $getField documentation (v6.0)](https://www.mongodb.com/docs/v6.0/reference/operator/aggregation/getfield/)
- [SERVER-67030: $getField doesn't work with a dynamic field](https://jira.mongodb.org/browse/SERVER-67030) — Closed as "Works as Designed"; confirms `field` must be a string constant in MongoDB 5.0–7.1
- [SERVER-74371: Support arbitrary expressions for 'field' parameter for $getField](https://jira.mongodb.org/browse/SERVER-74371) — Fixed in MongoDB 7.2.0-rc0 (October 2023)

## Issues Found
1. **Incorrect version requirement for dynamic `$getField` expressions.** The post stated that `$getField` (MongoDB 5.0+) supports dynamic field access using field path expressions like `$targetField` and computed expressions like `{ $concat: ["title_", "$userLanguage"] }`. In reality, MongoDB 5.0–7.1 requires the `field` parameter to be a string constant. Attempting to use a field path or expression that references document fields produces the error: `$getField requires 'field' to evaluate to a constant, but got a non-constant argument`. Dynamic expression support was added in MongoDB 7.2 (SERVER-74371). **Fix:** Updated the introduction, `$getField` section header, `$objectToArray` section, and summary to accurately state the version requirements — `$getField` was introduced in 5.0, but dynamic expressions for `field` require 7.2+.

## Review Notes
- The `$objectToArray` approach is more broadly useful than the post originally implied, since it is the only viable approach for truly dynamic field access in MongoDB versions prior to 7.2.
- All code examples are syntactically correct and use valid aggregation pipeline syntax. The logic of each example (nested field access, `$let` variable binding, `$objectToArray` with `$filter`) is sound.
- The `$objectToArray` example correctly handles the two-stage projection pattern needed to extract the `.v` value from the filtered `{k, v}` pair.
