# Validation Summary: How to Harden Apache httpd Security on RHEL

## Status
validated

## Post Type
Tutorial / hardening guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- Apache HTTP Server 2.4 / httpd
- Apache configuration directives
- HTTP security headers
- Linux file ownership and permissions
- systemd service reload workflow

## Sources Consulted
- Apache HTTP Server 2.4 core directives: https://httpd.apache.org/docs/2.4/mod/core.html
- Apache HTTP Server 2.4 mod_headers documentation: https://httpd.apache.org/docs/2.4/mod/mod_headers.html
- Apache HTTP Server 2.4 directive quick reference: https://httpd.apache.org/docs/2.4/mod/quickreference.html.en
- Red Hat Enterprise Linux 9 documentation, Setting up the Apache HTTP web server: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/deploying_web_servers_and_reverse_proxies/setting-apache-http-server_deploying-web-servers-and-reverse-proxies
- MDN X-XSS-Protection header documentation: https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/X-XSS-Protection
- OWASP Secure Headers Project: https://owasp.org/www-project-secure-headers/

## Issues Found
- The post recommended `X-XSS-Protection: 1; mode=block`. This header is deprecated, non-standard, and OWASP/MDN warn that it can introduce client-side security issues in some cases. I replaced it with a narrowly scoped `Content-Security-Policy` `frame-ancestors 'self'` example.
- The method restriction example described GET, POST, and HEAD as "safe methods." POST is not an HTTP safe method. I changed the comment to "common methods."
- The ETag section implied inode leakage as a general Apache behavior. Apache 2.4 defaults to `FileETag MTime Size`, without `INode`; inode leakage only applies to older or custom configurations that include `INode`. I updated the explanation while leaving `FileETag None` as a valid hardening option.
- The TRACE section stated that TRACE can be used in cross-site tracing attacks. Apache's official documentation notes that enabling TRACE does not itself expose a vulnerability in Apache httpd. I revised the text to frame `TraceEnable Off` as reducing exposed methods for hardening policy.

## Review Notes
The remaining Apache directives and commands are syntactically valid for Apache httpd 2.4/RHEL-style layouts. `ServerTokens Prod` intentionally still returns `Server: Apache`; it does not remove the header entirely. `Header always set` requires `mod_headers`, which the post lists as a prerequisite. The file permission guidance is correct for static content but would need adjustment for applications that require Apache or an application runtime to write uploads, cache files, or generated assets.
