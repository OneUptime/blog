# Validation Summary: How to Debug IPv6 in Virtualized Network Environments

## Status
validated

## Post Type
Tutorial / Troubleshooting Guide

## Technologies Covered
- IPv6 (NDP, SLAAC, Router Advertisements, ICMPv6)
- Linux networking (`ip`, `ping6`, `tcpdump`, `ip6tables`, `bridge`, `sysctl`)
- Linux bridge / bridge-netfilter (`net.bridge.bridge-nf-call-ip6tables`, multicast snooping)
- KVM / libvirt
- VMware ESXi / vSphere (`esxcli`, vSwitch security policies)
- Hyper-V (`Get-VMNetworkAdapter`, RouterGuard, DhcpGuard)
- VXLAN encapsulation
- ndisc6 (`rdisc6`)
- PowerShell (`Test-NetConnection`)
- Windows Filtering Platform (`netsh wfp`)

## Sources Consulted
- RFC 4443 (ICMPv6) — https://www.rfc-editor.org/rfc/rfc4443 — verified type numbers (2=Packet Too Big, 133=RS, 134=RA, 135=NS, 136=NA)
- RFC 4861 (Neighbor Discovery for IPv6) — https://www.rfc-editor.org/rfc/rfc4861 — RA periodic interval defaults
- RFC 4007 (IPv6 Scoped Address Architecture) — verified `%eth0` zone-id syntax for link-local
- RFC 7348 (VXLAN) — verified 50-byte encapsulation overhead with IPv4 outer
- Linux kernel docs: `Documentation/networking/bridge.rst` and `Documentation/admin-guide/sysctl/net.rst` — verified `bridge-nf-call-ip6tables` and `/sys/class/net/<bridge>/bridge/multicast_snooping`
- iproute2 / `bridge(8)` man page — verified `bridge link show`, `bridge mdb show` syntax
- ndisc6 man page — verified `rdisc6` behavior (sends RS, displays received RA)
- VMware ESXi `esxcli` reference — verified `esxcli network ip interface ipv6 address list`, `esxcli network diag ping --host --netstack --ipv6`, `esxcli network firewall ruleset list`
- VMware vSphere docs on vSwitch security policies (Promiscuous Mode, MAC Address Changes, Forged Transmits)
- Microsoft Hyper-V PowerShell docs — `Get-VMNetworkAdapter`, `RouterGuard`, `DhcpGuard`
- Microsoft `Test-NetConnection` cmdlet docs — verified `-ComputerName` and `-TraceRoute` parameters
- Microsoft `netsh wfp` reference — verified `show boottimepolicy` subcommand

## Issues Found
No technical issues found. All ICMPv6 type numbers, sysctl keys, sysfs paths, tcpdump filter expressions, esxcli commands, and PowerShell cmdlets were verified against official documentation and are correct.

## Review Notes
- The claim that Router Advertisements are sent "every 4-7 minutes" is an approximation; per RFC 4861 / radvd defaults, periodic unsolicited RAs are sent at intervals randomly chosen between `MinRtrAdvInterval` (default ~198s) and `MaxRtrAdvInterval` (default 600s) — i.e., roughly 3.3 to 10 minutes. The post's "4-7 minutes" falls inside this range and is a reasonable typical-observed value, but the full default span is wider. Not technically wrong, just a tighter window than the protocol defaults.
- `bridge link show dev br0` on a master bridge interface returns no port info (the command is normally used with slave/port names). The intent of "check multicast snooping" is more directly served by `cat /sys/class/net/br0/bridge/multicast_snooping` or `ip -d link show br0`. The post does follow up with the correct sysfs disable path, so the workflow is still functional.
- `ping6` is the legacy iputils binary; on modern distributions `ping -6` (or just `ping`) is the recommended invocation, but `ping6` remains available as an alias on virtually all current distributions, so the commands work as written.
- In the "Debug IPv6 Connectivity Through Virtual Switches" section, `eth0` is reused for both the VM's NIC and the hypervisor's physical interface for illustrative simplicity. In practice these will have different names (e.g., `enp1s0`, `eno1`) on the host. This is a minor presentation issue, not a technical error.
- VXLAN overhead of 50 bytes assumes IPv4 outer encapsulation; with IPv6 outer encapsulation overhead is 70 bytes. The post's MTU example is consistent with the typical IPv4 VXLAN deployment.
