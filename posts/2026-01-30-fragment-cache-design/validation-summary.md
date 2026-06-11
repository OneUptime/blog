# Validation Summary: How to Create Fragment Cache Design

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Fragment caching
- HTML fragment assembly
- Node.js
- ioredis
- Redis
- Edge Side Includes (ESI)
- CDN and edge caching concepts

## Sources Consulted
- Redis SET command documentation: https://redis.io/docs/latest/commands/set/
- Redis keyspace documentation for SCAN and KEYS guidance: https://redis.io/docs/latest/develop/using-commands/keyspace/
- ioredis README and API examples: https://github.com/redis/ioredis
- Node.js crypto documentation: https://nodejs.org/api/crypto.html
- W3C ESI Language Specification 1.0: https://www.w3.org/TR/esi-lang/
- Akamai ESI documentation: https://techdocs.akamai.com/property-mgr/docs/esi-edge-side-includes

## Issues Found
- The Redis cache write examples used `setex`. Redis documentation recommends using `SET` with expiration options for new code because `SET` options replace older commands such as `SETEX`. Changed examples to `redis.set(key, html, 'EX', ttl)`.
- Cache reads checked `if (cached)`, which treats an empty string fragment as a cache miss. Changed checks to `cached !== null`, matching Redis `GET` miss behavior.
- Pattern invalidation used Redis `KEYS`, which official Redis documentation says should not be used in regular application code because it can block large databases. Replaced it with ioredis `scanStream`.
- The event-driven invalidation example called `invalidatePattern(\`related-products:*\`)`, which would produce a pattern that does not match the post's `fragment:<name>:<hash>` key format. Changed it to `invalidatePattern('related-products')`.
- The ESI section called ESI "client-side assembly." ESI processing is edge-side or surrogate-side assembly, not browser-side assembly. Updated the wording and heading.
- The ESI examples used `ttl` attributes directly on `esi:include`. That is not the portable ESI baseline across implementations. Removed those attributes and added a note to set TTLs through fragment response cache headers or cache/CDN configuration, while noting that some processors have non-standard caching attributes.
- The lock example used a fixed lock value and unconditional `DEL`, which can delete another process's lock if the original lock expires and is reacquired. Updated the example to use `crypto.randomUUID()` as a lock token and a Lua compare-and-delete release script.
- The cache key helper only sorted top-level object keys. Replaced it with a recursive stable stringifier so nested parameters produce deterministic keys.

## Review Notes
The guide is technically relevant and generally accurate after the fixes. The Redis lock example is still intentionally simple; production systems may prefer stale-while-revalidate, request coalescing in the application layer, or a more complete distributed locking design depending on failure tolerance requirements.
