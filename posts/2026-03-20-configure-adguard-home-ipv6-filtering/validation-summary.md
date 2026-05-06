# Validation Summary: How to Configure AdGuard Home for IPv6 DNS Filtering

## Status
validated

## Post Type
Guide

## Technologies Covered
- AdGuard Home
- DNS and DNS filtering
- IPv6
- DNS-over-HTTPS (DoH)
- DNS-over-TLS (DoT)
- DNS-over-QUIC (DoQ)
- Docker
- `curl`
- `dig`

## Sources Consulted
- AdGuard Home official repository README: https://github.com/AdguardTeam/AdGuardHome
- AdGuard Home Configuration wiki: https://github.com/AdguardTeam/AdGuardHome/wiki/Configuration
- AdGuard Home Docker wiki: https://github.com/AdguardTeam/AdGuardHome/wiki/Docker
- AdGuard Home example configuration in the official source tree: https://github.com/AdguardTeam/AdGuardHome/blob/master/internal/next/AdGuardHome.example.yaml
- AdGuard Home OpenAPI schema in the official source tree: https://github.com/AdguardTeam/AdGuardHome/blob/master/openapi/next.yaml
- RFC 8484, "DNS Queries over HTTPS (DoH)": https://www.rfc-editor.org/rfc/rfc8484.html
- RFC 7858, "Specification for DNS over Transport Layer Security (TLS)": https://www.rfc-editor.org/rfc/rfc7858.html
- RFC 9250, "DNS over Dedicated QUIC Connections": https://www.rfc-editor.org/rfc/rfc9250.html
- RFC 6762, "Multicast DNS": https://www.rfc-editor.org/rfc/rfc6762.html
- RFC 8375, "Special-Use Domain 'home.arpa.'": https://www.rfc-editor.org/rfc/rfc8375.html

## Issues Found
- The Docker example only exposed plain DNS and the setup UI, but later sections enabled DoH, DoT, and DoQ. I added the missing `443/tcp`, `853/tcp`, and `853/udp` port mappings so the container example matches the protocols the post configures.
- The post used `dns.all_servers: true`, which is a legacy configuration key. I replaced it with the current `dns.upstream_mode: parallel` and added `bootstrap_prefer_ipv6: true` to match the IPv6-focused setup.
- The plain IPv6 upstream examples were bracketed without ports. I changed them to bare IPv6 literals, which matches AdGuard Home's documented upstream syntax for plain UDP resolvers.
- The DoQ example used port `784`, but current AdGuard Home defaults and current protocol documentation use `853` for DNS-over-QUIC. I updated `port_dns_over_quic` accordingly.
- The DoH and DoT access examples used a raw IPv6 literal even though the TLS configuration set `server_name: dns.example.com`. That would commonly fail certificate validation unless the certificate also contained an IP SAN. I changed the examples to use the hostname and explicitly noted that it needs an AAAA record pointing to the IPv6 address.
- The DoH test command used `application/dns-json` with `name=` and `type=` query parameters, which is not the RFC 8484 DoH wire-format interface AdGuard Home serves. I replaced it with a `curl --doh-url` example that exercises DoH correctly.
- The local rewrite snippet placed `rewrites` at the top level. In the current AdGuard Home config structure, classic DNS rewrites belong under `filtering.rewrites`, so I moved them there.
- The rewrite examples used `.local`, which is reserved for mDNS and can conflict with normal unicast DNS resolution on clients. I changed the examples to use `home.arpa`, which is the standards-based special-use home-network domain.
- The AAAA filtering test said a blocked AAAA lookup returns `0.0.0.0 or ::`. For AAAA queries under the default blocking mode, the blocked response is `::`, so I corrected the expectation.
- The web UI test used `http://[2001:db8::1]:3000` even though the post did not configure the HTTP listener separately for IPv6. I changed that check to `http://127.0.0.1:3000`, which is accurate for testing the local admin UI from the host.
- The filter example used the older AdGuard SDNS filter URL. I updated it to the current official HostlistsRegistry asset URL used by the project today.

## Review Notes
- The post now uses current AdGuard Home YAML keys and current protocol defaults, but AdGuard Home's documentation and source tree still contain some legacy examples for backward compatibility. Future edits should prefer the current configuration surface shown in the project's latest wiki and source examples.
