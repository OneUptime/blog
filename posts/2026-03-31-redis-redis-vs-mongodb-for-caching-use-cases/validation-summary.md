# Validation Summary: Redis vs MongoDB for Caching Use Cases

## Status
validated

## Post Type
Comparison / Technical Guide

## Technologies Covered
- Redis (in-memory data structure store)
- MongoDB (document database, WiredTiger storage engine)
- Python redis-py client library
- Python PyMongo client library

## Sources Consulted
- Redis SET command documentation: https://redis.io/docs/latest/commands/set/
- Redis ZADD / ZREVRANGE documentation: https://redis.io/docs/latest/commands/zadd/
- MongoDB TTL Indexes documentation: https://www.mongodb.com/docs/manual/core/index-ttl/
- MongoDB $inc operator documentation: https://www.mongodb.com/docs/manual/reference/operator/update/inc/
- PyMongo find_one API (hint parameter): https://pymongo.readthedocs.io/en/stable/api/pymongo/collection.html
- redis-py API documentation: https://redis-py.readthedocs.io/en/stable/

## Issues Found

1. **Incorrect claim: "atomic INCR is impossible in MongoDB"** (line 132)
   - **What was wrong:** The post stated that atomic INCR is impossible in MongoDB. This is factually incorrect — MongoDB supports atomic increments via the `$inc` operator in `updateOne` and `findOneAndUpdate`.
   - **What was changed:** Replaced "atomic INCR is impossible in MongoDB" with "atomic INCR is simpler and faster than MongoDB's $inc", which accurately reflects that Redis INCR is more ergonomic and performant for rate limiting without making a false impossibility claim.

2. **Misleading comment about WiredTiger cache control** (line 121)
   - **What was wrong:** The comment `hint="cache_index"  # Use in-memory WiredTiger cache` implied that using a query hint controls WiredTiger's internal cache behavior. This is incorrect — the `hint` parameter tells MongoDB's query planner which index to use; WiredTiger manages its own cache automatically based on access patterns.
   - **What was changed:** Updated the comment to `hint="cache_index"  # Hint MongoDB to use a specific index`, which accurately describes what the parameter does.

## Review Notes
- `datetime.utcnow()` is used throughout the post. This was deprecated in Python 3.12 in favor of `datetime.now(datetime.UTC)`. Since it still functions correctly and is widely used in existing codebases, this was not changed, but readers targeting Python 3.12+ should be aware of the deprecation.
- `r.zrevrange()` is deprecated in redis-py 4.x+ in favor of `r.zrange(..., rev=True)`. The deprecated method still works, so this was not changed, but it is worth noting for future updates.
- The latency figures in the comparison table are approximate and reasonable for typical deployments, though actual numbers will vary based on hardware, network topology, and workload characteristics.
