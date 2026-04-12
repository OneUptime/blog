# Validation Summary: What Is Write Concern in MongoDB and Why It Matters

## Status
validated

## Post Type
Guide

## Technologies Covered
- MongoDB (write concern, replica sets, journaling)
- Node.js MongoDB driver
- PyMongo (Python MongoDB driver)

## Sources Consulted
- MongoDB Write Concern documentation: https://www.mongodb.com/docs/manual/reference/write-concern/
- MongoDB Default Write Concern (5.0+ change): https://www.mongodb.com/docs/manual/reference/replica-configuration/#mongodb-rsconf-rsconf.writeConcernMajorityJournalDefault
- MongoDB Transactions documentation: https://www.mongodb.com/docs/manual/core/transactions/
- PyMongo WriteConcern API: https://pymongo.readthedocs.io/en/stable/api/pymongo/write_concern.html
- Node.js MongoDB Driver insertOne API: https://mongodb.github.io/node-mongodb-native/

## Issues Found

1. **`w: 1` incorrectly labeled as the default write concern.**
   - **What was wrong:** The post stated `w: 1` is the default. Starting with MongoDB 5.0, the implicit default write concern for replica sets and sharded clusters changed to `w: "majority"`.
   - **What was changed:** Removed "(default)" from the `w: 1` heading and added a note that `w: 1` was the default before MongoDB 5.0, with the current default being `w: "majority"`.
   - **Why:** Readers on MongoDB 5.0+ (the vast majority at this point) would have an incorrect understanding of default behavior.

2. **Journal flag (`j`) default behavior was oversimplified.**
   - **What was wrong:** The post stated "If `j` is false (the default), the write is acknowledged once it reaches memory." This is inaccurate for `w: "majority"` — when using majority write concern, journal acknowledgment is implied by default via the `writeConcernMajorityJournalDefault` replica set configuration setting (which defaults to `true`).
   - **What was changed:** Replaced the single sentence with a nuanced explanation that the behavior of an unset `j` depends on the write concern level: implied `j: true` for `w: "majority"`, memory-only acknowledgment for `w: 1`.
   - **Why:** The original text could lead readers to believe that `w: "majority"` without explicit `j: true` does not journal — which is incorrect with default replica set settings and could create a false sense of risk.

## Review Notes
- The code examples (Node.js and PyMongo) are syntactically correct and use current, non-deprecated APIs.
- The transaction example correctly places write concern at the `startTransaction` level.
- The post could mention in a future update that `w: "majority"` is required (not just recommended) for transaction commits — MongoDB enforces this regardless of what you specify.
- The `w: 0` description is a reasonable simplification; technically the driver still receives network-level errors, but the server does not send a write acknowledgment.
