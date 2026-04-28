# Validation Summary: How to Understand NAT Hairpinning and Loopback

## Status
validated

## Post Type
Tutorial / Concept Guide

## Technologies Covered
- NAT (Network Address Translation) — DNAT, SNAT, MASQUERADE
- NAT hairpinning / loopback / reflection
- Linux iptables (nat table, PREROUTING, POSTROUTING)
- pfSense (NAT Reflection, Pure NAT mode)
- Cisco IOS NAT (NVI, traditional inside/outside NAT)
- TCP/IP routing fundamentals
- curl, traceroute (testing tools)

## Sources Consulted
- [pfSense Documentation — NAT Reflection](https://docs.netgate.com/pfsense/en/latest/nat/reflection.html)
- [pfSense Documentation — Firewall & NAT Advanced Settings](https://docs.netgate.com/pfsense/en/latest/config/advanced-firewall-nat.html)
- [pfSense Documentation — Accessing Port Forwards from Local Networks](https://docs.netgate.com/pfsense/en/latest/recipes/port-forwards-from-local-networks.html)
- [Cisco Community — NAT Hairpinning discussion](https://community.cisco.com/t5/routing/nat-hairpinning/td-p/2475807)
- [Layer77 — NAT Hairpinning on Cisco ISR (NVI explanation)](https://layer77.net/2016/02/10/nat-hairpinning-on-cisco-isr/)
- [Faatech — Cisco IOS U-Turn NAT, NAT Reflection, NAT Hairpinning](https://faatech.be/cisco-ios-u-turn-nat-nat-reflection-nat-hairpinning/)
- iptables(8) and netfilter NAT documentation (PREROUTING/POSTROUTING semantics, MASQUERADE target)
- RFC 4787 / RFC 5128 (NAT terminology, hairpinning behavior)

## Issues Found
- **Cisco IOS section was technically incorrect.** The original claim that "Cisco IOS typically handles hairpin NAT automatically when `ip nat inside` is configured on the LAN interface and the NAT translation table has the mapping" is wrong. Traditional domain-based NAT (`ip nat inside` / `ip nat outside`) does **not** support hairpinning — the NAT pipeline only fires when traffic crosses between the inside and outside domains, not when both source and destination are on the inside. Cisco's recommended solution is the NAT Virtual Interface (NVI) feature using `ip nat enable` on each interface, or a NAT-on-a-stick configuration with policy-based routing through a loopback. I rewrote the section to reflect this accurately.

## Review Notes
- The iptables example is correct: the hairpin DNAT rule on the LAN interface (`-i eth0 -d 203.0.113.1 --dport 80`) and the matching POSTROUTING MASQUERADE rule (`-s 192.168.1.0/24 -d 192.168.1.10`) form a working hairpin configuration. The destination port `--dport 80` in the POSTROUTING rule is valid because DNAT happens before POSTROUTING but the destination port is unchanged in this example.
- The pfSense path "System → Advanced → Firewall & NAT", the "Pure NAT" reflection mode, and the "Enable automatic outbound NAT for Reflection" toggle all match current Netgate documentation.
- The "Without hairpinning (fails)" diagram is a slight oversimplification — in practice the local router usually drops or mis-routes the packet before it reaches the ISP. The text "(not public)" gestures at the RFC1918 source being rejected upstream, which is one possible failure mode but not the most common. Left as-is since it's not strictly wrong and the simplification aids the explanation.
- The MASQUERADE rule will use the LAN interface IP as the new source (since the packet egresses the LAN interface after DNAT), which is the desired behavior for hairpin. A more explicit `SNAT --to-source <router-LAN-IP>` would also work and some operators prefer it for predictability, but MASQUERADE is acceptable.
- Example IPs (`203.0.113.0/24` and `192.0.2.0/24`) correctly use TEST-NET ranges from RFC 5737.
