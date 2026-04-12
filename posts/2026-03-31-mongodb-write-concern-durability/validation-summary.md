# Validation Summary: How to Use Write Concern in MongoDB for Durability

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB (replica sets, write concern, journaling)
- MongoDB Node.js Driver (MongoClient, WriteConcern class)
- JavaScript / Node.js

## Sources Consulted
- MongoDB Write Concern documentation: https://www.mongodb.com/docs/manual/reference/write-concern/
- MongoDB Read Concern "linearizable" documentation: https://www.mongodb.com/docs/manual/reference/read-concern-linearizable/
- MongoDB 5.0 release notes (default write concern change): https://www.mongodb.com/docs/manual/release-notes/5.0/
- MongoDB Node.js Driver WriteConcern API: https://mongodb.github.io/node-mongodb-native/

## Issues Found
1. **Default write concern incorrectly stated as `w: 1`**: Since MongoDB 5.0 (released July 2021), the default write concern for replica sets is `w: "majority"`, not `w: 1`. Updated the w values table, the example section header, code comment, and summary to reflect this change.

2. **Incorrect linearizability claim in Best Practices**: The post stated that `w: majority` with `readConcern: majority` gives "linearizable read-after-write guarantees." This is incorrect. The combination ensures reads return majority-committed data, but linearizable reads require `readConcern: "linearizable"`. Updated the bullet point to accurately describe both options.

## Review Notes
- The WriteConcern constructor `new WriteConcern("majority", 10000, true)` uses positional parameters (w, wtimeoutMS, j) which is valid but less readable than the object form. Not a correctness issue.
- The durability matrix entry for `w:majority, j:false` is technically correct when `j` is explicitly set to `false`, but worth noting that since MongoDB 3.6+ with WiredTiger, the `writeConcernMajorityJournalDefault` replica set config defaults to `true`, meaning `w: "majority"` without an explicit `j` setting implies journal acknowledgment.
- The `wtimeout` property name in write concern object literals is accepted by the driver, though `wtimeoutMS` is the more standard property name in newer driver versions (v5+). Not flagged as an error since `wtimeout` remains functional.
