# Validation Summary: How to Understand ARP in Virtualized Environments (VMware, KVM)

## Status
validated

## Post Type
Guide

## Technologies Covered
- ARP, unsolicited ARP, and RARP
- VMware vSphere virtual switching and vMotion
- VMware PowerCLI
- KVM / libvirt networking
- Linux bridges and macvtap
- Linux networking tools (`ip`, `tcpdump`, `arping`, `virsh`)

## Sources Consulted
- Broadcom KB 427110, *Forged transmits and MAC address changes on a port group - standard practices and security implications*: https://knowledge.broadcom.com/external/article/427110/forged-transmits-and-mac-address-changes.html
- Broadcom KB 319651, *Pre-check with security policy fails when upgrading to vSphere 7.0 newer*: https://knowledge.broadcom.com/external/article/319651/precheck-with-security-policy-fails-when.html
- Broadcom KB 324520, *Configuring promiscuous mode on a virtual switch or on specific port group*: https://knowledge.broadcom.com/external/article/324520
- Broadcom KB 343401, *IP to MAC mapping, GARP, RARP and Notify Switch setting for Virtual Machine Connectivty*: https://knowledge.broadcom.com/external/article?legacyId=90045
- Broadcom PowerCLI reference, `Set-SecurityPolicy`: https://developer.broadcom.com/powercli/latest/vmware.vimautomation.core/commands/set-securitypolicy
- libvirt Network XML format: https://www.libvirt.org/formatnetwork.html
- libvirt networking wiki: https://wiki.libvirt.org/Networking.html
- libvirt domain API, `virDomainInterfaceAddresses`: https://libvirt.org/html/libvirt-libvirt-domain.html
- RFC 826, *An Ethernet Address Resolution Protocol (ARP)*: https://www.rfc-editor.org/rfc/rfc826.html
- RFC 5227, *IPv4 Address Conflict Detection*: https://www.rfc-editor.org/rfc/rfc5227.html
- `brctl(8)` man page: https://man7.org/linux/man-pages/man8/brctl.8.html
- `arping(8)` man page: https://man7.org/linux/man-pages/man8/arping.8.html
- Local CLI help: `ip link help`, `ip neigh help`, `tcpdump --help`

## Issues Found
- The VMware security-policy table used outdated defaults for `MAC Address Changes` and `Forged Transmits`. Broadcom documents that these defaults changed from `Accept` in older vSphere 6.x environments to `Reject` in vSphere 7.0+, so the table was corrected and a version note was added.
- The promiscuous-mode row implied that VMs only see their own ARP traffic. That was inaccurate because ARP requests are broadcast; the wording was corrected to describe sniffing of frames not addressed to the VM rather than suppression of normal ARP broadcasts.
- The vMotion section said VMware sends gratuitous ARP after migration. Broadcom documents ESXi sending RARP when `Notify Switches` is enabled, so the section was corrected to describe RARP-based upstream MAC relearning.
- The Linux bridge example used `brctl show`, but `brctl` is obsolete. It was replaced with current `iproute2` commands for viewing the bridge and attached interfaces.
- The `tcpdump` examples were reordered into canonical syntax with options before the filter expression.
- The MACVTAP section overstated the topology by saying each VM's MAC is "directly on the physical NIC" and used `virsh domifaddr` as a MAC lookup command. It was corrected to describe bridge bypass / direct attachment semantics and to use `virsh domiflist` plus `ip link show type macvtap`.
- The KVM migration section incorrectly suggested `virsh net-update default` as a way to refresh ARP state. `net-update` modifies libvirt network configuration, so it was removed and replaced with a guest-side unsolicited ARP example using `arping -U`.
- The promiscuous-mode section implied that enabling promisc on `virbr0` makes a VM see all ARP broadcasts. It was corrected to describe host-side capture or bridge-appliance behavior.
- The troubleshooting table mixed switch MAC-table issues with ARP-cache fixes and referred to vMotion "gratuitous ARP". Those rows were corrected to use RARP / `Notify Switches` terminology and appropriate neighbor-cache language.

## Review Notes
- VMware networking defaults are version-sensitive. Broadcom explicitly notes a change in defaults between vSphere 6.x and 7.0+, so posts that give default values should qualify the version.
- After KVM live migration, whether an unsolicited ARP is needed depends on guest behavior and the upstream network. The revised wording now presents this as conditional rather than universal.
- `virbr0` specifically refers to libvirt's default NAT-backed network. Bridged-to-LAN deployments often use a separate host bridge such as `br0`, so readers should not generalize `virbr0` to every KVM networking setup.
