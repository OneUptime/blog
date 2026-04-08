# Validation Summary: How to Set Up Cross-Datacenter Replication in MongoDB

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB (replica sets, replication)
- mongod configuration (YAML config)
- MongoDB Shell (mongosh / mongo)
- Node.js MongoDB driver
- systemd (service management)

## Sources Consulted
- MongoDB Manual: Replica Set Configuration — https://www.mongodb.com/docs/manual/reference/replica-configuration/
- MongoDB Manual: Configure Custom Write Concern (getLastErrorModes) — https://www.mongodb.com/docs/manual/tutorial/configure-replica-set-tag-sets/#configure-custom-write-concern
- MongoDB Manual: setDefaultRWConcern command — https://www.mongodb.com/docs/manual/reference/command/setDefaultRWConcern/
- MongoDB Manual: Replica Set Elections — https://www.mongodb.com/docs/manual/core/replica-set-elections/
- MongoDB Manual: Read Preference — https://www.mongodb.com/docs/manual/core/read-preference/

## Issues Found

1. **`getLastErrorModes` used wrong tag keys**: The original code defined `getLastErrorModes: { multiDC: { dc1: 1, dc2: 1 } }`, using `dc1` and `dc2` as tag keys. However, the member tags use key `dc` with values `"dc1"` and `"dc2"`. The correct definition is `{ multiDC: { dc: 2 } }`, meaning the write must be acknowledged by members with at least 2 unique values of the `dc` tag. Fixed to `{ dc: 2 }`.

2. **`setDefaultRWConcern` used invalid `w` value**: The original code set `w: { dc1: 1, dc2: 1 }` as an object, but the `w` field in write concern only accepts a number, the string `"majority"`, or a custom write concern mode name (string). Fixed to `w: "multiDC"`.

3. **Code ordering contradicted the text**: The `setDefaultRWConcern` block appeared before the `getLastErrorModes` definition, even though the text stated "You must define a tag set rule in the replica set config first." Reordered so the `getLastErrorModes` definition comes first.

4. **`cfg.settings = { ... }` overwrote entire settings object**: The original code assigned a new object to `cfg.settings`, which would wipe out any existing settings (like `electionTimeoutMillis`). Fixed to `cfg.settings.getLastErrorModes = { ... }` to preserve other settings.

5. **`heartbeatTimeoutSecs` is not a valid replica set setting**: There is no `heartbeatTimeoutSecs` in MongoDB replica set configuration. The correct setting for heartbeat frequency is `heartbeatIntervalMillis` (default 2000ms). Fixed to use `heartbeatIntervalMillis` with a value of 5000ms.

## Review Notes
- The 4-member replica set topology (2 in DC1, 2 in DC2) means neither datacenter alone holds a majority (3 of 4 votes). If either datacenter goes down entirely, no automatic election can succeed. The post does address this in Step 8 by showing a forced reconfiguration for DR failover, but readers should be aware that automatic failover requires a majority of voting members to be available. A 5th member (or an arbiter in a 3rd location) would enable automatic failover when one DC goes down.
- The `printSecondaryReplicationInfo()` method in the monitoring section is deprecated in newer versions of mongosh in favor of `db.printSecondaryReplicationInfo()` which still works but may show a deprecation warning.
