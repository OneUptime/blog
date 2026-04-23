# Validation Summary: How to Redirect All HTTP Traffic to HTTPS Using Nginx or Apache

## Status
validated

## Post Type
Guide

## Technologies Covered
- Nginx
- Apache HTTP Server
- HTTPS/TLS
- Let's Encrypt / Certbot HTTP-01 validation
- `curl`
- HSTS

## Sources Consulted
- NGINX `ngx_http_rewrite_module` documentation: https://nginx.org/en/docs/http/ngx_http_rewrite_module.html
- NGINX `ngx_http_core_module` embedded variables documentation: https://nginx.org/en/docs/http/ngx_http_core_module.html#variables
- Apache HTTP Server `mod_alias` `Redirect` documentation: https://httpd.apache.org/docs/current/en/mod/mod_alias.html#redirect
- Apache HTTP Server `mod_rewrite` documentation: https://httpd.apache.org/docs/current/en/mod/mod_rewrite.html#rewriterule
- Apache HTTP Server SSL/TLS how-to: https://httpd.apache.org/docs/current/en/ssl/ssl_howto.html
- Let's Encrypt challenge types documentation: https://letsencrypt.org/docs/challenge-types/
- Let's Encrypt integration guide: https://letsencrypt.org/docs/integration-guide/
- curl man page: https://curl.se/docs/manpage.html
- RFC 6797: HTTP Strict Transport Security (HSTS): https://datatracker.ietf.org/doc/html/rfc6797
- Local `curl --help all` output from the review environment

## Issues Found
- The Apache `mod_rewrite` example used `%1` in the redirect target. `%1` is a `RewriteCond` backreference, not a `RewriteRule` backreference, so the path would not be preserved as written. I changed the rule to use `%{REQUEST_URI}`.
- The ACME/Certbot section said the challenge path had to bypass the redirect. Let's Encrypt's HTTP-01 validation follows supported redirects, so I rewrote that section to describe direct port 80 handling as an optional pattern and updated the related warning and conclusion text.
- The Apache "SSL Virtual Host with Redirect" example did not handle `www.example.com` consistently. I added `ServerAlias www.example.com` to the relevant virtual hosts so the example matches the rest of the post.
- The Nginx redirect explanation said `$host$request_uri` preserved only the path. I corrected it to state that `$host` and `$request_uri` preserve the hostname and original request URI, including the query string.
- The catch-all Nginx wording was too broad. I narrowed it to requests that actually reach that server.
- The Apache/Nginx mixed guidance in "Common Mistakes" only mentioned Nginx's `server_name`. I corrected it to mention Apache's `ServerAlias` as well.

## Review Notes
- The HSTS example is technically valid, but `includeSubDomains` should only be enabled if every subdomain is available over HTTPS.
- Nginx and Apache were not installed in this workspace, so the review was documentation-based rather than runtime config-tested.
