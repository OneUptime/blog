# Validation Summary: How to Deploy Varnish Cache via Portainer

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Varnish Cache
- VCL (Varnish Configuration Language)
- Docker Compose / Portainer stack deployment
- Docker CLI
- HTTP cache invalidation

## Sources Consulted
- Varnish 7.4 VCL guide: https://varnish-cache.org/docs/7.4/users-guide/vcl.html
- Varnish 7.4 VCL steps reference: https://varnish-cache.org/docs/7.4/reference/vcl-step.html
- Varnish 7.4 VCL syntax reference: https://varnish-cache.org/docs/7.4/users-guide/vcl-syntax.html
- Varnish 7.4 VCL variables reference: https://varnish-cache.org/docs/7.4/reference/vcl-var.html
- Varnish 7.4 backend configuration guide: https://varnish-cache.org/docs/7.4/users-guide/vcl-backends.html
- Varnish 7.4 CLI guide: https://varnish-cache.org/docs/7.4/users-guide/run_cli.html
- Varnish 7.4 varnishlog reference: https://varnish-cache.org/docs/7.4/reference/varnishlog.html
- Varnish 7.4 VSL query reference: https://varnish-cache.org/docs/7.4/reference/vsl-query.html
- Varnish 7.4 counter reference: https://varnish-cache.org/docs/7.4/reference/varnish-counters.html
- Varnish official Docker image documentation: https://hub.docker.com/_/varnish
- Docker Compose service reference: https://docs.docker.com/reference/compose-file/services/
- Varnish documentation index, for version status: https://varnish-cache.org/docs/index.html

## Issues Found
- The stack example used `VARNISH_BACKEND_IP` and `VARNISH_BACKEND_PORT`, but the official Docker image documents `VARNISH_BACKEND_HOST` for the bundled default VCL and notes that backend-related env vars do not apply when you mount your own `/etc/varnish/default.vcl`. I removed the unsupported backend env vars and kept `VARNISH_SIZE`.
- The original `vcl_recv` ended with `return(hash);`, which bypasses Varnish's built-in request safety rules for cookie-bearing or authorized requests. I changed the logic so only explicit pass cases return early and the built-in VCL handles the remaining cacheability checks.
- The original `vcl_backend_response` ended with `return(deliver);`, which bypasses the built-in backend-response safety logic. I removed that explicit return so Varnish's built-in handling can still mark `Set-Cookie` or otherwise uncacheable responses correctly.
- The PURGE example used `!client.ip ~ trusted_purgers` and referenced an undefined ACL. I corrected the ACL match to `client.ip !~ trusted_purgers` and added an example `trusted_purgers` ACL.
- The PURGE snippet replaced `sub vcl_recv` entirely, which would discard the earlier request-handling logic if copied verbatim. I changed it into an additive example that clearly preserves the rest of the existing rules.
- The blanket invalidation command was labeled as a purge even though it used `ban`, and it hard-coded a project-specific container name. I changed the wording to invalidation, switched to the documented `ban 'obj.http.date ~ .*'` pattern, and replaced the container name with a placeholder.
- The summary claimed Varnish can serve 80-90% of requests from cache for most applications. That percentage is workload-dependent and not supported by the official references I checked, so I softened the claim.

## Review Notes
- The post targets Varnish 7.4 syntax and commands, which remain coherent for this example, but the Varnish documentation index marks 7.4 as deprecated. A future refresh to a newer supported image tag would be worth considering.
