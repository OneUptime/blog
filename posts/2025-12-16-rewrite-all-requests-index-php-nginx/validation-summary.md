# Validation Summary: How to Rewrite All Requests to index.php in Nginx

## Status
validated

## Post Type
Technical tutorial / configuration guide

## Technologies Covered
- Nginx
- PHP-FPM / FastCGI
- PHP front controller routing
- Laravel
- WordPress
- Symfony
- CodeIgniter
- HTTP security headers

## Sources Consulted
- Nginx core module documentation: https://nginx.org/en/docs/http/ngx_http_core_module.html
- Nginx FastCGI module documentation: https://nginx.org/en/docs/http/ngx_http_fastcgi_module.html
- Nginx HTTP/2 module documentation: https://nginx.org/en/docs/http/ngx_http_v2_module.html
- Nginx changelog for 1.25.1 HTTP/2 directive deprecation: https://nginx.org/en/CHANGES
- Laravel deployment documentation: https://laravel.com/docs/13.x/deployment
- Symfony web server configuration documentation: https://symfony.com/doc/current/setup/web_server_configuration.html
- WordPress permalink documentation: https://learn.wordpress.org/lesson/permalinks-rewriting-urls-on-apache-and-nginx/
- CodeIgniter URL / nginx documentation: https://codeigniter4.github.io/userguide/general/urls.html
- MDN X-XSS-Protection header reference: https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/X-XSS-Protection

## Issues Found
- The WordPress upload PHP denial was placed after the general PHP regex handler and duplicated as a nested location. I moved the `/uploads` and `/files` PHP denial before the general PHP handler so it takes precedence.
- The Symfony snippet comment incorrectly described the block as a dev environment rule allowing `index_dev.php`; the actual block only handles `index.php`. I changed the comment to describe the front controller accurately.
- The CodeIgniter fallback used `/index.php?/$request_uri`, which can duplicate the request path in the query string and does not match the official nginx guidance. I changed it to `/index.php$is_args$args`.
- The production Nginx snippet used deprecated `listen 443 ssl http2` syntax. I changed it to `listen 443 ssl;` with `http2 on;`, matching current Nginx HTTP/2 documentation.
- The production security headers included `X-XSS-Protection`, which MDN describes as unnecessary for modern browsers and recommends replacing with Content-Security-Policy. I removed the legacy header from the production sample.

## Review Notes
- The examples are otherwise consistent with the front controller pattern and the official Laravel, Symfony, WordPress, CodeIgniter, Nginx `try_files`, and FastCGI documentation.
- Local runtime validation with `nginx -t` was not performed because Nginx is not installed in this workspace; validation was performed by documentation review and static inspection.
