# Validation Summary: ESXi VM Has No Network: Trace the vNIC to the Physical Switch

## Status

validated

## Post Type

Troubleshooting guide

## Technologies Covered

- VMware vSphere ESXi
- vSphere Standard Switch (vSS)
- vSphere Distributed Switch (vDS)
- Virtual machine vNICs and guest NIC drivers, including VMXNET3
- VM and distributed port groups
- IEEE 802.1Q VLAN tagging, access ports, native VLANs, and trunks
- NIC teaming, static EtherChannel, IP-hash routing, LACP, and LAGs
- `esxcli`, `esxtop`, and `net-stats`
- `pktcap-uw` and `tcpdump-uw`
- MTU and jumbo frames
- vSwitch security policies
- VMware NSX segments, logical ports, TEPs, tunnels, and distributed firewalling

## Sources Consulted

- [Broadcom KB 324542: Troubleshooting virtual machine network connection issues](https://knowledge.broadcom.com/external/article/324542/troubleshooting-virtual-machine-network.html)
- [Broadcom KB 375097: Troubleshooting VLAN Connectivity Issues](https://knowledge.broadcom.com/external/article/375097/troubleshooting-vlan-connectivity-on-esx.html)
- [Broadcom KB 431907: Port Group Configuration Mismatch Across ESXi Hosts Results in Network Unavailability](https://knowledge.broadcom.com/external/article/431907/port-group-mismatch-across-esxi-hosts-re.html)
- [Broadcom KB 419915: VMs on ESXi hosts lose network connectivity](https://knowledge.broadcom.com/external/article/419915/vms-on-esxi-hosts-lose-network-connectiv.html)
- [Broadcom KB 341568: Packet capture on ESXi using the pktcap-uw tool](https://knowledge.broadcom.com/external/article/341568/packet-capture-on-esxi-using-the-pktcapu.html)
- [Broadcom KB 429983: VM network connectivity fails with VlanTag Mismatch](https://knowledge.broadcom.com/external/article/429983/vm-network-connectivity-fails-with-vlant.html)
- [Broadcom ESXCLI network command reference](https://developer.broadcom.com/xapis/esxcli-command-reference/latest/namespace/esxcli_network.html)
- [Broadcom KB 413620: VM and VMkernel use of vSS and vDS port groups](https://knowledge.broadcom.com/external/article/413620/when-adding-or-configuring-a-vms-network.html)
- [Broadcom KB 321259: Choosing a network adapter for a virtual machine](https://knowledge.broadcom.com/external/article/321259/choosing-a-network-adapter-for-a-virtual.html)
- [Broadcom KB 429824: Checking Virtual Machine and VMkernel uplinks using esxtop](https://knowledge.broadcom.com/external/article/429824/checking-virtual-machine-and-vmkernel-up.html)
- [Broadcom KB 382249: Using ESXTop and Interpreting ESXTop Statistics](https://knowledge.broadcom.com/external/article/382249/using-esxtop-and-interpreting-esxtop-sta.html)
- [Broadcom KB 412927: Physical interface unreachable when VM on specific host](https://knowledge.broadcom.com/external/article/412927/physical-interface-unreachable-when-vm-o.html)
- [Broadcom KB 418640: Interpreting VM-to-uplink pktcap-uw capture points](https://knowledge.broadcom.com/external/article/418640/after-a-vm-is-rebooted-it-sometimes-does.html)
- [Broadcom KB 324555: Link Aggregation Requirements for ESXi](https://knowledge.broadcom.com/external/article/324555)
- [Broadcom KB 414879: Same-host versus different-host VM communication](https://knowledge.broadcom.com/external/article/414879/vms-are-unable-to-communicate-when-on-di.html)
- [Broadcom KB 313061: Testing jumbo frame pings from ESXi over the network](https://knowledge.broadcom.com/external/article?articleNumber=313061)
- [Broadcom KB 318719: Recover vCenter networking on a distributed switch](https://knowledge.broadcom.com/external/article/318719/vcenter-network-connectivity-lost-recov.html)
- [Broadcom KB 405834: Network traffic impacted when using pktcap-uw](https://knowledge.broadcom.com/external/article/405834/network-traffic-impacted-when-using-pktc.html)
- [Broadcom KB 446719: Security implications of vSphere switch security policies](https://knowledge.broadcom.com/external/article/446719/security-implications-of-enabling-promis.html)
- [Broadcom KB 318873: A virtual machine loses network connectivity after vMotion](https://knowledge.broadcom.com/external/article/318873/a-virtual-machine-loses-network-connecti.html)
- [Broadcom KB 319651: Security-policy default changes in vSphere 7.0](https://knowledge.broadcom.com/external/article?legacyId=67853)

## Issues Found

- The guest checklist referred only to a paravirtual NIC driver. This excluded supported emulated adapter types, so it now refers to the guest NIC driver and gives VMXNET3 as an example.
- The DNS diagnosis was categorical. Successful IP connectivity with failed name resolution now points first to DNS configuration or resolver reachability rather than claiming that every such failure is strictly a DNS-server issue.
- The port-group checklist treated VMkernel port groups as invalid VM backings for both switch types. That restriction applies to standard-switch port groups; a vDS distributed port group can serve both VMs and VMkernel adapters. The checklist now distinguishes vSS and vDS behavior.
- The post assumed that one vmnic always carries the VM. Static EtherChannel and LACP can appear as `all(n)` in `TEAM-PNIC`, so the inventory, `esxtop` guidance, packet-capture procedure, and conclusion now cover all bundle members and require simultaneous captures on each member.
- The `esxtop` network display was described as showing packet counters. It shows packet rates and drop percentages, and the wording was corrected accordingly.
- The packet-capture examples were described as filtered even though the shown commands contain no filter. They are now identified as unfiltered live-display examples, followed by the existing instruction to add a focused filter.
- The capture interpretation table lacked an off-host-test qualifier and treated `UplinkSndKernel` as proof that a frame reached the wire. The table now applies to controlled off-host traffic and includes the physical NIC or driver as a possible boundary because the capture point is on the kernel side of the uplink. The guest receive-path row also now includes the guest driver and receive path.
- The MTU guidance required every layer to agree exactly and implied that a VM port group has an independent MTU. It now correctly requires every device in the path to support the intended frame size and identifies the vSwitch or vDS as the virtual-switch MTU layer.
- The security-policy guidance mentioned packet capture generically, which could imply that host-side `pktcap-uw` needs promiscuous mode. It now limits that case to an in-guest capture that must receive frames not addressed to the VM's vNIC.

## Review Notes

- All six links in the post's Official Documentation section resolved successfully and matched their descriptions during validation.
- `esxcli network nic list`, `net-stats -l`, both `pktcap-uw` commands, their capture-point names, and the `tcpdump-uw` pipelines match current Broadcom documentation.
- `pktcap-uw` is documented for ESXi 5.5 and later. Capture-point availability and operational limits should still be checked against the installed ESXi release.
- The default values of MAC Address Changes and Forged Transmits changed from Accept in vSphere 6.x to Reject in vSphere 7.0. Upgraded environments should verify effective policies instead of assuming defaults.
- No additional technical issues were found after the corrections above.
