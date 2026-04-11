# Validation Summary: How to Cache LLM Responses with Redis

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Redis (with RediSearch / Redis Stack for vector search)
- Python redis-py client
- OpenAI Python SDK (chat completions API)
- sentence-transformers (all-MiniLM-L6-v2 model)
- NumPy
- hashlib (SHA-256 hashing)

## Sources Consulted
- Redis FT.CREATE documentation: https://redis.io/docs/latest/commands/ft.create/
- Redis FT.SEARCH documentation: https://redis.io/docs/latest/commands/ft.search/
- Redis vector search query syntax (KNN, DIALECT 2): https://redis.io/docs/latest/develop/interact/search-and-query/query/vector-search/
- OpenAI Python SDK chat completions API: https://platform.openai.com/docs/api-reference/chat/create
- sentence-transformers documentation (SentenceTransformer.encode): https://www.sbert.net/docs/package_reference/SentenceTransformer.html
- Python 3 built-in float() documentation: https://docs.python.org/3/library/functions.html#float
- redis-py hset and expire documentation: https://redis-py.readthedocs.io/en/stable/commands.html

## Issues Found

### 1. TypeError in `tracked_call` — `float()` called on bytes
- **What was wrong:** The `tracked_call` function used `float(result[2][1])` to parse the KNN score. Because `r_bin` is created with `decode_responses=False`, field values from `FT.SEARCH` are returned as `bytes`. Python 3's `float()` does not accept `bytes` and raises `TypeError: float() argument must be a string or a real number, not 'bytes'`.
- **What was changed:** Changed `float(result[2][1])` to `float(result[2][1].decode())`.
- **Why:** The bytes must be decoded to a string before converting to float. The earlier `semantic_cached_call` function correctly decoded bytes before parsing, but `tracked_call` did not.

### 2. Unused TTL parameter in `semantic_cached_call`
- **What was wrong:** The `semantic_cached_call` function accepts a `ttl` parameter (default 86400 seconds) but never applied it. After storing the cached entry with `r_bin.hset()`, no expiry was set on the key, so cached entries would persist indefinitely.
- **What was changed:** Added `r_bin.expire(f"llm:sem:{cache_id}", ttl)` after the `hset` call.
- **Why:** The function signature clearly indicates TTL was intended. Without it, the semantic cache grows unbounded, which is both a correctness issue (stale responses) and an operational concern (memory growth).

## Review Notes
- The COSINE distance threshold of 0.12 is reasonable but users should be advised to tune this carefully for their domain. Too high and you get false cache hits with incorrect answers; too low and the cache rarely activates.
- The `all-MiniLM-L6-v2` model produces 384-dimensional vectors, which correctly matches the `DIM 384` in the FT.CREATE schema.
- The exact-match cache normalizes prompts via `.strip().lower()` before hashing, which is a good practice for reducing trivial misses.
- The RediSearch FT.CREATE command will raise an error if the index already exists. Production code should wrap it in a try/except or use `FT.CREATE ... IF NOT EXISTS` (available in newer Redis Stack versions).
- The post uses `execute_command` for RediSearch operations rather than the higher-level `redis.commands.search` module. This works but is lower-level than necessary with modern redis-py versions that include search client support.
