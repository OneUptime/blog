# Validation Summary: How to Trunk VLANs to an ESXi Guest Through a Standard-Switch Port Group with VLAN ID 4095

## Status

validated

## Post Type

Technical tutorial and operational guide

## Technologies Covered

- VMware vSphere ESXi
- vSphere Standard Switches and Distributed Switches
- Virtual Guest Tagging (VGT) and Virtual Switch Tagging (VST)
- IEEE 802.1Q VLAN trunking
- vSphere port-group security policies
- vMotion, HA, RARP, and upstream MAC learning
- Linux VLAN subinterfaces with iproute2
- iputils `ping`
- `tcpdump` and libpcap capture filters

## Sources Consulted

- Broadcom KB 311291, [Configuring Virtual Guest VLAN tagging (VGT) mode on a vNetwork Distributed Switch](https://knowledge.broadcom.com/external/article/311291)
- Broadcom KB 311540, [Sample configuration of virtual switch VLAN tagging (VST Mode)](https://knowledge.broadcom.com/external/article/311540)
- Broadcom KB 440372, [Virtual Switch Portgroup configuration for Virtual Machines running containers inside it](https://knowledge.broadcom.com/external/article/440372)
- Broadcom KB 317476, [Network connectivity is lost for VMs with 802.1q VLAN tagging](https://knowledge.broadcom.com/external/article/317476)
- Broadcom KB 310573, [vNetwork Distributed PortGroup (dvPortGroup) configuration](https://knowledge.broadcom.com/external/article/310573)
- Broadcom KB 431907, [Port Group Configuration Mismatch Across ESXi Hosts Results in Network Unavailability](https://knowledge.broadcom.com/external/article/431907)
- Broadcom KB 332686, [Configuring Network Switches for VLAN Tagging](https://knowledge.broadcom.com/external/article/332686)
- Broadcom KB 427110, [Forged transmits and MAC address changes on a port group - standard practices and security implications](https://knowledge.broadcom.com/external/article/427110)
- Broadcom KB 319651, [Pre-check with security policy fails when upgrading to vSphere 7.0 or newer](https://knowledge.broadcom.com/external/article/319651)
- iproute2 upstream manual, [`ip-link(8)`](https://man7.org/linux/man-pages/man8/ip-link.8.html)
- iproute2 upstream manual, [`ip-address(8)`](https://man7.org/linux/man-pages/man8/ip-address.8.html)
- iputils upstream manual, [`ping(8)`](https://man7.org/linux/man-pages/man8/ping.8.html)
- The Tcpdump Group upstream manuals, [`tcpdump(1)`](https://github.com/the-tcpdump-group/tcpdump/blob/master/tcpdump.1.in) and [`pcap-filter(7)`](https://github.com/the-tcpdump-group/libpcap/blob/master/pcap-filter.manmisc.in)
- IETF RFC 5737, [IPv4 Address Blocks Reserved for Documentation](https://www.rfc-editor.org/rfc/rfc5737.html)

## Issues Found

No technical issues found.

## Review Notes

- Broadcom's current VGT guidance covers ESXi and vCenter 7.x and 8.x. VLAN ID `4095`, the vSphere Client workflow, and the vSS-versus-vDS trunk-range distinction in the post match that guidance.
- Broadcom documents that the defaults for MAC Address Changes and Forged Transmits changed from **Accept** in vSphere 6.x to **Reject** in vSphere 7.0 and later. The post remains accurate because it does not hard-code policy values as universal and tells readers to inspect, record, and deliberately override the policies required by their workload.
- The Linux `ip` and `ping` commands are syntactically current. The addresses `192.0.2.0/24` and `198.51.100.0/24` are RFC 5737 documentation ranges; the post correctly instructs readers to replace them with assigned addresses.
- The `tcpdump` command and `vlan` filter are valid. VLAN offload can affect how a tag is represented in a guest capture, so the capture is appropriately presented as one layer of verification rather than the only test.
- All five Broadcom documentation URLs included in the post resolve to relevant official articles.
