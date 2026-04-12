# Validation Summary: How to Perform a Rolling Restart of a MongoDB Replica Set

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB (replica sets, `mongod`, `mongosh`)
- systemd service management
- Bash scripting for automation

## Sources Consulted
- MongoDB `rs.stepDown()` documentation: https://www.mongodb.com/docs/manual/reference/method/rs.stepDown/
- MongoDB `db.hello()` documentation: https://www.mongodb.com/docs/manual/reference/method/db.hello/
- MongoDB `rs.isMaster()` deprecation notice: https://www.mongodb.com/docs/manual/reference/method/rs.isMaster/
- MongoDB `rs.status()` documentation: https://www.mongodb.com/docs/manual/reference/method/rs.status/
- MongoDB replica set member states: https://www.mongodb.com/docs/manual/reference/replica-states/

## Issues Found

1. **Incorrect comment on `rs.stepDown(60)`**: The comment said "hold primary role for max 60 more seconds during election." This is wrong — the `stepDownSecs` parameter specifies how long the member remains ineligible for re-election after stepping down. The stepdown itself happens as soon as secondaries have caught up. Fixed the comment to: "step down and remain ineligible for re-election for 60 seconds."

2. **`rs.isMaster()` is deprecated**: `rs.isMaster()` was deprecated in MongoDB 5.0 (released July 2021) in favor of `db.hello()`. Changed `rs.isMaster().primary` to `db.hello().primary`.

3. **SSH command in automation script uses host:port format**: The `MEMBERS` array contains entries like `"mongo2:27017"`, and the script used `ssh "$host"` which would try to SSH to the invalid hostname `"mongo2:27017"`. Fixed by using bash parameter expansion `${host%%:*}` to strip the port number for the SSH command, while keeping the full host:port for the `mongosh` connection check.

## Review Notes
- The automation script lacks a final wait/check for the former primary (mongo1) to rejoin as SECONDARY after its restart. This is a completeness gap rather than an error — the manual steps correctly instruct the reader to wait, but the script ends without verifying.
- The script hardcodes `mongo1:27017` as the primary, which may not always be the case in practice. A production script would dynamically determine the current primary. This is acceptable for a tutorial.
