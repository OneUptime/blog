# Validation Summary: How to Configure Browser Caching

## Status
validated

## Post Type
Tutorial / technical implementation guide

## Technologies Covered
- HTTP caching
- Cache-Control, ETag, Last-Modified, Expires, Vary, and Pragma headers
- Nginx configuration
- Apache httpd `.htaccess`, mod_expires, mod_headers, and FileETag
- Express.js / Node.js
- CDN cache-control directives
- Webpack filename hashing
- curl header checks
- Browser DevTools

## Sources Consulted
- RFC 9111: HTTP Caching: https://www.rfc-editor.org/info/rfc9111/
- RFC 8246: HTTP Immutable Responses: https://datatracker.ietf.org/doc/html/rfc8246
- MDN Web Docs, Cache-Control header: https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Cache-Control
- Nginx ngx_http_headers_module documentation: https://nginx.org/en/docs/http/ngx_http_headers_module.html
- Nginx ngx_http_gzip_module documentation: https://nginx.org/en/docs/http/ngx_http_gzip_module.html
- Apache httpd mod_expires documentation: https://httpd.apache.org/docs/current/mod/mod_expires.html
- Express routing guide: https://expressjs.com/en/guide/routing/
- Express serve-static middleware documentation: https://expressjs.com/en/resources/middleware/serve-static/

## Issues Found
- The post claimed browser caching can reduce page load times by "50% or more" for returning visitors. This is workload-dependent and not generally guaranteed by HTTP caching specifications or server documentation, so it was changed to a non-numeric performance claim.
- The browser caching overview said subsequent visits serve the cached version without a network request. This is only true for fresh cache entries, so the wording was updated to specify a fresh cached version.
- The Nginx advanced example used `expires max` while also setting `Cache-Control: public, max-age=31536000`, which creates conflicting freshness durations because Nginx documents `expires max` as a 10-year Cache-Control value. It was changed to `expires 1y` to match the explicit one-year Cache-Control header.
- The Nginx query-parameter image example mixed conditional and default header directives in one location, which could produce an unclear or conflicting cache policy. It now sets one `$image_cache_control` value based on `$arg_v` and emits a single `Cache-Control` header.
- The Express example applied `immutable` to every cached non-JSON response, including unversioned assets and HTML. RFC 8246 defines `immutable` for resources that will not change during their freshness lifetime, so the example now applies `immutable` only when the path contains a hash-like version segment.
- The Express API route used `app.get('/api/*', ...)`, which is not current Express 5 route syntax because wildcards must be named. It was changed to `app.use('/api', ...)`, which works as middleware for API routes without relying on an unnamed wildcard.
- The CDN API example set two separate `Cache-Control` headers in the same Nginx location, one with `stale-while-revalidate` and one without. The redundant header was removed so the location emits one clear Cache-Control policy.
- The "Always include Vary header" best practice was overbroad. It was changed to include `Vary` when responses differ based on request headers.
- The conclusion said hash-based static assets can be cached indefinitely. That was changed to "long cache durations" to avoid implying unlimited caching.

## Review Notes
The remaining examples are broadly accurate as implementation guidance. Some recommendations, such as using one-year caching for images, assume reliable cache busting or URLs that change when content changes; future revisions could make that caveat more explicit for all asset types.
