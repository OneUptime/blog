# Validation Summary: How to Monitor Redis with Elastic APM

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Redis
- Elastic APM (Python agent `elastic-apm`, Node.js agent `elastic-apm-node`)
- Kibana APM UI
- Metricbeat Redis module
- Python `redis` library
- Node.js `ioredis` library
- Flask / Django (mentioned)

## Sources Consulted
- Elastic APM Python Agent documentation (elastic.co) and `elastic-apm` 6.x source code — verified `Client`, `instrument()`, `begin_transaction()`, `end_transaction()`, and `capture_span` APIs
- Elastic APM Node.js Agent documentation — https://www.elastic.co/docs/reference/apm/agents/nodejs/supported-technologies
- Elastic APM Node.js Agent GitHub — https://github.com/elastic/apm-agent-nodejs
- ioredis GitHub — https://github.com/redis/ioredis
- Redis command reference for SETEX — https://redis.io/docs/latest/commands/setex/
- Metricbeat Redis module documentation — https://www.elastic.co/docs/reference/beats/metricbeat/metricbeat-module-redis

## Issues Found

### 1. `begin_transaction()` used as context manager (line 56)
**What was wrong:** The code used `with elasticapm.Client().begin_transaction("request"):` but `begin_transaction()` returns a `Transaction` object that does NOT implement `__enter__`/`__exit__` — it cannot be used as a context manager with `with`.
**What was changed:** Replaced the `with` block with a direct `client_config.begin_transaction("request")` call, and removed the extra indentation level.

### 2. New `Client()` instances created instead of reusing the configured client (lines 56, 61, 66)
**What was wrong:** The transaction code called `elasticapm.Client()` (no arguments) to begin and end transactions, creating new unconfigured client instances each time. This overwrites the global client singleton, produces warnings, and the new clients lack the service_name/server_url/secret_token configuration from the setup section.
**What was changed:** Replaced all `elasticapm.Client()` calls with `client_config` — the client variable defined in the configuration code block above.

### 3. Unused import `from elasticapm import capture_span` (line 53)
**What was wrong:** `capture_span` was imported but never used in the code block.
**What was changed:** Removed the unused import line.

## Review Notes
- The `SETEX` Redis command used in both the Python and Node.js examples is considered deprecated since Redis 2.6.12 in favor of `SET key value EX seconds`. It still works and is supported by both `redis-py` and `ioredis`, so this is not an error, but authors may want to update to the modern syntax in a future revision.
- The Node.js code references `app` (Express) and `db` without defining them, which is standard for tutorial snippets showing partial application code.
- The Kibana navigation steps reference spans labeled `redis.GET` or `redis.SET` — the exact label format may vary by agent version (e.g., `Redis GET`), but the general guidance is correct.
