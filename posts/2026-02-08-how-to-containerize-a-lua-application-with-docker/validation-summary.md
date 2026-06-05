# Validation Summary: How to Containerize a Lua Application with Docker

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Docker
- Docker Compose
- Lua 5.4
- LuaRocks
- lua-http
- lua-cjson
- OpenResty
- Nginx / ngx_lua
- LuaJIT
- Redis

## Sources Consulted
- lua-http documentation: https://daurnimator.github.io/lua-http/0.4/
- lua-http GitHub README and dependency list: https://github.com/daurnimator/lua-http
- OpenResty Docker image documentation: https://hub.docker.com/r/openresty/openresty
- OpenResty docker-openresty Alpine fat Dockerfile: https://github.com/openresty/docker-openresty/blob/master/alpine/Dockerfile.fat
- OpenResty lua-nginx-module directives reference: https://openresty-reference.readthedocs.io/en/latest/Directives/
- OpenResty Lua Nginx API reference: https://openresty-reference.readthedocs.io/en/latest/Lua_Nginx_API/
- Nginx stub_status module documentation: https://nginx.org/en/docs/http/ngx_http_stub_status_module.html
- LuaRocks rockspec format documentation: https://github.com/luarocks/luarocks/blob/master/docs/rockspec_format.md
- Docker Compose file reference: https://docs.docker.com/compose/compose-file/
- Docker Compose version top-level element documentation: https://docs.docker.com/reference/compose-file/version-and-name/

## Issues Found
- The standalone lua-http server did not explicitly initialize the listening socket or check loop errors. Added `assert(server:listen())` and wrapped `server:loop()` with `assert(...)`, matching lua-http's documented server lifecycle and error-return behavior.
- The standalone Dockerfile and multi-stage Dockerfile installed LuaRocks modules without pinning LuaRocks to Lua 5.4, even though the runtime command uses `lua5.4`. Added `--lua-version=5.4` to LuaRocks install commands so installed modules land in the Lua 5.4 tree.
- The OpenResty Dockerfile used `openresty/openresty:1.25.3.1-alpine` while running `luarocks install`. OpenResty Docker documentation states `-fat` images include LuaRocks and OPM, so the image was changed to `openresty/openresty:1.29.2.4-alpine-fat`.
- The OpenResty Dockerfile copied `static/` unconditionally even though the article does not create that directory. Replaced the unconditional `COPY static/` with `RUN mkdir -p /app/static/` so the example builds from the files shown in the tutorial.
- The rockspec example used a `git://` GitHub URL. Updated it to `git+https://github.com/example/lua-app.git`, matching LuaRocks' documented SCM URL form and avoiding the insecure Git protocol.
- The rockspec dependency install command did not pin LuaRocks to Lua 5.4. Added `--lua-version=5.4` for consistency with the rockspec dependency constraint and the runtime Lua version.
- The Docker Compose snippet used the obsolete top-level `version: "3.8"` field. Removed it because current Docker Compose documentation says the field is only informative and emits an obsolete warning.

## Review Notes
- The OpenResty examples use LuaJIT, which is correctly described as Lua 5.1-compatible rather than Lua 5.4-compatible.
- The health endpoint's `ngx.var.connections_active` depends on the Nginx stub_status module. The OpenResty Docker image is built with `--with-http_stub_status_module`, and Nginx documents `$connections_active` as an embedded variable for that module.
