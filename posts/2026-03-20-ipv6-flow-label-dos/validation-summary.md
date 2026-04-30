# Validation Summary: How to Prevent IPv6 Theft and Denial of Service via Flow Labels

## Status
validated

## Post Type
Guide

## Technologies Covered
- IPv6
- IPv6 Flow Label
- ECMP
- Layer 3/4 load balancing
- Linux sysctl
- ip6tables
- nftables
- Cisco CoPP
- Scapy
- TShark

## Sources Consulted
- RFC 6437, "IPv6 Flow Label Specification" - https://www.rfc-editor.org/rfc/rfc6437
- RFC 6438, "Using the IPv6 Flow Label for Equal Cost Multipath Routing and Link Aggregation in Tunnels" - https://www.rfc-editor.org/rfc/rfc6438
- RFC 7098, "Using the IPv6 Flow Label for Load Balancing in Server Farms" - https://www.rfc-editor.org/rfc/rfc7098
- Linux kernel IP sysctl documentation - https://docs.kernel.org/6.1/networking/ip-sysctl.html
- Linux kernel netfilter flowtable documentation - https://docs.kernel.org/networking/nf_flowtable.html
- Wireshark Display Filter Reference for IPv6 fields - https://www.wireshark.org/docs/dfref/i/ipv6.html
- Wireshark `tshark(1)` man page - https://www.wireshark.org/docs/man-pages/tshark.html
- Scapy IPv6 API documentation - https://scapy.readthedocs.io/en/latest/api/scapy.layers.inet6.html
- Local `ip6tables` help output (`ip6tables v1.8.10`)
- Local `iptables-extensions(8)` man page
- Local `nft(8)` man page
- Cisco CoPP documentation - https://www.cisco.com/c/en/us/td/docs/routers/7600/ios/15S/configuration/guide/7600_15_0s_book/dos.html
- Cisco Catalyst 6500 CoPP guide - https://www.cisco.com/c/en/us/td/docs/switches/lan/catalyst6500/ios/15-5SY/config_guide/sup6T/15_5_sy_swcg_6T/control_plane_policing_copp.pdf

## Issues Found
- The title and description used "theft" and "traffic theft" loosely. RFC 6437 discusses theft of service and unintended flow-specific treatment, so the wording was narrowed to match the standard.
- The post claimed the Flow Label range starts at `1`. RFC 6437 defines `0` as valid and meaning "unlabeled", so the range was corrected to `0-0xFFFFF`.
- The overview and intended-use text overstated how devices use the Flow Label. It was corrected to reflect RFC 6437/6438/7098 guidance that classifiers should combine the label with other fields, not trust it in isolation.
- "Session theft" was overstated. RFC 7098 supports flow-label-based backend steering for layer 3/4 load balancers, but that does not by itself inject into an existing TCP session. The attack description and Scapy example were corrected accordingly.
- The "Flow Label Collision DoS" section incorrectly claimed varied labels generically exhaust firewall/load-balancer state tables. RFC 6437 instead describes rapid label cycling as something that can degrade stateless load distribution or confuse stateful classifiers, so the section was rewritten to reflect that.
- The ECMP section incorrectly implied a sender could force all traffic onto one path. RFC 6438 requires ECMP hashing to include at least `{destination, source, flow label}` and often more, so the text was corrected to describe influence over the sender's own or spoofed traffic only.
- The first `tshark | awk` pipeline counted packets, not unique Flow Labels per source. It was fixed to use `sort -u` before counting.
- The second `tshark` pipeline used `uniq -f 1`, which does not reliably count unique `(src, flow)` pairs. It was fixed to `sort -u | wc -l`.
- The Linux sysctl section incorrectly treated `auto_flowlabels` as a simple boolean and implied non-zero labels are mandatory whenever supported. It was corrected to match the kernel documentation and RFC 6437 language.
- The Cisco CoPP example claimed Flow-Label-specific mitigation while actually matching all IPv6 traffic, and the original syntax was too platform-assumptive. It was replaced with a generic CoPP example and explicitly described as coarse control-plane rate limiting.

## Review Notes
- `tshark` was not installed in the local environment, so its field names and CLI syntax were verified against Wireshark's official documentation rather than local execution.
- `nft` rule syntax was checked against the local man page and nftables documentation; live validation was limited by netlink permission errors in the environment.
