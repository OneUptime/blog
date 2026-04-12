# Validation Summary: How to Plan MongoDB Maintenance Windows

## Status
validated

## Post Type
Guide

## Technologies Covered
- MongoDB (replica sets, `mongosh`, `rs.status()`, `rs.stepDown()`, `setFeatureCompatibilityVersion`)
- Linux system administration (`systemctl`, `df`, `ssh`)
- AWS EC2 (EBS snapshots, volume management)

## Sources Consulted
- MongoDB `setFeatureCompatibilityVersion` documentation: https://www.mongodb.com/docs/manual/reference/command/setFeatureCompatibilityVersion/
- MongoDB `rs.stepDown()` documentation: https://www.mongodb.com/docs/manual/reference/method/rs.stepDown/
- MongoDB `rs.status()` documentation: https://www.mongodb.com/docs/manual/reference/method/rs.status/
- MongoDB replica set maintenance (rolling restart) documentation: https://www.mongodb.com/docs/manual/tutorial/perform-maintence-on-replica-set-members/
- MongoDB upgrade procedures: https://www.mongodb.com/docs/manual/release-notes/7.0-upgrade-replica-set/
- AWS CLI `ec2 create-snapshot` reference: https://docs.aws.amazon.com/cli/latest/reference/ec2/create-snapshot.html

## Issues Found
1. **Missing `confirm: true` in `setFeatureCompatibilityVersion` command** — Starting in MongoDB 7.0, the `setFeatureCompatibilityVersion` admin command requires a `confirm: true` field. Without it, the command returns an error. Changed `db.adminCommand({ setFeatureCompatibilityVersion: '7.0' })` to `db.adminCommand({ setFeatureCompatibilityVersion: '7.0', confirm: true })`.

## Review Notes
- The version upgrade procedure is simplified and does not explicitly show restarting `mongod` after installing the new package on each secondary. On Debian/Ubuntu, the `mongodb-org` package typically restarts the service automatically during installation, so this is not strictly wrong, but readers on other distributions should be aware they may need an explicit restart.
- The `mongodb-org=7.0.x` package version is a placeholder; readers will need to substitute the actual patch version (e.g., `7.0.12`).
- The election timeout claim of "10-30 sec" for write unavailability is a reasonable conservative estimate. Default `electionTimeoutMillis` is 10 seconds; total unavailability depends on network and load.
