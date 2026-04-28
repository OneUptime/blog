# Validation Summary: How to Configure NAT Reflection on Your Firewall

## Status
validated

## Post Type
Tutorial / Guide — practical configuration walkthrough for NAT reflection (loopback / hairpin NAT) on pfSense and Linux (iptables, nftables), with split DNS as an alternative.

## Technologies Covered
- NAT reflection / NAT loopback / hairpin NAT (concept)
- pfSense (advanced firewall & NAT settings)
- Linux iptables (nat table, PREROUTING/POSTROUTING, DNAT, MASQUERADE)
- Linux nftables (`inet` family NAT, `dnat`/`masquerade` statements, dstnat/srcnat priorities)
- dnsmasq (split DNS via `address=` directive)
- curl (verification)

## Sources Consulted
- pfSense Advanced Firewall and NAT documentation — https://docs.netgate.com/pfsense/en/latest/config/advanced-firewall-nat.html
- nftables wiki — Performing Network Address Translation (NAT) — https://wiki.nftables.org/wiki-nftables/index.php/Performing_Network_Address_Translation_(NAT)
- netfilter / iptables documentation for the nat table chains and DNAT/MASQUERADE targets
- dnsmasq man page — https://thekelleys.org.uk/dnsmasq/docs/dnsmasq-man.html

## Issues Found
- **pfSense option labels**: The post listed the NAT reflection modes as "Enable (NAT + Proxy)" and "Enable (Pure NAT)". Per current pfSense documentation the labels are simply **"NAT + Proxy"** and **"Pure NAT"** (alongside "Disabled"). Updated the option names in the pfSense section to match the documented labels.

No other technical errors were found:
- The hairpin iptables pattern (DNAT on LAN ingress for the public IP, MASQUERADE on POSTROUTING when source is LAN and destination is the internal server, plus a FORWARD ACCEPT rule) is the standard, correct pattern — the MASQUERADE is essential to force the return traffic back through the router.
- The nftables snippet using `table inet nat` with `priority -100` (dstnat) for prerouting and `priority 100` (srcnat) for postrouting, plus `dnat to`/`masquerade` statements, is valid syntax.
- The dnsmasq split-DNS line `address=/myserver.example.com/192.168.1.10` is correct per the dnsmasq man page.
- The conceptual explanation of NAT reflection / loopback / hairpin NAT is accurate.

## Review Notes
- **Kernel version caveat for nftables `inet` NAT**: NAT in the nftables `inet` family was only added in Linux kernel 5.2 (July 2019). On older kernels you must use the `ip` family table instead. This is not a problem on any currently supported distribution, but readers maintaining long-lived embedded/legacy systems should be aware. The post does not mention this; could be added in a future revision.
- The `pfSense` section is brief and does not mention the per-port-forward override available on individual NAT rules (which can override the global setting). Acceptable scope for a how-to but worth noting for completeness.
- The iptables FORWARD rule does not specify an output interface, which is intentional and correct for the hairpin case (input and output interface are both the LAN interface). Some hardened setups may also need to relax `rp_filter` or kernel routing checks, but the configuration as shown works on a default Linux router setup.
