# Validation Summary: How to Understand the Discard-Only Address Block (100::/64) - 100

## Status
validated

## Post Type
Reference guide

## Technologies Covered
- IPv6 special-purpose addressing
- RFC 6666 and IANA address registries
- Linux `iproute2`
- Linux `ip6tables`
- NGINX configuration
- Python `ipaddress`
- `curl`

## Sources Consulted
- RFC 6666: A Discard Prefix for IPv6 — https://www.rfc-editor.org/rfc/rfc6666
- IANA IPv6 Special-Purpose Address Space registry — https://www.iana.org/assignments/iana-ipv6-special-registry/iana-ipv6-special-registry.xhtml
- RFC 5737: IPv4 Address Blocks Reserved for Documentation — https://www.rfc-editor.org/rfc/rfc5737.html
- RFC 3849: IPv6 Address Prefix Reserved for Documentation — https://www.rfc-editor.org/rfc/rfc3849
- RFC 5180: IPv6 Benchmarking Methodology for Network Interconnect Devices — https://www.rfc-editor.org/rfc/rfc5180
- Python `ipaddress` module documentation — https://docs.python.org/3/library/ipaddress.html
- NGINX `ngx_http_geo_module` documentation — https://nginx.org/en/docs/http/ngx_http_geo_module.html
- curl manpage — https://curl.se/docs/manpage.html
- Local `man ip-route`
- Local `man ip6tables`

## Issues Found
- The post described `100::/64` as analogous to IPv4 `192.0.2.0/24`. That was incorrect. `192.0.2.0/24` is TEST-NET-1 documentation space from RFC 5737, while RFC 6666 created `100::/64` as a dedicated IPv6 discard prefix for RTBH use. I corrected the description, introduction, and comparison table.
- The introduction implied that packets to `100::/64` are automatically discarded by the protocol. The IANA registry marks the block as not reserved-by-protocol, and RFC 6666 describes operational use by routing the prefix to a discard or null interface inside an autonomous system. I updated the explanation to reflect that behavior.
- The DoS mitigation example used invalid Linux route syntax (`ip -6 route add 100::1/128 blackhole`) and an invalid IPv6 literal (`2001:db8:attack::/48`). I replaced it with valid `iproute2` syntax and corrected the RTBH explanation.
- The `curl` example said the request should always time out after five seconds. On Linux, a local blackhole route can fail immediately, while a remote discard path may appear as a timeout. I updated the note so it matches the documented `iproute2` route semantics and `curl` timeout behavior.
- The Python example incorrectly labeled `100::1:0` as outside `100::/64`; it is inside that network. I replaced it with `100:0:0:1::`, which is actually outside the `/64`, and removed the unused `socket` import.
- The firewall section used the `OUTPUT` chain to describe blocking traffic from internal hosts. `OUTPUT` only handles locally generated packets; forwarded traffic belongs in `FORWARD`. I added the correct forwarded-destination rules and clarified the locally generated case.
- The NGINX snippet placed `geo` at top level while presenting the snippet as `nginx.conf`. The `geo` directive is valid only in the `http` context. I wrapped the example in `http {}` so the configuration is structurally correct.

## Review Notes
- RFC 6666 explicitly says `100::/64` should not be announced to or accepted from third-party autonomous systems.
- The IANA registry entry for `100::/64` is `Source=True`, `Destination=True`, `Forwardable=True`, and `Globally Reachable=False`, which reinforces that the block's discard behavior comes from routing policy rather than built-in protocol handling.
- The `ip6tables` examples are valid on current systems, including the `iptables-nft` frontend, but some environments may prefer native `nft` syntax for new firewall deployments.
