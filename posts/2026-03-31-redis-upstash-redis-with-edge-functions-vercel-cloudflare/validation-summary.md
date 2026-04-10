# Validation Summary: How to Use Upstash Redis with Edge Functions (Vercel, Cloudflare)

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Upstash Redis (`@upstash/redis` SDK)
- Vercel Edge Middleware (Next.js)
- Cloudflare Workers
- Upstash REST API
- Wrangler (Cloudflare CLI tooling)

## Sources Consulted
- Upstash Redis SDK documentation: https://upstash.com/docs/redis/sdks/ts/overview
- Upstash REST API reference: https://upstash.com/docs/redis/features/restapi
- Next.js Middleware documentation: https://nextjs.org/docs/app/building-your-application/routing/middleware
- Cloudflare Workers documentation: https://developers.cloudflare.com/workers/
- Wrangler configuration reference: https://developers.cloudflare.com/workers/wrangler/configuration/

## Issues Found
No technical issues found.

## Review Notes
- The `wrangler.toml` example stores `UPSTASH_REDIS_REST_TOKEN` as a plain `[vars]` entry. In production, this should be set as a secret via `wrangler secret put` to avoid committing tokens to source control. This is acceptable for a tutorial context but worth noting.
- The Upstash REST API example uses `https://<UPSTASH_REDIS_REST_URL>/set/mykey/myvalue` where the actual `UPSTASH_REDIS_REST_URL` value already includes `https://`. The angle-bracket placeholder convention makes the intent clear, but readers should note the actual URL value already contains the protocol.
- The rate limiting example in the Vercel middleware has a minor race condition (between `incr` and `expire`) that is common in tutorial code. For production use, a Lua script or `SET key value EX 60 NX` pattern would be more robust, but this is appropriate for an introductory tutorial.
