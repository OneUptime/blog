# Validation Summary: How to Write a Script to Identify Slow Queries in MongoDB

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB (database profiler, system.profile collection, currentOp command, killOp)
- Python 3 with PyMongo driver
- JavaScript (MongoDB shell / mongosh)
- Cron (scheduling)
- YAML (mongod.conf configuration)

## Sources Consulted
- MongoDB documentation: Database Profiler — https://www.mongodb.com/docs/manual/tutorial/manage-the-database-profiler/
- MongoDB documentation: system.profile collection — https://www.mongodb.com/docs/manual/reference/database-profiler/
- MongoDB documentation: currentOp command — https://www.mongodb.com/docs/manual/reference/command/currentOp/
- MongoDB documentation: operationProfiling configuration — https://www.mongodb.com/docs/manual/reference/configuration-options/#operationprofiling-options
- MongoDB documentation: killOp command — https://www.mongodb.com/docs/manual/reference/command/killOp/
- PyMongo documentation: Database.command() — https://pymongo.readthedocs.io/en/stable/api/pymongo/database.html

## Issues Found
1. **Incorrect `currentOp` command invocation in Python (Real-Time Detection section)**
   - **What was wrong:** The code used `client.admin.command("currentOp", {"active": True, "secs_running": {"$gt": threshold_secs}})`. PyMongo's `command(name, value)` creates `{name: value}`, so this produced `{"currentOp": {"active": True, ...}}` — nesting the filter fields inside the `currentOp` value instead of placing them at the top level of the command document. The MongoDB `currentOp` command requires filter fields (`active`, `secs_running`, etc.) at the top level. With the original code, the filter would not be applied server-side, returning all operations unfiltered.
   - **What was changed:** Replaced with `client.admin.command({"currentOp": 1, "active": True, "secs_running": {"$gt": threshold_secs}})` which passes the entire command as a dictionary with filter fields at the top level, matching the documented command format.

## Review Notes
- `datetime.utcnow()` (used in the Python script) emits a deprecation warning in Python 3.12+. The recommended replacement is `datetime.now(datetime.timezone.utc)`. However, PyMongo treats naive datetimes as UTC, so the current code is functionally correct. Worth updating if targeting Python 3.12+.
- `db.killOp()` is a shell helper that still works in current MongoDB versions. For programmatic use, `db.adminCommand({ killOp: 1, op: <opid> })` is the underlying command form.
- The `system.profile` resize procedure in Best Practices is correct and follows the documented process (disable profiling, drop, recreate as capped collection, re-enable).
