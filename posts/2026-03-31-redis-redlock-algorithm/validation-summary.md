# Validation Summary: How the Redlock Algorithm Works in Redis

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Redis (distributed locking via SET NX PX)
- Redlock algorithm (distributed lock across N independent Redis instances)
- Python (redis-py client library)
- Lua scripting (atomic lock release within Redis)

## Sources Consulted
- Official Redis distributed locks documentation: https://redis.io/docs/latest/develop/use/patterns/distributed-locks/
- redis-py library documentation (SET with nx/px parameters, eval for Lua scripts)
- Martin Kleppmann's "How to do distributed locking" analysis (referenced in the post's Limitations section)

## Issues Found

### Issue 1: Incorrect claim that Redlock requires an odd number of instances
- **What was wrong:** The post stated "Redlock requires an odd number of Redis instances (typically 5)." The official specification does not require an odd number — it uses N=5 as a reasonable example. Any N works with an N/2+1 majority quorum; even numbers simply provide the same fault tolerance as the odd number below them.
- **What was changed:** Reworded to "Redlock is typically deployed with an odd number of Redis instances (commonly 5)..." with an explanation of why odd is preferred but not required.
- **Why:** Accuracy with the official Redlock specification.

### Issue 2: Lock release on failure only targeted acquired nodes
- **What was wrong:** In `acquire_redlock`, the failure path iterated over `acquired` (only nodes where the lock succeeded) instead of `nodes` (all nodes). The official spec explicitly states: "it will try to unlock all the instances (even the instances it believed it was not able to lock)." This is important because a SET NX may succeed on a node but the response could be lost due to a network issue, leaving the client unaware it holds a lock.
- **What was changed:** Changed `for node in acquired:` to `for node in nodes:` in the failure branch, and updated the comment to clarify the intent.
- **Why:** This was a correctness bug per the Redlock specification. Failing to release on all nodes could leave orphaned locks that persist until TTL expiry, delaying other clients from acquiring the lock.

### Issue 3: Clock drift formula misattributed to the spec
- **What was wrong:** The docstring `"""Clock drift factor: 0.01 * TTL + 2ms"""` implied this formula is part of the Redlock specification. The official spec only defines `CLOCK_DRIFT` as an abstract variable in the validity formula; the specific `0.01 * TTL + 2ms` values come from common library implementations (e.g., node-redlock).
- **What was changed:** Updated the docstring to `"""Clock drift compensation (common implementation choice: 0.01 * TTL + 2ms)"""` to clarify the formula's origin.
- **Why:** Accuracy of attribution. The formula is reasonable but readers should know it's an implementation convention, not a specification mandate.

## Review Notes
- The code examples use sequential lock acquisition (a for loop over nodes). The official spec recommends using a small per-node timeout to avoid waiting too long on unresponsive nodes. This is an acceptable simplification for a tutorial but worth noting for production implementations.
- The redis-py `eval()` method used for the Lua release script is correct. Redis 8.4 introduced the `DELEX` command as a native alternative to the Lua script, but the Lua approach remains valid and is more portable across Redis versions.
- The post correctly attributes the Redlock controversy to Martin Kleppmann and accurately summarizes the core concern (GC pauses and clock drift). Salvatore Sanfilippo published a rebuttal; both sides have valid points and this remains an active area of debate in distributed systems.
