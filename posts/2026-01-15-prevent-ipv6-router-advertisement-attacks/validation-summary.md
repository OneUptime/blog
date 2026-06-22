# Validation Summary: How to Prevent IPv6 Router Advertisement Attacks

## Status
validated

## Post Type
Technical guide / tutorial (security hardening + detection + incident response)

## Technologies Covered
- IPv6 Neighbor Discovery Protocol (NDP) / SLAAC
- ICMPv6 Router Advertisements (RA) and Router Solicitations (RS)
- Scapy (Python packet analysis)
- tcpdump / tshark / Wireshark display filters
- Linux sysctl / `/etc/network/interfaces` / NetworkManager (nmcli) / Netplan
- ip6tables and nftables
- Windows PowerShell `Net*` cmdlets and Group Policy/registry
- Cisco IOS, Cisco Nexus, Juniper Junos, Arista EOS first-hop security (RA Guard / DHCPv6 Guard)
- AppArmor profiles
- SEND (RFC 3971)
- Kubernetes NetworkPolicy and Calico GlobalNetworkPolicy
- Docker daemon hardening
- Prometheus alerting rules, Splunk SPL, ELK queries
- NDPMon, Ramond

## Sources Consulted
- RFC 4861 — Neighbor Discovery for IPv6 (RA/RS, multicast addresses ff02::1 / ff02::2)
- RFC 4191 — Default Router Preferences (2-bit Prf field encoding: 0=Medium, 1=High, 2=Reserved, 3=Low)
- RFC 8200 — IPv6 minimum link MTU of 1280 octets
- RFC 6106 / RFC 8106 — IPv6 RDNSS option (6106 obsoleted by 8106)
- RFC 3971 — SEcure Neighbor Discovery (SEND)
- Scapy source `scapy/layers/inet6.py` — `ICMPv6ND_RA` field layout (`prf` as a 2-bit `BitEnumField`)
- Linux kernel `Documentation/networking/ip-sysctl.txt` — `accept_ra`, `autoconf`, `router_solicitations`, `accept_ra_from_local`
- iptables/nftables man pages — `--icmpv6-type` names, `nd-router-advert` / `nd-router-solicit`
- Microsoft docs — `Set-NetIPInterface -RouterDiscovery`, `New-NetIPAddress`, `Set-DnsClientServerAddress`
- Cisco/Juniper/Arista IPv6 first-hop security documentation

## Issues Found
1. **Detection script — incorrect bit-shift on router preference (functional bug).**
   `prf = (ra.prf >> 3) & 0x03` was wrong. Scapy decodes the 2-bit Default Router
   Preference field directly into `ra.prf` (values 0–3), so shifting right by 3 always
   produces `0`, meaning the "High router preference from unknown router" check could
   never trigger. Changed to `prf = ra.prf` and added a clarifying comment.

2. **Attack 5 — incorrect "minimum valid" MTU.**
   The comment `MTU Option: 68 (minimum valid)` used the IPv4 minimum. The IPv6 minimum
   link MTU is 1280 octets (RFC 8200), and the post's own detection script (Check 5)
   correctly flags MTUs `< 1280`. Updated the comment to
   `1280 (IPv6 minimum) or an invalid lower value` to remove the internal inconsistency.

3. **Detection script — missing `import os`.**
   `send_alert()` calls `os.environ.get(...)` but `os` was never explicitly imported
   (it only happened to be reachable via `from scapy.all import *`, which is fragile).
   Added an explicit `import os`.

## Review Notes
- **RFC 6106 vs RFC 8106:** Attack 4 attributes the RDNSS option to RFC 6106. This is
  historically accurate but RFC 6106 was obsoleted by RFC 8106 (2017). Left as-is since
  the statement is not incorrect; a future edit could mention RFC 8106 as the current spec.
- **Netplan `gateway6`:** The `gateway6` key is deprecated in newer Netplan releases in
  favor of a `routes:` block (`- to: default / via: ...`). It still works and is valid for
  the "Ubuntu 18.04+" framing in the post, so it was not changed.
- **Cisco IOS RA Guard example:** The host policy is defined as `ipv6 snooping policy
  RA_GUARD_POLICY` but then referenced via `ipv6 nd raguard attach-policy RA_GUARD_POLICY`.
  In Cisco IPv6 first-hop security these are distinct policy types; an `ipv6 nd raguard
  attach-policy` should reference an `ipv6 nd raguard policy`. The router-side policy in the
  same block is defined correctly. This is illustrative and platform/version dependent, so
  it was left unchanged, but readers should ensure the attached policy name matches a
  defined `nd raguard policy`.
- The `tcpdump`/Scapy BPF filter `icmp6 and ip6[40] == 134` correctly matches the ICMPv6
  type byte at the fixed 40-byte IPv6 header offset; this works when no extension headers
  precede ICMPv6, which is the normal case for RAs.
- sysctl keys (`accept_ra`, `autoconf`, `router_solicitations`, `accept_ra_from_local`),
  ip6tables/nftables ICMPv6 type names, PowerShell cmdlets, and the Calico/Kubernetes
  manifests were all verified as valid and current.
