# Validation Summary: How to Configure Server-Sent Events Through Nginx

## Status
validated

## Post Type
Tutorial / Configuration guide

## Technologies Covered
- Nginx reverse proxy configuration
- Server-Sent Events (SSE)
- Browser EventSource API
- Node.js HTTP responses
- Express.js
- Redis pub/sub with ioredis
- curl

## Sources Consulted
- Nginx ngx_http_proxy_module documentation: https://nginx.org/en/docs/http/ngx_http_proxy_module.html
- Nginx ngx_http_core_module documentation: https://nginx.org/en/docs/http/ngx_http_core_module.html
- Nginx ngx_http_gzip_module documentation: https://nginx.org/en/docs/http/ngx_http_gzip_module.html
- MDN, Using server-sent events: https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events/Using_server-sent_events
- MDN, EventSource: https://developer.mozilla.org/en-US/docs/Web/API/EventSource
- WHATWG HTML Standard, Server-sent events: https://html.spec.whatwg.org/multipage/server-sent-events.html
- Node.js HTTP API documentation: https://nodejs.org/api/http.html
- Express 5.x API reference: https://expressjs.com/en/api/
- MDN, Content-Encoding header: https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Content-Encoding
- Local curl help output for `-N` / `--no-buffer` and `--max-time`

## Issues Found
- The defaults table said `gzip` is on sometimes and `proxy_cache` varies. Nginx documentation shows `gzip off;` and `proxy_cache off;` by default, so the table now says they are off unless explicitly configured.
- The Nginx snippets disabled `chunked_transfer_encoding`. Nginx enables this by default for HTTP/1.1, and disabling it is only documented as useful for clients that fail to support chunked encoding. The snippets and summary now keep it on for SSE streams.
- The production config comment said `proxy_set_header Accept "text/event-stream"` passed through the event-stream content type. `Accept` is a request header sent to the upstream, not the response `Content-Type`, so the comment now describes that accurately.
- The Node.js backend set `Content-Encoding: identity` to prevent compression. `Content-Encoding` is for encodings that have actually been applied, and no header is needed when no compression is applied. The incorrect header was removed.
- The authentication section implied browser SSE clients can pass `Authorization` headers directly. Native browser `EventSource` cannot set arbitrary request headers, so the text now clarifies that cookies or query parameters are needed for native browser clients, while forwarded `Authorization` works for non-browser clients or polyfills that can send it.
- The debugging section listed `Connection: keep-alive` as an unconditional expected header. This can vary by HTTP version and proxy behavior, so the wording now marks it as something HTTP/1.1 responses may include.
- The summary table said `proxy_http_version 1.1` is required for streaming. The wording now says it uses HTTP/1.1 to the upstream, which is the relevant Nginx proxy behavior.

## Review Notes
The code snippets parse successfully with Node.js syntax checks. The curl flags used in the post are present in the installed curl help output. The SSE examples are intentionally minimal and do not include production hardening such as client ID collision handling, write backpressure handling, CORS configuration, or Redis error handling.
