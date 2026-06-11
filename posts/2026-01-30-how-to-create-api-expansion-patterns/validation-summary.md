# Validation Summary: How to Create API Expansion Patterns

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- REST API design
- API expansion patterns
- TypeScript
- Node.js
- Express.js
- DataLoader
- Redis caching
- Stripe API expansion
- GitHub REST API media types
- OpenAPI documentation

## Sources Consulted
- TypeScript Handbook: https://www.typescriptlang.org/docs/
- Express routing guide: https://expressjs.com/en/guide/routing.html
- DataLoader README: https://github.com/graphql/dataloader
- Redis SETEX command documentation: https://redis.io/docs/latest/commands/setex/
- Redis keyspace and SCAN/KEYS guidance: https://redis.io/docs/latest/develop/using-commands/keyspace/
- node-redis README and scanIterator examples: https://github.com/redis/node-redis
- Stripe expanding responses documentation: https://docs.stripe.com/api/expanding_objects
- GitHub REST API media types and pull request endpoint documentation: https://docs.github.com/en/rest/pulls/pulls
- OpenAPI parameter documentation: https://swagger.io/docs/specification/v3_0/describing-parameters/

## Issues Found
- The DataLoader examples returned `null` for missing records while using `DataLoader<string, Customer>` and `DataLoader<string, Product>`. Updated the generics to `Customer | null` and `Product | null` so the TypeScript types match DataLoader's result behavior.
- The expansion depth validation allowed one additional nested level because it checked `currentDepth > limits.maxDepth`. Updated it to reject non-empty expansions when `currentDepth >= limits.maxDepth`.
- The Redis cache example used `setex`, which Redis documents as deprecated in favor of `SET` with `EX`. Updated the example to use `redis.set(key, value, { EX: ttl })`.
- The Redis invalidation example used `KEYS` in application code, which Redis warns can block and harm production performance. Updated it to use `scanIterator` with a match pattern.
- The Stripe `curl` examples left URLs unquoted even though query strings containing `&` are interpreted by shells. Quoted the URLs.
- The GitHub media type examples used old `application/vnd.github.v3...` forms. Updated them to the current documented `application/vnd.github+json` and `application/vnd.github.full+json` forms.
- The sparse fieldset parser claimed recursive nested handling but only stored the remaining path as a flat string. Updated it to build the nested selector tree recursively and handle arrays during field selection.
- The Jest examples accessed dynamically expanded fields on a statically inferred base order type. Added local casts in the examples so the TypeScript snippet reflects the dynamic response shape.

## Review Notes
The code snippets remain illustrative and assume surrounding application types such as `Order`, `Customer`, `Product`, `Database`, `RedisClient`, `db`, and request type augmentation for `req.loaders`. No project test suite was run because the post contains standalone examples rather than executable repository code.
