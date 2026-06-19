# Validation Summary: How to Configure HTTP/2 Server Push

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- HTTP/2 Server Push
- Nginx HTTP/2 configuration
- Node.js `http2`
- Express with `spdy`
- Go `net/http`
- Flask `Link` headers
- Browser Resource Timing API
- `nghttp` and `curl`

## Sources Consulted
- RFC 9113: HTTP/2, especially Server Push behavior and restrictions: https://datatracker.ietf.org/doc/html/rfc9113
- Nginx `ngx_http_v2_module` documentation for `http2`, `http2_push`, and `http2_push_preload`: https://nginx.org/en/docs/http/ngx_http_v2_module.html
- Nginx `ngx_http_core_module` documentation for `early_hints`: https://nginx.org/en/docs/http/ngx_http_core_module.html
- Node.js HTTP/2 API documentation for `ServerHttp2Stream.pushStream()`: https://nodejs.org/api/http2.html
- Go `net/http` documentation for HTTP/2, `http.Pusher`, and `http.PushOptions`: https://pkg.go.dev/net/http
- `spdy` package README for Express-compatible `res.push()` usage: https://raw.githubusercontent.com/spdy-http2/node-spdy/master/README.md
- Chrome for Developers notice on removing HTTP/2 Server Push in Chrome 106: https://developer.chrome.com/blog/removing-push
- W3C Resource Timing specification and MDN `PerformanceResourceTiming.deliveryType` documentation: https://www.w3.org/TR/resource-timing/ and https://developer.mozilla.org/en-US/docs/Web/API/PerformanceResourceTiming/deliveryType
- curl man page for `--http2`: https://curl.se/docs/manpage.html

## Issues Found
- Nginx examples presented `http2_push` and `http2_push_preload` as current configuration without version caveats. Added a note that these directives are legacy, valid for Nginx 1.13.9 through 1.25.0, and obsolete in Nginx 1.25.1 and newer.
- The conditional Nginx example placed `map` inside `server` and used `http2_push` inside an `if` block. Moved the `map` directives into `http` context and replaced the invalid `if` block with variable-based `http2_push` directives.
- The Express example overwrote `res.push` and then called `res.push()` from inside the replacement function, causing recursion. Changed the middleware to bind the original `res.push()` and expose a separate `res.pushResource()` helper.
- The Express example read `req.cookies` but did not install cookie parsing middleware. Added `cookie-parser` and `app.use(cookieParser())`.
- The push budget example output did not match the code's actual selection. Corrected the expected total from 41KB to 48KB and corrected the selected resources list.
- The Flask example used `render_template()` without importing it. Added the missing import.
- The browser monitoring example claimed Resource Timing could identify pushed resources using `deliveryType === 'cache'`. Reworded and changed the code to report cache/reuse indicators instead, noting that Resource Timing has no portable HTTP/2 push flag.
- The Go example comment said HTTP/2 requires TLS. Revised it to clarify that Go enables browser-compatible HTTP/2 automatically when serving with TLS.
- The caveats section described the restriction as "different origins." Revised it to the more precise HTTP/2 authority rule for pushed resources.

## Review Notes
HTTP/2 Server Push is technically part of HTTP/2 and still exists in some server APIs, but browser and server support is legacy. Chrome disabled it by default in Chrome 106, Nginx made its push directives obsolete in 1.25.1, and new deployments should generally prefer 103 Early Hints and preload headers.
