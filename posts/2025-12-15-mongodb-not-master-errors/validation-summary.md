# Validation Summary: How to Fix 'not master' Errors in MongoDB Replica Set

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- MongoDB replica sets
- MongoDB Node.js driver
- MongoDB read preferences
- MongoDB retryable reads and writes
- MongoDB transactions
- mongosh replica set diagnostics

## Sources Consulted
- MongoDB Manual: Replica Set Primary - https://www.mongodb.com/docs/manual/core/replica-set-primary/
- MongoDB Manual: Replica Set Secondary Members - https://www.mongodb.com/docs/manual/core/replica-set-secondary/
- MongoDB Manual: Error Codes - https://www.mongodb.com/docs/manual/reference/error-codes/
- MongoDB Manual: hello command - https://www.mongodb.com/docs/manual/reference/command/hello/
- MongoDB Manual: db.hello() mongosh method - https://www.mongodb.com/docs/manual/reference/method/db.hello/
- MongoDB Manual: rs.status() mongosh method - https://www.mongodb.com/docs/manual/reference/method/rs.status/
- MongoDB Manual: replSetStepDown command - https://www.mongodb.com/docs/manual/reference/command/replsetstepdown/
- MongoDB Manual: Read Preference - https://www.mongodb.com/docs/manual/core/read-preference/
- MongoDB Manual: Retryable Writes - https://www.mongodb.com/docs/manual/core/retryable-writes/
- MongoDB Node.js Driver: Connection Options - https://www.mongodb.com/docs/drivers/node/current/connect/connection-options/
- MongoDB Node.js Driver: Monitoring Application Events - https://www.mongodb.com/docs/drivers/node/current/monitoring-and-logging/monitoring/
- MongoDB Node.js Driver: Transactions - https://www.mongodb.com/docs/drivers/node/current/crud/transactions/
- MongoDB Node.js Driver: Configure CRUD Operations - https://www.mongodb.com/docs/drivers/node/current/crud/configure/
- MongoDB Node.js Driver: Run a Database Command - https://www.mongodb.com/docs/drivers/node/current/run-command/

## Issues Found
- The not-primary error code helper used outdated or incorrect names and omitted the current `NotPrimaryOrSecondary` code. Updated the comments and code list to use `NotWritablePrimary` (`10107`), `NotPrimaryNoSecondaryOk` (`13435`), `NotPrimaryOrSecondary` (`13436`), and `LegacyNotPrimary` (`10058`).
- The retry example called `sleep()` without defining it. Added a small Promise-based helper so the snippet works as shown.
- The direct-secondary and connection-string snippets redeclared the same `const` names in one JavaScript block. Renamed the variables so the examples are syntactically valid.
- The topology monitoring example implied `monitorCommands` enables topology-change events. Removed that option because the example uses SDAM events, not command monitoring.
- The read preference example used a cursor-level method that is less aligned with the current Node.js driver examples. Updated it to set read preference through collection options.
- The mongosh diagnostic snippet used `rs.hello()`, which is not the documented mongosh helper. Changed it to `db.hello()`.
- The connection-string verification snippet used `client.topology`, an internal driver detail. Replaced it with the documented `hello` command output.
- The transaction section claimed transactions automatically retry not-master errors while showing the Core API. Rewrote the sample to use `session.withTransaction()`, which is the documented convenient transaction API with retry handling for transient transaction errors.
- The final summary over-specified not-master errors as only writes to secondaries. Adjusted it to say the application reached a node that is not the writable primary.

## Review Notes
- MongoDB still exposes legacy "not master" wording in older deployments and client errors, but current documentation uses "not primary" and `NotWritablePrimary`.
- Retryable reads and writes are enabled by default in current MongoDB Node.js driver connection options, but showing them explicitly remains valid for clarity.
- `primaryPreferred` can return stale data during failover; it is appropriate only for reads that can tolerate that behavior.
