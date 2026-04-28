# Validation Summary: How to Prevent NDP Spoofing Attacks

## Status
validated

## Post Type
Tutorial / Security Hardening Guide

## Technologies Covered
- IPv6 Neighbor Discovery Protocol (NDP) — RFC 4861
- ICMPv6 Neighbor Advertisement (Type 136) and unsolicited NA cache poisoning
- Cisco IOS-XE IPv6 Snooping / ND Inspection (`ipv6 snooping policy`, `security-level guard`)
- Linux iproute2 `ip -6 neigh` with `nud permanent` static entries
- Linux sysctl tunables for the IPv6 neighbor cache (`base_reachable_time_ms`, `delay_first_probe_time`, `retrans_time_ms`)
- ip6tables (ICMPv6 type filtering, `-m mac`, rate limiting)
- tcpdump BPF filtering for ICMPv6 NA
- Hypervisor anti-spoofing (VMware vSphere Forged Transmits, Hyper-V MAC address spoofing, KVM/ebtables)
- Container/cloud considerations (Kubernetes NetworkPolicy, AWS/Azure/GCP hypervisor enforcement)

## Sources Consulted
- RFC 4861 — Neighbor Discovery for IP version 6 (IPv6), §4.4 Neighbor Advertisement Message Format and §7.2 Address Resolution
- Cisco IOS-XE configuration guide for First Hop Security / IPv6 Snooping (`ipv6 snooping policy`, `security-level guard`, `attach-policy`, `trust`, `show ipv6 neighbor binding`)
- Linux kernel `Documentation/networking/ip-sysctl.rst` — `net.ipv6.neigh.*` parameters and defaults
- iproute2 `ip-neighbour(8)` man page — `nud permanent` state
- ip6tables(8) and ip6tables-extensions(8) man pages — `--icmpv6-type`, `-m mac`, `-m limit`
- tcpdump(8) / pcap-filter(7) for ICMPv6 BPF expressions
- VMware vSphere Networking documentation — virtual switch security policies (Promiscuous Mode, MAC Address Changes, Forged Transmits)
- Microsoft Hyper-V documentation — VM network adapter advanced features ("MAC address spoofing")

## Issues Found
- **Hyper-V terminology (fixed):** The original text said "Hyper-V: Enable 'MAC Spoofing Protection' on virtual switch." Hyper-V does not expose a feature called "MAC Spoofing Protection" on the virtual switch; the relevant setting is **"MAC address spoofing"** on the VM's network adapter (Advanced Features), which is **disabled by default**. Disabled = protection in effect; enabling it allows the guest to send frames with arbitrary source MACs. Replaced with: *"Hyper-V: Ensure 'MAC address spoofing' is disabled (default) on VM network adapters"* so the configuration matches the actual UI/feature.

## Review Notes
- All other technical content was verified against authoritative sources and is accurate:
  - **Cisco IPv6 Snooping config** (`ipv6 snooping policy`, `security-level guard`, `tracking enable`, `attach-policy`, `ipv6 snooping trust`, `show ipv6 neighbor binding`, `show ipv6 snooping counters interface`) — all valid IOS-XE syntax.
  - **Linux sysctl defaults** — `base_reachable_time_ms` 30000, `delay_first_probe_time` 5, `retrans_time_ms` 1000 are all correct per the kernel `ip-sysctl` documentation.
  - **`ip -6 neigh add … nud permanent`** is valid iproute2 syntax; `ip -6 neigh show` does print `PERMANENT` for these entries; permanent entries are not overridden by unsolicited NAs.
  - **ip6tables filters** (`--icmpv6-type neighbor-advertisement`, `-m mac --mac-source`, `-m limit --limit … --limit-burst …`) are all valid.
  - **NA Override flag location**: byte 44 of the IPv6 packet (offset 4 of the ICMPv6 header) bit 5 = mask 0x20 — correct under LSB-zero bit ordering for IPv6 packets without extension headers.
  - **VMware vSphere "Forged Transmits = Reject"** is the correct vSwitch/portgroup security setting to block VMs from emitting frames with non-assigned source MACs.
- The `tcpdump` filter `icmp6 and ip6[40] == 136` works correctly for typical link-local NDP traffic (which has no IPv6 extension headers, so the ICMPv6 type lands at fixed offset 40). A more robust alternative is `icmp6[icmp6type] == nd-neighbor-advert`, but the post's filter is not wrong — left as-is.
- The ip6tables-only approach is presented honestly as a partial mitigation, with a note that switch-level ND Inspection is more effective. Fair characterization.
- The cloud-platform claim that AWS/Azure/GCP block NDP spoofing at the hypervisor layer is broadly true (source MAC/IP validation is enforced on the virtual NIC) but the specifics vary by provider and product (e.g., AWS allows source/dest check disabling for NAT instances). Not worth flagging as an error in a high-level overview.
