# Validation Summary: How to Configure Apache mod_rewrite Rules on RHEL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux
- Apache HTTP Server 2.4
- Apache mod_rewrite
- Apache `.htaccess` and virtual host configuration
- Linux command-line tools

## Sources Consulted
- Apache HTTP Server 2.4 mod_rewrite module documentation: https://httpd.apache.org/docs/current/mod/mod_rewrite.html
- Apache HTTP Server 2.4 RewriteRule flags documentation: https://httpd.apache.org/docs/current/en/rewrite/flags.html
- Apache HTTP Server 2.4 redirecting and remapping documentation: https://httpd.apache.org/docs/current/rewrite/remapping.html
- Apache HTTP Server 2.4 core `AllowOverride` documentation: https://httpd.apache.org/docs/2.4/mod/core.html#allowoverride
- Apache HTTP Server 2.4 `.htaccess` tutorial: https://httpd.apache.org/docs/current/howto/htaccess.html
- Red Hat Customer Portal mod_rewrite article landing page: https://access.redhat.com/solutions/15712

## Issues Found
- The redirect examples used leading `/` patterns without stating the context. Apache matches leading `/` in virtual host/server context, but `.htaccess` and other per-directory contexts strip the directory prefix and do not match a leading slash. I added a note that the examples are written for virtual host or server config and that `.htaccess` path-matching rules should omit the leading `/`.
- The HTTPS and www redirect substitutions rebuilt the target URL from the `RewriteRule` capture. That works in virtual host context, but is easy to break when moved to `.htaccess` because the capture no longer includes a leading slash. I changed those redirects to use `%{REQUEST_URI}`, which preserves the requested path consistently.
- The clean URL front-controller rule used `^(.*)$` in virtual host/server context, causing `$1` to include the leading slash. I changed it to `^/(.*)$` so the `q` parameter receives the clean path without a leading slash.

## Review Notes
The post is technically relevant and otherwise aligned with Apache HTTP Server 2.4 behavior used on RHEL 9. Future improvements could mention that `AllowOverride FileInfo` is sufficient for rewrite directives in `.htaccess` when broader `.htaccess` overrides are not required, and that high `rewrite:trace` levels should be avoided outside short debugging sessions.
