# Validation Summary: How to Set Up Nginx with Lua for Dynamic Routing on Ubuntu

## Status
validated

## Post Type
Tutorial / Technical Guide

## Technologies Covered
- OpenResty (Nginx bundled with LuaJIT)
- Nginx (lua-nginx-module)
- Lua / LuaJIT
- LuaRocks (package manager)
- lua-resty-jwt (referenced)
- cjson (Lua JSON library)
- Ubuntu 22.04 (jammy)
- systemd

## Sources Consulted
- OpenResty official site and Ubuntu install docs: https://openresty.org/en/linux-packages.html
- OpenResty lua-nginx-module reference: https://github.com/openresty/lua-nginx-module
- ngx.req.* API: https://github.com/openresty/lua-nginx-module#ngxreqget_headers, get_method, read_body, set_body_data, set_header
- ngx.shared.DICT API (`incr` signature): https://github.com/openresty/lua-nginx-module#ngxshareddictincr
- `lua_shared_dict`, `lua_package_path`, `access_by_lua_block`, `rewrite_by_lua_block`, `content_by_lua_block` directive references in lua-nginx-module docs
- Nginx phases / variable handling and `proxy_pass` with variables: https://nginx.org/en/docs/http/ngx_http_proxy_module.html#proxy_pass
- Nginx config syntax (comments use `#`): https://nginx.org/en/docs/beginners_guide.html
- OpenResty Ubuntu deb package layout (`/etc/openresty/`, `/etc/openresty/conf.d/`, `/usr/local/openresty/`)

## Issues Found
- **A/B Testing nginx config — invalid comment syntax (line 143).** The line `set $target "http://127.0.0.1:3000";  -- default backend` used a Lua-style `--` comment in nginx config context. Nginx config comments use `#` (Lua's `--` is only valid inside `*_by_lua_block { ... }` blocks). Changed to `# default backend`. Without this fix, `openresty -t` would fail with a syntax error on that line.

## Review Notes
- The post uses Ubuntu 22.04 (jammy) explicitly in the repo URL. By 2026-05-17, Ubuntu 24.04 (noble) is also supported by the OpenResty repository; readers on noble should substitute `noble` for `jammy`. Not a correctness issue.
- In the Custom Authentication example, `local cjson = require "cjson"` is loaded but never used (the JSON responses are built as string literals). Harmless but slightly misleading.
- The `luarocks install lua-resty-jwt` step is shown immediately before an example that does not actually use lua-resty-jwt (it performs a static API-key lookup). The comment inside the block (`-- replace with JWT validation in production`) makes the intent clear, so it's not an error, but readers expecting JWT validation should know they'd need to add `require "resty.jwt"` and call `jwt:verify(...)` themselves.
- In the Dynamic Routing example, configuration ordering may confuse readers: `access_by_lua_block` appears in the config above `set $target "backend_default";`, but the `set` directive runs first because it executes in the rewrite phase, which precedes the access phase. The code is correct as written.
- `proxy_pass http://$target;` (with a variable) using upstream names like `backend_v1` works because nginx resolves variable hostnames against defined upstream blocks before attempting DNS. Behavior is correct on current nginx/OpenResty versions.
- The `incr` call `dict:incr(key, 1, 0, window)` correctly uses the 4-argument form (key, value, init, init_ttl) — verified against the lua-resty-core / lua-nginx-module shared dict API.
- The `lua_package_path "/etc/openresty/lua/?.lua;;";` directive is correct; the trailing `;;` appends the default search paths.
- The `Set-Cookie` example does not set `HttpOnly` / `Secure` / `SameSite` attributes; fine for an A/B-group cookie but readers should add those flags for any security-sensitive cookie.
- The final test commands (`curl -H "X-API-Version: v2" http://localhost/` and `curl http://localhost/hello`) target configs from earlier sections, not the immediately preceding "Load Lua Scripts from Files" section. Not incorrect, just a presentation choice.
