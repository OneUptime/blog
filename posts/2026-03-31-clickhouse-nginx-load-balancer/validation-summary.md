# Validation Summary: How to Use Nginx as a ClickHouse Load Balancer

## Status
validated

## Post Type
Tutorial / Configuration Guide

## Technologies Covered
- Nginx (open-source and Plus editions)
- ClickHouse HTTP interface (port 8123)
- SSL/TLS termination
- HTTP load balancing and reverse proxying

## Sources Consulted
- Nginx `upstream` module documentation: https://nginx.org/en/docs/http/ngx_http_upstream_module.html
- Nginx `proxy_pass` directive documentation: https://nginx.org/en/docs/http/ngx_http_proxy_module.html#proxy_pass
- Nginx `proxy_set_header` directive documentation: https://nginx.org/en/docs/http/ngx_http_proxy_module.html#proxy_set_header
- Nginx SSL module documentation: https://nginx.org/en/docs/http/ngx_http_ssl_module.html
- ClickHouse HTTP interface documentation: https://clickhouse.com/docs/en/interfaces/http
- ClickHouse `hostName()` function reference: https://clickhouse.com/docs/en/sql-reference/functions/other-functions#hostname

## Issues Found

### Issue 1: Invalid `proxy_pass` syntax for credential injection
- **What was wrong:** The post showed `proxy_pass http://clickhouse_user:secret@clickhouse_nodes;` to inject credentials at the proxy level. Nginx's `proxy_pass` directive does not support embedding `user:password@` credentials in the URL when targeting an upstream block. This configuration would cause an Nginx config test failure.
- **What was changed:** Replaced with `proxy_set_header Authorization "Basic Y2xpY2tob3VzZV91c2VyOnNlY3JldA==";` which is the correct way to inject HTTP Basic Auth credentials at the proxy level. The Base64 value decodes to `clickhouse_user:secret`, preserving the original example credentials.
- **Why:** `proxy_pass` only accepts `http://upstream_name` or `http://host:port/uri` forms. Credential injection must be done via the `Authorization` header.

### Issue 2: Non-existent `round_robin` directive name in summary
- **What was wrong:** The summary referenced `round_robin` as if it were a named Nginx directive (like `least_conn`). There is no `round_robin` directive in Nginx — round-robin is simply the default behavior when no load-balancing method is specified.
- **What was changed:** Changed `round_robin` to "the default round-robin method" to accurately reflect that it is the implicit default, not a named directive.
- **Why:** Using backtick formatting suggested it was a directive that could be placed in a config file, which would confuse readers attempting to use it.

## Review Notes
- The logging section title says "Logging ClickHouse Queries" and mentions logging "the query string," but the custom log format captures `$http_x_query_id` (the X-Query-Id custom header), not the SQL query itself. The `$request` variable in the same format does include the URL which may contain the query parameter for GET requests, so this is partially accurate but could be clearer. Not changed since it is not strictly incorrect — `$request` does capture GET query strings, and `X-Query-Id` is a useful ClickHouse tracking header.
- The `proxy_request_buffering on` directive shown in the "Request Buffering" section is actually the Nginx default. The section is still useful since it groups it with `client_max_body_size` and an extended timeout, but readers should know buffering is on by default.
- All Nginx directives and ClickHouse functions referenced in the post are current and non-deprecated as of the review date.
