# Validation Summary: How to Downgrade MongoDB to a Previous Version

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- MongoDB (versions 7.0 and 8.0 used as examples)
- Feature Compatibility Version (FCV) mechanism
- mongodump / mongorestore utilities
- mongosh shell commands
- apt / yum package management for MongoDB
- systemd service management

## Sources Consulted
- MongoDB official documentation on `setFeatureCompatibilityVersion` command (https://www.mongodb.com/docs/manual/reference/command/setFeatureCompatibilityVersion/)
- MongoDB official downgrade procedures for 8.0 to 7.0 (https://www.mongodb.com/docs/manual/release-notes/8.0-downgrade-standalone/)
- MongoDB official documentation on replica set downgrade (https://www.mongodb.com/docs/manual/release-notes/8.0-downgrade-replica-set/)
- MongoDB documentation on Feature Compatibility Version (https://www.mongodb.com/docs/manual/reference/command/setFeatureCompatibilityVersion/#std-label-set-fcv)

## Issues Found

### Issue 1: Incorrect claim that FCV upgrade prevents downgrade
**What was wrong:** The Overview, Downgrade Windows section, and Summary all stated or implied that once FCV is set to the new version (e.g., "8.0"), a major version downgrade is impossible without a full backup restore. This is incorrect. MongoDB supports setting FCV back to the previous version (e.g., from "8.0" back to "7.0") as long as you remove any features incompatible with the target version. The post itself contradicted this claim in Step 1 by showing the `setFeatureCompatibilityVersion` command to set FCV to a lower version.

**What was changed:** Rewrote the Overview, Downgrade Windows item #2, the note after the FCV check example, and the Summary to accurately describe that FCV can be set back and that a full restore is only needed when incompatible changes cannot be reversed.

### Issue 2: Missing `confirm: true` parameter in `setFeatureCompatibilityVersion`
**What was wrong:** The `setFeatureCompatibilityVersion` command in Step 1 was missing the required `confirm: true` parameter. Starting from MongoDB 7.0, this parameter is mandatory and the command will fail without it.

**What was changed:** Updated the command from `db.adminCommand({ setFeatureCompatibilityVersion: "7.0" })` to `db.adminCommand({ setFeatureCompatibilityVersion: "7.0", confirm: true })`.

## Review Notes
- The `mongodump` example includes a plaintext password (`admin:secret`) in the URI. While acceptable as a tutorial placeholder, production usage should use `--config` files or environment variables to avoid credential exposure in shell history.
- The `storage.engine: wiredTiger` config setting is technically redundant since MongoDB 4.2+ only supports WiredTiger, but it is not incorrect.
- The `apt-get remove` followed by `apt-get install` approach for downgrading is functional but `apt-get install --allow-downgrades` is an alternative that some operators may prefer.
- The package pinning section correctly lists `mongodb-org-shell` for apt-mark, though on MongoDB 6.0+ installations using mongosh, the package name is `mongodb-mongosh`. This is version-dependent and the post's example is valid for the versions discussed.
