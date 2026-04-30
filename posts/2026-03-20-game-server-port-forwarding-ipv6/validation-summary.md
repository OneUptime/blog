# Validation Summary: How to Configure Game Server Port Forwarding for IPv6

## Status
validated

## Post Type
Guide

## Technologies Covered
- IPv6
- Linux firewalling with `ip6tables`
- Linux firewalling with `nftables`
- Linux networking tools (`ip`, `ping`, `ss`, `sysctl`, `nmap`, `telnet`)
- Game server networking

## Sources Consulted
- RFC 4864, Local Network Protection for IPv6: https://www.rfc-editor.org/rfc/rfc4864.html
- RFC 6092, Recommended Simple Security Capabilities in Customer Premises Equipment (CPE) for Providing Residential IPv6 Internet Service: https://www.rfc-editor.org/rfc/rfc6092.html
- RFC 4443, Internet Control Message Protocol (ICMPv6) for IPv6: https://www.rfc-editor.org/rfc/rfc4443.html
- RFC 4890, Recommendations for Filtering ICMPv6 Messages in Firewalls: https://www.rfc-editor.org/rfc/rfc4890.html
- RFC 3493, Basic Socket Interface Extensions for IPv6: https://www.rfc-editor.org/rfc/rfc3493.html
- Linux kernel `bindv6only` sysctl documentation: https://www.kernel.org/doc/html/latest/networking/ip-sysctl.html
- nftables wiki, Matching packet headers: https://wiki.nftables.org/wiki-nftables/index.php/Matching_packet_headers
- Valheim dedicated server guide: https://valheim.com/support/a-guide-to-dedicated-servers
- Valve Developer Community, Source Dedicated Server: https://developer.valvesoftware.com/wiki/Source_Dedicated_Server
- Valve Developer Community, Source RCON Protocol: https://developer.valvesoftware.com/wiki/Source_RCON_Protocol
- Rust Wiki, Creating a hidden, whitelisted server: https://wiki.facepunch.com/rust/Creating_a_hidden_whitelisted_server
- Factorio Wiki, Multiplayer: https://wiki.factorio.com/Multiplayer
- ARK official community forum thread confirming `7777`, `7778`, and `27015` usage: https://survivetheark.com/index.php?%2Fforums%2Ftopic%2F742145-unable-to-query-server-info-on-self-hosted-server-joining-localy%2F=&comment=3632234&do=findComment
- Minecraft Wiki references for Java Edition default port behavior: https://minecraft.wiki/w/Server.properties and https://minecraft.wiki/w/Tutorial%3ASetting_up_a_server
- Nmap reference guide: https://nmap.org/book/port-scanning-options.html
- Local command help/man output checked for syntax: `ip6tables --help`, `ss --help`, `nft --help`, `sysctl net.ipv6.bindv6only`

## Issues Found
- The description claimed the post covered NAT64 considerations, but the article did not discuss NAT64. I corrected the description so it matches the actual technical content.
- The original NAT check implied IPv6 NAT is simply absent. I changed this to a NAT66-rule check, because IPv6 NAT is uncommon but not impossible, and the original command did not really prove “no NAT”.
- The Minecraft example incorrectly opened UDP 25565 alongside TCP 25565. I corrected it to Java Edition’s default TCP listener.
- The Valheim example used `2456-2458`, but the official dedicated server guide documents default use of the configured port and port+1, which makes the default range `2456-2457`. I corrected the range in both `ip6tables` and `nftables`.
- The ARK example comment listed `7777` and `27015` but only opened `7777`. I corrected the rules to include `7778` and `27015`, matching current dedicated-server guidance.
- The Rust example incorrectly opened TCP `28015`. I changed it to UDP `28015` for the game server and TCP `28016` as the optional default RCON port.
- The `ip6tables-save` persistence path was distro-specific. I kept the command but labeled it as a Debian/Ubuntu `iptables-persistent` example.
- The router/gateway example used an invalid IPv6 address literal (`2001:db8::gameserver`) and the older `-m state` matcher. I replaced the address with a valid documentation address and updated the rule to use `conntrack`.
- The `nftables` example used `ip6 nexthdr icmpv6`, which can miss ICMPv6 behind IPv6 extension headers. I replaced it with `meta l4proto ipv6-icmp`, updated loopback matching to `iifname lo`, and made the sample port set consistent with the corrected game-port guidance.
- The dual-stack section used a fictional server command and claimed binding to `::` “binds to both”, which depends on application behavior and the `IPV6_V6ONLY` setting. I replaced that with an OS-level `sysctl` check and corrected the `ss` examples to use explicit `-4` and `-6` filters.
- The connectivity-test section used an invalid IPv6 placeholder and tested the wrong protocol for the sample ports. I replaced the address with a valid documentation address and separated the TCP and UDP examples accordingly.
- The closing paragraph was too absolute in saying IPv6 access “requires only” firewall rules. I softened that to “usually requires” because upstream filtering and platform-specific edge policy can still affect reachability.

## Review Notes
- `2001:db8::/32` is the correct documentation prefix for examples, but readers must replace it with their real global IPv6 address before applying the commands.
- `ip6tables` remains valid on Linux, but many current distributions implement it via the nftables backend. The post now keeps both `ip6tables` and native `nftables` examples technically consistent.
- I attempted to run `nft --check` on the revised ruleset, but the current environment returned `Operation not permitted`, so final verification of the nftables snippet was done against official nftables documentation rather than by loading the ruleset locally.
