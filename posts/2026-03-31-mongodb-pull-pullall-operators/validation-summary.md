# Validation Summary: How to Use $pull and $pullAll in MongoDB to Remove Array Elements

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB (update operators: `$pull`, `$pullAll`)
- MongoDB Shell (`mongosh`) commands
- MongoDB query operators (`$lt`, `$in`)

## Sources Consulted
- MongoDB official documentation for `$pull`: https://www.mongodb.com/docs/manual/reference/operator/update/pull/
- MongoDB official documentation for `$pullAll`: https://www.mongodb.com/docs/manual/reference/operator/update/pullAll/
- MongoDB official documentation for `updateOne`: https://www.mongodb.com/docs/manual/reference/method/db.collection.updateOne/
- MongoDB official documentation for `updateMany`: https://www.mongodb.com/docs/manual/reference/method/db.collection.updateMany/

## Issues Found
No technical issues found.

## Review Notes
- All code examples use correct syntax and produce the expected results as documented.
- The `$pull` with condition example correctly shows `{ $lt: 60 }` removing elements 55, 40, and 30 from `[55, 72, 40, 88, 30]`, leaving `[72, 88]`.
- The embedded document removal example correctly demonstrates that `$pull` matches subdocuments by field equality.
- The comparison table accurately distinguishes `$pull` (supports query conditions) from `$pullAll` (exact value match only).
- The summary correctly notes that both operators remove all matching occurrences, not just the first one.
- None.
