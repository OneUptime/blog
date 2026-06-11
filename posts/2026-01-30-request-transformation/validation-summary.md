# Validation Summary: How to Implement Request Transformation

## Status
validated

## Post Type
Tutorial / Guide — covers Kong and NGINX (OpenResty) request transformation patterns with configuration and Lua code examples.

## Technologies Covered
- Kong Gateway (declarative `kong.yaml` configuration)
- Kong plugins: `request-transformer`, `request-transformer-advanced`, `route-by-header`, `pre-function`, `rate-limiting`
- Kong PDK (`kong.request.*`, `kong.service.request.*`)
- NGINX core directives: `map`, `upstream`, `proxy_set_header`, `rewrite`, `location`, `set`
- OpenResty / `ngx_http_lua_module` (`access_by_lua_block`, `set_by_lua_block`, `ngx.req.*`)
- Lua libraries: `cjson.safe`, `resty.jwt`, `resty.jit-uuid`
- Mermaid diagrams; bash/curl for testing

## Sources Consulted
- Kong `request-transformer` reference: https://developer.konghq.com/plugins/request-transformer/reference/
- Kong `request-transformer-advanced` reference: https://developer.konghq.com/plugins/request-transformer-advanced/
- Kong `route-by-header` reference: https://developer.konghq.com/plugins/route-by-header/reference/
- Kong `pre-function` reference: https://developer.konghq.com/plugins/pre-function/
- Kong PDK (`kong.service.request`): https://developer.konghq.com/gateway/pdk/reference/kong.service.request/
- NGINX `ngx_http_core_module` (`$request_id`, `map`): https://nginx.org/en/docs/http/ngx_http_core_module.html
- NGINX `ngx_http_proxy_module` (`proxy_set_header`): https://nginx.org/en/docs/http/ngx_http_proxy_module.html
- OpenResty lua-nginx-module: https://github.com/openresty/lua-nginx-module

## Issues Found

1. **NGINX `map` directive used the wrong source variable.** The first NGINX example mapped `$request_id` (NGINX's always-populated, auto-generated id) instead of `$http_x_request_id` (the incoming header). With the original variable, the `""` arm could never match, so the directive never fell back to the generated id — the inverse of the stated intent. Fix: changed the source variable to `$http_x_request_id`.

2. **NGINX `map` directive placed inside `server { ... }`.** `map` is only valid in the `http` context per the NGINX docs. Fix: moved the `map` block above the `server` block so the snippet is a valid `/etc/nginx/conf.d/*.conf` fragment (conf.d is included in `http`).

3. **Fabricated `$(uuid)` / `$(timestamp)` Kong template variables.** Kong's `request-transformer` template engine evaluates `$(...)` as a Lua expression against documented namespaces (`headers`, `query_params`, `uri_captures`, `shared`); it does not expose `$(uuid)` or `$(timestamp)` as built-ins. Fix: replaced each occurrence with valid inline Lua — `$(require('resty.jit-uuid').generate_v4())` for UUIDs and `$(os.time())` for timestamps — in both the header-transformation and the body-transformation Kong examples, and in the combined-pipeline example.

4. **Fabricated `request-transformer-advanced` 3-part conditional syntax.** The example used `"X-Header:value:condition"` as if Kong supported inline conditional templates. That syntax does not exist in any Kong plugin. Fix: replaced the example with valid `$(...)` Lua-expression templates that derive header values from other request properties, and added a sentence pointing readers to the `pre-function` / `post-function` plugins when true conditional logic is required.

5. **Duplicate top-level YAML keys in the Kong URL-rewriting example.** The snippet declared `services:` twice and `plugins:` twice at the document root, which is invalid YAML. Fix: consolidated everything into a single `services:` list and a single `plugins:` list.

6. **Duplicate `rename:` key inside one plugin config** (Complete Kong Configuration section). The `request-transformer` plugin block specified `rename:` twice within the same `config` object — also invalid YAML. Fix: merged the two `rename` blocks into one with both `headers` and `body` sub-keys.

7. **`route-by-header` `condition` schema was wrong.** The plugin's `condition` field is a map of `header-name -> expected-value`, not an object with `header_name`/`header_value` keys. Fix: rewrote the example to use `condition: { x-canary: "true" }`, matching the official schema, and added a one-line clarifying comment.

## Review Notes

- The `proxy_set_header HeaderName "";` pattern used to "remove" headers is correct per the NGINX `ngx_http_proxy_module` docs: an empty value causes the header not to be passed to the upstream.
- The simplified JWT decoding example uses `ngx.decode_base64`, which is standard base64. JWTs are base64url-encoded (`-`/`_` instead of `+`/`/`), so the snippet would mis-decode some real-world tokens — but the post explicitly flags it as "simplified — use proper JWT lib in production", which is a reasonable caveat for an illustrative snippet, so this was not changed.
- `request-transformer-advanced` is a Kong Enterprise (paid) plugin; OSS users will not have it available. The text now notes the Enterprise dependency.
- `ngx.req.get_body_data()` can return `nil` if the body has been buffered to disk (large bodies), in which case `ngx.req.get_body_file()` should be used. The post's examples assume in-memory bodies; this is fine given the `client_body_buffer_size`/`client_max_body_size` tuning shown, but production deployments handling large payloads should account for the disk-buffered case.
- The NGINX example that uses `if` inside `location` to select an upstream is functionally correct but treads close to the well-known "if is evil" pitfalls. Left as-is — it works for the patterns shown.
