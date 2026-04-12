# Validation Summary: How to Write a Script to Clean Up Unused Indexes in MongoDB

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB (aggregation pipeline, `$indexStats`, `dropIndex`, `getIndexes`, `serverStatus`)
- Python 3 with PyMongo driver
- mongosh (MongoDB Shell)
- WiredTiger storage engine

## Sources Consulted
- MongoDB `$indexStats` aggregation stage documentation: https://www.mongodb.com/docs/manual/reference/operator/aggregation/indexStats/
- PyMongo `Collection.aggregate()` documentation: https://pymongo.readthedocs.io/en/stable/api/pymongo/collection.html#pymongo.collection.Collection.aggregate
- PyMongo `Collection.drop_index()` documentation: https://pymongo.readthedocs.io/en/stable/api/pymongo/collection.html#pymongo.collection.Collection.drop_index
- MongoDB `dropIndex` command documentation: https://www.mongodb.com/docs/manual/reference/method/db.collection.dropIndex/
- MongoDB `serverStatus` WiredTiger cache fields: https://www.mongodb.com/docs/manual/reference/command/serverStatus/#wiredtiger
- Python `datetime.utcnow()` deprecation (Python 3.12): https://docs.python.org/3/library/datetime.html#datetime.datetime.utcnow

## Issues Found
1. **`datetime.utcnow()` is deprecated since Python 3.12**: The script used `datetime.utcnow()` which has been deprecated since Python 3.12 (released October 2023) and emits a `DeprecationWarning`. Replaced with `datetime.now(timezone.utc)` and added `timezone` to the import from `datetime`. This is the recommended migration path per the Python documentation.

2. **Sample output count mismatch**: The sample dry-run output stated "Found 3 unused index(es):" but only listed 2 indexes (`orders.status_1` and `users.legacy_username_1`). Changed the count to "Found 2 unused index(es):" to match the actual listed output.

## Review Notes
- The script correctly protects the `_id_` index from deletion. MongoDB itself also prevents dropping `_id_`, but the early skip is good practice to avoid unnecessary error handling.
- The `$indexStats` reset-on-restart caveat is correctly documented in the Best Practices section. The recommendation to wait 7-14 days is reasonable.
- The post correctly notes that `dropIndex` causes a brief lock. In MongoDB 4.2+, this is an exclusive collection-level lock (blocking both reads and writes briefly), not just a write lock, but the practical guidance to drop during off-peak hours is sound regardless.
- The script does not handle system collections (e.g., those prefixed with `system.`). `list_collection_names()` may return these depending on the MongoDB version and configuration, but `$indexStats` would simply fail on them, which the script handles via the try/except. This is acceptable.
