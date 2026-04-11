# Validation Summary: How to Use Redis with Apache Superset for Dashboard Caching

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Redis
- Apache Superset
- Flask-Caching (cachelib)
- Celery
- Python (requests library)

## Sources Consulted
- Apache Superset caching configuration documentation (https://superset.apache.org/docs/configuration/cache/)
- Apache Superset async queries / Celery documentation (https://superset.apache.org/docs/configuration/async-queries-celery/)
- Apache Superset REST API reference (https://superset.apache.org/docs/api/)
- Flask-Caching configuration documentation (https://flask-caching.readthedocs.io/)
- Apache Superset PyPI package page (https://pypi.org/project/apache-superset/)
- Redis CLI documentation (https://redis.io/docs/manual/cli/)

## Issues Found

1. **Invalid pip extra `[redis]`**: The install command was `pip install apache-superset[redis] celery redis`. The `[redis]` extra does not exist in the `apache-superset` PyPI package. Changed to `pip install apache-superset celery redis`.

2. **Unused and misleading import**: `from cachelib.redis import RedisCache` was imported at the top of the config example but never used. The dictionary-based `CACHE_CONFIG` uses the string `"RedisCache"` for `CACHE_TYPE`, which Flask-Caching resolves internally without requiring an explicit import. Removed the import to avoid reader confusion.

3. **Login API code did not handle JWT token**: The Superset `/api/v1/security/login` endpoint returns a JWT access token in the response body. The original code used `requests.Session()` and discarded the login response, meaning subsequent API calls would be unauthenticated. Fixed by capturing the response, extracting `access_token`, and setting the `Authorization: Bearer` header on the session.

4. **`xargs` missing `-n 1` flag in Redis monitoring command**: The `MEMORY USAGE` Redis command accepts exactly one key. Without `-n 1`, `xargs` would pass multiple keys as arguments to a single `redis-cli MEMORY USAGE` invocation, which would fail. Added `-n 1` to process one key at a time.

## Review Notes
- The `superset cache-warmup` CLI command was available in earlier Superset versions. In newer Superset releases (3.x+), cache warming may be handled via API endpoints (`/api/v1/chart/warm_up_cache`) or Celery tasks instead. The command shown may not work in all versions.
- The Superset REST API also requires a CSRF token for state-changing requests (PUT/POST/DELETE) in production configurations. The chart update example omits this for brevity, which is acceptable for a tutorial but readers should be aware.
- The `GLOBAL_ASYNC_QUERIES` feature flag requires Redis 5.0+ and additional configuration (`GLOBAL_ASYNC_QUERIES_REDIS_CONFIG`) not shown in the post.
- All cache config keys (`CACHE_CONFIG`, `FILTER_STATE_CACHE_CONFIG`, `EXPLORE_FORM_DATA_CACHE_CONFIG`) and their field names are correct for current Superset versions.
- The Celery app path `superset.tasks.celery_app:app` and all Celery configuration options are correct.
