# Validation Summary: How to Use Write Concern w:majority in MongoDB

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- MongoDB (replica sets, write concern, read concern)
- MongoDB Node.js driver (`mongodb` package)
- MongoDB shell (`mongosh`)

## Sources Consulted
- MongoDB documentation on Write Concern: https://www.mongodb.com/docs/manual/reference/write-concern/
- MongoDB documentation on `writeConcernMajorityJournalDefault`: https://www.mongodb.com/docs/manual/reference/replica-configuration/#mongodb-rsconf-rsconf.writeConcernMajorityJournalDefault
- MongoDB documentation on Read Concern "majority": https://www.mongodb.com/docs/manual/reference/read-concern-majority/
- MongoDB Node.js driver API documentation for WriteConcern class

## Issues Found
1. **Incorrect claim about `j: true` and in-memory writes** — The post stated "Without `j: true`, a majority of nodes have the write in memory. With `j: true`, a majority have it safely in their on-disk journals." This is incorrect for MongoDB 3.6+ with the default configuration. The `writeConcernMajorityJournalDefault` replica set setting defaults to `true` since MongoDB 3.6, meaning `w: "majority"` already requires journaling from a majority of nodes by default, even without explicitly specifying `j: true`. Fixed the paragraph to accurately describe the default journaling behavior and clarify that explicit `j: true` is useful as an override when `writeConcernMajorityJournalDefault` has been set to `false`.

## Review Notes
- The Node.js driver example uses the positional `WriteConcern` constructor (`new WriteConcern("majority", 5000, true)`). While correct, the options object form (`{ w: "majority", wtimeoutMS: 5000, j: true }`) is more readable and commonly used in modern documentation. Not changed since the positional form is valid.
- The "Pairing With Read Concern majority" section claims "guaranteed to see the write" which is true when reading from the primary (the default read preference), but would not hold if the read preference were set to secondary. For a stricter causal consistency guarantee, a causally consistent session would be needed. Not changed since the example uses default read preference (primary).
- Starting from MongoDB 5.0, the default write concern for replica sets is `w: "majority"`. The post doesn't mention this but it's supplementary context, not an error.
