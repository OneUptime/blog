# Validation Summary: How to Use Aggregation Pipeline Updates in MongoDB 4.2+

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB (4.2+ aggregation pipeline updates)
- MongoDB Shell (mongosh)
- MongoDB Node.js Driver

## Sources Consulted
- MongoDB documentation on updates with aggregation pipeline: https://www.mongodb.com/docs/manual/tutorial/update-documents-with-aggregation-pipeline/
- MongoDB `$dateAdd` operator documentation: https://www.mongodb.com/docs/manual/reference/operator/aggregation/dateAdd/ (confirms introduced in MongoDB 5.0)
- MongoDB `$switch` operator documentation: https://www.mongodb.com/docs/manual/reference/operator/aggregation/switch/
- MongoDB `$$NOW` system variable documentation: https://www.mongodb.com/docs/manual/reference/aggregation-variables/#mongodb-variable-variable.NOW
- MongoDB `findOneAndUpdate` documentation: https://www.mongodb.com/docs/manual/reference/method/db.collection.findOneAndUpdate/

## Issues Found
1. **Section heading mismatch ("$cond" vs "$switch")**: The heading on line 63 read "Conditionally Setting a Field with $cond" but the code example uses the `$switch` operator, not `$cond`. Fixed the heading to read "Conditionally Setting a Field with $switch".

2. **Inaccurate comment in `$dateAdd` example**: The code comment said "30 days from now" but the code actually computes 30 days from the document's `$createdAt` field, not from the current time. Additionally, `$dateAdd` requires MongoDB 5.0+, not 4.2+. Fixed the comment to read "Set expiresAt to 30 days after createdAt if not already set (requires MongoDB 5.0+)".

## Review Notes
- The post mixes mongosh syntax (e.g., `db.users.updateMany`) with Node.js driver syntax (e.g., `await db.collection('counters').findOneAndUpdate` with `returnDocument: 'after'`). Both are individually correct but readers should be aware of the context switch.
- The `$unset` syntax used (`{ $unset: 'legacyScore' }`) is correct for pipeline context where `$unset` accepts a string or array of strings, distinct from the classic update `$unset` which takes an object.
- The supported pipeline stages list is accurate per MongoDB documentation: `$addFields`/`$set`, `$project`/`$unset`, and `$replaceRoot`/`$replaceWith`.
