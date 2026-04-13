# Validation Summary: How to Migrate from MongoDB 4.x to 5.x

## Status
validated

## Post Type
Tutorial / Step-by-step migration guide

## Technologies Covered
- MongoDB 4.4 and 5.0
- mongodump / mongorestore
- MongoDB Replica Sets
- Feature Compatibility Version (FCV)
- Time-series collections
- Node.js MongoDB driver
- PyMongo (Python)
- MongoDB Java driver
- mongosh

## Sources Consulted
- MongoDB 5.0 Release Notes: https://www.mongodb.com/docs/manual/release-notes/5.0/
- MongoDB Upgrade Replica Set to 5.0: https://www.mongodb.com/docs/manual/release-notes/5.0-upgrade-replica-set/
- MongoDB setFeatureCompatibilityVersion documentation: https://www.mongodb.com/docs/manual/reference/command/setFeatureCompatibilityVersion/
- MongoDB $where operator documentation: https://www.mongodb.com/docs/manual/reference/operator/query/where/
- MongoDB count() deprecation notes (introduced in 4.0): https://www.mongodb.com/docs/manual/reference/method/db.collection.count/
- MongoDB Node.js driver compatibility matrix: https://www.mongodb.com/docs/drivers/node/current/compatibility/
- MongoDB Time-Series Collections: https://www.mongodb.com/docs/manual/core/timeseries-collections/
- MongoDB Downgrade 5.0 to 4.4: https://www.mongodb.com/docs/manual/release-notes/5.0-downgrade-replica-set/

## Issues Found

1. **$where operator claim was incorrect**: The post stated "$where operator usage in aggregation" was removed. `$where` was never valid in aggregation pipelines — it is a query operator for `find()`. Fixed to note that `$where` and other server-side JavaScript expressions are deprecated in 5.0.

2. **count() deprecation timing was wrong**: The post implied `db.collection.count()` was deprecated in MongoDB 5.0. It was actually deprecated in MongoDB 4.0. Added "since 4.0" to clarify.

3. **FCV irreversibility claim was dangerously incorrect**: The post stated "This is irreversible - you cannot downgrade FCV without a full restore." This is wrong. You can set FCV back to "4.4" using `setFeatureCompatibilityVersion`, provided you remove any 5.0-specific features first. Replaced with accurate downgrade instructions.

4. **Rollback/downgrade note was inaccurate**: The post stated "You can only downgrade from 5.0 to 4.4 if FCV has not been updated to 5.0." In reality, you can set FCV back to "4.4" before downgrading binaries, even after it was set to "5.0". Fixed to describe the correct downgrade procedure.

5. **Node.js driver version was wrong**: The post recommended `npm install mongodb@5`, but the Node.js driver v4.x is the correct version for MongoDB server 5.0 compatibility. Driver v5 was released later for MongoDB 6.0/7.0. Changed to `mongodb@4`.

6. **Serverless instances attribution**: The post listed "serverless instances" alongside core MongoDB 5.0 server features. Serverless instances are an Atlas-specific deployment option, not a server feature. Added "(Atlas)" qualifier to clarify.

## Review Notes
- The `apt-key add` command used in the package installation step is deprecated by Debian/Ubuntu in favor of storing keys in `/etc/apt/keyrings/` with `signed-by` in the sources list. The command still works but will produce deprecation warnings on modern Ubuntu versions. This is not a MongoDB-specific issue.
- The post covers replica set upgrades well but only briefly mentions sharded clusters in the overview without providing sharded cluster-specific upgrade steps. A future revision could add a section on shard-specific considerations.
- The mongodump/mongorestore approach shown for backup/rollback works for smaller deployments but may not be practical for large production databases. File system snapshots or Atlas snapshots are more appropriate for large datasets.
