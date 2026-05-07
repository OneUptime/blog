# Validation Summary: How to Set Up a 6to4 Tunnel for IPv6 Connectivity

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- 6to4
- IPv6
- IPv4
- Linux `iproute2`
- Debian `ifupdown`
- SIT tunnels

## Sources Consulted
- RFC 3056: Connection of IPv6 Domains via IPv4 Clouds — https://www.rfc-editor.org/rfc/rfc3056
- RFC 7526: Deprecating the Anycast Prefix for 6to4 Relay Routers — https://www.rfc-editor.org/rfc/rfc7526
- RFC 6343: Advisory Guidelines for 6to4 Deployment — https://www.rfc-editor.org/rfc/rfc6343
- Debian `interfaces(5)` man page (`ifupdown`) — https://manpages.debian.org/unstable/ifupdown/interfaces.5.en.html
- Debian `ifupdown` source for the `inet6` `6to4` method — https://sources.debian.org/src/ifupdown/0.8.19/inet6.defn
- Debian `ip-tunnel(8)` man page (`iproute2`) — https://manpages.debian.org/unstable/iproute2/ip-tunnel.8.en.html
- IANA IPv4 Special-Purpose Address Registry — https://www.iana.org/assignments/iana-ipv4-special-registry/iana-ipv4-special-registry.xhtml
- Local CLI help checked for command syntax: `ip tunnel help`, `ip route help`, `ping -h`, `curl --help`

## Issues Found
- The introduction said 6to4 "does not work behind NAT" as an absolute rule. RFC 3056 is narrower: the 6to4 function can coexist with NAT when it runs on the border device that owns the globally unique IPv4 address. I changed the wording to describe the common operational requirement accurately.
- The prerequisite check used `curl -4 https://ifconfig.me` as if it could prove the host was not behind NAT. That only shows the externally visible IPv4 address, not whether the host itself owns it. I changed the section to compare the host's local global IPv4 address with the externally visible address.
- The prerequisite block used `modprobe sit` without privilege escalation. I changed it to `sudo modprobe sit` and noted that built-in SIT support may not appear in `lsmod`.
- The manual Linux configuration added an explicit `2002::/16` route after assigning `2002:...::1/16`. Debian's documented 6to4 implementation relies on the connected route created by the `/16` address, so the extra route was redundant and could fail with a duplicate-route error. I removed it.
- The manual Linux configuration routed `::/0` through the 6to4 relay. Debian's documented `6to4` method routes `2000::/3` instead. I changed the route to `2000::/3` to match the documented behavior.
- The Debian persistent configuration used `iface ... inet6 v4tunnel` with `endpoint any`, but `v4tunnel` documents `endpoint` as a required IPv4 dotted-quad address. Debian documents a dedicated `inet6 6to4` method for this use case, so I replaced the stanza with the documented `6to4` method.
- The relay test pinged `2002:c0a8:0101::1`, which is a 6to4 address derived from the private IPv4 address `192.168.1.1`; that does not validate public 6to4 relay availability. I replaced it with an IPv4 reachability check for `192.88.99.1` and labeled it as deprecated anycast behavior.
- The conclusion said 6to4 itself is deprecated by RFC 7526. RFC 7526 deprecates the public anycast relay model and explicitly says the basic unicast 6to4 mechanism and `2002::/16` are not deprecated. I corrected that statement.

## Review Notes
- The post is technically salvageable, but 6to4 is a legacy transition mechanism. Public anycast relay use via `192.88.99.1` is deprecated and often unavailable in practice, so the tutorial is best treated as historical or niche operational guidance rather than a recommended modern deployment.
- I validated command syntax and configuration semantics against Debian and `iproute2` documentation, but I did not perform an end-to-end live tunnel test in this environment because that would require a host with a globally reachable public IPv4 address and access to a working 6to4 relay.
