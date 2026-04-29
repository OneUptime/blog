# How to Pass IPv6 Traffic Through Virtual Switches

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, Virtual Switch, OVS, Hyper-V, VMware, SDN

Description: Configure virtual switches in VMware, Hyper-V, and Open vSwitch to correctly forward IPv6 traffic including NDP, Router Advertisements, and MLD, avoiding common IPv6 blocking issues.

## Introduction

Virtual switches must handle IPv6-specific traffic types - NDP (Neighbor Discovery Protocol), Router Advertisements (ICMPv6 type 134), MLD (Multicast Listener Discovery), and PMTUD (Path MTU Discovery) - to enable functional IPv6 connectivity for virtual machines. Many virtual switch defaults block or mishandle these essential IPv6 mechanisms.

## IPv6 Traffic Types Virtual Switches Must Handle

```text
IPv6 traffic through virtual switches:
┌─────────────────────────────────────────────────────┐
│ Essential IPv6 multicast traffic:                    │
│  ff02::1   All nodes (common RA destination)        │
│  ff02::2   All routers (RS destination)             │
│  ff02::1:ff xx:xxxx  Solicited-node (NDP)          │
│                                                      │
│ ICMPv6 types that must NOT be blocked:              │
│  Type 133: Router Solicitation                       │
│  Type 134: Router Advertisement                      │
│  Type 135: Neighbor Solicitation                     │
│  Type 136: Neighbor Advertisement                    │
│  Type 2:   Packet Too Big (PMTUD)                   │
│  Types 130,131,132,143: MLD (multicast)             │
└─────────────────────────────────────────────────────┘
```

## Linux Bridge: Allow All IPv6 Traffic

```bash
# Check if bridge netfilter is blocking IPv6 NDP

sysctl net.bridge.bridge-nf-call-ip6tables
# If this is 1, ip6tables rules apply to bridged frames

# Disable bridge netfilter for IPv6 (recommended for pure L2 bridges)
cat >> /etc/sysctl.d/99-bridge-ipv6.conf << 'EOF'
# Do not filter bridged IPv6 traffic with ip6tables
net.bridge.bridge-nf-call-ip6tables = 0
net.bridge.bridge-nf-call-iptables = 0
EOF
sysctl -p /etc/sysctl.d/99-bridge-ipv6.conf

# If you must use bridge netfilter, allow bridged ICMPv6 explicitly
ip6tables -A FORWARD -m physdev --physdev-is-bridged -p icmpv6 -j ACCEPT
ip6tables -A FORWARD -m physdev --physdev-is-bridged -m conntrack --ctstate ESTABLISHED,RELATED -j ACCEPT
```

## Open vSwitch: IPv6 Flow Rules

```bash
# OVS: ensure IPv6 and ICMPv6 traffic is forwarded

# icmpv6_type matches require OpenFlow 1.2+; ovs-ofctl uses OpenFlow 1.0 by default
ovs-vsctl set bridge ovs-br0 protocols=OpenFlow10,OpenFlow11,OpenFlow12,OpenFlow13

# Check existing flows
ovs-ofctl -O OpenFlow13 dump-flows ovs-br0 | grep -E "icmp6|ipv6"

# Add explicit rules to allow IPv6 (if using deny-all default)
# Allow ICMPv6 NDP (types 133-136)
ovs-ofctl -O OpenFlow13 add-flow ovs-br0 "priority=200,icmp6,icmpv6_type=133,actions=normal"
ovs-ofctl -O OpenFlow13 add-flow ovs-br0 "priority=200,icmp6,icmpv6_type=134,actions=normal"
ovs-ofctl -O OpenFlow13 add-flow ovs-br0 "priority=200,icmp6,icmpv6_type=135,actions=normal"
ovs-ofctl -O OpenFlow13 add-flow ovs-br0 "priority=200,icmp6,icmpv6_type=136,actions=normal"

# Allow ICMPv6 Packet Too Big (PMTUD)
ovs-ofctl -O OpenFlow13 add-flow ovs-br0 "priority=200,icmp6,icmpv6_type=2,actions=normal"

# Allow MLD (v1 and v2)
ovs-ofctl -O OpenFlow13 add-flow ovs-br0 "priority=200,icmp6,icmpv6_type=130,actions=normal"
ovs-ofctl -O OpenFlow13 add-flow ovs-br0 "priority=200,icmp6,icmpv6_type=131,actions=normal"
ovs-ofctl -O OpenFlow13 add-flow ovs-br0 "priority=200,icmp6,icmpv6_type=132,actions=normal"
ovs-ofctl -O OpenFlow13 add-flow ovs-br0 "priority=200,icmp6,icmpv6_type=143,actions=normal"

# Allow all other IPv6
ovs-ofctl -O OpenFlow13 add-flow ovs-br0 "priority=100,ipv6,actions=normal"
```

