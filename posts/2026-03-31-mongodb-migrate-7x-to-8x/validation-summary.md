# Validation Summary: How to Migrate from MongoDB 7.x to 8.x

## Status
validated

## Post Type
Tutorial / Step-by-step Guide

## Technologies Covered
- MongoDB 7.x and 8.x
- mongosh (MongoDB Shell)
- MongoDB Replica Sets
- Feature Compatibility Version (FCV)
- APT package management (Ubuntu)
- systemctl service management

## Sources Consulted
- MongoDB 8.0 Upgrade Replica Set documentation: https://www.mongodb.com/docs/manual/release-notes/8.0-upgrade-replica-set/
- MongoDB setFeatureCompatibilityVersion command reference: https://www.mongodb.com/docs/manual/reference/command/setfeaturecompatibilityversion/
- MongoDB SBE (Slot-Based Execution) documentation: https://www.mongodb.com/docs/manual/reference/sbe/
- MongoDB 8.0 Release Notes: https://www.mongodb.com/docs/manual/release-notes/8.0/
- MongoDB Install on Ubuntu documentation: https://www.mongodb.com/docs/v8.0/tutorial/install-mongodb-on-ubuntu/
- MongoDB Free Monitoring decommission notice (August 2023)
- MongoDB 6.0 Release Notes (legacy mongo shell removal): https://www.mongodb.com/docs/manual/release-notes/6.0/

## Issues Found

1. **`checkFreeMonitoringStatus` command is obsolete** (line 28): The `checkFreeMonitoringStatus` admin command referenced Free Monitoring, which was decommissioned in August 2023. Replaced with `buildInfo` command as a more useful pre-upgrade check.

2. **"Removed legacy mongo shell" incorrectly listed as an 8.0 change** (line 48): The legacy `mongo` shell was removed in MongoDB 6.0, not 8.0. Updated the text to clarify it was removed in 6.0 and to ensure readers are using `mongosh`.

3. **Missing `confirm: true` in `setFeatureCompatibilityVersion` calls** (lines 25, 118): Starting from MongoDB 7.0, the `setFeatureCompatibilityVersion` command requires a `confirm: true` parameter. Both invocations were missing this required field. Added `confirm: true` to both calls.

4. **APT repository entry missing GPG key setup** (line 71): The apt source entry was missing the `signed-by` directive and the GPG key import step, which is required on modern Ubuntu for package authentication. Added the `wget`/`gpg` key import command and the `signed-by` parameter.

5. **Hardcoded package version `mongodb-org=8.0.0`** (lines 74, 95): Pinning to `8.0.0` exactly may fail if that specific patch version is not available in the repository. Changed to `mongodb-org` (without version pin) which installs the latest 8.0.x release from the configured 8.0 repository.

## Review Notes
- The overall rolling upgrade procedure (secondaries first, step down primary, upgrade primary last) is correct and follows MongoDB's official documentation.
- The FCV workflow (ensure FCV is at 7.0 before upgrade, set to 8.0 only after all nodes are upgraded) is accurate.
- The downgrade warning about FCV 8.0 is generally correct — once FCV is set to 8.0, downgrading requires careful procedures and backups are strongly recommended.
- The post correctly describes SBE as being "enabled for more query shapes" in 8.0, which is accurate — SBE was introduced in MongoDB 5.1 and progressively expanded. The Overview section uses the phrase "new query execution engine" which is slightly misleading since SBE is not new in 8.0, but the expanded coverage claim is correct.
- The `replSetStepDown` command usage is correct.
- The profiling and log checking commands in the post-upgrade validation section are correct.
