# Validation Summary: How to Use Redis as a Cache for MongoDB

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Redis (redis-py, ioredis)
- MongoDB (pymongo, Node.js MongoDB driver)
- Python
- Node.js / JavaScript
- Cache-aside pattern
- Write-through caching pattern

## Sources Consulted
- redis-py documentation: https://redis-py.readthedocs.io/en/stable/ (verified `Redis.delete()`, `Redis.setex()`, `Redis.pipeline()`, `Redis.scan_iter()` APIs)
- ioredis documentation: https://github.com/redis/ioredis (verified `set` with `EX` option, `del`, `get` APIs)
- PyMongo documentation: https://pymongo.readthedocs.io/en/stable/ (verified `find_one`, `update_one`, `delete_one`, `insert_one`, `aggregate` APIs)
- MongoDB Node.js Driver documentation: https://www.mongodb.com/docs/drivers/node/current/ (verified `MongoClient`, `findOne` with `projection`, `updateOne`)
- Redis command reference: https://redis.io/commands/ (verified DEL does not support glob patterns, SCAN does)

## Issues Found

1. **`r.delete("products:list:*")` does not support glob patterns (Cache Invalidation section)**
   - **What was wrong:** The `DEL` command in Redis (and `r.delete()` in redis-py) takes literal key names, not glob patterns. Calling `r.delete("products:list:*")` attempts to delete a key literally named `"products:list:*"`, which almost certainly does not exist. The comment even noted "(requires SCAN)" but the code did not use it.
   - **What was changed:** Replaced `r.delete("products:list:*")` with `invalidate_pattern("products:list:*")`, which uses the `scan_iter`-based helper function defined immediately below in the same code block.
   - **Why:** The `invalidate_pattern` function correctly uses `SCAN` to find matching keys and then deletes them, which is the proper way to delete keys by pattern in Redis.

2. **Double JSON encoding in `get_products_by_category` (Caching Query Lists section)**
   - **What was wrong:** `json.dumps([serialize_doc(d) for d in docs])` double-encoded the documents. `serialize_doc()` already returns a JSON string, so wrapping a list of JSON strings in `json.dumps()` produced a JSON array of escaped strings (e.g., `["{\\"_id\\": ...}", ...]`) instead of a JSON array of objects. After `json.loads()`, the caller would receive a list of strings rather than a list of dicts.
   - **What was changed:** Changed to `serializable_docs = [json.loads(serialize_doc(d)) for d in docs]` followed by `serialized = json.dumps(serializable_docs)`, and returned `serializable_docs` directly instead of re-parsing the serialized string.
   - **Why:** Each document must first be deserialized from the `serialize_doc` output back to a dict before the list is serialized as a whole, ensuring proper single-level JSON encoding.

## Review Notes
- The `serialize_doc` helper returns a JSON string, which works well for single-document caching but creates a footgun when used in list contexts (as seen in issue #2). A future improvement could be to split it into a function that returns a serializable dict and a separate one that returns a JSON string.
- The `insert_one` call in `create_product` already mutates the input `product_data` dict by adding `_id`, so the subsequent `product_data['_id'] = result.inserted_id` is redundant (though not incorrect). This is a minor style note, not a bug.
- The negative caching of `json.dumps(None)` (which produces the string `"null"`) works correctly because `"null"` is truthy and `json.loads("null")` returns Python `None`. This is a valid pattern.
