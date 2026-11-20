# Validation summary

Constructed a synthetic Ethernet broadcast ARP request and unicast reply and decoded them locally with tcpdump 4.99.1 (Apple 161), libpcap 1.10.1. Verified sender/target IP and MAC fields and matched the article excerpts to that output. Five shell snippets pass syntax checks. Reviewed Linux 6.12 bridge forwarding/input, iproute2 6.12.0 command and policy sources, neighbor semantics, nftables bridge filtering and tcpdump 4.99.5 option documentation. Mermaid structure was checked, not rendered. The generated social image was visually inspected and is readable without clipping.

No live packets were captured and no Linux topology, VM, bridge policy or firewall was changed. The synthetic decoding test is not evidence of actual VXLAN forwarding; the article makes that limitation explicit.

## Checked sources

- https://www.rfc-editor.org/rfc/rfc826.html
- https://raw.githubusercontent.com/the-tcpdump-group/tcpdump/tcpdump-4.99.5/tcpdump.1.in
- https://raw.githubusercontent.com/iproute2/iproute2/v6.12.0/bridge/bridge.c
- https://raw.githubusercontent.com/iproute2/iproute2/v6.12.0/man/man8/bridge.8
- https://raw.githubusercontent.com/torvalds/linux/v6.12/net/bridge/br_forward.c
- https://raw.githubusercontent.com/torvalds/linux/v6.12/net/bridge/br_input.c
- https://man7.org/linux/man-pages/man8/ip-neighbour.8.html
- https://wiki.nftables.org/wiki-nftables/index.php/Bridge_filtering
- https://www.netfilter.org/projects/nftables/manpage.html

## Repository checks

The repository validator passed for this post in an isolated fixture with its catalog entry, author list, tag allowlist, and social image. Shell examples, if present, passed bash syntax checking. The full existing catalog was not revalidated.
