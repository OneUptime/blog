# Validation Summary: How to Use redis-om-python for Object Mapping

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Redis (Redis Stack with RedisJSON and RediSearch modules)
- Python
- redis-om-python (redis-om PyPI package, v1.1.0)
- Pydantic v2
- Docker

## Sources Consulted
- redis-om-python GitHub repository: https://github.com/redis/redis-om-python
- redis-om-python source code (`redis_om/__init__.py`, model definitions, connections module)
- PyPI page for redis-om: https://pypi.org/project/redis-om/
- redis-om-python getting started documentation
- Docker Hub redis/redis-stack-server image

## Issues Found
1. **`%` operator requires `full_text_search=True`, not just `index=True`**: The `name` field on the `Product` model was defined with `Field(index=True)` but the query example used `Product.name % "Keyboard"` which requires `full_text_search=True`. Without this, redis-om raises a `QuerySyntaxError`. Fixed by adding `full_text_search=True` to the `name` field definition and updating the explanation text.
2. **Unused `Optional` import**: The code imported `from typing import Optional` but never used it. Removed to avoid confusion.

## Review Notes
- `Migrator` is a deprecated backward-compatibility alias for `SchemaDetector` in redis-om v1.1.0. The code still works, but newer projects should use `SchemaMigrator`. This was not changed since `Migrator` remains functional and is more commonly seen in existing tutorials.
- The Docker image `redis/redis-stack-server:latest` is valid but the redis-om project itself references `redis/redis-stack:latest` (which includes RedisInsight). Both work for the purposes of this tutorial. Not changed since `redis-stack-server` is the lighter-weight option and is a valid choice.
- Redis 8 now includes Search and JSON modules natively, so `redis:8` is also a valid alternative to Redis Stack. Not mentioned in the post since Redis Stack remains the more widely documented approach.
