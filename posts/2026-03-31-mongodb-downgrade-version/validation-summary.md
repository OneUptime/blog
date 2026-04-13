# Validation Summary: How to Downgrade MongoDB to Previous Version

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB (7.0, 6.0)
- Feature Compatibility Version (FCV)
- mongodump
- Replica set administration
- systemd (systemctl)
- apt/yum package management

## Sources Consulted
- MongoDB official documentation: Downgrade 7.0 to 6.0 (https://www.mongodb.com/docs/manual/release-notes/7.0-downgrade-replica-set/)
- MongoDB official documentation: setFeatureCompatibilityVersion (https://www.mongodb.com/docs/manual/reference/command/setFeatureCompatibilityVersion/)
- MongoDB official documentation: hello command (replacement for isMaster) (https://www.mongodb.com/docs/manual/reference/command/hello/)
- MongoDB official documentation: mongodump (https://www.mongodb.com/docs/database-tools/mongodump/)
- MongoDB official documentation: Install on Ubuntu/RHEL (https://www.mongodb.com/docs/manual/administration/install-on-linux/)

## Issues Found

1. **Incorrect version terminology ("minor" instead of "major")**: The post referred to 7.0 → 6.0 as a "one minor version" downgrade in three places (introduction, limitations table, and summary). In MongoDB's versioning scheme, 7.0, 6.0, 5.0, etc. are *major* versions; minor/patch versions are 7.0.1, 7.0.2, etc. Changed all three occurrences of "one minor version" to "one major version."

2. **Deprecated `rs.isMaster()` method**: The post used `rs.isMaster().primary` to verify the new primary after stepdown. `isMaster` was deprecated in MongoDB 5.1 in favor of the `hello` command, and the shell helper `db.hello()` is the recommended replacement. Changed to `db.hello().primary`.

## Review Notes
- The `confirm: true` parameter in `setFeatureCompatibilityVersion` is correctly noted as required in MongoDB 7.0+.
- The rolling downgrade procedure (secondaries first, then step down primary, then downgrade former primary) follows MongoDB's official recommended approach.
- The `mongodump` command with `--oplog` is correctly used for a consistent backup of a replica set.
- The `db.getCollectionInfos()` calls in Step 3 are valid but somewhat limited for detecting all FCV-gated features. MongoDB's official docs recommend checking for specific incompatible features (e.g., certain index types, collection features). This is not wrong but could be more comprehensive in a future revision.
- The package repository URLs and GPG key URLs follow MongoDB's official format and are correct.
