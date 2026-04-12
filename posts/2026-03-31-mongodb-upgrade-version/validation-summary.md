# Validation Summary: How to Upgrade MongoDB Version Safely

## Status
validated

## Post Type
Tutorial / Step-by-step Guide

## Technologies Covered
- MongoDB (server versions 5.0, 6.0, 7.0)
- MongoDB Shell (mongosh)
- mongodump (backup utility)
- systemd (service management)
- APT package manager (Ubuntu/Debian)
- LVM (filesystem snapshots)
- Replica Sets (rolling upgrades)
- Feature Compatibility Version (FCV)

## Sources Consulted
- MongoDB official upgrade documentation for 6.0 to 7.0 (https://www.mongodb.com/docs/manual/release-notes/7.0-upgrade-replica-set/)
- MongoDB official installation guide for Ubuntu (https://www.mongodb.com/docs/manual/tutorial/install-mongodb-on-ubuntu/)
- MongoDB `setFeatureCompatibilityVersion` command reference (https://www.mongodb.com/docs/manual/reference/command/setFeatureCompatibilityVersion/)
- MongoDB `validate` command reference (https://www.mongodb.com/docs/manual/reference/command/validate/)
- MongoDB `rs.stepDown()` reference (https://www.mongodb.com/docs/manual/reference/method/rs.stepDown/)
- APT key management deprecation notes for Ubuntu 22.04+

## Issues Found

### Issue 1: Deprecated `apt-key` usage on Ubuntu 22.04 (Jammy)
- **What was wrong:** The post used `wget -qO- ... | sudo apt-key add -` to import the MongoDB GPG key and a `deb` line without a `signed-by` clause. The `apt-key` command has been deprecated since APT 2.4.x (Ubuntu 22.04 Jammy), which is the exact distribution used in the example. Using `apt-key` produces deprecation warnings and will stop working in future Ubuntu releases.
- **What was changed:** Replaced with `curl -fsSL ... | sudo gpg -o /usr/share/keyrings/mongodb-server-7.0.gpg --dearmor` and added `signed-by=/usr/share/keyrings/mongodb-server-7.0.gpg` to the repository line. This matches MongoDB's current official installation documentation.
- **Why:** The official MongoDB documentation for Ubuntu now uses the `gpg --dearmor` + `signed-by` approach. Since the post explicitly targets Jammy, it should use the current recommended method.

### Issue 2: Missing `confirm: true` in `setFeatureCompatibilityVersion` command
- **What was wrong:** The command `db.adminCommand({ setFeatureCompatibilityVersion: "7.0" })` is missing the required `confirm: true` parameter. Starting with MongoDB 7.0, the `setFeatureCompatibilityVersion` command requires `confirm: true` to execute. Without it, the command will fail.
- **What was changed:** Updated to `db.adminCommand({ setFeatureCompatibilityVersion: "7.0", confirm: true })`.
- **Why:** This is a mandatory parameter introduced in MongoDB 7.0. Since the post walks through upgrading to 7.0, the command must include it or it will not work.

### Issue 3 (not fixed, minor): `apt-get remove mongodb-org` step
- The post removes the `mongodb-org` metapackage before installing the new version. MongoDB's official upgrade documentation does not include this removal step — it simply changes the repository and runs `apt-get install`. Removing the metapackage is not harmful (it only removes the metapackage, not the actual binaries), but it's an unnecessary step. Left as-is since it does not cause failures.

## Review Notes
- The overall upgrade procedure (one major version at a time, rolling upgrade order, FCV management) is accurate and follows MongoDB best practices.
- The `rs.stepDown(120)` syntax is correct — the parameter specifies the number of seconds the member should remain stepped down.
- The `mongodump` command flags (`--uri`, `--out`, `--gzip`) are all correct.
- The `validate()` command syntax with `{ full: false }` is correct.
- The downgrade procedure correctly notes that downgrading after FCV has been set requires a backup restore.
- The multi-step upgrade path (5.0 -> 6.0 -> 7.0) is accurately described.
- The `mongodb-org=6.0.x` in the downgrade section is clearly a placeholder (with a comment), which is acceptable.
