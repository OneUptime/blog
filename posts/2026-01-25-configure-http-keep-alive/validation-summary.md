# Validation Summary: How to Configure HTTP Keep-Alive

## Status
validated

## Post Type
Tutorial / technical guide

## Technologies Covered
- HTTP/1.1 persistent connections and HTTP/2 multiplexing
- Nginx reverse proxy and upstream configuration
- Apache HTTP Server
- Node.js HTTP servers and HTTP/HTTPS agents
- Express.js
- Flask with Gunicorn
- FastAPI with Uvicorn
- Python Requests and urllib3 connection pooling
- Go net/http clients
- curl and Linux ss monitoring commands
- Prometheus client metrics

## Sources Consulted
- RFC 9112, HTTP/1.1 persistence: https://datatracker.ietf.org/doc/html/rfc9112
- Nginx ngx_http_core_module directives: https://nginx.org/en/docs/http/ngx_http_core_module.html
- Nginx ngx_http_upstream_module keepalive directives: https://nginx.org/en/docs/http/ngx_http_upstream_module.html
- Nginx core worker_connections directive: https://nginx.org/en/docs/ngx_core_module.html
- Apache HTTP Server core directives: https://httpd.apache.org/docs/current/mod/core.html
- Node.js HTTP API documentation: https://nodejs.org/api/http.html
- Gunicorn settings reference: https://gunicorn.org/reference/settings/
- Uvicorn settings documentation: https://uvicorn.dev/settings/
- Requests advanced usage, Sessions and Keep-Alive: https://requests.readthedocs.io/en/master/user/advanced/
- urllib3 connection pool reference: https://urllib3.readthedocs.io/en/stable/reference/urllib3.connectionpool.html
- Go net/http package documentation: https://pkg.go.dev/net/http
- curl man page: https://curl.se/docs/manpage.html
- ss Linux manual page: https://www.man7.org/linux/man-pages/man8/ss.8.html

## Issues Found
- The introduction stated that every HTTP request traditionally requires a new TCP connection. RFC 9112 confirms HTTP/1.1 defaults to persistent connections, so the wording was changed to describe the non-persistent case instead.
- The Nginx tuning snippet placed `worker_connections` inside the `http` context. Nginx documents this directive as valid in the `events` context, so the snippet now uses an `events` block.
- The Node.js server example described a 65 second timeout as matching the Nginx default, but Nginx's documented default is 75 seconds. The comment now says it matches the Nginx setting shown earlier in the post.
- The Go client example used `io.ReadAll` without importing `io`, which would not compile. Added the missing import.
- The curl monitoring comment implied `--keepalive-time` checks HTTP keep-alive. The curl man page defines it as TCP keepalive probe timing, so the comment was corrected.
- The summary recommended matching client and server keep-alive timeouts exactly. Node.js agent documentation describes closing client sockets slightly before server expiration to avoid reuse races, so the recommendation now says to keep client idle timeouts slightly lower where possible.
- The summary recommended setting timeouts higher than intermediate proxy timeouts. That advice is too broad for all components, so it was changed to coordinating timeouts with proxies and load balancers.

## Review Notes
The JavaScript examples were syntax-checked with `node --check`. Go was not installed in the review environment, so the Go snippet could not be compiled locally after the import fix. Some examples intentionally keep explicit headers such as `Connection: keep-alive`; these are valid for HTTP/1.1 examples but should be revisited if the post is later expanded to cover HTTP/2-specific server behavior.
