# Validation Summary: How to Fix 'host not found in upstream' Nginx Startup Errors

## Status
validated

## Post Type
Tutorial / troubleshooting guide

## Technologies Covered
- Nginx reverse proxy configuration
- Nginx upstreams and DNS resolution
- Nginx resolver and resolver_timeout directives
- Docker networking and embedded DNS
- Docker Compose depends_on and health checks
- Dockerfile ENTRYPOINT and CMD
- Basic Docker CLI troubleshooting commands

## Sources Consulted
- Nginx ngx_http_proxy_module documentation: https://nginx.org/en/docs/http/ngx_http_proxy_module.html#proxy_pass
- Nginx ngx_http_core_module resolver documentation: https://nginx.org/en/docs/http/ngx_http_core_module.html#resolver
- Nginx ngx_http_upstream_module documentation: https://nginx.org/en/docs/http/ngx_http_upstream_module.html
- NGINX HTTP Load Balancing documentation: https://docs.nginx.com/nginx/admin-guide/load-balancer/http-load-balancer/
- Docker Compose startup order documentation: https://docs.docker.com/compose/how-tos/startup-order/
- Docker Compose version top-level element documentation: https://docs.docker.com/reference/compose-file/version-and-name/
- Docker Engine networking and DNS documentation: https://docs.docker.com/engine/network/#dns-services
- Dockerfile reference for ENTRYPOINT and CMD: https://docs.docker.com/reference/dockerfile/
- Local Docker CLI help for `docker exec`, `docker logs`, and `docker compose up`

## Issues Found
- The Docker Compose snippet used the top-level `version: '3.8'` field. Docker's current Compose specification keeps this only for backward compatibility and marks it obsolete, so I removed it.
- The Dockerfile entrypoint example passed `"--"` as an argument to the wait script. After `shift 2`, the script would try to execute `--` as the command and fail. I removed the extra `"--"` from the `ENTRYPOINT`.
- The complete Docker-oriented Nginx configuration listed both Docker's embedded resolver (`127.0.0.11`) and Google DNS. Because Nginx queries configured resolvers in round-robin fashion, Docker service names such as `app` could be sent to a public DNS resolver and fail. I changed the example to use only `127.0.0.11`.
- The backup upstream section implied backup servers could handle startup resolution failures. Nginx still has to resolve hostnames in the upstream block before the configuration loads, so I added a note clarifying that backups help after configuration load, not when hostnames cannot be resolved at startup.
- The Nginx Plus dynamic upstream section was outdated. The `resolve` parameter is available in Nginx open source starting with 1.27.3 and was Nginx Plus-only before that, so I updated the wording and section heading.
- The key takeaway saying to always configure a resolver when using hostnames was too broad. Static hostnames in normal `proxy_pass` or `upstream` configuration are resolved during configuration load. I narrowed the takeaway to variable-based `proxy_pass` and upstream `resolve` usage.
- The resolver example recommended Google DNS generically. I changed the comment to recommend a resolver that can resolve the upstream hostname, because internal hostnames require an internal or container-aware resolver.

## Review Notes
The main Nginx explanation is technically accurate for static hostnames and variable-based `proxy_pass`: variables cause Nginx to use the configured resolver at request time when the host is not an upstream group. The Docker `depends_on` health-check example is valid for current Docker Compose, but it controls service creation order only; runtime DNS resolution or a wait script is still useful when the upstream can disappear and reappear after Nginx starts.
