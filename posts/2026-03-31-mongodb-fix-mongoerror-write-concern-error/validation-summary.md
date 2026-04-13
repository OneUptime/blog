# Validation Summary: How to Fix MongoError: Write Concern Error in MongoDB

## Status
validated

## Post Type
Troubleshooting Guide

## Technologies Covered
- MongoDB (replica sets, write concern, replication)
- MongoDB Node.js Driver (MongoClient API)
- mongosh (MongoDB Shell)

## Sources Consulted
- MongoDB Write Concern documentation: https://www.mongodb.com/docs/manual/reference/write-concern/
- MongoDB `replSetGetStatus` command reference: https://www.mongodb.com/docs/manual/reference/command/replSetGetStatus/
- MongoDB Node.js Driver WriteConcern options: https://www.mongodb.com/docs/drivers/node/current/fundamentals/connection/connection-options/
- MongoDB Replica Set Status reference: https://www.mongodb.com/docs/manual/reference/command/replSetGetStatus/#output

## Issues Found

### Issue 1: Incorrect claim about `w: "majority"` on standalone instances
- **What was wrong:** Cause 4 stated that `w: "majority"` on a standalone MongoDB instance "always times out because there are no secondaries to replicate to." This is factually incorrect. MongoDB treats `w: "majority"` as equivalent to `w: 1` on standalone instances — it succeeds immediately without timeout.
- **What was changed:** Rewrote the section to accurately explain that `w: "majority"` is equivalent to `w: 1` on standalone, while still recommending explicit `w: 1` for clarity. Retitled the section to "Misconfigured Replica Set Topology" to cover the more realistic scenario where this causes issues.
- **Why:** The original claim contradicts official MongoDB documentation, which states: "For a standalone mongod, write concern 'majority' is equivalent to w: 1."

### Issue 2: Misleading replication lag monitoring code
- **What was wrong:** The monitoring script printed `m.optimeDate` and labeled it as "lag". `optimeDate` is an absolute timestamp (the time of the last operation applied), not a lag measurement. Printing it as "lag" would confuse readers.
- **What was changed:** Rewrote the monitoring snippet to compute actual replication lag by finding the primary member and calculating the millisecond difference between the primary's `optimeDate` and each member's `optimeDate`. Also added `stateStr` to the output for more useful diagnostics.
- **Why:** Replication lag is a relative measurement (difference between primary and secondary optime), not an absolute timestamp. The corrected code gives readers an actionable lag value in milliseconds.

## Review Notes
- The error code 64 (`WriteConcernFailed`) is accurate for MongoDB write concern errors.
- The write concern levels (`w: 1`, `w: "majority"`, `w: <number>`, `j: true`) are all correctly explained.
- The `wtimeoutMS` option name is correct for the current MongoDB Node.js driver (v5+/v6+).
- The recommended write concern settings by use case are reasonable and align with MongoDB best practices.
- The `rs.status()` and `replSetGetStatus` commands are both valid and current.
