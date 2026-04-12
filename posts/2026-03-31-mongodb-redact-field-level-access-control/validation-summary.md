# Validation Summary: How to Use $redact for Field-Level Access Control in MongoDB Aggregation

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB Aggregation Framework (`$redact` stage)
- MongoDB system variables (`$$KEEP`, `$$PRUNE`, `$$DESCEND`, `$$CURRENT`)
- MongoDB aggregation operators (`$cond`, `$eq`, `$or`, `$gt`, `$type`, `$size`, `$setIntersection`, `$in`)

## Sources Consulted
- MongoDB official documentation: $redact aggregation stage (https://www.mongodb.com/docs/manual/reference/operator/aggregation/redact/)
- MongoDB official documentation: $not aggregation operator (https://www.mongodb.com/docs/manual/reference/operator/aggregation/not/)
- MongoDB official documentation: $type aggregation operator (https://www.mongodb.com/docs/manual/reference/operator/aggregation/type/)
- MongoDB official documentation: $in aggregation operator (https://www.mongodb.com/docs/manual/reference/operator/aggregation/in/)
- MongoDB official documentation: $setIntersection aggregation operator (https://www.mongodb.com/docs/manual/reference/operator/aggregation/setIntersection/)
- MongoDB official documentation: Aggregation expression system variables (https://www.mongodb.com/docs/manual/reference/aggregation-variables/)

## Issues Found

### Issue 1: Incorrect `$not` syntax and fragile `$type` comparison in Example 1

**What was wrong:** The expression `{ $not: { $gt: [{ $type: "$clearance" }, "missing"] } }` had two problems:

1. **Wrong `$not` syntax for aggregation context.** Inside `$redact`, all operators are aggregation expression operators. The aggregation `$not` requires array syntax `{ $not: [ <expression> ] }`, but the code used the query operator syntax `{ $not: { <operator> } }`. This would cause a runtime error.

2. **Fragile string comparison against "missing".** The `$gt` check relied on the BSON type name string sorting lexicographically after `"missing"`. This only works for some types (e.g., `"string"`, `"object"`) but fails for others (`"int"`, `"double"`, `"bool"`, `"array"`, `"date"`, `"long"`), which sort before `"missing"`. While the blog's use case assumes `clearance` is always a string, the logic is unnecessarily fragile.

**What was changed:** Replaced `{ $not: { $gt: [{ $type: "$clearance" }, "missing"] } }` with `{ $eq: [{ $type: "$clearance" }, "missing"] }`. This directly checks whether the field is missing using a simple equality test — correct in all cases, no `$not` needed, and clearer to read.

## Review Notes
- Example 2 (role-based redaction) will error at document levels that lack a `roles` array field, since `$setIntersection` requires array inputs. The Limitations section correctly warns that missing fields must be handled explicitly, so this is not an error in the post, but readers should be aware that production use would need an `$ifNull` or `$type` guard.
- Example 3 uses `$$DESCEND` in the else branch, which means documents/sub-documents without an `env` field will be descended into (and ultimately kept at leaf levels). This is functionally correct for the stated purpose but could surprise readers expecting non-matching levels to be pruned.
- All other code examples, syntax, operator usage, and technical explanations are accurate.
