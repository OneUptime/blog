# Validation Summary: How to Understand Longest Prefix Match in Routing

## Status
validated

## Post Type
Guide

## Technologies Covered
- IPv4 routing
- CIDR
- Longest prefix match (LPM)
- Linux `iproute2`
- Python `ipaddress`
- BGP route aggregation

## Sources Consulted
- Python `ipaddress` documentation: https://docs.python.org/3.11/howto/ipaddress.html
- Linux kernel LC-trie documentation: https://docs.kernel.org/networking/fib_trie.html
- Linux `ip-route(8)` manual page: https://man7.org/linux/man-pages/man8/ip-route.8.html
- RFC 1812, Requirements for IP Version 4 Routers: https://www.rfc-editor.org/rfc/rfc1812
- RFC 2328, OSPF Version 2: https://www.rfc-editor.org/rfc/rfc2328.html
- RFC 4632, Classless Inter-domain Routing (CIDR): https://www.rfc-editor.org/rfc/rfc4632
- Juniper longest-match routing rule documentation: https://www.juniper.net/documentation/us/en/software/junos/cli-reference/topics/ref/statement/longest-match-next-hop-edit-static-routing-options.html
- Local `ip route help` output from the installed `iproute2` CLI

## Issues Found
- The Python output block did not exactly match the code's actual `print(f"  /{length:2d}  {prefix}")` formatting for single-digit prefix lengths. I corrected the `/8` and `/0` lines so the documented output matches the real output.
- The route aggregation example described a "BGP global table" containing `10.0.0.0/8`, which is RFC 1918 private address space and not appropriate as a public Internet global-table example. I changed the wording to "A BGP table might have" so the example remains technically valid as a generic BGP example.
- The Linux implementation note said Linux uses a "hash table + LPC-trie" for routing. Current kernel documentation describes the IPv4 FIB lookup structure as an LC-trie. I corrected the text to "Linux uses an LC-trie for IPv4 software routing lookups."
- The Linux verification example used next hops that were not shown as directly reachable and said the `/8` route was the "only match" even though the default route also matches. I changed the example to use gateways on the connected `192.168.1.0/24` subnet, added the explicit `dev` argument to the `ip route add` command, and corrected the explanation to "longest match."

## Review Notes
- The post is accurate after the fixes above.
- The Linux kernel implementation note is specifically about IPv4 lookups, which matches the post's IPv4 scope.
- The `ip route add` examples require sufficient privileges on the host where they are run.
