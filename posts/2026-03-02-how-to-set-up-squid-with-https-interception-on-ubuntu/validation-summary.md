# Validation Summary: How to Set Up Squid with HTTPS Interception on Ubuntu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Squid proxy (with SSL/TLS bumping, peek-and-splice)
- OpenSSL (CA/key generation, s_client inspection)
- `security_file_certgen` (Squid SSL certificate generator helper)
- iptables / netfilter-persistent (transparent traffic redirection)
- systemd (service management)
- Ubuntu / Debian CA trust store (`update-ca-certificates`)
- Windows Group Policy and Firefox certificate stores (mentioned)

## Sources Consulted
- Squid `http_port` directive: http://www.squid-cache.org/Doc/config/http_port/
- Squid `https_port` directive: http://www.squid-cache.org/Doc/config/https_port/
- Squid `sslcrtd_program` directive: http://www.squid-cache.org/Doc/config/sslcrtd_program/
- Squid `acl` directive (file-reference syntax): http://www.squid-cache.org/Doc/config/acl/
- Squid SSL Peek-and-Splice feature: https://wiki.squid-cache.org/Features/SslPeekAndSplice
- Squid SslBump intercept example: https://wiki.squid-cache.org/ConfigExamples/Intercept/SslBumpExplicit
- Squid `logformat` (`%ssl::bump_mode` token): https://www.squid-cache.org/Doc/config/logformat/
- Ubuntu `squid-openssl` package documentation

## Issues Found

1. **Swapped comments on `http_port`/`https_port` directives.** The original config labeled `http_port 3128 ssl-bump` (no `intercept` flag) as "transparent HTTPS interception" and `https_port 3129 intercept ssl-bump` as "explicit proxy". This was backwards. Per the Squid `http_port` docs, `ssl-bump` without `intercept` is an explicit forward proxy that bumps CONNECT requests, while the `intercept` flag enables NAT-based transparent interception. Swapped the two comment blocks so each accurately describes its port.

2. **Missing quotes on ACL file reference.** The line `acl no_intercept dstdomain /etc/squid/no_intercept_domains.txt` would have been parsed by Squid as a literal domain string `/etc/squid/no_intercept_domains.txt`, not as a path to a domain list. Per the Squid `acl` documentation, file-based ACL values must be quoted: `acl no_intercept dstdomain "/etc/squid/no_intercept_domains.txt"`. Added the quotes.

3. **Incorrect cache.log grep marker.** The original `grep "SSL_bump" /var/log/squid/cache.log` would return no matches: Squid does not emit a literal `SSL_bump` token in cache.log by default. SSL/TLS bump diagnostics surface under debug section 83 (e.g., `debug_options ALL,1 83,5`) and use the lowercase tokens `bump`, `splice`, `peek`. Replaced the grep pattern with `grep -E "bump|splice|peek"` and added a note that debug section 83 must be enabled for these entries to appear.

## Review Notes

- `sslcrtd_program` is correct for Squid 3.1 through v7 (current Ubuntu LTS ships Squid 5/6). It is removed in Squid v8 — a future-proofing caveat readers should be aware of, but not an issue for the Ubuntu versions targeted by the post.
- `security_file_certgen` at `/usr/lib/squid/security_file_certgen` is the correct Debian/Ubuntu packaging path.
- `sudo cat ... | sudo tee squid-ca.pem` works but writes the combined file to stdout as well; readers may prefer `| sudo tee squid-ca.pem > /dev/null`. Not technically wrong, so left as-is.
- `sslproxy_cert_error allow all` is appropriately flagged as a development-only convenience in the existing comment.
- `https_port ... intercept ssl-bump` for transparent HTTPS interception via iptables `REDIRECT` is correct and matches the upstream Squid example. To monitor the access log with the bump mode visible, readers can extend their `logformat` to include `%ssl::bump_mode`.
- The post correctly emphasises legal/authorisation considerations for MITM interception, which is appropriate framing for a security-sensitive feature.
