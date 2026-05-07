# Validation Summary: How to Set Up Apache .htaccess Rules to Block IPv4 Ranges

## Status
validated

## Post Type
Guide

## Technologies Covered
- Apache HTTP Server 2.4
- `.htaccess`
- `mod_authz_core`
- `mod_authz_host`
- `mod_access_compat`

## Sources Consulted
- Apache HTTP Server Access Control how-to: https://httpd.apache.org/docs/2.4/howto/access.html
- Apache `mod_authz_host` documentation: https://httpd.apache.org/docs/current/mod/mod_authz_host.html
- Apache `mod_authz_core` documentation: https://httpd.apache.org/docs/2.4/mod/mod_authz_core.html
- Apache `.htaccess` tutorial: https://httpd.apache.org/docs/2.4/howto/htaccess.html
- Apache Override Class Index for `.htaccess`: https://httpd.apache.org/docs/2.4/en/mod/overrides.html
- Apache core directive docs for `<Location>` and `AllowOverride`: https://httpd.apache.org/docs/current/en/mod/core.html
- Apache Custom Error Responses docs: https://httpd.apache.org/docs/current/custom-error.html

## Issues Found
- The override guidance was too broad and partly incorrect. `Require` in `.htaccess` needs `AllowOverride AuthConfig`, while `ErrorDocument` in `.htaccess` needs `AllowOverride FileInfo`. I updated the main config example and the takeaway bullet to reflect the correct override classes.
- The `/admin` example used `<Location>` inside a `.htaccess`-focused post. Apache documents `<Location>` as valid only in `server config` and `virtual host` context, not in `.htaccess`. I replaced that example with a valid `/admin/.htaccess` example.
- The “CIDR range” example described `/24` CIDR notation but used Apache’s partial-prefix shorthand in the directive. I changed the rule to explicit CIDR notation so the example matches the section title and comment exactly.

## Review Notes
- The legacy `Order`/`Allow`/`Deny` syntax is accurately labeled for Apache 2.2, but Apache 2.4 documentation marks those directives as deprecated via `mod_access_compat`.
- If Apache is behind a reverse proxy or CDN, `Require ip` evaluates the connecting proxy address unless the server is configured appropriately, such as with `mod_remoteip`.
- Apache’s `.htaccess` documentation still recommends using the main server config instead of `.htaccess` when you control the server, for performance and security reasons.
