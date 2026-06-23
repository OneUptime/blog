# Validation Summary: How to Understand $host vs $http_host in Nginx

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Nginx HTTP core module variables
- Nginx proxy module configuration
- Nginx rewrite module conditionals and variables
- Nginx map module
- HTTP Host header semantics
- curl command-line testing

## Sources Consulted
- Nginx ngx_http_core_module embedded variables: https://nginx.org/en/docs/http/ngx_http_core_module.html
- Nginx ngx_http_proxy_module proxy_set_header documentation: https://nginx.org/en/docs/http/ngx_http_proxy_module.html
- Nginx ngx_http_map_module documentation: https://nginx.org/en/docs/http/ngx_http_map_module.html
- Nginx request processing documentation: https://nginx.org/en/docs/http/request_processing.html
- Nginx server names documentation: https://nginx.org/en/docs/http/server_names.html
- Nginx ngx_http_rewrite_module documentation: https://nginx.org/en/docs/http/ngx_http_rewrite_module.html
- RFC 9110, HTTP Semantics, Host and :authority: https://datatracker.ietf.org/doc/html/rfc9110#section-7.2
- curl man page: https://curl.se/docs/manpage.html

## Issues Found
- The comparison table said `$http_host` includes a port only when it is non-standard. RFC 9110 defines the Host field as host plus optional port, and Nginx exposes the Host header value through `$http_host`, so this was changed to "if present."
- The comparison table listed `$host` sources in a different order from the official Nginx precedence. It was corrected to request line, Host header, then server_name.
- The `$host` priority list described the request-line host as "HTTP/1.0 style." Nginx documents this as the host name from the request line, which is more accurately represented by an absolute-form request target, so the wording was corrected.
- The post said `$host` is never empty. Nginx falls back to the selected server name, but server names can be empty in some configurations, so the wording was changed to describe the fallback instead of making an absolute guarantee.
- The fallback proxy example used `$proxy_host` as a custom variable name. Nginx already defines `$proxy_host` in the proxy module, so the example variable was renamed to `$effective_host`.
- The curl example for testing without a Host header used only `--http1.0`. curl still sends Host by default with HTTP/1.0, so the command now explicitly removes the internal Host header with `-H "Host:"`.

## Review Notes
Nginx was not installed in the local environment, so Nginx syntax and behavior were checked against official Nginx documentation. The curl command behavior was checked with local curl 8.5.0 and cross-referenced with the curl man page.
