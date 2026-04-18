# Validation Summary: How to Verify Router Advertisement Configuration

## Status
validated

## Post Type
Tutorial / Verification checklist guide

## Technologies Covered
- IPv6 Router Advertisements (RFC 4861)
- radvd (Router Advertisement Daemon)
- SLAAC (Stateless Address Autoconfiguration, RFC 4862)
- RDNSS / DNSSL (RFC 8106)
- iproute2 (`ip -6 addr`, `ip -6 route`, `ip -6 neigh`)
- rdisc6 (from the ndisc6 package)
- tcpdump BPF filters for ICMPv6
- systemd-resolved / systemd-resolve
- RFC 4941 (IPv6 Privacy Extensions / temporary addresses)

## Sources Consulted
- radvd(8) man page and upstream docs: https://radvd.litech.org/radvd.8.html
- rdisc6(8) man page (ndisc6 package): https://manpages.debian.org/rdisc6
- ip-address(8) man page — iproute2: https://man7.org/linux/man-pages/man8/ip-address.8.html
- ip-route(8) man page — iproute2: https://man7.org/linux/man-pages/man8/ip-route.8.html
- ip-neighbour(8): https://man7.org/linux/man-pages/man8/ip-neighbour.8.html
- tcpdump / pcap-filter(7): https://www.tcpdump.org/manpages/pcap-filter.7.html
- systemd-resolve / resolvectl: https://www.freedesktop.org/software/systemd/man/resolvectl.html
- RFC 4861 (Neighbor Discovery for IPv6)
- RFC 4862 (IPv6 SLAAC)
- RFC 4941 / RFC 8981 (IPv6 Privacy Extensions)
- RFC 8106 (IPv6 Router Advertisement Options for DNS Configuration)
- Linux kernel source: IPv6 default route metric constant (IP6_RT_PRIO_USER = 1024) in `include/net/ip6_route.h`

## Issues Found
- **Step 5 expected output used `metric 100`**: Linux's kernel default metric for RA-installed IPv6 default routes is `1024` (`IP6_RT_PRIO_USER`). Changed the example expected output from `metric 100` to `metric 1024` so it reflects what a user would typically actually see.

## Review Notes
- `radvd --configtest` success output text ("configuration file is ok") is illustrative. radvd's actual success output varies across versions (some versions print nothing to stdout, others write a short message to stderr). The comment is treated as indicative of the general expected result rather than literal text, and the `--configtest` / `-C` flag combination itself is correct.
- `ping6` is still functional but has been deprecated in modern iputils in favor of `ping -6`. Either works today; no change required.
- `systemd-resolve` has been renamed to `resolvectl` (it is kept as a compatibility symlink in most modern distributions). The command still works today, though `resolvectl status` is the current recommended form.
- The tcpdump filter `icmp6 and ip6[40] == 134` correctly matches Router Advertisements by inspecting the ICMPv6 type byte at offset 40 (immediately after the 40-byte IPv6 fixed header). This assumes no IPv6 extension headers are present between the IPv6 header and the ICMPv6 header, which is essentially always the case for RAs.
- The `proto ra` route protocol in `ip -6 route` output requires a reasonably modern Linux kernel (RTPROT_RA is widely supported on current distributions).
- The `mngtmpaddr` flag description is slightly loose — strictly, it marks an address whose kernel-side management drives generation of RFC 4941/8981 temporary addresses from that prefix — but the gist is correct.
