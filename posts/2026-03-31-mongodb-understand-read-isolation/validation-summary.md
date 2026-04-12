# Validation Summary: How to Understand Read Isolation in MongoDB

## Status
validated

## Post Type
Guide

## Technologies Covered
- MongoDB (read concern / read isolation)
- MongoDB Node.js Driver
- MongoDB Replica Sets
- MongoDB Multi-Document Transactions

## Sources Consulted
- MongoDB Official Documentation: Read Concern (https://www.mongodb.com/docs/manual/reference/read-concern/)
- MongoDB Official Documentation: Read Concern "snapshot" (https://www.mongodb.com/docs/manual/reference/read-concern-snapshot/)
- MongoDB Official Documentation: Read Concern "linearizable" (https://www.mongodb.com/docs/manual/reference/read-concern-linearizable/)
- MongoDB Official Documentation: Transactions (https://www.mongodb.com/docs/manual/core/transactions/)
- MongoDB Node.js Driver API: FindOptions (https://mongodb.github.io/node-mongodb-native/)

## Issues Found
1. **`snapshot` read concern described as "transactions only"** - The post stated in three places that `snapshot` read concern is only available within transactions. This is incorrect for MongoDB 5.0+ (released July 2021), which supports `snapshot` read concern outside of transactions for `find`, `aggregate`, and `distinct` operations. Updated the read concern levels table, the snapshot section description, and the choosing guide to say "primarily used in transactions" instead of "transactions only", and added a note about MongoDB 5.0+ availability outside transactions.

## Review Notes
- The `available` read concern description is correct but does not mention that it may return orphaned documents during chunk migration in sharded clusters. This is an advanced detail that may be outside the scope of this introductory guide.
- The `linearizable` read concern has additional constraints not mentioned (e.g., only works on the primary, cannot be used with `$out` or `$merge` stages, not available in causally consistent sessions or transactions). These are advanced details appropriate for a deeper-dive post.
- The post does not discuss the `available` read concern in its own section, unlike the other levels. This is a stylistic choice rather than an error.
- All Node.js driver code examples use correct API patterns. The `readConcern` option is valid in `findOne` options via the `CommandOperationOptions` inheritance chain.
