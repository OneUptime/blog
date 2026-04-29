# Validation Summary: How to Configure IPv6 Routing Between Network Namespaces

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Linux network namespaces
- IPv6 addressing and routing
- `iproute2` (`ip netns`, `ip link`, `ip -6 addr`, `ip -6 route`)
- Linux `sysctl` IPv6 forwarding
- Virtual Ethernet (`veth`) devices
- `ping` and `tcpdump`

## Sources Consulted
- `ip-netns(8)`: https://man7.org/linux/man-pages/man8/ip-netns.8.html
- `network_namespaces(7)`: https://www.man7.org/linux/man-pages/man7/network_namespaces.7.html
- `veth(4)`: https://www.man7.org/linux/man-pages/man4/veth.4.html
- `ip-route(8)`: https://www.man7.org/linux/man-pages/man8/ip-route.8.html
- `ping(8)`: https://man7.org/linux/man-pages/man8/ping.8.html
- Linux kernel IP sysctl documentation: https://docs.kernel.org/6.18/networking/ip-sysctl.html
- RFC 3849, IPv6 Address Prefix Reserved for Documentation: https://www.rfc-editor.org/rfc/rfc3849.html
- OneUptime homepage: https://oneuptime.com/
- Local command help on the review environment: `ip netns help`, `ip -6 route help`, `ping -6 -h`, `sysctl -h`

## Issues Found
- The original "Full Setup Script" did not configure routing. It created one veth pair between two namespaces on the same `/64`, which gives direct Layer 2 connectivity rather than routed IPv6 through a central namespace. I replaced it with a three-namespace topology (`ns1`, `router`, `ns2`), two `/64` subnets, IPv6 forwarding in the router namespace, and explicit static routes in the endpoint namespaces.
- The command examples used `ping6`. I updated them to `ping -6`, which matches the current documented `ping(8)` interface.
- The monitoring section implied monitors could simply point at the example namespace addresses. I clarified that monitoring must run from a network context that has routes to those IPv6 addresses, and that the `2001:db8::/32` addresses in the post are documentation-only examples.
- The conclusion contained broken command references and an overly broad statement about tooling. I corrected the missing `ip`/`netns` references and narrowed the wording to tools invoked inside a namespace with `ip netns exec`.

## Review Notes
- The post now aligns with the title and description: it demonstrates static IPv6 routing between namespaces via a central router namespace.
- The example addresses remain appropriate because RFC 3849 reserves `2001:db8::/32` for documentation.
- I could not run a full live namespace test in this environment because `ip netns add` failed with `mount --make-shared /run/netns failed: Operation not permitted`. Command syntax and behavior were validated against the cited documentation and local CLI help output.
