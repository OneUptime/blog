# Validation Summary: How to Choose Write Concern Levels in MongoDB

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- MongoDB write concern
- MongoDB replica sets
- MongoDB custom write concern tags
- MongoDB transactions
- MongoDB Node.js driver
- JavaScript

## Sources Consulted
- MongoDB Manual: Write Concern - https://www.mongodb.com/docs/manual/reference/write-concern/
- MongoDB Manual: Write Concern for Replica Sets - https://www.mongodb.com/docs/manual/core/replica-set-write-concern/
- MongoDB Manual: Transactions and Write Concern - https://www.mongodb.com/docs/manual/core/transactions/
- MongoDB Manual: Configure Replica Set Tag Sets - https://www.mongodb.com/docs/manual/tutorial/configure-replica-set-tag-sets/
- MongoDB Manual: db.collection.insertOne() - https://www.mongodb.com/docs/manual/reference/method/db.collection.insertone/
- MongoDB Node.js Driver: Configure CRUD Operations - https://www.mongodb.com/docs/drivers/node/current/crud/configure/
- MongoDB Node.js Driver API: WriteConcern - https://mongodb.github.io/node-mongodb-native/7.0/classes/WriteConcern.html
- MongoDB Node.js Driver API: WriteConcernSettings - https://mongodb.github.io/node-mongodb-native/7.0/interfaces/WriteConcernSettings.html
- MongoDB Node.js Driver API: MongoWriteConcernError - https://mongodb.github.io/node-mongodb-native/7.0/classes/MongoWriteConcernError.html

## Issues Found
- The diagram used `w:all`, which is not a valid literal MongoDB write concern. Changed it to `w:N`.
- The table described `w:N` as "N specific members." MongoDB's numeric write concern requires propagation to the specified number of `mongod` instances, not named specific members. Updated the wording.
- Node.js examples used deprecated driver aliases `j` and `wtimeout`. Updated examples to use `journal` and `wtimeoutMS`.
- The `WriteConcern` constructor example was replaced with a plain `writeConcern` settings object to align with current Node.js driver examples and avoid deprecated option names.
- The journal explanation implied `j: true` fully protects against rollback. Updated it to note that journaling can survive process restart but does not by itself prevent rollback after failover.
- The write concern error example checked for `WriteConcernError`; the current Node.js driver class is `MongoWriteConcernError`. Updated the check.
- The fallback retry example retried an `insertOne()` after a write concern timeout, which can duplicate or conflict with the original primary-side insert. Updated it to preserve `_id` and use an idempotent `replaceOne(..., { upsert: true })` fallback.
- The custom write concern example used `rs.reconfig()` with a partial replica set configuration. Updated it to modify `rs.conf()` before calling `rs.reconfig(conf)`.
- The custom tag explanation said the write was acknowledged by at least one member in each datacenter. Updated it to the more precise MongoDB behavior: satisfying two distinct `dc` tag values.
- The production helper retried write concern timeout errors directly. Updated it to avoid retrying `code === 64` as though the original insert had failed.

## Review Notes
The post is technically relevant and now aligns with current MongoDB server and Node.js driver documentation. Future updates may need to revisit `wtimeoutMS` and `journal` naming if the Node.js driver changes its public write concern settings again.
