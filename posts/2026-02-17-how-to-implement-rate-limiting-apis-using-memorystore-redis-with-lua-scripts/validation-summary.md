# Validation Summary: How to Implement Rate Limiting APIs Using Memorystore Redis with Lua Scripts

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Google Cloud Memorystore for Redis
- Google Cloud CLI
- Redis Lua scripting
- Redis hashes, counters, sorted sets, expiration, and SCAN
- redis-py
- Python
- FastAPI

## Sources Consulted
- Google Cloud Memorystore for Redis create/manage instances documentation: https://cloud.google.com/memorystore/docs/redis/create-manage-instances
- Google Cloud CLI `gcloud redis instances create` reference: https://cloud.google.com/sdk/gcloud/reference/redis/instances/create
- Google Cloud Memorystore for Redis supported versions: https://cloud.google.com/memorystore/docs/redis/supported-versions
- Redis Lua scripting documentation: https://redis.io/docs/latest/develop/programmability/eval-intro/
- Redis Lua API reference and type conversion rules: https://redis.io/docs/latest/develop/programmability/lua-api/
- Redis `HMSET` command documentation: https://redis.io/docs/latest/commands/hmset/
- Redis `ZRANGE` command documentation: https://redis.io/docs/latest/commands/zrange/
- Redis `SCAN` command documentation: https://redis.io/docs/latest/commands/scan/
- redis-py Lua scripting documentation: https://redis.readthedocs.io/en/stable/lua_scripting.html
- FastAPI middleware documentation: https://fastapi.tiangolo.com/tutorial/middleware/

## Issues Found
- The Memorystore setup comment said Basic tier was acceptable when losing counts during failover is acceptable. Basic tier does not provide a replica failover path, so the comment was changed to refer to losing counts during an outage or restart.
- The fixed-window limiter used wall-clock bucket IDs in the key but set the key TTL to a full window from the first request. That made `Retry-After` potentially longer than the actual fixed-window reset. The code now expires the key at the current bucket boundary and returns a TTL that matches the reset time.
- The sliding-window request ID used `id(object())`, which is not a reliable uniqueness strategy because object IDs can be reused. The example now uses a timestamp plus `uuid.uuid4()`.
- The token bucket script used `HMSET`, which Redis marks deprecated as of Redis 4.0. The script now uses multi-field `HSET`.
- The token bucket script returned fractional Lua numbers directly. Redis Lua converts returned Lua numbers to integer replies by default, dropping the decimal part. The script now returns the fractional token value as a string and the Python code parses it with `float()`.
- The FastAPI snippet referenced `TOKEN_BUCKET_SCRIPT` and `check_token_bucket` without defining or importing them, and imported unused modules. The snippet now imports `check_token_bucket` from the previous token bucket module, and the token bucket example guards its demo call with `if __name__ == "__main__":` so it can be imported safely.

## Review Notes
The Python snippets were checked with `ast.parse` after edits. The local environment did not have `gcloud` or the `redis`/`fastapi` Python packages installed, so command and API validation used official documentation rather than local execution.
