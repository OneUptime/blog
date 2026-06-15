# Validation Summary: How to Store JSON Documents with RedisJSON

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Redis
- RedisJSON / Redis JSON
- Redis Stack
- Redis Search / RediSearch
- Docker
- Python
- redis-py
- JSONPath

## Sources Consulted
- Redis JSON.SET command documentation: https://redis.io/docs/latest/commands/json.set/
- Redis JSON.GET command documentation: https://redis.io/docs/latest/commands/json.get/
- Redis JSON.NUMINCRBY command documentation: https://redis.io/docs/latest/commands/json.numincrby/
- Redis JSON.ARRAPPEND command documentation: https://redis.io/docs/latest/commands/json.arrappend/
- Redis JSON.ARRPOP command documentation: https://redis.io/docs/latest/commands/json.arrpop/
- Redis JSON.MERGE command documentation: https://redis.io/docs/latest/commands/json.merge/
- Redis JSONPath documentation: https://redis.io/docs/latest/develop/data-types/json/path/
- Redis JSON RAM usage documentation: https://redis.io/docs/latest/develop/data-types/json/ram/
- Redis Stack Docker documentation: https://redis.io/docs/latest/operate/oss_and_stack/install/archive/install-stack/docker/
- redis-py command documentation: https://redis.readthedocs.io/en/stable/commands.html
- redis-py JSON command source documentation: https://redis.readthedocs.io/en/v7.1.1/_modules/redis/commands/json/commands.html
- Docker Hub redislabs/rejson image page: https://hub.docker.com/r/redislabs/rejson/

## Issues Found
- The setup section used the deprecated `redislabs/rejson:latest` Docker image. Replaced it with `redis/redis-stack-server:latest`, and exposed Redis Insight port `8001` in the `redis/redis-stack:latest` example to match Redis Stack Docker documentation.
- The `remove_from_array` helper treated `JSON.ARRPOP` with a `$` JSONPath as a single JSON string. Redis returns an array reply for JSONPath matches, so the helper now decodes each returned item and returns the single value when there is one match.
- The nested field helper claimed `JSON.SET` creates intermediate objects. Redis documentation says it can create a final object member when the parent object exists, but cannot create missing intermediate path elements. Updated the comment accordingly.
- The `JSON.MERGE` comment described availability as `Redis 7.2+`. Redis documents the command as available in Redis JSON 2.6.0, so the version note was corrected to `RedisJSON 2.6+`.
- The memory section claimed RedisJSON is more memory-efficient than serialized JSON strings. Redis documentation says Redis JSON stores values as binary data after deserialization and that this representation is often more expensive size-wise than serialized JSON. Updated the statement to recommend measuring memory for the document shape.

## Review Notes
The examples use `execute_command` rather than redis-py's higher-level `r.json()` helpers. This is still valid, but future revisions could use `r.json().set()`, `r.json().get()`, and related helpers for clearer Python examples.
