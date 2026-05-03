# Validation Summary: How to Detect and Prevent UDP Flood Attacks

## Status
validated

## Post Type
Tutorial / Technical Guide

## Technologies Covered
- UDP protocol
- Linux networking (`ip`, `nstat`, `tcpdump`, `top`, `/proc/interrupts`)
- iptables (`limit` and `hashlimit` modules)
- Linux sysctl (`net.ipv4.icmp_ratelimit`, `net.ipv4.icmp_msgs_per_sec`, `net.core.rmem_max`, `net.core.netdev_max_backlog`, `net.ipv4.conf.*.rp_filter`)
- NTP / `ntp.conf` (`disable monitor`, `restrict default noquery`)
- BIND / `named.conf` (Response Rate Limiting)
- UDP amplification vectors (DNS, NTP, SSDP, Memcached, Chargen)
- AWS Shield Advanced
- GCP Cloud Armor / Advanced Network DDoS Protection
- Cloudflare Magic Transit
- BGP blackholing

## Sources Consulted
- Linux kernel IP sysctl documentation: https://docs.kernel.org/networking/ip-sysctl.html
- netfilter iptables-extensions manual: https://ipset.netfilter.org/iptables-extensions.man.html
- CISA UDP-Based Amplification Attacks alert (TA14-017A): https://www.cisa.gov/news-events/alerts/2014/01/17/udp-based-amplification-attacks
- RFC 3704 (Ingress Filtering / `rp_filter` strict mode)
- Google Cloud Armor / Advanced Network DDoS Protection docs: https://cloud.google.com/armor/docs/advanced-network-ddos
- ISC BIND ARM: Response Rate Limiting (`rate-limit`) configuration
- ntp.org documentation on `disable monitor` (CVE-2013-5211 / monlist amplification)

## Issues Found

1. **`-m limit` described as per-source.** The post originally read "Limit UDP packets to 1000 per second from any single source" for the `iptables -m limit` rule. The `limit` match is a single global token bucket and does not track sources. Updated the comment to "Limit total UDP packets to 1000 per second across all sources (global token bucket)" and added a CAUTION note that `-m limit` is a single global counter, directing readers to `hashlimit` (already shown below) for per-source enforcement.

2. **`net.ipv4.icmp_ratelimit=1000` mislabeled.** The original comment said `# Max 1000 ICMP/sec`, but per kernel.org the value is the *minimum space between responses in milliseconds* to the same target (default 1000 = ~1 ICMP/sec to that target). Corrected the comment to "Min 1000ms between ICMP responses to the same target". Also clarified the adjacent `net.ipv4.icmp_msgs_per_sec=1000` line as "Max 1000 ICMP/sec total from this host" so the two sysctls are no longer described identically.

3. **GCP product reference imprecise.** Original comment "GCP: Cloud Armor rules for UDP flood" suggested Cloud Armor security policies (primarily L7) handle UDP floods. Updated to "GCP: Cloud Armor Advanced Network DDoS Protection (L3/L4) for UDP floods", which is the purpose-built L3/L4 product for volumetric attacks like UDP floods on network/passthrough load balancers.

## Review Notes
- Detection commands (`ip -s link`, `nstat | grep UdpIn|IcmpOutDestUnreachs`, `tcpdump | awk | cut`, `top -b -n 1`) are syntactically correct and produce the described output. The tcpdump pipeline assumes IPv4 (4-octet `cut -d. -f1-4`) and would not extract IPv6 source addresses correctly — worth noting if dual-stack monitoring is required.
- Hashlimit syntax (`--hashlimit-above 100/sec`, `--hashlimit-mode srcip`, `--hashlimit-name`, `--hashlimit-burst`) matches the netfilter manual.
- Amplification factors (DNS ~50x, NTP ~556x, SSDP ~30x, Memcached ~50000x) are within the ranges published by CISA/US-CERT and academic research.
- `rp_filter=1` is correctly described as strict mode; readers running asymmetric routing (multi-homed hosts, BGP) should consider `rp_filter=2` (loose) instead — the post does not warn about this, but the recommendation is reasonable for a typical single-homed server.
- The NTP `disable monitor` and BIND `rate-limit { responses-per-second 10; };` snippets are valid configuration directives.
- The `net.ipv4.icmp_msgs_per_sec` default in modern kernels is actually 1000 (not 10000 as some older docs suggest); setting it to 1000 explicitly is therefore essentially the default — readers wanting tighter limits should lower this value.
