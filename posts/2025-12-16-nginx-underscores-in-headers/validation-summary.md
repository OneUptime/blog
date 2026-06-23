# Validation Summary: How to Enable Underscores in HTTP Header Names in Nginx

## Status
validated

## Post Type
Tutorial / Configuration guide

## Technologies Covered
- Nginx HTTP core module
- Nginx reverse proxy configuration
- Nginx FastCGI configuration
- HTTP request headers
- CGI-style header-to-environment-variable mappings
- AWS Elastic Load Balancing forwarding headers
- curl

## Sources Consulted
- Nginx ngx_http_core_module documentation: https://nginx.org/en/docs/http/ngx_http_core_module.html
- Nginx ngx_http_proxy_module documentation: https://nginx.org/en/docs/http/ngx_http_proxy_module.html
- Nginx ngx_http_fastcgi_module documentation: https://nginx.org/en/docs/http/ngx_http_fastcgi_module.html
- Nginx ngx_http_log_module documentation: https://nginx.org/en/docs/http/ngx_http_log_module.html
- Nginx ngx_http_rewrite_module documentation: https://nginx.org/en/docs/http/ngx_http_rewrite_module.html
- Nginx ngx_http_map_module documentation: https://nginx.org/en/docs/http/ngx_http_map_module.html
- Nginx ngx_http_realip_module documentation: https://nginx.org/en/docs/http/ngx_http_realip_module.html
- RFC 9110, HTTP Semantics: https://datatracker.ietf.org/doc/html/rfc9110
- RFC 3875, CGI Version 1.1: https://datatracker.ietf.org/doc/html/rfc3875
- AWS Classic Load Balancer HTTP headers documentation: https://docs.aws.amazon.com/elasticloadbalancing/latest/classic/x-forwarded-headers.html
- AWS Elastic Load Balancing overview: https://docs.aws.amazon.com/elasticloadbalancing/latest/userguide/how-elastic-load-balancing-works.html

## Issues Found
- The post described Nginx as following CGI specification recommendations for dropping underscore headers. RFC 3875 defines the CGI header-to-meta-variable mapping, but does not recommend that Nginx reject underscore header names. Updated the wording to state that Nginx's default behavior avoids ambiguity with CGI-style mappings.
- The post implied hyphenated header names were the HTTP standard convention. RFC 9110 permits underscores in HTTP field names because `_` is a valid token character. Updated the wording to call hyphenated names the most interoperable convention.
- The AWS Classic Load Balancer section incorrectly said AWS Classic Load Balancers use some underscore headers. AWS documentation lists hyphenated `X-Forwarded-For`, `X-Forwarded-Proto`, and `X-Forwarded-Port` headers for Application and Classic Load Balancers. Updated the section and removed the unnecessary `underscores_in_headers on;` directive from that example.
- The summary claimed underscore headers are essential for certain cloud providers. Since the AWS example was corrected to hyphenated headers, updated the summary to refer only to legacy systems or APIs that use underscore-based header names.

## Review Notes
Nginx was not installed in the local environment, so `nginx -t` could not be run against extracted snippets. The directives, contexts, embedded variables, proxy examples, FastCGI parameters, log format usage, and reload/check commands were reviewed against official Nginx documentation instead.
