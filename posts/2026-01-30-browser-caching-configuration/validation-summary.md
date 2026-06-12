# Validation Summary: How to Build Browser Caching Configuration

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- HTTP caching headers
- Cache-Control, Expires, ETag, Last-Modified, If-None-Match, Vary
- Nginx
- Apache HTTP Server mod_expires and mod_headers
- Express.js and Node.js
- webpack
- curl

## Sources Consulted
- RFC 9111: HTTP Caching: https://datatracker.ietf.org/doc/html/rfc9111
- RFC 9110: HTTP Semantics: https://datatracker.ietf.org/doc/html/rfc9110
- MDN Cache-Control header reference: https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Cache-Control
- MDN ETag header reference: https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/ETag
- MDN If-None-Match header reference: https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/If-None-Match
- Nginx ngx_http_core_module documentation: https://nginx.org/en/docs/http/ngx_http_core_module.html
- Nginx ngx_http_gzip_module documentation: https://nginx.org/en/docs/http/ngx_http_gzip_module.html
- Apache mod_expires documentation: https://httpd.apache.org/docs/current/mod/mod_expires.html
- Apache core configuration sections documentation: https://httpd.apache.org/docs/current/mod/core.html
- Express 5.x API reference: https://expressjs.com/en/api/
- Express static files guide: https://expressjs.com/en/starter/static-files/
- webpack caching guide: https://webpack.js.org/guides/caching/
- webpack optimization configuration: https://webpack.js.org/configuration/optimization/

## Issues Found
- The long-lived Nginx JavaScript/CSS rule matched every `.js` and `.css` file, despite the text describing only versioned static assets. Changed the regex to match hash-versioned filenames such as `app.a1b2c3d4.js` and quoted it because Nginx regexes containing `}` should be quoted.
- The directive table used `app.v2.js` as the immutable asset example, which does not clearly reflect the content-hash strategy described later. Changed it to `app.a1b2c3d4.js`.
- The Nginx gzip example omitted `gzip_vary on`, while the article later warns about missing `Vary: Accept-Encoding`. Added `gzip_vary on` so compressed assets emit the expected `Vary` header.
- The Nginx HTML example manually set `Last-Modified` to `$date_gmt`, which represents response time rather than the selected representation's modification time. Removed that incorrect header override.
- The Nginx and Express API examples set `Pragma: no-cache` as a response header. Removed it so the examples rely on the modern `Cache-Control: no-store` response directive.
- The Apache section said the full configuration could be placed in `.htaccess`, but the included `<LocationMatch>` block is a server or virtual-host context container. Changed the placement guidance to virtual host or server configuration.
- The Express middleware cached all `.js` and `.css` files for one year because `path.includes('.')` did not validate a version hash. Changed the regex to require a hex hash before the extension.
- The Express ETag helper returned an unquoted hash, but HTTP entity tags must be quoted strings. Updated the helper to return a quoted ETag so the `If-None-Match` comparison matches the value clients send.

## Review Notes
The Express ETag route remains a simplified teaching example: production code should avoid synchronous file reads on hot paths, handle file-not-found errors, restrict file paths carefully, and parse `If-None-Match` lists or weak validators if full HTTP validator behavior is required.
