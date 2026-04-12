# Validation Summary: How to Use $$REMOVE to Conditionally Exclude Fields in MongoDB

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB (aggregation framework)
- MongoDB system variable `$$REMOVE` (introduced in MongoDB 3.6)
- Aggregation stages: `$addFields`, `$project`, `$replaceWith`
- Aggregation operators: `$cond`, `$objectToArray`, `$filter`, `$arrayToObject`

## Sources Consulted
- MongoDB official documentation: Aggregation Variables — https://www.mongodb.com/docs/manual/reference/aggregation-variables/
- MongoDB official documentation: $project stage — https://www.mongodb.com/docs/manual/reference/operator/aggregation/project/
- MongoDB official documentation: $addFields stage — https://www.mongodb.com/docs/manual/reference/operator/aggregation/addfields/
- MongoDB official documentation: $set stage (alias for $addFields) — https://www.mongodb.com/docs/manual/reference/operator/aggregation/set/
- MongoDB official documentation: $switch operator — https://www.mongodb.com/docs/manual/reference/operator/aggregation/switch/
- MongoDB JIRA SERVER-27614 (feature request for $$REMOVE, targeted 3.6) — https://jira.mongodb.org/browse/SERVER-27614

## Issues Found
1. **"Problem $$REMOVE Solves" example was inaccurate.** The "before" code example had three issues:
   - `$addFields: { ssn: "$ssn" }` was a no-op (reassigns ssn to itself, accomplishing nothing).
   - The `$project` stage with only `ssn` specified would exclude all other fields from output (not just conditionally handle ssn), making it not equivalent to the $$REMOVE version.
   - The claim that "conditional field inclusion requires two separate pipeline stages" was not accurately demonstrated by the code shown.
   - **Fix:** Replaced with a single `$addFields` stage using `$cond` that sets ssn to `null` for non-admins, which is the realistic pre-$$REMOVE approach. Updated surrounding text to accurately describe the limitation (setting to a sentinel value rather than truly omitting the field).

## Review Notes
- All core technical claims about $$REMOVE behavior are correct and verified against official MongoDB documentation.
- $$REMOVE was introduced in MongoDB 3.6; the post does not mention a version requirement, which could be helpful for readers on older versions.
- The post correctly notes that $$REMOVE does not work for array elements (use $filter instead).
- The $objectToArray/$filter/$arrayToObject pattern for stripping null fields is correct and well-documented.
- The post mentions $switch compatibility in the summary, which is correct — $$REMOVE can be returned from any expression context.
- The post does not mention `$set` (alias for `$addFields`), where $$REMOVE also works identically.
