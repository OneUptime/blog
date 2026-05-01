# Validation Summary: How to Configure DNS-Based IPv6 Load Balancing

## Status
validated

## Post Type
Guide

## Technologies Covered
- DNS
- IPv6
- AAAA records
- BIND 9
- PowerDNS Authoritative Server
- Dynamic DNS updates with `nsupdate`
- Bash
- cron
- BGP anycast
- BIRD

## Sources Consulted
- BIND 9 Configuration Reference (`rrset-order`): https://bind9.readthedocs.io/en/v9.21.9/reference.html
- BIND 9 Manual Pages (`nsupdate`): https://bind9.readthedocs.io/en/v9.21.14/manpages.html
- RFC 3596, DNS Extensions to Support IP Version 6: https://www.rfc-editor.org/rfc/rfc3596.html
- RFC 6724, Default Address Selection for Internet Protocol Version 6 (IPv6): https://www.rfc-editor.org/rfc/rfc6724.html
- PowerDNS Authoritative Server Lua Records overview: https://doc.powerdns.com/authoritative/lua-records/index.html
- PowerDNS Authoritative Server Lua record functions: https://doc.powerdns.com/authoritative/lua-records/functions.html
- RFC 4786, Operation of Anycast Services: https://www.rfc-editor.org/rfc/rfc4786.html
- BIRD 3.2.1 User's Guide: https://bird.nic.cz/doc/bird-3.2.1.html
- Local CLI help used to sanity-check command syntax: `ping -h`, `ping6 -h`, and `dig -h`

## Issues Found
- The PowerDNS section used a `preresolve(dq)` / `dq:addAnswer()` Lua script in `/etc/powerdns/pdns.lua`, which matches PowerDNS Recursor Lua hooks rather than PowerDNS Authoritative Server weighted authoritative answers. I replaced it with a supported PowerDNS Authoritative `LUA` `AAAA` record using `pickwrandom(...)` and noted that Lua records must be enabled first.
- The round-robin explanation implied that clients simply cycle through returned AAAA records. I corrected that language to reflect that authoritative DNS can return multiple addresses, but client and resolver address-selection behavior determines which address is tried.
- The health-check script used `ping6`, which is no longer the preferred syntax on modern iputils systems, and used `echo -e` to feed `nsupdate`. I changed this to `ping -6` and `printf '%b'` for current syntax and better shell portability.
- The anycast section described anycast as "true load balancing", used invalid placeholder IPv6 literals, and showed an outdated `bird6.conf` / pre-channel BIRD example. I corrected the claim to coarse-grained traffic distribution and high availability, replaced the placeholder addresses with valid documentation-safe IPv6 examples, and updated the BIRD configuration to current `bird.conf` syntax with an explicit `ipv6` channel.

## Review Notes
- `rrset-order` defaults to random ordering only when no `rrset-order` statement is present; once such statements are configured, unmatched RRsets default to `none` in BIND.
- Lower TTLs help reduce failover lag, but recursive caching and client-side destination address selection still limit how fast DNS-only failover takes effect.
- PowerDNS `pickwrandom()` provides weighted selection but not health checks; health-aware behavior in PowerDNS Authoritative requires functions such as `ifportup()` or `ifurlup()`.
