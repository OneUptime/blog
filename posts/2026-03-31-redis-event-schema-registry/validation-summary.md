# Validation Summary: How to Implement Event Schema Registry with Redis

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Redis (Hashes, Sorted Sets, Streams)
- Python (redis-py client library)
- JSON Schema (jsonschema Python library)
- Event Sourcing / Event-Driven Architecture

## Sources Consulted
- Redis HSET documentation: https://redis.io/docs/latest/commands/hset/
- Redis HGET documentation: https://redis.io/docs/latest/commands/hget/
- Redis HKEYS documentation: https://redis.io/docs/latest/commands/hkeys/
- Redis ZADD documentation: https://redis.io/docs/latest/commands/zadd/
- Redis XADD documentation: https://redis.io/docs/latest/commands/xadd/
- redis-py GitHub repository: https://github.com/redis/redis-py
- jsonschema PyPI page: https://pypi.org/project/jsonschema/
- Confluent Schema Registry compatibility documentation: https://docs.confluent.io/platform/current/schema-registry/fundamentals/schema-evolution.html

## Issues Found
- **Inverted backward compatibility check logic**: The `check_backward_compatible` function checked `old_required - new_required` (removed required fields) and flagged removals as breaking changes. This is incorrect. Backward compatibility means a consumer using the NEW schema can read data written with the OLD schema. The actual breaking change is *adding* new required fields to the new schema, because old data won't contain them and will fail validation. Removed required fields are backward compatible since old data still satisfies the relaxed constraint. Fixed by changing the set difference to `new_required - old_required` and updating the error message from "removed required fields" to "added required fields."

## Review Notes
- All Redis commands (HSET, HGET, HKEYS, ZADD, XADD) use correct syntax and are available in modern Redis versions (4.0+).
- All redis-py API calls use the correct signatures for redis-py >= 3.0.
- The jsonschema.validate() call is correct.
- The `register_schema` function does not automatically update the `schema:latest` hash, which is managed separately via manual HSET. This is a design choice, not a bug, but readers building a production system would want to update `schema:latest` atomically within `register_schema`.
- The `get_latest_version` function defaults to version 1 when no version is found. This could be misleading if version 1 hasn't been registered yet, but is acceptable for a tutorial context.
- The compatibility check only examines required fields. A production schema registry would also need to check for removed properties, type changes, and other structural incompatibilities.
