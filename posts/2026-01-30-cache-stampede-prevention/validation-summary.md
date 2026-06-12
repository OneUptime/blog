# Validation Summary: How to Build Cache Stampede Prevention

## Status
validated

## Post Type
Technical guide / implementation tutorial

## Technologies Covered
- Redis
- ioredis
- Node.js
- TypeScript
- Distributed locking
- Probabilistic early recomputation / XFetch
- Request coalescing / single-flight

## Sources Consulted
- Redis SET command documentation: https://redis.io/docs/latest/commands/set/
- Redis SETNX command documentation: https://redis.io/docs/latest/commands/setnx/
- Redis ioredis guide for JavaScript: https://redis.io/docs/latest/develop/clients/ioredis/
- ioredis official README/API examples: https://github.com/redis/ioredis
- Vattani, Chierichetti, and Lowenstein, "Optimal Probabilistic Cache Stampede Prevention": https://cseweb.ucsd.edu/~avattani/papers/cache_stampede.pdf
- Go singleflight package documentation, used to confirm the duplicate in-flight work suppression concept: https://pkg.go.dev/golang.org/x/sync/singleflight

## Issues Found
- The XFetch probability formula had beta in the numerator: `exp(-beta * (expiry - now) / delta)`. The Vattani et al. paper defines the early recomputation gap as `-delta * beta * log(rand())`, which corresponds to `exp(-(expiry - now) / (delta * beta))`. Updated the formula, TypeScript examples, beta tuning table, and explanatory text so higher beta values mean earlier recomputation.
- Redis lock release used a plain `DEL lockKey`. Redis documentation warns this can delete another client's lock if the original lock expires and is reacquired before release. Updated the lock examples to store a unique token and release via an atomic compare-and-delete Lua script.
- The ioredis TypeScript import used `import Redis from 'ioredis';`. The official ioredis README says this is still supported but will be deprecated in the next major version, and recommends `import { Redis } from 'ioredis'` for TypeScript. Updated the import.

## Review Notes
The examples are technically valid as illustrative application code, but production deployments should still choose lock timeouts, stale TTLs, polling behavior, and alert thresholds based on measured workload characteristics. Redis also notes that the simple single-instance lock pattern is less robust than Redlock for stronger distributed locking guarantees.
