# Validation Summary: How to Handle Stale Reads from Secondaries in MongoDB

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- MongoDB Replica Sets
- MongoDB Node.js Driver (`mongodb` npm package)
- PyMongo (Python MongoDB driver)
- MongoDB Read Preferences (`secondaryPreferred`, `secondary`, `primary`)
- `maxStalenessSeconds` read preference option
- MongoDB Read Concern (`majority`)
- MongoDB Causally Consistent Sessions
- `mongosh` shell helpers (`rs.status()`, `rs.printSecondaryReplicationInfo()`)

## Sources Consulted
- MongoDB Manual — Read Preference: https://www.mongodb.com/docs/manual/core/read-preference/
- MongoDB Manual — maxStalenessSeconds: https://www.mongodb.com/docs/manual/core/read-preference-staleness/
- MongoDB Manual — Read Concern "majority": https://www.mongodb.com/docs/manual/reference/read-concern-majority/
- MongoDB Manual — Causal Consistency and Read and Write Concerns: https://www.mongodb.com/docs/manual/core/causal-consistency-read-write-concerns/
- MongoDB Manual — replSetGetStatus: https://www.mongodb.com/docs/manual/reference/command/replSetGetStatus/
- MongoDB Node.js Driver — ReadPreference: https://www.mongodb.com/docs/drivers/node/current/fundamentals/connection/read-preference/
- PyMongo Documentation — Read Preferences: https://pymongo.readthedocs.io/en/stable/examples/high_availability.html

## Issues Found
1. **`maxStalenessSeconds: 30` in Node.js code example (line 45)**: The code set `maxStalenessSeconds` to 30, but the text immediately below correctly states the minimum allowed value is 90 seconds. A value of 30 would cause the MongoDB driver to throw an error at connection time. Fixed to `maxStalenessSeconds: 90` with an updated comment to match.

## Review Notes
- The "Monitoring Stale Reads" section prints `m.optimeDate` and labels it "This node lag" — this shows the timestamp of the last applied oplog entry, not the actual lag duration. Computing lag requires comparing against the primary's optimeDate. This is not technically wrong for a debugging snippet but could be more precise.
- The explanation of `majority` read concern is correct: it protects against reading data that could be rolled back during a failover. The phrasing "protecting against reading uncommitted or yet-to-replicate data" is slightly ambiguous but conveys the right idea.
- All other code examples (causal consistency sessions, read preference routing, replication lag measurement, PyMongo configuration) are syntactically correct and use current APIs.
