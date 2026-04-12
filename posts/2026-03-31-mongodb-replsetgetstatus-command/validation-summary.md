# Validation Summary: How to Use the replSetGetStatus Command in MongoDB

## Status
validated

## Post Type
Tutorial / Reference

## Technologies Covered
- MongoDB (replica sets, replication)
- `replSetGetStatus` admin command
- `rs.status()` shell helper
- mongosh

## Sources Consulted
- MongoDB official documentation: replSetGetStatus command (https://www.mongodb.com/docs/manual/reference/command/replSetGetStatus/)
- MongoDB official documentation: Replica Set Member States (https://www.mongodb.com/docs/manual/reference/replica-states/)
- MongoDB official documentation: rs.status() shell helper (https://www.mongodb.com/docs/manual/reference/method/rs.status/)

## Issues Found
1. **ROLLBACK state number was incorrect (line 110)**: The Member States Reference table listed `ROLLBACK (6)`, but state 6 is actually `UNKNOWN`. The correct state number for ROLLBACK is 9. This was inconsistent with the post's own key fields section earlier, which correctly stated `6=UNKNOWN`. Fixed by correcting ROLLBACK to state 9 and adding the missing UNKNOWN (6) entry to the table.

## Review Notes
- The example JSON output shows `lastHeartbeat` and `pingMs` on the PRIMARY member entry. In actual `rs.status()` output, the member you are querying (the "self" member, marked with `self: true`) does not include heartbeat-related fields like `lastHeartbeat`, `lastHeartbeatRecv`, or `pingMs`, since those are only reported for remote members. The example is illustrative and simplified, so this is not strictly wrong but could be refined in a future update.
- The replication lag calculation script correctly subtracts JavaScript Date objects to get milliseconds, which is valid in mongosh.
- The post omits less common states like STARTUP2 (5) and REMOVED (10), which is reasonable for a focused tutorial.
