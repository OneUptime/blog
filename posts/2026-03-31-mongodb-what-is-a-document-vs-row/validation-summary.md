# Validation Summary: What Is a MongoDB Document and How It Differs from a Row

## Status
validated

## Post Type
Conceptual Guide

## Technologies Covered
- MongoDB (document model, BSON format, shell commands)
- SQL / Relational databases (PostgreSQL, MySQL referenced)

## Sources Consulted
- MongoDB Manual — Documents: https://www.mongodb.com/docs/manual/core/document/
- MongoDB Manual — BSON Types: https://www.mongodb.com/docs/manual/reference/bson-types/
- MongoDB Manual — insertMany: https://www.mongodb.com/docs/manual/reference/method/db.collection.insertMany/
- MongoDB Manual — insertOne: https://www.mongodb.com/docs/manual/reference/method/db.collection.insertOne/
- MongoDB Manual — find: https://www.mongodb.com/docs/manual/reference/method/db.collection.find/
- MongoDB Manual — updateOne: https://www.mongodb.com/docs/manual/reference/method/db.collection.updateOne/
- MongoDB Manual — $set operator: https://www.mongodb.com/docs/manual/reference/operator/update/set/
- MongoDB Manual — $addToSet operator: https://www.mongodb.com/docs/manual/reference/operator/update/addToSet/
- MongoDB Limits and Thresholds (16MB document size): https://www.mongodb.com/docs/manual/reference/limits/

## Issues Found
No technical issues found.

## Review Notes
- The first example shows `_id` as a plain string (`"507f1f77bcf86cd799439011"`). In practice, auto-generated IDs are ObjectId types (e.g., `ObjectId("507f1f77bcf86cd799439011")` in the shell). This is not technically wrong since MongoDB accepts any type for `_id`, but readers may benefit from knowing the distinction in a future revision.
- MongoDB has supported multi-document ACID transactions since version 4.0 (2018). The "When Relational Rows Are Better" section mentions "strong consistency and transaction guarantees" as a relational advantage, which is still a reasonable general claim but could be nuanced in a future update to acknowledge MongoDB's transaction support.
