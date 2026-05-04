# Validation Summary: How to Configure HAProxy SSL Termination with IPv6

## Status
validated

## Post Type
Tutorial / Configuration Guide

## Technologies Covered
- HAProxy (load balancer)
- IPv6 networking
- SSL/TLS termination
- SNI (Server Name Indication)
- HSTS (HTTP Strict Transport Security)
- OpenSSL `s_client`
- `socat` (for HAProxy admin socket queries)
- `curl` (for IPv6 HTTPS testing)

## Sources Consulted
- HAProxy 2.8 Configuration Manual: https://docs.haproxy.org/2.8/configuration.html
- HAProxy Enterprise Configuration Manual: https://www.haproxy.com/documentation/haproxy-configuration-manual/latest/
- HAProxy HTTP redirects tutorial: https://www.haproxy.com/documentation/haproxy-configuration-tutorials/proxying-essentials/custom-rules/http-redirects/
- HAProxy SNI blog: https://www.haproxy.com/blog/enhanced-ssl-load-balancing-with-server-name-indication-sni-tls-extension
- OpenSSL 3.0 `s_client` man page: https://docs.openssl.org/3.0/man1/openssl-s_client/
- RFC 4291 (IPv6 Addressing Architecture)

## Issues Found
- **Invalid IPv6 addresses in the SNI section.** The post used `[2001:db8::api1]`, `[2001:db8::api2]`, `[2001:db8::web1]`, and `[2001:db8::web2]` as backend server addresses. IPv6 hex digits are restricted to `0-9` and `a-f` (RFC 4291), so the letters `p`, `i`, and `w` are not valid. HAProxy would fail to parse these. Fixed by replacing with valid hex addresses: `[2001:db8::a1]`, `[2001:db8::a2]` for the api backend and `[2001:db8::b1]`, `[2001:db8::b2]` for the web backend.

## Review Notes
- `option ssl-hello-chk` (used in the SSL passthrough section) is still accepted by modern HAProxy (2.8/3.x) but is effectively obsolete: it sends an SSLv3 ClientHello that TLS-only servers reject and cannot send SNI. The recommended modern alternative is `option tcp-check` with `tcp-check connect ssl`, or `check-ssl verify none` on the `server` line. Left in place since it still functions, but consider updating in a future revision.
- `ssl-default-bind-options ssl-min-ver TLSv1.2 no-sslv3` works, but `no-sslv3` is redundant once `ssl-min-ver TLSv1.2` is set. Modern style is just `ssl-default-bind-options ssl-min-ver TLSv1.2`.
- On Linux, binding both `*:443` and `[::]:443` on the same frontend can occasionally conflict due to default `IPV6_V6ONLY` behavior; if a user encounters "Address already in use", they may need to add the `v6only` modifier to the IPv6 bind line. The post does not call this out, but it's a relatively rare gotcha and not a technical error.
- For new configs, `http-request redirect scheme https code 301 if !{ ssl_fc }` is generally preferred over the older `redirect scheme https code 301` form, but both remain valid.
- `ssl-default-bind-ciphers` only configures TLSv1.2-and-below ciphers; for TLSv1.3 cipher suites the directive is `ssl-default-bind-ciphersuites`. The current cipher list is fine for TLSv1.2; TLSv1.3 uses sane defaults if unspecified.
