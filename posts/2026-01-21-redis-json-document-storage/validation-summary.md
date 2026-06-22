# Validation Summary: How to Use Redis JSON for Document Storage

## Status
validated

## Post Type
Tutorial / technical guide

## Technologies Covered
- Redis Stack
- RedisJSON / Redis JSON commands
- Redis JSONPath syntax
- RediSearch / Redis Search JSON indexing
- redis-py
- node-redis
- Docker and Docker Compose
- Python
- Node.js

## Sources Consulted
- Redis Stack Docker documentation: https://redis.io/docs/latest/operate/oss_and_stack/install/archive/install-stack/docker/
- Redis JSON data type documentation: https://redis.io/docs/latest/develop/data-types/json/
- Redis JSONPath documentation: https://redis.io/docs/latest/develop/data-types/json/path/
- Redis `JSON.SET` command documentation: https://redis.io/docs/latest/commands/json.set/
- Redis `JSON.NUMMULTBY` command documentation: https://redis.io/docs/latest/commands/json.nummultby/
- Redis Search JSON indexing documentation: https://redis.io/docs/latest/develop/ai/search-and-query/indexing/
- redis-py JSON/Search documentation: https://redis.io/docs/latest/develop/clients/redis-py/queryjson/
- redis-py API documentation: https://redis.readthedocs.io/en/latest/
- node-redis documentation: https://redis.io/docs/latest/develop/clients/nodejs/
- Python `datetime` documentation: https://docs.python.org/3/library/datetime.html

## Issues Found
- The Docker Compose example manually loaded Redis Stack modules with `redis-server --loadmodule`. Redis Stack images already load bundled modules, and the official Docker docs use `REDIS_ARGS` for Redis server arguments. Changed the Compose snippet to set `REDIS_ARGS: "--appendonly yes"`.
- The post described RedisJSON storage as "memory efficiency" from an optimized binary format. Redis documentation notes JSON is stored internally for efficient access, but this can be more expensive than serialized JSON. Reworded the claim to focus on efficient subdocument access.
- The array example called `JSON.ARRINDEX store:1 $.tags` even though `store:1` did not contain a `tags` array. Added a `tags` array to the sample document.
- The numeric examples used `JSON.NUMMULTBY` and redis-py's `nummultby()`, which are deprecated for RedisJSON 2.x/current Redis JSON. Replaced the CLI example with `JSON.SET` of the computed discounted value and removed the Python wrapper method.
- The Node.js wrapper passed the custom `prefix` option through to `redis.createClient()`. Changed the constructor to remove `prefix` before passing options to node-redis.
- The redis-py RediSearch import used the old `redis.commands.search.indexDefinition` module path. Updated it to the current documented `redis.commands.search.index_definition` import.
- The versioning snippet used `datetime.utcnow()` without an import and with a deprecated API. Added the import and changed it to `datetime.now(timezone.utc).isoformat()`.
- The partial update helper converted `scores[0]` into `$.scores.[0]`, which is not the JSONPath form shown in Redis examples. Changed the conversion to preserve array-index syntax as `$.scores[0]`.

## Review Notes
- RedisJSON `$` paths return JSONPath-style results, often arrays for matching values. The post's Python and Node helper methods unwrap single-item lists in selected accessor methods, which is appropriate for the examples but worth calling out in future revisions if expanding the guide.
- Some Redis CLI examples are formatted across multiple lines for readability. They are technically correct command forms but may need line continuations or single-line formatting if intended for direct copy/paste into `redis-cli`.
