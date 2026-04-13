# Validation Summary: How to Upgrade MongoDB to a New Major Version

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- MongoDB (versions 5.0 through 8.0)
- Feature Compatibility Version (FCV) system
- mongodump / mongosh CLI tools
- Ubuntu/Debian package management (apt)
- systemctl service management

## Sources Consulted
- [setFeatureCompatibilityVersion - MongoDB v8.0 Docs](https://www.mongodb.com/docs/v8.0/reference/command/setfeaturecompatibilityversion/) — confirmed `confirm: true` is required since MongoDB 7.0
- [checkMetadataConsistency - MongoDB Docs](https://www.mongodb.com/docs/manual/reference/command/checkmetadataconsistency/) — confirmed this is a sharded-cluster-only command introduced in 7.0
- [Install MongoDB Community Edition on Ubuntu - v8.0](https://www.mongodb.com/docs/v8.0/tutorial/install-mongodb-on-ubuntu/) — confirmed modern GPG key management approach
- [Upgrade a Replica Set to 8.0 - MongoDB Docs](https://www.mongodb.com/docs/manual/release-notes/8.0-upgrade-replica-set/) — verified upgrade path and rolling upgrade procedure
- [Upgrade a Standalone to 8.0 - MongoDB Docs](https://www.mongodb.com/docs/manual/release-notes/8.0-upgrade-standalone/) — verified standalone upgrade procedure
- [validate command - MongoDB Docs](https://www.mongodb.com/docs/manual/reference/command/validate/) — confirmed `errors` field usage

## Issues Found
1. **`checkMetadataConsistency` incorrectly included as pre-upgrade check**: This command was presented as a general "check for deprecated usage" step, but it only works on sharded clusters (via `mongos`), was introduced in MongoDB 7.0, and checks sharding metadata consistency — not deprecated API usage. Removed it from the pre-upgrade checklist and renumbered remaining items.

2. **`setFeatureCompatibilityVersion` missing `confirm: true`**: Starting in MongoDB 7.0, the `setFeatureCompatibilityVersion` command requires a `confirm: true` parameter or it will fail. Added `confirm: true` to both occurrences (replica set Step 6 and standalone upgrade).

3. **Deprecated `apt-key add` for GPG key management**: The post used `wget | sudo apt-key add -` which has been deprecated since apt 2.4 (Ubuntu 22.04+). Replaced with the modern `gpg --dearmor` + `signed-by` approach per official MongoDB installation docs. Also updated the Ubuntu codename from `focal` to `jammy`.

4. **Invalid apt package version `mongodb-org=7.0.x`**: The `.x` suffix is not valid apt syntax and would cause an error. Replaced with a specific version number `mongodb-org=7.0.12`.

5. **Oversimplified rollback statement**: The post claimed downgrading after FCV change requires a full backup restore as the only option. In reality, MongoDB supports lowering the FCV after removing backwards-incompatible features, though it is complex. Updated to accurately describe both paths.

## Review Notes
- The upgrade path (5.0 -> 6.0 -> 7.0 -> 8.0) is correct.
- The `validate` command usage with `result.errors` is correct per MongoDB docs.
- The rolling upgrade order (secondaries first, then step down primary, then upgrade former primary) is correct per official docs.
- The post could benefit from mentioning `db.adminCommand({ getParameter: 1, featureCompatibilityVersion: 1 })` output format differences between versions, but this is not a technical error.
- The `mongodump` backup command includes a plaintext password in the URI — readers should be advised to use environment variables or a config file for credentials in production, though this is a stylistic concern rather than a technical error.
