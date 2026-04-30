# Validation Summary: How to Configure IPv6 Captive Portals for Wi-Fi

## Status
validated

## Post Type
Guide

## Technologies Covered
- IPv6
- Captive Portal / CAPPORT
- nftables
- Linux neighbor discovery (NDP)
- Python / Flask
- Router Advertisements (RA)
- radvd
- DHCPv6 / ISC DHCP

## Sources Consulted
- RFC 8908: Captive Portal API — https://www.rfc-editor.org/rfc/rfc8908.html
- RFC 8910: Captive-Portal Identification in DHCP and Router Advertisements (RAs) — https://www.rfc-editor.org/rfc/rfc8910
- RFC 8952: Captive Portal Architecture — https://www.rfc-editor.org/rfc/rfc8952.html
- `radvd.conf(5)` man page — https://manpages.debian.org/unstable/radvd/radvd.conf.5.en.html
- `nft(8)` / nftables man page — https://manpages.debian.org/bookworm/nftables/nft.8.en.html
- Werkzeug serving documentation — https://werkzeug.palletsprojects.com/en/stable/serving/
- ISC DHCP 4.4 `dhcp-options` manual page — https://kb.isc.org/docs/isc-dhcp-44-manual-pages-dhcp-options
- ISC DHCP 4.4 `dhcpd.conf` manual page — https://kb.isc.org/docs/isc-dhcp-44-manual-pages-dhcpdconf

## Issues Found
- The post cited RFC 8910 as the CAPPORT API specification. I corrected the CAPPORT API references to RFC 8908 and clarified that RFC 8910 covers RA/DHCP signaling of the API URI.
- Several example IPv6 literals and prefixes were invalid, including `2001:db8::portal`, `2001:db8::dns`, and `2001:db8:guest::/64`. I replaced them with valid documentation-prefix examples under `2001:db8::/32`.
- The nftables example redirected arbitrary HTTPS traffic to the portal. That breaks TLS and conflicts with the CAPPORT architecture, which is designed to avoid protocol-forging behavior. I removed the HTTPS DNAT guidance and updated the comments to point the CAPPORT API and portal hostname at the gateway instead.
- The Flask CAPPORT example used `jsonify`, which would return `application/json`. RFC 8908 requires `application/captive+json`, and it recommends private or stricter cache controls. I changed the response code to emit the correct content type and `Cache-Control: private`.
- The CAPPORT example removed `user-portal-url` for authenticated clients while still setting `can-extend-session: true`. I corrected the response structure so the semantics match RFC 8908 more closely.
- The authentication check used substring matching against `nft list set` output. I replaced that with `nft get element` and a return-code check, which is a more accurate set-membership test.
- The RA section said radvd did not support captive-portal advertisement natively and pointed readers to DHCPv6 option 114. Current radvd supports `AdvCaptivePortalAPI`, RA uses option type 37, and DHCPv6 uses option 103 for this purpose. I corrected both the RA and DHCPv6 examples.
- The DHCPv6 example used the unrelated `capwap-ac-v6` option definition with the wrong code. I replaced it with a correctly defined custom DHCPv6 option 103 carrying the captive portal API URI.

## Review Notes
- The fenced Python example was syntax-checked successfully with `python3 -m py_compile` after extraction from the Markdown file.
- `nft -c` could not be executed successfully in this sandbox because `nft` could not initialize netlink without the needed privileges, so nftables validation was done against the official man page and syntax documentation instead.
- The Flask sample uses the built-in development server API for simplicity. For a real captive portal deployment, TLS should be terminated with a production-grade server and a certificate valid for the advertised hostname.
- The ISC DHCP syntax is valid, but ISC DHCP 4.4 is legacy software; many current DHCPv6 deployments use Kea instead.
