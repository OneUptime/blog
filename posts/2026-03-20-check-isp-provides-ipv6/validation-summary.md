# Validation Summary: How to Check If Your ISP Provides IPv6 - A Practical Guide

## Status
validated

## Post Type
Guide

## Technologies Covered
- IPv6
- DHCPv6 Prefix Delegation (DHCPv6-PD)
- ICMPv6 / `ping`
- DNS / `dig`
- Linux networking tools (`ip`, `journalctl`)
- RIPEstat
- WHOIS / RIR lookup
- Hurricane Electric Tunnel Broker / 6in4

## Sources Consulted
- RFC 4291, IPv6 Addressing Architecture: https://www.rfc-editor.org/rfc/rfc4291
- RFC 4193, Unique Local IPv6 Unicast Addresses: https://www.rfc-editor.org/rfc/rfc4193
- RFC 3056, Connection of IPv6 Domains via IPv4 Clouds (6to4): https://www.rfc-editor.org/rfc/rfc3056
- RFC 4380, Teredo: Tunneling IPv6 over UDP through NATs: https://www.rfc-editor.org/rfc/rfc4380
- RFC 4861, Neighbor Discovery for IP version 6 (IPv6): https://www.rfc-editor.org/rfc/rfc4861
- RFC 6177, IPv6 Address Assignment to End Sites: https://www.rfc-editor.org/rfc/rfc6177.html
- RFC 7084, Basic Requirements for IPv6 Customer Edge Routers: https://www.rfc-editor.org/rfc/rfc7084
- RFC 8415, Dynamic Host Configuration Protocol for IPv6 (DHCPv6): https://www.rfc-editor.org/rfc/rfc8415
- IANA IPv6 Address Space registry: https://www.iana.org/assignments/ipv6-address-space
- IANA IPv6 Special-Purpose Address Space registry: https://www.iana.org/assignments/iana-ipv6-special-registry
- RIPEstat Data API docs: https://stat.ripe.net/docs/data_api/
- RIPEstat RIS Prefixes endpoint docs: https://stat.ripe.net/docs/data-api/api-endpoints/ris-prefixes
- Google Public DNS docs: https://developers.google.com/speed/public-dns/docs/using
- Cloudflare 1.1.1.1 IP address docs: https://developers.cloudflare.com/1.1.1.1/ip-addresses/
- pfSense documentation (platform identification): https://docs.netgate.com/pfsense/en/latest/general/index.html
- ARIN CLI Whois syntax: https://www.arin.net/resources/registry/whois/rws/cli/
- Hurricane Electric Tunnel Broker: https://tunnelbroker.net/
- Local CLI help/output: `ping -h`, `curl --help all`, `ip -h`, `ip tunnel help`, `ip -6 route help`, `dig -h`, `journalctl --help`

## Issues Found
- The post used `ping6`; I updated it to `ping -6`, which matches current documented `iputils` usage.
- The `curl -6 https://ipv6.google.com` description called it an IPv6-only resource. I corrected the wording because the command forces IPv6 transport, but the hostname itself is not the important part.
- The router CLI example mixed Linux commands with pfSense, which is FreeBSD-based. I removed pfSense from that Linux-specific example.
- The delegated-prefix check used `ip -6 route show | grep "::/56\\|::/48\\|::/64"`, which is not a reliable generic DHCPv6-PD test. I replaced it with an IPv6 default-route check and clarified that delegated prefixes should be verified in DHCPv6 client logs.
- The IPv6 address-interpretation table was oversimplified and partly wrong. In particular, native public IPv6 is not identified by `2001:xxxx::/32`, and `2001::/32` contains special-use ranges. I replaced that with the correct broader `2000::/3` guidance and clarified that prefixes alone do not always distinguish native from tunneled IPv6.
- The `test-ipv6.com` command tried to parse JSONP as JSON. I fixed it by stripping the callback wrapper before passing the output to `python3 -m json.tool`.
- The `dig AAAA ipv6.google.com` note said it checked whether DNS resolves over IPv6. That command only checks for an AAAA record; it does not by itself prove IPv6 transport to the resolver. I corrected the wording and examples.
- The MTU note referred to “jumbo packets,” but the payload sizes shown are path-MTU probes for ordinary Ethernet-sized traffic, not jumbo frames. I corrected the explanation.
- The RIPE API example used `https://stat.ripe.net/data/prefixes/data.json`, which currently returns `404`. I replaced it with the current `ris-prefixes` endpoint and adjusted the parsing logic to match the real response structure.
- The WHOIS example queried an IPv4 documentation address (`198.51.100.0`) while claiming to check IPv6 allocation. I replaced it with an IPv6-oriented example and clarified that the correct RIR server depends on the ISP resource being queried.
- The Hurricane Electric tunnel example installed the default route as `ip route add ::/0 dev he-ipv6`, which is incomplete/misleading for typical 6in4 configurations. I corrected it to add the IPv6 default route via the tunnel server’s IPv6 endpoint.
- The conclusion made DHCPv6-PD sound mandatory for confirming ISP IPv6 support in every case. I narrowed that claim so DHCPv6-PD is presented as the downstream-router case, and softened the unsupported generalization about IPv6 simply needing to be enabled on most accounts.

## Review Notes
- The article is now technically sound, but the command examples remain Linux-oriented and will not apply directly to non-Linux router platforms.
- `whois` is still usable for quick checks, but RDAP is the more modern interface for registry lookups and may be a better future update for automation-focused readers.
- Delegated prefix sizes vary by provider. Residential service commonly uses sizes such as `/56`, `/60`, or `/64`, and the exact size is an operational policy choice rather than an architectural requirement.
