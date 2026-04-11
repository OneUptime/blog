# Validation Summary: How to Scale Redis with Consistent Hashing

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Python 3 (type hints, f-strings)
- Redis (via redis-py client library)
- sortedcontainers (SortedDict for ordered key storage)
- Consistent hashing algorithm (virtual nodes / vnodes)

## Sources Consulted
- sortedcontainers official documentation — https://grantjenks.com/docs/sortedcontainers/ (SortedDict.bisect_left, indexed access on SortedValuesView)
- redis-py official documentation — https://redis-py.readthedocs.io/ (Redis.setex signature: name, time, value)
- Consistent hashing theory — Karger et al., "Consistent Hashing and Random Trees" (1/N remapping fraction claim)

## Issues Found
1. **Bug in `__init__`: `self.clients` used before assignment.**
   - **What was wrong:** `self.clients = nodes` was set *after* the `for` loop that calls `self.add_node()`. The `add_node` method's first line is `self.clients[name] = client`, which would raise `AttributeError: 'ConsistentHashRing' object has no attribute 'clients'` because `self.clients` did not yet exist.
   - **What was changed:** Moved the initialization to `self.clients = {}` before the loop, and removed the post-loop `self.clients = nodes` assignment. `add_node()` now correctly populates `self.clients` during iteration.
   - **Why:** Without this fix, the `ConsistentHashRing` class cannot be instantiated — it crashes immediately.

## Review Notes
- The use of MD5 for hashing is acceptable for a hash ring (uniform distribution matters, not cryptographic strength), but production systems often prefer faster non-cryptographic hashes like xxHash or MurmurHash3.
- The `values()[idx]` access on SortedDict is O(log n) per call, which is efficient and correct for this use case.
- The 1/N remapping claim when adding a node (e.g., ~25% when going from 3 to 4 nodes) is theoretically correct for consistent hashing with sufficient virtual nodes.
- 150 virtual nodes per physical node is a reasonable default for good balance across a small cluster.
