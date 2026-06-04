# Validation Summary: How to Run Varnish Cache in Docker

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Varnish Cache
- VCL (Varnish Configuration Language)
- Docker
- Docker Compose
- Nginx
- Prometheus metrics exporters

## Sources Consulted
- Varnish Docker Official Image documentation: https://hub.docker.com/_/varnish
- Varnish VCL reference: https://www.varnish.org/docs/reference/vcl/
- Varnish purging and banning guide: https://www.varnish.org/docs/users-guide/purging/
- Varnish CLI reference: https://www.varnish.org/docs/reference/varnish-cli/
- Varnish 7.5 varnishlog reference: https://varnish-cache.org/docs/7.5/reference/varnishlog.html
- Varnish 7.5 varnishtop reference: https://varnish-cache.org/docs/7.5/reference/varnishtop.html
- Docker Compose file reference, version element: https://docs.docker.com/reference/compose-file/version-and-name/

## Issues Found
- The quick-start Docker command used `varnish:7.5`, `VARNISH_BACKEND_HOST=backend`, and `VARNISH_BACKEND_PORT=80`. The current official image documentation uses `VARNISH_BACKEND_HOST` as an HTTP or HTTPS URL and does not document `VARNISH_BACKEND_PORT` for the official image. I changed the example to use `VARNISH_BACKEND_HOST=http://backend/`, removed `VARNISH_BACKEND_PORT`, added the Docker network flag needed for the backend hostname to resolve, and switched to the maintained official `varnish` image reference.
- The Docker Compose snippets used the obsolete top-level `version: "3.8"` field and pinned `varnish:7.5`. I removed the obsolete `version` field and switched the examples to the maintained official `varnish` image reference.
- The custom `vcl_recv` returned `hash` after only passing `POST` and `Authorization` requests. Because explicit returns bypass built-in VCL behavior, other unsafe methods and stateful requests with cookies could be cached. I changed this to pass all non-GET/HEAD requests and pass requests with cookies.
- The custom `vcl_backend_response` returned `deliver` without preserving built-in cacheability checks for `Set-Cookie`, private/no-store/no-cache `Cache-Control`, or `Vary: *`. I added explicit checks to mark those responses uncacheable before delivery.
- The BAN example used the deprecated built-in `ban()` function, which does not provide error reporting. I updated it to import `std`, use `std.ban()`, and return `std.ban_error()` for invalid ban expressions.

## Review Notes
- Docker Hub rate limiting prevented pulling and running `varnish:7.5` locally, so runtime validation was performed against official Varnish and Docker documentation rather than a live container.
- The official Varnish Docker image documentation recommends `--ulimit memlock=-1:-1` and a tmpfs mount for `/var/lib/varnish/varnishd` for best performance. The post remains technically correct without them, but production examples could mention these options in a future improvement.
