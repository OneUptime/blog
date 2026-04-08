# Validation Summary: How to Check if a Document Exists in MongoDB Without Fetching It

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB (mongosh shell)
- MongoDB Node.js Driver
- MongoDB countDocuments API
- MongoDB findOne with projection
- MongoDB find cursor API
- MongoDB upsert with $setOnInsert

## Sources Consulted
- MongoDB Manual: db.collection.countDocuments() — https://www.mongodb.com/docs/manual/reference/method/db.collection.countDocuments/
- MongoDB Manual: db.collection.findOne() — https://www.mongodb.com/docs/manual/reference/method/db.collection.findOne/
- MongoDB Manual: cursor.hasNext() — https://www.mongodb.com/docs/manual/reference/method/cursor.hasNext/
- MongoDB Manual: db.collection.updateOne() (upsert) — https://www.mongodb.com/docs/manual/reference/method/db.collection.updateOne/
- MongoDB Manual: $setOnInsert — https://www.mongodb.com/docs/manual/reference/operator/update/setOnInsert/
- MongoDB Node.js Driver: countDocuments — https://www.mongodb.com/docs/drivers/node/current/usage-examples/count/

## Issues Found
No technical issues found.

## Review Notes
- The mermaid flowchart's "find limit 1" path (node E) does not connect to an outcome node, while the other two methods do. This is a minor diagram completeness issue, not a technical error.
- The mongosh examples use `findOne(filter, projection)` which is the correct mongosh syntax. Note that the Node.js driver equivalent would require `findOne(filter, { projection: { _id: 1 } })` — the post avoids this potential confusion by only using `countDocuments` in the Node.js driver section.
- The race condition warning for check-then-insert and the recommended upsert alternative are accurate and valuable advice.
