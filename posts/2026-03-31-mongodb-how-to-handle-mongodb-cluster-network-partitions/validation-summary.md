# Validation Summary: How to Handle MongoDB Cluster Network Partitions

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- MongoDB Replica Sets
- MongoDB Write Concern and Read Concern
- MongoDB Read Preference
- MongoDB Elections and Failover
- PyMongo (Python driver)
- Node.js MongoDB driver
- CAP Theorem

## Sources Consulted
- MongoDB Replica Set Elections documentation (https://www.mongodb.com/docs/manual/core/replica-set-elections/)
- MongoDB Replica Set Configuration reference (https://www.mongodb.com/docs/manual/reference/replica-configuration/)
- MongoDB Read Concern "linearizable" documentation (https://www.mongodb.com/docs/manual/reference/read-concern-linearizable/)
- MongoDB Replica Set Rollbacks documentation (https://www.mongodb.com/docs/manual/core/replica-set-rollbacks/)
- MongoDB error_codes.yml source (https://github.com/mongodb/mongo/blob/master/src/mongo/base/error_codes.yml)
- PyMongo Collection.insert_one() source and documentation (https://pymongo.readthedocs.io/)
- MongoDB Community Forums on CAP theorem classification (https://www.mongodb.com/community/forums/t/q-about-mongodbs-cap/150499)

## Issues Found

1. **PyMongo `insert_one()` does not accept a `write_concern` parameter** (Critical): The Python code example passed `write_concern={"w": "majority", "wtimeout": 10000}` as a keyword argument to `insert_one()`, which would raise a `TypeError` at runtime. Fixed to use `collection.with_options(write_concern=WriteConcern("majority", wtimeout=10000))` as the PyMongo API requires.

2. **Error code 91 mislabeled as "replica set step down"**: Error code 91 is `ShutdownInProgress`, not "replica set step down." Updated the comment to correctly say "ShutdownInProgress."

3. **Error code 64 comment outdated**: Error code 64 was renamed from `WriteConcernFailed` to `WriteConcernTimeout` in the MongoDB codebase. Updated the comment accordingly.

4. **Isolated secondary described as "stepping down"**: Secondaries do not "step down" -- only a primary steps down. An isolated secondary remains in the SECONDARY state but cannot participate in elections or reach a majority. Fixed the description to accurately reflect this behavior.

5. **Rollback directory path incomplete**: The rollback path was listed as `<dbpath>/rollback/` but the actual path includes a collection UUID subdirectory: `<dbpath>/rollback/<collectionUUID>/`. Fixed.

## Review Notes
- The CAP theorem classification of MongoDB as "CP" is a common simplification. MongoDB's official stance is that CAP is an oversimplification of real-world distributed systems behavior, as consistency levels are tunable via read/write concerns. The post's statement is acceptable for a general audience but could benefit from a caveat about tunability.
- The `linearizable` read concern description ("guarantees latest committed data") is correct at a high level but omits that it also verifies the primary's status with secondaries, and that it only works with queries that uniquely identify a single document. These are important nuances for production use.
- The `rs.reconfig()` example using spread syntax (`...rs.conf()`) is a convenient pattern but readers should be aware that reconfiguring settings may require incrementing the `version` field in practice.
