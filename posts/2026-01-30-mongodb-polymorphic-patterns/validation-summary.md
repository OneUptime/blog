# Validation Summary: How to Implement MongoDB Polymorphic Patterns

## Status
validated

## Post Type
Tutorial / technical guide

## Technologies Covered
- MongoDB schema design patterns
- MongoDB JSON Schema validation
- MongoDB indexes, including compound, partial, and wildcard indexes
- MongoDB aggregation pipeline
- MongoDB Node.js driver
- TypeScript discriminated unions and type guards

## Sources Consulted
- MongoDB Manual: Polymorphic Data - https://www.mongodb.com/docs/manual/data-modeling/design-patterns/polymorphic-data/
- MongoDB Manual: Store Polymorphic Data - https://www.mongodb.com/docs/manual/data-modeling/design-patterns/polymorphic-data/polymorphic-schema-pattern/
- MongoDB Manual: Schema Validation - https://www.mongodb.com/docs/manual/core/schema-validation/
- MongoDB Manual: `$jsonSchema` supported keywords and omissions - https://www.mongodb.com/docs/manual/reference/operator/query/jsonschema/
- MongoDB Manual: Partial Indexes - https://www.mongodb.com/docs/manual/core/index-partial/
- MongoDB Manual: Wildcard Indexes - https://www.mongodb.com/docs/manual/core/indexes/index-types/index-wildcard/
- MongoDB Manual: Compound Wildcard Indexes - https://www.mongodb.com/docs/manual/core/indexes/index-types/index-wildcard/index-wildcard-compound/
- MongoDB Manual: Compound Indexes - https://www.mongodb.com/docs/manual/core/indexes/index-types/index-compound/
- MongoDB Manual: `$facet` aggregation stage - https://www.mongodb.com/docs/manual/reference/operator/aggregation/facet/
- MongoDB Node.js Driver Quick Reference - https://www.mongodb.com/docs/drivers/node/current/reference/quick-reference/

## Issues Found
- The conditional schema validation example used the JSON Schema `const` keyword for discriminator checks. MongoDB documents support draft 4 JSON Schema keywords and list `enum`, `oneOf`, and `anyOf`, but not `const`, so the example was corrected to use single-value `enum` checks.
- Several MongoDB shell snippets used `ObjectId("...")`, which is not a valid ObjectId literal if copied into mongosh. These were replaced with valid 24-character hexadecimal ObjectId values.
- The TypeScript example referenced `ObjectId` without importing it and used `Notification` as a type alias name, which can conflict with the DOM `Notification` type in common TypeScript projects. The snippet now imports `ObjectId` from `mongodb` as a type and uses `NotificationDocument` for the union type.

## Review Notes
The remaining MongoDB examples align with current MongoDB documentation. Partial indexes require queries to include predicates that imply the partial filter before the index is eligible, so the discriminator-inclusive query guidance is appropriate for the shown indexes. Wildcard indexes are valid for dynamic fields but should still be planned around actual query patterns because they are not a substitute for targeted indexes on known high-volume access paths.
