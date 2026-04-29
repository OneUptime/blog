# Validation Summary: How to Configure LiteSpeed HTTP/3 with IPv6

## Status
validated

## Post Type
Guide

## Technologies Covered
- OpenLiteSpeed
- LiteSpeed Web Server
- HTTP/3
- QUIC
- IPv6
- curl
- OpenSSL
- `ufw`
- `ip6tables`

## Sources Consulted
- OpenLiteSpeed repository installation docs: https://docs.openlitespeed.org/installation/repo/
- OpenLiteSpeed basic configuration docs: https://docs.openlitespeed.org/config/
- OpenLiteSpeed SSL/listener docs: https://docs.openlitespeed.org/security/ssl/
- OpenLiteSpeed command reference: https://docs.openlitespeed.org/commands/
- LiteSpeed QUIC and HTTP/3 docs: https://docs.litespeedtech.com/lsws/cp/cpanel/quic-http3/
- Official OpenLiteSpeed source, default config template: https://github.com/litespeedtech/openlitespeed/blob/master/dist/conf/httpd_config.conf.in
- Official OpenLiteSpeed source, listener/QUIC help text and config metadata: https://github.com/litespeedtech/openlitespeed/blob/master/dist/admin/html.open/res/lang/en-US_tips.php
- Official OpenLiteSpeed source, plain-config directive mappings: https://github.com/litespeedtech/openlitespeed/blob/master/src/main/plainconf.cpp
- Official curl man page / HTTP/3 docs: https://curl.se/docs/manpage.html and https://curl.se/docs/http3.html
- Official OpenSSL `s_client` docs: https://docs.openssl.org/3.6/man1/openssl-s_client/
- RFC 9001, QUIC uses TLS 1.3 or newer: https://www.rfc-editor.org/rfc/rfc9001
- RFC 7838, `Alt-Svc` header semantics: https://www.rfc-editor.org/rfc/rfc7838

## Issues Found
- The repository bootstrap command was wrong. It used a misspelled, outdated URL (`enable_lst_debain_repo.sh`). I replaced it with the current official LiteSpeed repository bootstrap command and updated the package install command to the documented form.
- The listener instructions were inaccurate. The draft told readers to add a separate IPv6 listener and referenced a `Protocol` field that does not match current OpenLiteSpeed listener setup. I changed this to create or edit the HTTPS listener on port 443, use the documented `[ANY]` dual-stack bind option or a specific IPv6 address, and configure ALPN / QUIC from the actual SSL settings.
- The plain-text listener config used unsupported or misplaced directives. `quic 1`, `quicShmDir`, and `quicCertUpdateInterval` in the listener block do not match current OpenLiteSpeed listener config. I replaced them with the supported listener-level `enableQuic` directive and current certificate path examples.
- The QUIC tuning block was not valid OpenLiteSpeed syntax. The original `quic { maxConnections migration gso alpn }` block mixed unsupported keys and non-QUIC server settings. I replaced it with supported `tuning{}` directives drawn from current OpenLiteSpeed config metadata: `quicEnable`, `quicShmDir`, `quicMaxStreams`, `quicHandshakeTimeout`, and `quicIdleTimeout`.
- The manual `Alt-Svc` rewrite snippet was technically wrong. It used an Apache-style `Header` directive inside a rewrite block, which is not a valid way to configure this in OpenLiteSpeed, and it was unnecessary because LiteSpeed advertises supported HTTP/3 versions automatically. I replaced the section with an accurate explanation.
- The firewall examples were serviceable but weaker than the documented pattern. I changed `ip6tables -A` to `ip6tables -I` so the rules are inserted ahead of existing reject/drop rules, matching LiteSpeed’s own firewall guidance more closely.
- The verification commands contained inaccurate checks. The draft used process-name matching that was brittle, raw-IP HTTP/3 tests that would often fail certificate validation, and a nonexistent `/_admin/qperf` endpoint. I replaced those with a port-listening check, domain-based IPv6 `curl` tests, and the documented OpenLiteSpeed config syntax check command.
- The troubleshooting commands were incomplete or misleading. `openssl s_client -alpn h3` over TCP does not prove QUIC negotiation, and the post did not include a restart step after config changes. I replaced the QUIC troubleshooting command with a forced HTTP/3 `curl` check, kept the TLS 1.3 verification, and added the required `systemctl restart lsws` step.

## Review Notes
- `curl --http3` and `curl --http3-only` require a curl build with HTTP/3 support; the post now notes that explicitly.
- OpenLiteSpeed currently enables server-level QUIC by default in its shipped config template, but keeping the explicit `quicEnable` example is still reasonable in a configuration guide.
- `[ANY]` is the documented OpenLiteSpeed listener value for serving both IPv4 and IPv6 on the same listener.
