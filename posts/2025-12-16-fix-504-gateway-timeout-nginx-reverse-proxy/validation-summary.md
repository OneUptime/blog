# Validation Summary: How to Fix '504 Gateway Timeout' in Nginx Reverse Proxy

## Status
validated

## Post Type
Tutorial / Troubleshooting guide

## Technologies Covered
- Nginx reverse proxy configuration
- Nginx upstream load balancing and passive failover
- Nginx FastCGI configuration
- Bash, awk, grep, tail, and curl commands
- MySQL slow query logging
- Python / Flask request timeout handling
- Server-Sent Events and streaming proxy configuration
- OneUptime monitoring concepts

## Sources Consulted
- Nginx ngx_http_proxy_module documentation: https://nginx.org/en/docs/http/ngx_http_proxy_module.html
- Nginx ngx_http_upstream_module documentation: https://nginx.org/en/docs/http/ngx_http_upstream_module.html
- Nginx ngx_http_fastcgi_module documentation: https://nginx.org/en/docs/http/ngx_http_fastcgi_module.html
- NGINX HTTP Load Balancing documentation: https://docs.nginx.com/nginx/admin-guide/load-balancer/http-load-balancer/
- MySQL Slow Query Log documentation: https://dev.mysql.com/doc/refman/9.7/en/slow-query-log.html
- MySQL Log Output Destinations documentation: https://dev.mysql.com/doc/refman/9.7/en/log-destinations.html
- Python signal module documentation: https://docs.python.org/3/library/signal.html
- Flask request context documentation: https://flask.palletsprojects.com/en/stable/reqcontext/
- Local curl help output for `-w`, `-o`, and `-s` flags.

## Issues Found
- The "Upstream Configuration with Health Checks" heading overstated what the snippet showed. The Nginx `max_fails` and `fail_timeout` settings provide passive failure handling, not active health checks. Updated the heading and intro text to say "Passive Health Checks" and "passive failover."
- The slow-request `awk` command compared `$NF` numerically, but the configured log format emits the final upstream-response-time field as `urt="..."`, which converts to zero in awk numeric comparison. Updated the command to extract the value inside `urt="..."` before comparing it to 5 seconds.
- The MySQL example queried `mysql.slow_log` while only configuring file logging. MySQL writes to `mysql.slow_log` only when `log_output` includes `TABLE`. Added `SET GLOBAL log_output = 'TABLE,FILE';` so both the table query and file path configuration are consistent.
- The Flask timeout example used `after_request` to clear `signal.alarm()`, which is less reliable for cleanup when an unhandled exception occurs. Updated it to use `teardown_request`, which Flask calls when the request context is popped, including exception paths. Also clarified that the signal-based example is for Unix single-threaded workers because Python only permits signal handlers to be set in the main thread.
- The request-queuing snippet included an active `queue` directive even though the comments said it is only available in NGINX Plus. In open-source Nginx, leaving that line active would make the copied configuration invalid. Commented out the `queue` directive and kept the note explaining that it is NGINX Plus-only.

## Review Notes
- Nginx was not installed in the local environment, so configuration syntax was reviewed against official Nginx documentation rather than `nginx -t`.
- The timeout directive explanations are accurate: Nginx proxy and FastCGI read/send timeouts apply between successive read or write operations, not necessarily to the total request duration.
- The Nginx upstream `keepalive` directive behavior changed in Nginx 1.29.7, where upstream keepalive is enabled by default. The post's explicit `keepalive 32` remains valid and non-deprecated.
