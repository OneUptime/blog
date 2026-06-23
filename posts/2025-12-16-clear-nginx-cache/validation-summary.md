# Validation Summary: How to Clear Nginx Cache

## Status
validated

## Post Type
Tutorial / operations guide

## Technologies Covered
- Nginx proxy cache
- Nginx FastCGI cache
- Third-party ngx_cache_purge module
- NGINX Plus cache purge support
- HTTP cache headers
- Bash scripting
- Cron
- Docker volumes

## Sources Consulted
- Nginx ngx_http_proxy_module documentation: https://nginx.org/en/docs/http/ngx_http_proxy_module.html
- Nginx ngx_http_fastcgi_module documentation: https://nginx.org/en/docs/http/ngx_http_fastcgi_module.html
- Nginx ngx_http_headers_module documentation: https://nginx.org/en/docs/http/ngx_http_headers_module.html
- NGINX content caching administration guide: https://docs.nginx.com/nginx/admin-guide/content-cache/content-caching/
- Nginx command-line parameters documentation: https://nginx.org/en/docs/switches.html
- FRiCKLE ngx_cache_purge module README: https://github.com/FRiCKLE/ngx_cache_purge
- Docker volume inspect CLI documentation: https://docs.docker.com/reference/cli/docker/volume/inspect/
- crontab(5) manual page: https://man7.org/linux/man-pages/man5/crontab.5.html

## Issues Found
- The cache-clearing script declared an unused backup directory and hard-coded `nginx:nginx` ownership. This can fail on Debian/Ubuntu installations that commonly use `www-data`. Updated the script to detect a running Nginx worker user and fall back to `www-data`.
- The purge section referred to `proxy_cache_purge` generically while showing third-party `ngx_cache_purge` separate-location syntax. Clarified that the example uses the third-party module and that NGINX Plus has built-in purge support with different syntax.
- The "Automatic Cache Invalidation" section overstated what the example does. Updated the heading and description to describe cache bypass and revalidation, which matches the Nginx directives shown.
- The `proxy_cache_methods GET HEAD` comment said it bypassed POST requests. Updated the comment to state that it caches only GET and HEAD requests.
- The browser cache section implied that response headers directly clear already-cached browser objects. Updated the wording to describe controlling future responses and revalidated content, and added `always` to the dynamic-content `add_header` directives so the no-cache headers apply beyond the default success/redirect status set.
- The key takeaways said to always reload Nginx after clearing cache. Updated this to recommend reloads after cache configuration changes or when clearing in-memory cache metadata.

## Review Notes
Manual filesystem cache deletion is common operational practice, but selective cache purging is safer when available. Wildcard purge behavior depends on the module or NGINX Plus feature in use; operators should verify their installed module and package before relying on wildcard purges in production.
