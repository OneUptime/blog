# Validation Summary: How to Write a Script to Validate MongoDB Collection Integrity

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB (query operators, `validate` command, aggregation pipeline)
- Python 3 / PyMongo
- Cron scheduling (Linux)

## Sources Consulted
- PyMongo documentation for `count_documents`, `distinct`, `aggregate`: https://pymongo.readthedocs.io/en/stable/api/pymongo/collection.html
- MongoDB query operator reference (`$exists`, `$lt`, `$gt`, `$or`): https://www.mongodb.com/docs/manual/reference/operator/query/
- MongoDB `validate` command: https://www.mongodb.com/docs/manual/reference/command/validate/
- Python 3.12 `datetime.utcnow()` deprecation notice: https://docs.python.org/3/library/datetime.html#datetime.datetime.utcnow

## Issues Found

### 1. Bug in `check_value_range` — incorrect query logic when both min and max are provided
**What was wrong:** The function built a single query dict `{field: {"$lt": min_val, "$gt": max_val}}`. MongoDB interprets multiple operators on the same field as an implicit AND, meaning the query searched for documents where the value is simultaneously less than `min_val` AND greater than `max_val`. When `min_val <= max_val` (the normal case), this condition is impossible to satisfy and always returns 0 results.

**What was changed:** Replaced the merged-dict approach with a list of conditions combined using `$or`, so the query correctly finds documents where the value is less than `min_val` OR greater than `max_val`. When only one bound is provided, the single condition is used directly without `$or`.

**Why:** Out-of-range values are those below the minimum OR above the maximum, not both simultaneously.

### 2. `datetime.utcnow()` is deprecated since Python 3.12
**What was wrong:** The script used `datetime.utcnow()`, which has been deprecated since Python 3.12 (October 2023) because it returns a naive datetime that doesn't carry timezone information, leading to subtle bugs.

**What was changed:** Replaced `datetime.utcnow()` with `datetime.now(datetime.UTC)`, the recommended replacement available since Python 3.11.

**Why:** A 2026 blog post should use current, non-deprecated APIs.

## Review Notes
- The `check_no_nulls` function queries `{field: None}`, which in MongoDB matches both documents where the field is explicitly `null` and documents where the field does not exist. This overlaps with `check_required_fields` (which uses `$exists: False`). This is not incorrect, but readers should be aware of the overlap.
- The script uses `exit(1)` rather than `sys.exit(1)`. The built-in `exit()` is intended for interactive use; `sys.exit()` is the standard for scripts. This works in practice but is not best practice.
- The cron job comment says "Run integrity checks after every deployment" but the cron schedule (`0 4 * * *`) runs daily at 4 AM, not on deployment. The comment is aspirational rather than accurate for the cron entry shown.
