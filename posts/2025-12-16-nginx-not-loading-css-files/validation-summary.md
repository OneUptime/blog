# Validation Summary: How to Fix Nginx Not Loading CSS Files

## Status
validated

## Post Type
Tutorial / troubleshooting guide

## Technologies Covered
- Nginx HTTP server configuration
- MIME types and Content-Type headers
- Nginx location, root, alias, try_files, gzip, expires, add_header, and FastCGI directives
- CSS stylesheet delivery
- Content Security Policy
- Linux file permissions and service commands
- curl-based HTTP diagnostics

## Sources Consulted
- Nginx ngx_http_core_module documentation: https://nginx.org/en/docs/http/ngx_http_core_module.html
- Nginx ngx_http_headers_module documentation: https://nginx.org/en/docs/http/ngx_http_headers_module.html
- Nginx ngx_http_gzip_module documentation: https://nginx.org/en/docs/http/ngx_http_gzip_module.html
- Nginx ngx_http_fastcgi_module documentation: https://nginx.org/en/docs/http/ngx_http_fastcgi_module.html
- IANA media type registration for text/css: https://www.iana.org/assignments/media-types/text/css
- IANA media type registration for font/woff: https://www.iana.org/assignments/media-types/font/woff
- IANA media type registration for font/woff2: https://www.iana.org/assignments/media-types/font/woff2
- IANA media type registration for application/javascript: https://www.iana.org/assignments/media-types/application/javascript
- MDN X-Content-Type-Options documentation: https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/X-Content-Type-Options
- MDN Content-Security-Policy style-src documentation: https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Content-Security-Policy/style-src
- Local curl help output for command flags used in the post.

## Issues Found
- The custom `mime.types` example mapped `.js` to both `text/javascript` and `application/javascript`. I removed `application/javascript` from the new mapping because IANA marks it obsolete in favor of `text/javascript`, and duplicate extension mappings can be confusing in Nginx examples.
- The custom `mime.types` example mapped `.woff` and `.woff2` to both current `font/*` types and older `application/font-*` types. I removed the older duplicate mappings; IANA identifies `application/font-woff` as deprecated in favor of `font/woff`, and `font/woff2` is the registered WOFF2 type.
- The `alias` example used `alias /var/www/static;` while the explanatory comment said Nginx would look under `/var/www/static/css/style.css`. I added the trailing slash so the example and comment match Nginx's documented alias path replacement behavior.
- The gzip section claimed that some browsers have issues with gzip-compressed CSS. I changed this to "Misconfigured gzip compression can cause CSS delivery issues" because gzip-compressed CSS is standard browser behavior; delivery problems are usually caused by server/header misconfiguration.
- The complete configuration repeated the obsolete duplicate JavaScript MIME mapping and included `application/javascript` in the custom mapping/gzip examples. I updated those examples to use `text/javascript` consistently where the post defines new mappings.

## Review Notes
The guide is technically valid after the fixes. The permissions commands are common for simple static deployments, but a future revision could note that ownership should be adapted to the site's deployment model and that directories must be searchable by the Nginx worker user, not necessarily owned by it.
