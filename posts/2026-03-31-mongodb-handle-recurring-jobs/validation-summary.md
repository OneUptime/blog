# Validation Summary: How to Handle Recurring Jobs with MongoDB

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB
- Mongoose ODM
- Node.js
- cron-parser npm package

## Sources Consulted
- Mongoose documentation for `findOneAndUpdate` and `findByIdAndUpdate`: https://mongoosejs.com/docs/api/model.html
- MongoDB `$push` with `$each` and `$slice` documentation: https://www.mongodb.com/docs/manual/reference/operator/update/push/
- cron-parser npm package API (`parseExpression`, `next()`, `prev()`): https://www.npmjs.com/package/cron-parser
- MongoDB `findOneAndUpdate` atomicity guarantees: https://www.mongodb.com/docs/manual/reference/method/db.collection.findOneAndUpdate/

## Issues Found

1. **`handleMissedRuns` missing return value in catch-up branch** (line ~134): The catch-up branch ran all missed executions but had no `return` statement, so the function returned `undefined` instead of the next future run time. The non-catch-up branch correctly returned `next`. Fixed by capturing the first future date from the iterator when the while loop breaks and returning it.

2. **`findStuckJobs` had unused variables and incorrect threshold logic** (line ~173-185): `prevRun` and `expectedLastRun` were computed via `interval.prev()` but never referenced — dead code with iterator side effects. The comment stated "twice their expected interval" but the implementation used a hardcoded 30-minute threshold, which is incorrect for jobs with varying frequencies. Fixed by computing the actual interval duration from two consecutive `next()` calls and comparing the overdue time against twice that interval.

## Review Notes
- The distributed locking pattern using `findOneAndUpdate` is a well-established approach and is correctly implemented here with lock expiry for dead worker recovery.
- The `maxConcurrency` field is defined in the schema but never used in any of the code examples. This is not a bug but could confuse readers expecting it to be wired up.
- The `checkForOverlap` function references `LOCK_TIMEOUT_MS` which is defined in the job runner section — readers would need to ensure the constant is accessible in scope.
