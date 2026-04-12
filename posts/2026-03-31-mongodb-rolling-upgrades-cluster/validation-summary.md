# Validation Summary: How to Perform Rolling Upgrades on a MongoDB Cluster

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB (replica sets, rolling upgrades)
- mongosh (MongoDB Shell)
- systemctl (systemd service management)
- apt-get (Debian/Ubuntu package management)

## Sources Consulted
- MongoDB official documentation: Upgrade a Replica Set to a specific version (https://www.mongodb.com/docs/manual/release-notes/7.0-upgrade-replica-set/)
- MongoDB official documentation: setFeatureCompatibilityVersion command (https://www.mongodb.com/docs/manual/reference/command/setFeatureCompatibilityVersion/)
- MongoDB official documentation: rs.stepDown() (https://www.mongodb.com/docs/manual/reference/method/rs.stepDown/)
- MongoDB official documentation: rs.printSecondaryReplicationInfo() (https://www.mongodb.com/docs/manual/reference/method/rs.printSecondaryReplicationInfo/)
- MongoDB official documentation: rs.printReplicationInfo() (https://www.mongodb.com/docs/manual/reference/method/rs.printReplicationInfo/)

## Issues Found
1. **Missing `confirm: true` in `setFeatureCompatibilityVersion` command** (Step 4): Starting with MongoDB 7.0, the `setFeatureCompatibilityVersion` command requires a `confirm: true` parameter. Without it, the command fails. Changed `db.adminCommand({ setFeatureCompatibilityVersion: "7.0" })` to `db.adminCommand({ setFeatureCompatibilityVersion: "7.0", confirm: true })`.

## Review Notes
- The post correctly covers the standard rolling upgrade procedure: secondaries first, step down primary, upgrade former primary, then set FCV.
- The `mongodb-org=7.0.0` package pin is specific to a point release. In practice, users may want to install the latest patch release (e.g., `mongodb-org=7.0.*`) but pinning to a specific version is not incorrect.
- The post is Debian/Ubuntu-specific (uses `apt-get` and `systemctl`). RHEL/CentOS users would need `yum` or `dnf` equivalents, but limiting scope to one platform is reasonable for a tutorial.
- The rollback considerations section correctly warns that downgrading after FCV change is complex, which is an important safety note.
