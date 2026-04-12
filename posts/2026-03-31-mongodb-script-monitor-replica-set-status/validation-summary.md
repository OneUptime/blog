# Validation Summary: How to Write a Script to Monitor MongoDB Replica Set Status

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB (replica sets, oplog)
- Python 3 with PyMongo
- mongosh (MongoDB Shell)
- Cron scheduling
- Webhook alerting

## Sources Consulted
- PyMongo `bson.timestamp.Timestamp` API: https://pymongo.readthedocs.io/en/stable/api/bson/timestamp.html
- MongoDB `replSetGetStatus` command: https://www.mongodb.com/docs/manual/reference/command/replSetGetStatus/
- MongoDB oplog documentation: https://www.mongodb.com/docs/manual/core/replica-set-oplog/
- mongosh Timestamp type: https://www.mongodb.com/docs/manual/reference/method/Timestamp/

## Issues Found

1. **Python `as_datetime()` on BSON Timestamp (line 90)**: The `check_oplog_window()` function called `last["ts"].as_datetime()` and `first["ts"].as_datetime()`. The oplog `ts` field is a `bson.timestamp.Timestamp` object, which does not have an `as_datetime()` method. It exposes `.time` (Unix epoch seconds as an integer) and `.inc` (ordinal). Fixed by replacing `(last["ts"].as_datetime() - first["ts"].as_datetime()).total_seconds() / 3600` with `(last["ts"].time - first["ts"].time) / 3600`.

2. **mongosh `getHighBits()` on Timestamp (line 139)**: The "Checking Oplog Size and Window" mongosh snippet used `last.ts.getHighBits()` and `first.ts.getHighBits()`. The `Timestamp` type in mongosh does not have a `getHighBits()` method (that method belongs to `NumberLong`). The correct property for the seconds component is `.t`. Fixed by replacing `last.ts.getHighBits()` / `first.ts.getHighBits()` with `last.ts.t` / `first.ts.t`.

## Review Notes
- `datetime.utcnow()` used in the Python script is deprecated since Python 3.12 in favor of `datetime.now(datetime.UTC)`. It still functions correctly but may generate deprecation warnings on newer Python versions.
- The mongosh `db.collection.stats()` command used for oplog size is functional but `collStats` has been deprecated in MongoDB 6.2+ in favor of the `$collStats` aggregation stage. It still works for now.
- The lag calculation in the mongosh quick check measures lag from "now" rather than from the primary's `optimeDate`, which slightly overstates lag for secondaries and shows non-zero lag for the primary. This is acceptable for a quick diagnostic check.
