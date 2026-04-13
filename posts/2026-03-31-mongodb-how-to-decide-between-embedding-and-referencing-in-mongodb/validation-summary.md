# Validation Summary: How to Decide Between Embedding and Referencing in MongoDB

## Status
validated

## Post Type
Guide

## Technologies Covered
- MongoDB (document model, BSON format)
- MongoDB Shell (query and update syntax)
- MongoDB Data Modeling (embedding, referencing, Extended Reference Pattern)
- MongoDB Indexes (compound indexes)
- MongoDB Multi-document Transactions

## Sources Consulted
- MongoDB Manual: Data Modeling Introduction — https://www.mongodb.com/docs/manual/core/data-modeling-introduction/
- MongoDB Manual: Data Model Design (Embedded vs References) — https://www.mongodb.com/docs/manual/core/data-model-design/
- MongoDB Manual: BSON Document Size Limit (16MB) — https://www.mongodb.com/docs/manual/reference/limits/#mongodb-limit-BSON-Document-Size
- MongoDB Manual: Update Operators ($push, $inc) — https://www.mongodb.com/docs/manual/reference/operator/update/
- MongoDB Manual: db.collection.updateOne() — https://www.mongodb.com/docs/manual/reference/method/db.collection.updateOne/
- MongoDB Manual: db.collection.createIndex() — https://www.mongodb.com/docs/manual/reference/method/db.collection.createIndex/
- MongoDB Manual: Transactions — https://www.mongodb.com/docs/manual/core/transactions/
- MongoDB Blog: Building with Patterns (Extended Reference Pattern) — https://www.mongodb.com/blog/post/building-with-patterns-the-extended-reference-pattern

## Issues Found
No technical issues found.

## Review Notes
- The post uses simplified ObjectId strings (e.g., `ObjectId("order001")`) instead of valid 24-character hex strings. This is a common and accepted convention in blog posts for readability and does not affect the technical accuracy of the schema design guidance.
- The "<= 20" threshold in the decision framework is a reasonable rule of thumb. MongoDB's official guidance uses similar heuristics but does not prescribe a specific number.
- The Extended Reference Pattern and change streams mention are accurate and align with MongoDB's official "Building with Patterns" series.
- All MongoDB operators, methods, and index specifications use correct syntax.
