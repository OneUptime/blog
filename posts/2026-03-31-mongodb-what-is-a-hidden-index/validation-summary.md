# Validation Summary: What Is a Hidden Index in MongoDB

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- MongoDB (4.4+)
- MongoDB Hidden Indexes
- MongoDB Query Planner
- MongoDB Shell (mongosh) commands

## Sources Consulted
- MongoDB official documentation on hidden indexes: https://www.mongodb.com/docs/manual/core/index-hidden/
- MongoDB official documentation on cursor.hint(): https://www.mongodb.com/docs/manual/reference/method/cursor.hint/
- MongoDB official documentation on collMod command: https://www.mongodb.com/docs/manual/reference/command/collMod/

## Issues Found
1. **Incorrect claim about using `hint()` with hidden indexes**: The post stated that you can force the query planner to use a hidden index via `$hint` / `.hint()` for testing purposes. This is incorrect — MongoDB returns an error if you attempt to hint a hidden index, treating it the same as hinting a nonexistent index. The official docs explicitly state: "You cannot cursor.hint() a hidden index." Fixed the section to explain the correct behavior and suggest temporarily unhiding the index as the proper way to test.

## Review Notes
- The post does not mention that the `_id` index cannot be hidden. This is a documented restriction but not a technical error in the post — it simply isn't covered.
- All other code examples (`createIndex` with `hidden: true`, `collMod` for hiding/unhiding, `getIndexes()`, `dropIndex()`) are syntactically correct and use current, non-deprecated APIs.
- The explanation of write overhead for hidden indexes is accurate.
- The safe index removal workflow is sound and reflects best practices.
