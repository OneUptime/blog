# Validation Summary: How to Configure DNS over TLS with IPv6

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- DNS over TLS (DoT)
- IPv6
- Unbound
- stunnel
- CoreDNS
- systemd-resolved
- OpenSSL
- Certbot / Let's Encrypt
- Python / dnspython
- ip6tables

## Sources Consulted
- RFC 7858, Specification for DNS over Transport Layer Security (TLS): https://www.rfc-editor.org/rfc/rfc7858.html
- RFC 1035, Domain Names - Implementation and Specification: https://datatracker.ietf.org/doc/html/rfc1035
- Unbound `unbound.conf(5)`: https://unbound.docs.nlnetlabs.nl/en/latest/manpages/unbound.conf.html
- stunnel manual: https://www.stunnel.org/manual.html
- CoreDNS `tls` plugin docs: https://coredns.io/plugins/tls/
- systemd `resolved.conf(5)`: https://www.freedesktop.org/software/systemd/man/254/resolved.conf.html
- systemd `resolvectl(1)`: https://www.freedesktop.org/software/systemd/man/latest/resolvectl.html
- OpenSSL `s_client`: https://docs.openssl.org/3.0/man1/openssl-s_client/
- Certbot docs: https://eff-certbot.readthedocs.io/en/stable/using.html
- dnspython query/message docs: https://dnspython.readthedocs.io/en/stable/query.html and https://dnspython.readthedocs.io/en/latest/message-make.html
- Android secure DNS guidance: https://developer.android.com/privacy-and-security/risks/bad-dns
- Apple DNS settings docs: https://developer.apple.com/documentation/networkextension/dns-settings and https://developer.apple.com/documentation/devicemanagement/dnssettings

## Issues Found
- The raw DoT `openssl s_client` test used `echo -e`, which appends a newline and is less reliable for binary DNS payloads. I replaced it with `printf` and added `-servername dns.example.com` so the test sends the intended bytes and uses the expected TLS server name.
- The `stunnel` example used `sslVersion = TLSv1.2`, which fixes both the minimum and maximum protocol version to TLS 1.2. I changed it to `sslVersionMin = TLSv1.2` so TLS 1.3 remains available.
- The self-signed certificate command wrote `dns.key` and `dns.crt`, but the server examples referenced `dns.example.com.key` and `dns.example.com.crt`. I aligned the file names and noted that Certbot stores the live certificate and key under `/etc/letsencrypt/live/dns.example.com/`.
- The `systemd-resolved` client example used only the IPv6 address in `DNS=`. I updated it to `DNS=2001:db8::1#dns.example.com` so certificate validation and SNI work correctly with hostname-based certificates.
- The dnspython example referenced `dns.message.make_query()` without importing `dns.message`. I added the missing import and passed `server_hostname="dns.example.com"` for correct TLS SNI behavior.
- The verification and firewall examples implied UDP/853 usage. DoT is defined for TCP/853, so I changed the listener check to `ss -ltnp` and removed the UDP firewall rule.
- The conclusion implied iOS had a simple native DoT toggle equivalent to Android or systemd-resolved. I clarified that Apple platforms support encrypted DNS through DNS settings profiles or apps.

## Review Notes
- The Unbound ACLs in the example intentionally create a public recursive DoT listener. That is technically valid, but operators usually also add rate limiting or client restrictions to avoid running an abuse-prone open resolver.
- In `systemd-resolved`, global `DNS=` settings can coexist with per-link DNS learned from network managers. If a deployment needs to force exclusive use of the DoT resolver, the per-link DNS source may need to be adjusted separately.
