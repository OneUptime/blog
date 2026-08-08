# Validation Summary: ESXi Management Network Cannot Reach the Gateway: A VLAN Checklist

## Status

validated

## Post Type

Technical troubleshooting guide

## Technologies Covered

- VMware ESXi and vSphere
- VMkernel management networking and TCP/IP stacks
- vSphere Standard Switches (vSS) and Distributed Switches (vDS)
- IEEE 802.1Q VLAN tagging, access ports, native VLANs, and Virtual Switch Tagging
- Physical NICs, uplink teaming, static EtherChannel, IP-hash routing, and LACP
- `esxcli`, `vmkping`, and `pktcap-uw`
- MTU and jumbo-frame validation
- ARP, ICMP, LLDP, and CDP troubleshooting

## Sources Consulted

- [Broadcom ESXCLI network command reference](https://developer.broadcom.com/xapis/esxcli-command-reference/latest/namespace/esxcli_network.html)
- [Testing VMkernel network connectivity with the vmkping command](https://knowledge.broadcom.com/external/article/344313/testing-vmkernel-network-connectivity-wi.html)
- [Unable to ping the gateway from the ESXi host](https://knowledge.broadcom.com/external/article/400301/unable-to-ping-the-gateway-from-the-esxi.html)
- [Troubleshooting VLAN Connectivity Issues](https://knowledge.broadcom.com/external/article/375097/troubleshooting-vlan-connectivity-on-esx.html)
- [Configuring External Switch VLAN Tagging mode on a vNetwork Distributed Switch](https://knowledge.broadcom.com/external/article/310910/configuring-external-switch-vlan-tagging.html)
- [ESXi host management network unreachable after physical network adapter replacement](https://knowledge.broadcom.com/external/article/434918/esxi-host-management-network-unreachable.html)
- [Cannot ping or connect to a VMkernel adapter](https://knowledge.broadcom.com/external/article/431443/cannot-ping-or-connect-to-a-vmkernel-ada.html)
- [Configuring Standard vSwitch or virtual Distributed Switch from the command line](https://knowledge.broadcom.com/external/article/326175/configuring-standard-vswitch-vss-or-virt.html)
- [Configure Virtual Switch with an EtherChannel](https://knowledge.broadcom.com/external/article/321425/configure-virtual-switch-with-an-etherch.html)
- [Packet drops and connection issues due to incorrectly configured load balancing](https://knowledge.broadcom.com/external/article/419272/packet-drops-and-connection-issues-due-t.html)
- [Network connectivity fails on a new Distributed Port Group when VDS is configured with LACP](https://knowledge.broadcom.com/external/article/428331/network-connectivity-fails-on-a-new-dist.html)
- [Enabling Jumbo Frames on virtual switches](https://knowledge.broadcom.com/external/article/324494/enabling-jumbo-frames-on-virtual-switche.html)
- [Packet capture on ESXi using the pktcap-uw tool](https://knowledge.broadcom.com/external/article/341568/packet-capture-on-esxi-using-the-pktcapu.html)
- [Network traffic impacted when using pktcap-uw](https://knowledge.broadcom.com/external/article/405834/network-traffic-impacted-when-using-pktc.html)
- [vCenter network connectivity lost: recover vCenter when connected to a distributed switch](https://knowledge.broadcom.com/external/article/318719/vcenter-network-connectivity-lost-recov.html)
- [Restarting Management Agents in ESXi](https://knowledge.broadcom.com/external/article/320280/restarting-the-management-agents-in-esxi.html)
- [RFC 5737: IPv4 Address Blocks Reserved for Documentation](https://www.rfc-editor.org/rfc/rfc5737.html)

## Issues Found

1. The original single-uplink troubleshooting procedure applied the same failover method to ordinary NIC teams and aggregated links. That is unsafe for static EtherChannel with IP-hash, where all member uplinks must remain active, and for LACP, where the distributed port group uses the LAG as its logical active uplink. The paragraph now limits one-active-uplink testing to non-aggregated teams and requires a coordinated, channel-aware procedure for EtherChannel or LACP members.
2. The MTU checklist referred to a port group as an MTU configuration layer. MTU is configured on the VMkernel adapter and the vSS or vDS, with compatible settings required along the physical and routed path. The checklist now names those actual configuration layers.

## Review Notes

- All `esxcli` commands in the post are present in Broadcom's current command reference. `esxcli network ip route ipv4 list` uses the default TCP/IP stack unless `--netstack` is supplied, which is appropriate for the normal ESXi management stack.
- Both `vmkping` examples are valid. For IPv4, an 8972-byte ICMP payload plus the 8-byte ICMP header and 20-byte IPv4 header tests a 9000-byte MTU with fragmentation disabled.
- VLAN 0 or VLAN type None correctly represents untagged ESXi traffic for the access/native VLAN design described. Tagged port groups on an allowed physical trunk correctly describe Virtual Switch Tagging.
- Broadcom's management-agent article separately prohibits the bulk `services.sh restart` and DCUI **Restart Management Agents** actions on hosts using vSAN, LACP, NSX, or shared graphics; it directs administrators to restart only the required individual service. The post already recommends individual agents and warns about disruption.
- All six links in the post's Official Documentation section were reachable and matched their displayed topics at review time.
- The example addresses `192.0.2.1` and `192.0.2.11` are within RFC 5737's TEST-NET-1 documentation range.
