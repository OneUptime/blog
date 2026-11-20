# Validation summary

Reviewed Linux 6.12 VXLAN forwarding and default-destination source, iproute2 6.12.0 FDB parser/manual, Linux bridge/address/route documentation and tcpdump 4.99.5 options. Six shell snippets pass syntax checks. Both capture expressions compiled against an empty synthetic Ethernet pcap on macOS; no network traffic was captured. Mermaid structure was checked, not rendered. The generated social image was visually inspected and is readable without clipping.

No Linux topology, bridge, FDB change or connectivity test was run. Source verification and filter compilation do not establish packet forwarding. The only mutation example is explicitly scoped to a manually managed isolated two-host staging setup after inspecting existing state.

## Checked sources

- https://docs.kernel.org/6.12/networking/vxlan.html
- https://man7.org/linux/man-pages/man8/ip-link.8.html
- https://raw.githubusercontent.com/iproute2/iproute2/v6.12.0/man/man8/bridge.8
- https://docs.kernel.org/networking/bridge.html
- https://man7.org/linux/man-pages/man8/ip-address.8.html
- https://man7.org/linux/man-pages/man8/ip-route.8.html
- https://raw.githubusercontent.com/torvalds/linux/v6.12/drivers/net/vxlan/vxlan_core.c
- https://raw.githubusercontent.com/iproute2/iproute2/v6.12.0/bridge/fdb.c
- https://raw.githubusercontent.com/the-tcpdump-group/tcpdump/tcpdump-4.99.5/tcpdump.1.in

## Repository checks

The repository validator passed for this post in an isolated fixture with its catalog entry, author list, tag allowlist, and social image. Shell examples, if present, passed bash syntax checking. The full existing catalog was not revalidated.
