# Validation Summary: How to Understand Nginx Location Priority

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Nginx location matching
- Nginx server and location configuration
- Nginx proxy, FastCGI, headers, and basic authentication directives
- curl for HTTP testing

## Sources Consulted
- Nginx official documentation: ngx_http_core_module location directive and matching algorithm - https://nginx.org/en/docs/http/ngx_http_core_module.html#location
- Nginx official documentation: ngx_http_core_module try_files, root, return, and error_log contexts - https://nginx.org/en/docs/http/ngx_http_core_module.html
- Nginx official documentation: ngx_http_proxy_module proxy_pass and proxy_set_header directives - https://nginx.org/en/docs/http/ngx_http_proxy_module.html
- Nginx official documentation: ngx_http_fastcgi_module fastcgi_pass directive - https://nginx.org/en/docs/http/ngx_http_fastcgi_module.html
- Nginx official documentation: ngx_http_headers_module add_header and expires directives - https://nginx.org/en/docs/http/ngx_http_headers_module.html
- Nginx official documentation: ngx_http_auth_basic_module auth_basic and auth_basic_user_file directives - https://nginx.org/en/docs/http/ngx_http_auth_basic_module.html
- GitHub author profile link - https://github.com/nawazdhandala

## Issues Found
- The location-priority flowchart and table treated `^~` as a separate prefix-matching pass before the general longest-prefix selection. Nginx first selects the longest matching prefix, then skips regex checks only if that longest prefix uses `^~`. Updated the flowchart, priority table, and summary wording to reflect the official algorithm.
- The `^~` section said regex search stops if the `^~` prefix matches. Updated it to say regex search stops if that `^~` location is the longest matching prefix.
- The nested-location example said the child location "inherits parent config plus", which overstates Nginx inheritance behavior. Updated the comment to note that some directives can be inherited from the parent location.
- The upload security fix suggested placing a nested regex inside a `^~` location. Since `^~` prevents regex checks when it is the longest matching prefix, this was not a reliable fix for the stated issue. Updated the example to use a normal prefix location so the protective regex can still run.

## Review Notes
Nginx was not installed in the local environment, so I could not run `nginx -t` against executable examples. The review was performed against official Nginx documentation instead.