## VMware vSwitch: IPv6 Configuration

```text
# VMware Standard vSwitch - IPv6 passes through transparently
# No special configuration needed for basic IPv6 bridging

# However, some features can interfere with IPv6:

# 1. Promiscuous Mode - not needed for IPv6, but may be needed for
#    some configurations (e.g., network monitoring VMs)
# vSphere Client → vSwitch → Edit → Security → Promiscuous Mode

# 2. Forged Transmits - needed if VMs use MACs different from vNIC MAC
#    e.g., when running network namespaces or nested virtualization

# 3. MAC Address Changes - may be needed if a guest changes its effective MAC
#    and must receive traffic for that MAC

# Check port group settings:
# vSphere Client → vSwitch → Port Group → Edit Settings → Security
```

```bash
# VMware ESXi esxcli: check vSwitch settings
esxcli network vswitch standard policy failover get --vswitch-name vSwitch0
esxcli network vswitch standard policy security get --vswitch-name vSwitch0
```

## Hyper-V: Virtual Switch for IPv6

```powershell
# Hyper-V: check virtual switch for IPv6 issues

# List virtual switches
Get-VMSwitch

# Check if MAC spoofing is needed (for nested virtualization with IPv6)
Get-VMNetworkAdapter -VMName "MyVM" | Select-Object MacAddressSpoofing

# Enable MAC spoofing if VMs run nested workloads with IPv6
Set-VMNetworkAdapter -VMName "MyVM" -MacAddressSpoofing On

# DHCP Guard - blocks DHCPv6 if enabled on non-DHCP servers
# Disable if a VM is running a DHCPv6 server
Set-VMNetworkAdapter -VMName "DHCPv6Server" -DhcpGuard Off

# Router Guard - blocks Router Advertisements from VMs
# Enable to prevent rogue RA attacks, disable for legitimate VM routers
Set-VMNetworkAdapter -VMName "MyRouter" -RouterGuard Off
```

## Testing IPv6 Through Virtual Switches

```bash
# From inside a VM: test NDP is working
ip -6 neigh show
# Should show a neighbor entry for the router, often in REACHABLE or STALE state

# Check Router Advertisements are reaching VMs
tcpdump -i eth0 -n "icmp6 and icmp6[0] == 134"
# Should see RA packets from the router

# Test MTU (check Packet Too Big messages work)
ping6 -M do -s 1452 2001:4860:4860::8888
# If this fails unexpectedly, verify ICMPv6 type 2 is not being blocked

# From OVS: trace IPv6 packet path
ovs-appctl ofproto/trace ovs-br0 \
    "ipv6,in_port=1,ipv6_src=2001:db8::100,ipv6_dst=2001:db8::1,icmp6,icmpv6_type=135"
```

## Conclusion

Virtual switches must forward ICMPv6 NDP messages (types 133-136), Packet Too Big (type 2), and MLD messages for IPv6 to function correctly. Linux bridges block these if `bridge-nf-call-ip6tables=1` and ip6tables has DROP defaults. Open vSwitch requires explicit OpenFlow rules for ICMPv6 types in custom table configurations, and matches on `icmpv6_type` require OpenFlow 1.2 or later. Hyper-V's Router Guard blocks Router Advertisements from VMs - disable it when a VM is legitimately running an IPv6 router. VMware vSwitches are transparent to IPv6 by default, but MAC Address Changes and Forged Transmit policies may need adjustment for nested virtualization or other workloads that use MACs different from the vNIC MAC. Always test NDP and PMTUD functionality after configuring virtual switches for IPv6.
