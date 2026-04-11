# Validation Summary: How to Export Redis Data to MongoDB

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Python (redis-py library)
- Redis (SCAN, TYPE, TTL, GET, HGETALL, LRANGE, SMEMBERS, ZRANGE, RANDOMKEY, DBSIZE)
- MongoDB (pymongo: MongoClient, replace_one, bulk_write, create_index, count_documents, find_one)
- pymongo bulk operations (ReplaceOne)

## Sources Consulted
- redis-py official documentation: https://redis-py.readthedocs.io/en/stable/
- pymongo official documentation: https://pymongo.readthedocs.io/en/stable/
- Python datetime documentation: https://docs.python.org/3/library/datetime.html#datetime.datetime.utcnow
- MongoDB TTL index documentation: https://www.mongodb.com/docs/manual/core/index-ttl/

## Issues Found

1. **Unused `import json`**: The `json` module was imported in the setup section but never used in any code example. Removed the unused import.

2. **Deprecated `datetime.utcnow()`**: `datetime.utcnow()` has been deprecated since Python 3.12 (October 2023). Replaced all occurrences (4 total) with `datetime.now(timezone.utc)` and updated the import to `from datetime import datetime, timezone`.

3. **Incomplete spot check in `validate_export()`**: The validation function only searched the `strings` and `hashes` collections when spot-checking a random key. If the random key happened to be a list, set, or sorted set, it would report a false warning. Fixed to search all five collections (`strings`, `hashes`, `lists`, `sets`, `sorted_sets`).

## Review Notes
- All redis-py API calls (`scan_iter`, `type`, `ttl`, `get`, `hgetall`, `lrange`, `smembers`, `zrange`, `dbsize`, `randomkey`) are correct and current.
- All pymongo API calls (`MongoClient`, `replace_one`, `bulk_write`, `create_index`, `count_documents`, `find_one`, `ReplaceOne`) are correct for pymongo 4.x.
- The `pymongo.ReplaceOne` access pattern is valid since pymongo re-exports it at the package level.
- The TTL index using `expireAfterSeconds` is correctly configured, though the post uses a hardcoded 86400 seconds (24 hours) rather than mapping individual Redis TTLs to MongoDB TTL expiration, which is a design choice rather than an error.
- The `scan_iter(pattern, count=batch_size)` usage is correct — `match` is the first positional parameter.
