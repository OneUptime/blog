# Validation Summary: How to Keep Redis and Elasticsearch in Sync

## Status
validated

## Post Type
Technical guide / tutorial

## Technologies Covered
- Redis
- Redis Streams
- Redis Pub/Sub
- Elasticsearch
- Python
- redis-py
- Elasticsearch Python client

## Sources Consulted
- Redis-py command documentation: https://redis.readthedocs.io/en/stable/commands.html
- Redis XREADGROUP command documentation: https://redis.io/docs/latest/commands/xreadgroup/
- Redis XACK command documentation: https://redis.io/docs/latest/commands/xack/
- Redis SCAN command documentation: https://redis.io/docs/latest/commands/scan/
- Elasticsearch Python client API documentation: https://elasticsearch-py.readthedocs.io/en/latest/api/elasticsearch.html
- Elasticsearch Python helper documentation: https://elasticsearch-py.readthedocs.io/en/stable/api_helpers.html
- Elastic transport response documentation: https://elastic-transport-python.readthedocs.io/en/latest/responses.html
- Elasticsearch refresh parameter documentation: https://www.elastic.co/docs/reference/elasticsearch/rest-apis/refresh-parameter

## Issues Found
- Redis `setex` is still available in redis-py, but current redis-py documentation marks it deprecated and recommends `SET` with the `EX` option. Replaced `setex(...)` calls with `set(..., ex=...)`, including the pipeline example.
- The cached search example attempted to `json.dumps()` the Elasticsearch `search()` response directly. Current Elasticsearch Python clients return an `ObjectApiResponse`; the JSON body is exposed through `.body`. Updated the example to cache and return `response.body`.

## Review Notes
- Python code blocks were checked with `ast.parse` and are syntactically valid.
- Redis Pub/Sub invalidation is appropriate for low-latency invalidation, but it is not durable. Redis Streams remains the better fit when replay or acknowledgments are required.
- The examples use `refresh=True` to make Elasticsearch writes immediately searchable. This is technically correct, but it can reduce indexing throughput in production workloads.
