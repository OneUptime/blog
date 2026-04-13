# Validation Summary: How to Implement Distributed Locks with MongoDB

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB (TTL indexes, findOneAndUpdate, upsert)
- Python (PyMongo driver)
- Distributed systems concepts (distributed locking, mutual exclusion)

## Sources Consulted
- PyMongo official documentation — `find_one_and_update` API: https://pymongo.readthedocs.io/en/stable/api/pymongo/collection.html
- PyMongo `ReturnDocument` enum: https://pymongo.readthedocs.io/en/stable/api/pymongo/collection.html#pymongo.collection.ReturnDocument
- MongoDB Manual — TTL Indexes: https://www.mongodb.com/docs/manual/core/index-ttl/
- MongoDB Manual — `findOneAndUpdate`: https://www.mongodb.com/docs/manual/reference/method/db.collection.findOneAndUpdate/
- MongoDB Manual — `$exists` operator: https://www.mongodb.com/docs/manual/reference/operator/query/exists/
- MongoDB SERVER-37124 — upsert duplicate key retry behavior: https://jira.mongodb.org/browse/SERVER-37124

## Issues Found

### 1. Dead `$or` condition in `acquire_lock` filter
**What was wrong:** The filter included `{"_id": {"$exists": False}}` inside a `$or` clause alongside `{"expiresAt": {"$lt": now}}`. Since the filter already specifies `"_id": lock_name` at the top level, any matched document necessarily has `_id`, making the `$exists: False` branch always false — it was dead code. The intent was to handle the "lock doesn't exist yet" case, but that scenario is handled by the `upsert=True` behavior (inserting when no document matches), not by the `$or` condition.
**What was changed:** Removed the `$or` wrapper and the dead `$exists` condition, simplifying the filter to `{"_id": lock_name, "expiresAt": {"$lt": now}}`.

### 2. Missing `DuplicateKeyError` handling
**What was wrong:** When the lock is currently held (document exists, `expiresAt` is in the future), the filter does not match any document. With `upsert=True`, MongoDB attempts to insert a new document with the same `_id`, which raises a `DuplicateKeyError`. The original code had no exception handling for this, meaning the `acquire_lock` function would crash instead of returning `None` when the lock was already held.
**What was changed:** Added a `try/except DuplicateKeyError` block around the `find_one_and_update` call, returning `None` on duplicate key (indicating the lock is held). Added the necessary import: `from pymongo.errors import DuplicateKeyError`.

### 3. Non-idiomatic `return_document=True`
**What was wrong:** While `return_document=True` works because `ReturnDocument.AFTER` is internally defined as `True`, it is not the documented or idiomatic usage. The official PyMongo documentation specifies using `ReturnDocument.AFTER`.
**What was changed:** Changed `return_document=True` to `return_document=ReturnDocument.AFTER` and added `ReturnDocument` to the pymongo import.

### 4. Inaccurate "Duplicate key on upsert" edge case description
**What was wrong:** The original text stated that `upsert=True` "prevents race conditions," implying the behavior was seamless. In reality, the losing process receives a `DuplicateKeyError` exception that must be caught.
**What was changed:** Updated the text to accurately describe that the losing process receives a `DuplicateKeyError`, which the code catches and treats as a failed acquisition.

## Review Notes
- The blog correctly notes that MongoDB's TTL reaper runs approximately every 60 seconds, which means expired locks may persist briefly. This is an important caveat for users considering this approach.
- The clock skew section recommends using `$$NOW` for server-side timestamps. This is valid advice, but `$$NOW` only works within aggregation pipeline-style updates (array syntax). The code examples use standard update operators, so adopting `$$NOW` would require changing the update to pipeline syntax (e.g., `[{"$set": {"acquiredAt": "$$NOW"}}]`). This is not a bug in the post — it's mentioned as a recommendation, not implemented in the code — but users should be aware of the syntax difference.
- The `return_document=True` pattern, while functional, could confuse readers unfamiliar with PyMongo internals. Using the explicit `ReturnDocument.AFTER` constant is clearer and matches official documentation examples.
