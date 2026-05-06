# Validation Summary: How to Configure Cloudflare Workers IPv6

## Status
validated

## Post Type
Guide

## Technologies Covered
- Cloudflare Workers
- Cloudflare IPv6 Compatibility
- Cloudflare request headers
- Python Workers
- Wrangler bindings and environment variables
- `curl`
- DNS `AAAA` lookups
- IPv6 URI syntax

## Sources Consulted
- Cloudflare IPv6 compatibility: https://developers.cloudflare.com/network/ipv6-compatibility/
- Cloudflare HTTP headers: https://developers.cloudflare.com/fundamentals/reference/http-headers/
- Cloudflare Workers Headers API: https://developers.cloudflare.com/workers/runtime-apis/headers/
- Cloudflare Workers Fetch API: https://developers.cloudflare.com/workers/runtime-apis/fetch/
- Cloudflare Workers environment variables: https://developers.cloudflare.com/workers/configuration/environment-variables/
- Cloudflare Workers bindings (`env`): https://developers.cloudflare.com/workers/runtime-apis/bindings/
- Cloudflare Python Workers examples: https://developers.cloudflare.com/workers/languages/python/examples/
- Cloudflare Python Workers standard library support: https://developers.cloudflare.com/workers/languages/python/stdlib/
- Cloudflare `workers.dev` routing: https://developers.cloudflare.com/workers/configuration/routing/workers-dev/
- Cloudflare Custom Domains: https://developers.cloudflare.com/workers/configuration/routing/custom-domains/
- curl man page: https://curl.se/docs/manpage.html
- curl tutorial: https://curl.se/docs/tutorial.html
- RFC 3986 URI syntax: https://www.rfc-editor.org/rfc/rfc3986.html

## Issues Found
- The post originally described IPv6 enablement as a generic serverless or VPC/subnet task. For Cloudflare Workers, that is incorrect. I updated the introduction, Step 1, and the conclusion to reflect Cloudflare's edge-managed IPv6 model and the zone-level IPv6 Compatibility setting for proxied custom domains.
- The original client IP example used a generic `handler(event, context)` pattern and `X-Forwarded-For` parsing. That is not a Cloudflare Workers request model. I replaced it with a valid Python Worker `WorkerEntrypoint` example that reads `CF-Connecting-IP` and `CF-Connecting-IPv6`.
- The outbound request example used `urllib.request` and `requests`. Those are not the correct HTTP request APIs for Workers runtime examples. I replaced them with the Workers `fetch()` API in a valid Python Worker example.
- The environment variable example used `os.environ`, which is not the normal binding model for Workers. I replaced it with a Wrangler `[vars]` example and access through `self.env`.
- The IPv6 `curl --resolve` example used an unbracketed IPv6 literal. Current curl syntax requires bracketed IPv6 addresses in that option. I corrected the command.
- The monitoring snippet was a standalone Python helper, not a Worker example. I converted it to a valid Python Worker logging example using supported logging patterns.

## Review Notes
- The post now reflects Cloudflare Workers behavior accurately as of 2026-05-06.
- The code examples are written for Python Workers. Python Workers remain in beta, so actual deployment still requires the Python Workers setup documented by Cloudflare, including the `python_workers` compatibility flag.
