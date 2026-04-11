# Validation Summary: How to Use CLIENT INFO in Redis to Get Current Client Details

## Status
validated

## Post Type
Tutorial / Reference

## Technologies Covered
- Redis (CLIENT INFO command)
- Python (redis-py library)
- Node.js (node-redis library)

## Sources Consulted
- Redis CLIENT INFO official documentation — https://redis.io/docs/latest/commands/client-info/
- Redis CLIENT LIST official documentation (flags reference) — https://redis.io/docs/latest/commands/client-list/
- redis-py library documentation — https://redis.io/docs/latest/develop/clients/redis-py/
- node-redis library documentation — https://redis.io/docs/latest/develop/clients/nodejs/

## Issues Found

1. **Incorrect version for CLIENT INFO availability (line 19):** The post stated "Available since Redis 7.2" but CLIENT INFO was introduced in Redis 6.2.0. Redis 7.2 introduced CLIENT SETINFO, not CLIENT INFO. Fixed to "Available since Redis 6.2.0."

2. **Incorrect `N` flag definition (flags table):** The post defined the `N` flag as "CLIENT NO-EVICT is set." Per official Redis documentation, `N` means "No specific flag set" (i.e., the default when no other flags apply). The CLIENT NO-EVICT mechanism uses flag `e`. Fixed the description to "No specific flag set."

3. **Flawed "Checking Subscription State" example (lines 156–171):** The original code called `pubsub = sub_client.pubsub()` which creates a separate internal connection in redis-py, then ran `CLIENT INFO` on `sub_client` — a different connection that has no subscriptions. Additionally, once a connection enters Pub/Sub mode, only subscription commands (SUBSCRIBE, UNSUBSCRIBE, etc.) are allowed, so CLIENT INFO cannot be run on a subscribed connection. Removed the unused `threading` import and the incorrect subscription logic. Replaced with a correct example showing the subscription counter fields and a note about the Pub/Sub mode limitation.

4. **Node.js example uses top-level `await` with CommonJS `require()` (lines 113–126):** Top-level `await` is only supported in ES modules, but the example uses `require()` (CommonJS). Wrapped the code in an `async function main()` to make it syntactically valid, and added `client.disconnect()` for proper cleanup.

## Review Notes
- The `T` flag description ("CLIENT NO-TOUCH is set") is an acceptable simplification. The full meaning is "the client will not touch the LRU/LFU of the keys it accesses." CLIENT NO-TOUCH is the command that sets this flag, so the shorthand is reasonable.
- The CLIENT INFO vs CLIENT LIST comparison table is accurate. CLIENT INFO requires no special ACL permissions beyond basic connection access, while CLIENT LIST typically requires admin privileges.
- The Python `client_info()` method in redis-py and `clientInfo()` in node-redis are both verified to exist and work as shown.
- The manual parsing examples using `execute_command('CLIENT', 'INFO')` are correct and functional, though `client.client_info()` is the preferred approach in redis-py since it returns a parsed dict directly.
