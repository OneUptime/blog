# Validation Summary: How to Handle Pricing and Discount Caching with Redis

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Redis
- redis-py
- ioredis
- Python
- JavaScript / Node.js
- Python Decimal
- decimal.js
- Lua scripts in Redis

## Sources Consulted
- Redis SETEX command documentation: https://redis.io/docs/latest/commands/setex/
- Redis HSET command documentation: https://redis.io/docs/latest/commands/hset/
- Redis EVAL command documentation: https://redis.io/docs/latest/commands/eval/
- Redis Lua API reference: https://redis.io/docs/latest/develop/programmability/lua-api/
- Redis redis-py guide: https://redis.io/docs/latest/develop/clients/redis-py/
- redis-py command reference: https://redis.readthedocs.io/en/stable/commands.html
- ioredis documentation: https://redis.github.io/ioredis/
- ioredis repository documentation: https://github.com/redis/ioredis
- Python decimal module documentation: https://docs.python.org/3/library/decimal.html
- decimal.js API documentation: https://mikemcl.github.io/decimal.js/

## Issues Found
- Bulk price fetching in both Python and Node.js returned `sale_price` whenever present, even outside the configured sale window. Updated both `get_prices_bulk` implementations to evaluate `sale_start` and `sale_end`, and to return sale metadata consistently with single-item price lookup.
- Coupon creation stored optional `None` values in a Redis hash for `max_discount` and `max_uses`. redis-py command arguments must be encodable Redis values, not Python `None`; updated the example to store empty strings for unset optional numeric fields.
- Coupon validation accepted coupons with product restrictions when no eligible product list was supplied, and the defined `category_ids` restriction was not checked. Updated validation to normalize empty product/category lists, reject non-matching restricted coupons, and enforce category restrictions.
- The complete pricing engine did not pass cart categories into coupon validation, so category-specific coupons could not be enforced. Updated the call to pass `category_ids`.
- `apply_coupon` could create usage counters for a missing coupon key because the Lua script only checked usage counters. Updated the script to atomically verify coupon existence, active state, and validity window before incrementing usage.

## Review Notes
The examples are tutorial-level and omit production concerns such as idempotent coupon application per order, Redis Cluster hash-slot design for Lua keys, distributed cache invalidation strategy, and replacing `KEYS` with `SCAN` for large keyspaces. These are improvement opportunities rather than correctness blockers for the post's current scope.
