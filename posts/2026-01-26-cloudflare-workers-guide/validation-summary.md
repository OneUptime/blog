# Validation Summary: How to Build Applications with Cloudflare Workers

## Status
validated

## Post Type
Tutorial / technical guide

## Technologies Covered
- Cloudflare Workers
- Wrangler CLI
- Workers KV
- Durable Objects
- Cloudflare Cache API
- Workers observability and logging
- JavaScript and TypeScript
- Serverless and edge computing

## Sources Consulted
- Cloudflare Workers CLI getting started: https://developers.cloudflare.com/workers/get-started/guide/
- Cloudflare Wrangler install/update documentation: https://developers.cloudflare.com/workers/wrangler/install-and-update/
- Cloudflare Wrangler Workers commands: https://developers.cloudflare.com/workers/wrangler/commands/workers/
- Cloudflare Wrangler configuration documentation: https://developers.cloudflare.com/workers/wrangler/configuration/
- Cloudflare Workers KV bindings documentation: https://developers.cloudflare.com/kv/concepts/kv-bindings/
- Cloudflare Workers KV commands documentation: https://developers.cloudflare.com/kv/reference/kv-commands/
- Cloudflare Workers KV read API documentation: https://developers.cloudflare.com/kv/api/read-key-value-pairs/
- Cloudflare Durable Objects getting started documentation: https://developers.cloudflare.com/durable-objects/get-started/
- Cloudflare Durable Objects migrations documentation: https://developers.cloudflare.com/durable-objects/reference/durable-objects-migrations/
- Cloudflare Workers limits documentation: https://developers.cloudflare.com/workers/platform/limits/
- Cloudflare Workers pricing documentation: https://developers.cloudflare.com/workers/platform/pricing/
- Cloudflare Workers Cache API documentation: https://developers.cloudflare.com/workers/runtime-apis/cache/
- Cloudflare Workers context / waitUntil documentation: https://developers.cloudflare.com/workers/runtime-apis/context/
- Cloudflare Workers observability and logs documentation: https://developers.cloudflare.com/workers/observability/logs/

## Issues Found
- The setup section used global Wrangler installation and `wrangler init` as the primary project creation path. Cloudflare currently recommends creating Worker projects with C3 and installing Wrangler locally in the project, so the setup command was changed to `npm create cloudflare@latest -- my-worker`, and later Wrangler commands were changed to `npx wrangler ...`.
- The generated project structure listed `wrangler.toml`, while current C3 projects generate `wrangler.jsonc` by default. The structure was updated to show `wrangler.jsonc`, and later configuration sections were worded generically because the article's snippets intentionally use TOML.
- The KV namespace commands used the older `wrangler kv:namespace create` syntax. Cloudflare documents `wrangler kv namespace create` as the current syntax, so both production and preview commands were updated.
- The Durable Objects migration used `new_classes`, which creates key-value-backed Durable Objects. Cloudflare recommends SQLite-backed Durable Objects for new classes and documents `new_sqlite_classes` for new projects, so the migration snippet was updated.
- The external API example described Workers as having a 30-second CPU limit without the free-plan caveat. The comment was generalized to avoid implying a universal limit.
- The execution limits section said the free plan CPU limit was 50ms. Current Cloudflare pricing and limits documentation lists 10ms for the free plan, and the paid plan default as 30 seconds with an increase path up to 5 minutes, so the text was corrected.
- The Cache API example used `new Request(request.url, request)` as the cache key. Because `cache.put()` throws when the request key is not a GET request, the example now creates a GET cache key explicitly.

## Review Notes
The post is technically relevant and remains a useful guide. Some performance statements such as sub-50ms responses and isolate initialization under 5ms are best treated as general positioning rather than guaranteed service-level behavior.
