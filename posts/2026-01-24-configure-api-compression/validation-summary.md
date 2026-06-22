# Validation Summary: How to Configure Compression for APIs

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- HTTP compression and content negotiation
- gzip, Brotli, and deflate
- Nginx gzip, gzip_static, and ngx_brotli configuration
- Node.js Express compression middleware
- Flask-Compress
- FastAPI and Starlette middleware
- Go net/http gzip middleware
- curl, gzip, and Brotli CLI usage

## Sources Consulted
- MDN Accept-Encoding header: https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Accept-Encoding
- MDN Content-Encoding header: https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Content-Encoding
- RFC 9110 HTTP Semantics: https://www.rfc-editor.org/info/rfc9110/
- Nginx ngx_http_gzip_module documentation: https://nginx.org/en/docs/http/ngx_http_gzip_module.html
- Nginx ngx_http_gzip_static_module documentation: https://nginx.org/en/docs/http/ngx_http_gzip_static_module.html
- google/ngx_brotli documentation: https://github.com/google/ngx_brotli
- Express compression middleware documentation: https://expressjs.com/en/resources/middleware/compression/
- Node.js zlib documentation: https://nodejs.org/api/zlib.html
- FastAPI advanced middleware documentation: https://fastapi.tiangolo.com/advanced/middleware/
- Flask-Compress project documentation: https://pypi.org/project/Flask-Compress/
- Google Brotli CLI manual: https://github.com/google/brotli/blob/master/docs/brotli.1
- GNU gzip local help output (`gzip --help`)

## Issues Found
- The Express section said `compression` only handles gzip and showed both default and custom middleware enabled together. Updated the text to include gzip, deflate, and Brotli, and changed the default middleware call to a commented alternative so the custom options are the active configuration.
- The Node.js Brotli example used `shrink-ray-current`, which is unnecessary for current Express `compression` versions. Replaced it with the current `compression` Brotli configuration using Node.js `zlib` Brotli parameters.
- The custom FastAPI Brotli middleware consumed `response.body_iterator` and then returned the original response when compression was not smaller, which would produce an empty body. Rebuilt the uncompressed response from the captured body, skipped already encoded responses, respected `br;q=0`, and preserved/adds `Vary: Accept-Encoding`.
- The Go sample used a substring check for `Accept-Encoding`, which could incorrectly accept values such as `gzip;q=0`. Added a small parser for comma-separated encodings and quality values, and added `Vary: Accept-Encoding`.
- The Go example body contained placeholder JSON (`{"users": [...]}`), which is not valid JSON. Changed it to `{"users":[]}`.
- The Nginx `gzip_types` example included `text/html`; Nginx compresses `text/html` by default and documents `gzip_types` as additional MIME types. Removed the duplicate entry.

## Review Notes
JavaScript and Python snippets were syntax-checked locally. Go was reviewed by inspection because Go is not installed in this environment. The Brotli CLI is also not installed locally, so its flags were checked against the upstream manual. The remaining compression ratio figures are reasonable general estimates, but actual ratios vary significantly by payload type and content.
