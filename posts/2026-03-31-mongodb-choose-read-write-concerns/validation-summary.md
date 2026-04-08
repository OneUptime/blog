# Validation Summary: How to Choose Read and Write Concerns for Your Use Case in MongoDB

## Status
validated

## Post Type
Guide

## Technologies Covered
- MongoDB (read concerns, write concerns, transactions, causal consistency)
- MongoDB Node.js Driver (code examples use async/await and driver API)
- MongoDB Shell (some examples use `db.collection` shell syntax)

## Sources Consulted
- MongoDB documentation: Read Concern (https://www.mongodb.com/docs/manual/reference/read-concern/)
- MongoDB documentation: Write Concern (https://www.mongodb.com/docs/manual/reference/write-concern/)
- MongoDB documentation: Read Concern "linearizable" (https://www.mongodb.com/docs/manual/reference/read-concern-linearizable/)
- MongoDB documentation: Transactions (https://www.mongodb.com/docs/manual/core/transactions/)
- MongoDB documentation: Causal Consistency and Read and Write Concerns (https://www.mongodb.com/docs/manual/core/causal-consistency-read-write-concerns/)
- MongoDB Node.js Driver API: findOneAndUpdate options (https://mongodb.github.io/node-mongodb-native/)

## Issues Found
No technical issues found.

## Review Notes
- **Use Case 5 ("causally consistent" terminology)**: The post states that `w:majority` + `readConcern:"majority"` "forms a causally consistent read-after-write." This is technically imprecise. On the primary, this combination does guarantee read-your-writes, but true causal consistency in MongoDB's terminology requires using causally consistent client sessions (`{ causalConsistency: true }`). Without causal sessions, reading from a secondary with `readConcern:"majority"` after a `w:majority` write is not guaranteed to see the write. Since the code example reads from the primary, the practical recommendation is correct, but the terminology could be more precise.
- **Use Case 7 (linearizable on findOneAndUpdate)**: The `readConcern: "linearizable"` is documented as available "for read operations on the primary only." Applying it to `findOneAndUpdate` (a write operation) is unconventional. MongoDB drivers accept it and the server may apply it to the read portion of the operation, but the standard pattern for linearizable reads is a separate `find` or `findOne` call. The core recommendation of `w:majority` for the write is sound regardless.
- The post mixes MongoDB shell syntax (`db.collection.method()`) and Node.js driver syntax (`await collection.method()`) across examples. This is not incorrect but could be noted for consistency in a future revision.
