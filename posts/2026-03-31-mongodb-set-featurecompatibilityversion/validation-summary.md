# Validation Summary: How to Set featureCompatibilityVersion in MongoDB

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- MongoDB (7.0 / 6.0)
- mongosh (MongoDB Shell)
- featureCompatibilityVersion (FCV) subsystem
- Replica sets and sharded clusters

## Sources Consulted
- MongoDB `setFeatureCompatibilityVersion` command reference (https://www.mongodb.com/docs/v7.0/reference/command/setfeaturecompatibilityversion/)
- MongoDB `getParameter` command reference (https://www.mongodb.com/docs/manual/reference/command/getParameter/)
- MongoDB 7.0 Upgrade a Replica Set guide (https://www.mongodb.com/docs/manual/release-notes/7.0-upgrade-replica-set/)
- MongoDB 7.0 Upgrade a Sharded Cluster guide (https://www.mongodb.com/docs/manual/release-notes/7.0-upgrade-sharded-cluster/)
- MongoDB Built-In Roles reference (https://www.mongodb.com/docs/manual/reference/built-in-roles/)
- MongoDB Privilege Actions reference (https://www.mongodb.com/docs/manual/reference/privilege-actions/)

## Issues Found

### 1. Missing `confirm: true` in all `setFeatureCompatibilityVersion` commands (Critical)
- **What was wrong:** Starting in MongoDB 7.0, the `setFeatureCompatibilityVersion` command requires a `confirm: true` parameter. Without it, the command will not execute and returns an error. All five instances of this command in the post were missing the parameter.
- **What was changed:** Added `confirm: true` to every `setFeatureCompatibilityVersion` call (lines 39, 55, 69, 93, and 113).
- **Why:** The commands as written would fail on MongoDB 7.0+ deployments, which is the version the post targets.

### 2. Misleading "one major version below" wording (Minor)
- **What was wrong:** The FCV constraints section stated "You can only set FCV to the current binary version or one major version below." MongoDB does not use traditional semantic major versioning (e.g., the jump from 6.0 to 7.0 is a sequential release, not a major version bump in the semver sense).
- **What was changed:** Reworded to "the current binary version or the previous version."
- **Why:** The original wording could confuse readers who interpret "major version" in the semver sense, potentially leading them to believe they could skip versions.

## Review Notes
- The `getParameter` syntax for checking FCV is correct for `mongod` instances but is undefined on `mongos` instances. The verification command shown in the sharded cluster section connects to a shard host (mongod), which is correct.
- The privilege section mentions the `root` role; the `clusterManager` and `clusterAdmin` roles also grant the `setFeatureCompatibilityVersion` privilege and may be more appropriate in production environments (principle of least privilege). This is not an error, just a note for potential future improvement.
- The upgrade order for replica sets is accurate and matches official MongoDB documentation.
