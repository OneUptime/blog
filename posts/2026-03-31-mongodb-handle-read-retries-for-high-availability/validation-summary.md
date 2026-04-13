# Validation Summary: How to Handle Read Retries for High Availability in MongoDB

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB (server 4.2+, 4.4+ for hedged reads)
- MongoDB Node.js Driver
- Retryable Reads
- Read Preferences (primaryPreferred, secondaryPreferred, secondary, nearest)
- Hedged Reads
- maxStalenessSeconds

## Sources Consulted
- MongoDB Retryable Reads documentation: https://www.mongodb.com/docs/manual/core/retryable-reads/
- MongoDB Read Preference documentation: https://www.mongodb.com/docs/manual/core/read-preference/
- MongoDB Read Preference maxStalenessSeconds: https://www.mongodb.com/docs/manual/core/read-preference-staleness/
- MongoDB Hedged Reads documentation: https://www.mongodb.com/docs/manual/core/read-preference-hedge-option/
- MongoDB Node.js Driver API (Db, Admin, Collection classes): https://www.mongodb.com/docs/drivers/node/current/
- MongoDB serverStatus command: https://www.mongodb.com/docs/manual/reference/command/serverStatus/
- MongoDB error codes and messages (5.0+ inclusive language changes): https://www.mongodb.com/docs/manual/reference/error-codes/

## Issues Found

1. **Missing "not primary" error check in manual retry logic**: The manual retry function checked for `"not master"` in error messages but did not check for `"not primary"`. MongoDB 5.0+ replaced the `"not master"` error message with `"not primary"` as part of inclusive language changes. Added the `"not primary"` check so the retry logic works with both older and newer MongoDB server versions.

2. **Incorrect Node.js driver API for admin commands**: The code used `db.adminCommand({ serverStatus: 1 })`, which is a MongoDB shell (mongosh) method, not available in the Node.js driver. Changed to `db.admin().command({ serverStatus: 1 })`, which is the correct Node.js driver API using the `Admin` class returned by `Db.admin()`.

3. **Hedged reads missing sharded cluster requirement and incomplete read preference list**: The post stated hedged reads work with `nearest`, `secondary`, and `secondaryPreferred` without mentioning they require a sharded cluster (mongos). Added the sharded cluster requirement and included `primaryPreferred` in the list of compatible read preferences, as it is also supported.

## Review Notes
- The `maxStalenessSeconds` value of 90 used in the example is the minimum allowed value. This is technically valid but worth noting for readers who might try lower values.
- The post mixes `require("mongodb")` (CommonJS) and top-level `await` (ES modules) syntax in examples. This is a minor stylistic inconsistency but both patterns are common in MongoDB tutorials.
- The hedged reads section could benefit from mentioning that the feature only applies to sharded cluster deployments via mongos, which was added in the fix. Readers using simple replica sets should understand the `hedge` option will have no effect without mongos.
