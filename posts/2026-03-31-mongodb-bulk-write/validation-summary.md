# Validation Summary: How to Use bulkWrite() in MongoDB for Batch Operations

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB (mongosh shell and server)
- MongoDB bulkWrite() API
- MongoDB CRUD operations (insertOne, updateOne, updateMany, replaceOne, deleteOne, deleteMany)

## Sources Consulted
- MongoDB official documentation: db.collection.bulkWrite() — https://www.mongodb.com/docs/manual/reference/method/db.collection.bulkWrite/
- MongoDB official documentation: BulkWriteResult — https://www.mongodb.com/docs/manual/reference/method/BulkWriteResult/
- MongoDB official documentation: BSON Document Size Limit — https://www.mongodb.com/docs/manual/reference/limits/
- MongoDB Node.js Driver API: MongoBulkWriteError — https://mongodb.github.io/node-mongodb-native/

## Issues Found

1. **`err.result.nInserted` uses legacy property name (line 186):** The error handling example used `err.result.nInserted`, which is the legacy mongo shell property. In mongosh and the modern Node.js driver, the correct property on `BulkWriteResult` is `insertedCount`. Changed to `err.result.insertedCount`.

2. **Misleading "16 MB per operation" claim (line 225):** The post stated "MongoDB still limits bulk operations to 100,000 operations per batch and 16 MB per operation." This conflated two different limits. The 16 MB limit is the BSON document size limit (applying to individual documents, not to bulk operations). The 100,000 limit is the server's internal `maxWriteBatchSize` — the driver automatically splits larger batches, so from the client perspective there is no hard cap. Rewrote to clarify both points.

3. **Incorrect use of "atomically" (line 232):** The use cases section listed "Processing a batch of event-driven changes atomically." `bulkWrite()` does not provide atomicity across the entire batch — each individual operation is atomic, but the batch as a whole is not. Multi-document transactions are needed for cross-operation atomicity. Changed "atomically" to "efficiently."

## Review Notes
- The post's opening statement that bulkWrite sends operations "in a single network round trip" is a common simplification. In practice, the driver groups consecutive operations of the same type into separate wire protocol commands, so a mixed bulkWrite may involve multiple server round trips. This is a standard simplification used even in MongoDB's own documentation, so it was left as-is.
- The error handling example accesses `err.writeErrors` and iterates with `.forEach()`. In mongosh this works, but the exact error object shape can vary between the mongosh shell and different Node.js driver versions. The example is reasonable for illustrative purposes.
- The mermaid diagram and overall structure are accurate and well-organized.
