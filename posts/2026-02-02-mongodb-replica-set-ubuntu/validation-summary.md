# Validation Summary: How to Configure MongoDB Replica Set on Ubuntu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- MongoDB 7.0
- MongoDB Replica Sets
- Ubuntu 22.04 LTS (Jammy)
- WiredTiger storage engine
- mongosh (MongoDB Shell)
- mongodump / mongorestore / bsondump
- systemd (mongod service management)
- UFW firewall
- OpenSSL (keyfile generation)
- MongoDB Node.js Driver (connection string usage)
- jq (JSON parsing in monitoring script)

## Sources Consulted
- MongoDB 7.0 Configuration File Options: https://www.mongodb.com/docs/v7.0/reference/configuration-options/
- Compatibility Changes in MongoDB 7.0: https://www.mongodb.com/docs/manual/release-notes/7.0-compatibility/
- Install MongoDB on Ubuntu (v7.0): https://www.mongodb.com/docs/v7.0/tutorial/install-mongodb-on-ubuntu/
- MongoDB 7.0 Server Parameters: https://www.mongodb.com/docs/v7.0/reference/parameters/
- rs.printSecondaryReplicationInfo() (v7.0): https://www.mongodb.com/docs/v7.0/reference/method/rs.printSecondaryReplicationInfo/
- rs.stepDown() (v7.0): https://www.mongodb.com/docs/v7.0/reference/method/rs.stepDown/
- setDefaultRWConcern (v7.0): https://www.mongodb.com/docs/v7.0/reference/command/setDefaultRWConcern/
- Replica Set Configuration (v7.0): https://www.mongodb.com/docs/v7.0/reference/replica-configuration/
- Journaling (v7.0): https://www.mongodb.com/docs/v7.0/core/journaling/
- MongoDB Keyfile Authentication: https://www.mongodb.com/docs/v7.0/tutorial/enforce-keyfile-access-control-in-existing-replica-set/

## Issues Found

1. **`storage.journal.enabled: true` in the mongod.conf example** — This option was removed in MongoDB 6.1, and is no longer supported in MongoDB 7.0. With WiredTiger, journaling is always enabled and cannot be disabled. Including this option causes mongod to fail at startup with "Unrecognized option: storage.journal.enabled". **Fix:** Removed the `journal: enabled: true` lines from the storage block in the configuration example and added a short comment explaining that journaling is always enabled with WiredTiger in MongoDB 6.1+.

2. **Disabling JavaScript via setParameter at runtime** — The post used `db.adminCommand({ setParameter: 1, javascriptEnabled: false })` to disable server-side JS. `javascriptEnabled` is not a runtime-changeable server parameter; it is a configuration-file-only option under `security.javascriptEnabled` and requires a mongod restart. **Fix:** Replaced the invalid runtime command with the correct YAML configuration snippet (`security.javascriptEnabled: false`) and a note that it cannot be toggled at runtime.

## Review Notes
- The MongoDB 7.0 repository URL, GPG key URL, and Ubuntu 22.04 jammy package source line are all correct.
- `mongosh`, `rs.printSecondaryReplicationInfo()`, `rs.printReplicationInfo()`, `rs.stepDown(60)`, `rs.addArb()`, `rs.add()`, `rs.remove()`, and `rs.reconfig()` are all valid in MongoDB 7.0.
- `setDefaultRWConcern` command syntax is valid; the post does not mention the restriction that once set, the default write concern cannot be unset (added in MongoDB 5.0), but this is a minor omission rather than an error.
- `heartbeatIntervalMillis` is documented as "internal use only" in the MongoDB 7.0 replica set configuration reference. Setting it via `rs.reconfig` works for tuning but is not a publicly tunable knob; readers should be aware that adjusting it is not officially supported.
- The `cacheSizeGB: 2` value in the example is illustrative and may not match the stated formula ("50% of RAM minus 1GB") for the 4GB minimum RAM mentioned in prerequisites; users should compute the correct value for their server.
- `openssl rand -base64 756` produces ~1008 base64 characters, which fits within MongoDB's 6–1024 character keyfile range — this matches MongoDB's documented recommendation.
- `net-tools` (used by the `netstat` examples) is no longer installed by default on modern Ubuntu; the post correctly installs it in Step 1.
- `telnet` (used in the troubleshooting section) is also not installed by default on Ubuntu 22.04; readers may need to install it or substitute with `nc -vz mongo1 27017`. Not technically incorrect but worth noting.
