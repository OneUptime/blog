# Validation Summary: How to Use Read Concern 'linearizable' in MongoDB

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB (read concerns, replication, consistency guarantees)
- mongosh (MongoDB Shell)
- MongoDB Node.js Driver

## Sources Consulted
- MongoDB official documentation on Read Concern "linearizable": https://www.mongodb.com/docs/manual/reference/read-concern-linearizable/
- MongoDB official documentation on `db.collection.findOne()`: https://www.mongodb.com/docs/manual/reference/method/db.collection.findOne/
- MongoDB Node.js Driver API documentation for `FindOptions`: https://mongodb.github.io/node-mongodb-native/
- MongoDB official documentation on Read Concern levels: https://www.mongodb.com/docs/manual/reference/read-concern/

## Issues Found
- **Formatting issue in mongosh example**: The comma after the filter object in the `findOne` call was placed on its own line (`{ userId: "usr-123" }\n,`), which was syntactically valid but poorly formatted. Fixed by moving the comma to the end of the filter line.

## Review Notes
- The post correctly states that linearizable read concern guarantees only apply to queries that uniquely identify a single document. This is an important nuance that is accurately represented.
- The recommendation to always use `maxTimeMS` with linearizable reads is correct and follows MongoDB best practices, since the operation can block indefinitely if the primary becomes unreachable during the confirmation step.
- The comparison table accurately captures the trade-offs between `local`, `majority`, and `linearizable` read concerns.
- The Node.js code example correctly passes `readConcern` and `maxTimeMS` as operation-level options to `findOne`, which is supported by the MongoDB Node.js driver.
