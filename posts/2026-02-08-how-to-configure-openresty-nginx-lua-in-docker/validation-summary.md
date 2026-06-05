# Validation Summary: How to Configure OpenResty (Nginx + Lua) in Docker

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Docker
- Docker Compose
- OpenResty
- Nginx
- Lua and LuaJIT
- ngx_lua
- LuaRocks

## Sources Consulted
- OpenResty lua-nginx-module documentation: https://github.com/openresty/lua-nginx-module
- OpenResty FAQ: https://openresty.org/en/faq.html
- OpenResty Docker image documentation: https://github.com/openresty/docker-openresty
- Nginx proxy module documentation: https://nginx.org/en/docs/http/ngx_http_proxy_module.html#proxy_pass
- Docker Compose file reference: https://docs.docker.com/reference/compose-file/
- Docker Compose version top-level element documentation: https://docs.docker.com/reference/compose-file/version-and-name/

## Issues Found
- The Docker examples used the older `openresty/openresty:1.25.3.1-alpine` tag. Updated the runnable examples to current documented OpenResty Docker tag examples, using `1.29.2.4-1-alpine-apk` for runtime examples and `1.29.2.4-1-alpine-fat` where LuaRocks is needed.
- The Compose example used the obsolete top-level `version: "3.8"` property. Removed it so the file follows the current Compose Specification behavior.
- The Compose healthcheck used `curl`, which is not guaranteed in the lean Alpine OpenResty image. Changed it to use BusyBox `wget`.
- The opening performance claim said Lua code executes at the speed of compiled C code. Adjusted the wording to accurately describe LuaJIT performance inside the Nginx event loop.
- The rate limiter was described as a sliding-window limiter and commented as a token-bucket limiter, but the code implements a fixed-window counter using shared dictionary expiry. Updated the description and comment.
- The Nginx wiring example used duplicate `access_by_lua_file` directives in the same location, which ngx_lua does not allow. Replaced it with one `access_by_lua_block` that loads both Lua files.
- The response-cache body filter cached only the current response chunk. Updated it to collect body chunks in `ngx.ctx` and store the concatenated body when the final chunk is seen.
- The Dockerfile used the lean Alpine image while installing LuaRocks packages. Switched it to the Alpine fat image and used the documented LuaRocks path.

## Review Notes
- The response-cache example is intentionally simple and suitable for small JSON responses, but production caching should account for response size, content type, cache keys, `Vary` semantics, streaming responses, and cache invalidation.
- The dynamic routing example relies on `proxy_pass` with a variable, which Nginx supports. In production, DNS resolution and URI behavior should be tested for the exact deployment topology.
