# Validation Summary: How to Deploy Varnish Cache via Portainer - A Practical Guide

## Status
validated

## Post Type
Guide

## Technologies Covered
- Varnish Cache
- VCL (Varnish Configuration Language)
- Docker / Docker Compose
- Portainer stacks
- Shell commands with `curl`, `awk`, and Varnish CLI tools

## Sources Consulted
- Varnish documentation index: https://varnish-cache.org/docs/index.html
- VCL reference: https://varnish-cache.org/docs/7.7/reference/vcl.html
- Built-in VCL behavior: https://varnish-cache.org/docs/trunk/users-guide/vcl-built-in-code.html
- Purging and banning: https://varnish-cache.org/docs/7.0/users-guide/purging.html
- Backend health probes: https://varnish-cache.org/docs/7.7/reference/vcl-probe.html
- VCL variables: https://varnish-cache.org/docs/7.7/reference/vcl-var.html
- `varnishd` reference: https://varnish-cache.org/docs/7.7/reference/varnishd.html
- `varnishadm` reference: https://varnish-cache.org/docs/7.7/reference/varnishadm.html
- `varnishstat` reference: https://varnish-cache.org/docs/7.7/reference/varnishstat.html
- `varnishlog` reference: https://varnish-cache.org/docs/7.7/reference/varnishlog.html
- `vsl-query` reference: https://varnish-cache.org/docs/7.7/reference/vsl-query.html
- Docker Official Image overview for Varnish: https://hub.docker.com/_/varnish
- Docker Official Image tags for Varnish: https://hub.docker.com/_/varnish/tags
- Docker port publishing documentation: https://docs.docker.com/engine/network/port-publishing/

## Issues Found
- The original `PURGE` example could not work because the VCL did not implement `req.method == "PURGE"` handling or an ACL. I added `acl purge` and `return(purge)` handling in `vcl_recv` to match the official Varnish purging model.
- The original `vcl_recv` ended with `return(hash)` and did not account for `Cookie` headers. That bypassed built-in VCL safeguards that Varnish documents for normal cache behavior. I removed the unconditional `return(hash)` and added explicit pass behavior for `Cookie` headers.
- The original `unset beresp.http.Set-Cookie` on every `200` response would force caching of responses that Varnish otherwise treats as uncacheable. I removed that line and narrowed the comment to cacheable `200` responses.
- The Compose example used `varnish:7.4-alpine`, while Varnish `7.4` is marked deprecated in the official docs and newer official tags are available. I updated the example to `varnish:7.7.3-alpine`.
- The stack published the Varnish management port and bound `-T` to `0.0.0.0`. I changed it to `127.0.0.1:6082` and removed the published `6082` port because the post’s operational commands run from inside the container.
- The reload section used manual `varnishadm` commands, but the official Docker image documents `varnishreload` as the supported way to reload mounted VCL without restarting the container. I replaced that section with `docker exec varnish varnishreload`.
- The live `varnishstat` command was missing `-it`, even though `varnishstat` defaults to curses mode when `-1`, `-j`, or `-x` are not used. I changed the example to `docker exec -it`.
- The hit-rate `awk` parsed the wrong field from `varnishstat -1` output and could divide by zero before any traffic hit the cache. I made the parser resilient and added zero-request handling.
- The final `varnishlog` command did not show cache status directly; it showed request flow and VCL execution. I corrected the comment so it matches the command’s actual behavior.

## Review Notes
- The `purge` ACL in the example is intentionally narrow. If PURGE requests will come from the Docker host or a separate management subnet, the ACL should be adjusted to that environment.
- Docker documents that published ports are reachable outside the host by default. The post now keeps the Varnish management interface internal to the container, while leaving the public HTTP listener intentionally published.
- The official Varnish Docker image recommends `tmpfs` and `ulimit` settings for better runtime performance. Their absence does not make the article incorrect, but they would be reasonable future improvements.
