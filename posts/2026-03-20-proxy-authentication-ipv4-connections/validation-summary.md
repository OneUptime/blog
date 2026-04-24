# Validation Summary: How to Configure Proxy Authentication for IPv4 Connections

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Squid proxy
- HTTP Basic authentication
- LDAP-backed proxy authentication
- Apache `htpasswd`
- `curl`
- Shell proxy environment variables

## Sources Consulted
- Squid `auth_param` reference: https://www.squid-cache.org/Doc/config/auth_param/
- Squid `acl` reference: https://www.squid-cache.org/Doc/config/acl/
- Squid `logformat` reference: https://www.squid-cache.org/Doc/config/logformat/
- Squid authentication overview: https://wiki.squid-cache.org/Features/Authentication
- Squid NCSA auth example: https://wiki.squid-cache.org/ConfigExamples/Authenticate/Ncsa
- Squid LDAP auth example: https://wiki.squid-cache.org/ConfigExamples/Authenticate/Ldap
- Apache `htpasswd` documentation: https://httpd.apache.org/docs/current/programs/htpasswd.html
- `curl` manpage: https://curl.se/docs/manpage.html
- everything curl, HTTP proxy usage: https://everything.curl.dev/usingcurl/proxies/http.html
- everything curl, proxy environment variables: https://everything.curl.dev/usingcurl/proxies/env.html
- RFC 7617, Basic authentication: https://www.rfc-editor.org/rfc/rfc7617.html
- Debian `basic_ldap_auth(8)` manpage: https://manpages.debian.org/unstable/squid/basic_ldap_auth.8.en.html

## Issues Found
- The main Squid auth example used only `http_access allow authenticated_users`. Squid's authentication docs note that a plain `allow` rule does not reliably trigger a `407 Proxy Authentication Required` challenge for unauthenticated clients. I changed the access-control flow to `http_access deny !authenticated_users` followed by `http_access allow authenticated_users`, and applied the same correction to the IP-bypass and LDAP examples.
- The `curl` example labeled "HTTPS proxy" used `--proxy https://proxy.example.com:3128`, which would require a separate HTTPS-proxy listener and TLS configuration not shown anywhere else in the post. I changed it to the common and correct case for the demonstrated Squid setup: an HTTPS destination accessed through the configured HTTP proxy.
- The environment-variable section said the settings could go in `~/.bashrc` or `/etc/environment` while using `export` syntax. That syntax is appropriate for a shell profile, not `/etc/environment`. I corrected the section heading/comment to match shell usage.
- The original `no_proxy` example used CIDR notation. `curl` supports CIDR in `NO_PROXY` only in newer versions, and support is not universal across tools. I changed the example to a hostname/domain-based pattern that is more broadly portable.
- The log-monitoring command parsed the wrong fields from Squid's default `access.log` format and assumed the username was field 11. According to Squid's default `logformat squid`, the username is field 8. I replaced the pipeline with an `awk` filter that prints the correct fields and ignores entries without a username.
- The authentication-method table treated LDAP as if it were a client authentication scheme on the same level as Basic, Digest, and Kerberos. In this post's own Squid example, LDAP is a backend used to validate Basic credentials. I corrected that row to "LDAP-backed Basic" and adjusted the security wording accordingly.
- The conclusion said to "tunnel proxy credentials over HTTPS", which was directionally right but imprecise for a forward-proxy setup. I rewrote it to state the actual requirement: use TLS to the proxy itself on untrusted networks because Basic credentials are only Base64-encoded.

## Review Notes
- Helper binary paths such as `/usr/lib/squid/basic_ncsa_auth` and `/usr/lib/squid/basic_ldap_auth` are correct for Debian/Ubuntu-style layouts, but some distributions use `/usr/lib64/squid/...` instead.
- The LDAP example still uses `-w "ldap_password"` for brevity. The `basic_ldap_auth(8)` documentation recommends `-W <secretfile>` as the less insecure option for production deployments.
- Squid `proxy_auth` ACLs apply to explicitly configured forward proxies and cannot be used on transparent/intercept/intercepting proxy ports.
