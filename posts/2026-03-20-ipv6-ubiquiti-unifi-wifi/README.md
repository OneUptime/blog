# How to Configure IPv6 on Ubiquiti UniFi Wi-Fi

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, Ubiquiti, UniFi, Wi-Fi, SLAAC, DHCPv6, Wireless LAN

Description: Configure IPv6 support on Ubiquiti UniFi access points and controller including prefix delegation, DHCPv6, SLAAC for wireless clients, and IPv6 firewall policies.

---

Ubiquiti UniFi networks support IPv6 through the UniFi Network application. You configure IPv6 on both the WAN and the LAN network, and UniFi APs bridge RA messages and DHCPv6 traffic to wireless clients. The USG or UDM gateway handles prefix delegation from the ISP.

## UniFi Controller IPv6 Configuration

```text
UniFi Network:
- WAN: Settings > Internet > [Select WAN] > IPv6 Configuration
- LAN/VLAN: Settings > Networks > [Select Network] > IPv6

Supported WAN IPv6 methods:
- SLAAC
- DHCPv6
- Static

Supported LAN IPv6 interface types:
- Prefix Delegation
- Static

Recommended for most deployments:
- WAN IPv6 Configuration: DHCPv6
- WAN Prefix Delegation Size: Match the ISP assignment (commonly /48 or /56)
- LAN IPv6 Interface Type: Prefix Delegation
- Client Address Assignment: SLAAC, or DHCPv6 with Allow SLAAC for mixed clients
```

## UniFi USG IPv6 Configuration via JSON Override

```text
Legacy USG note:
- `config.gateway.json` applies only to USG-era gateways.
- The override should mirror EdgeOS/VyOS DHCPv6-PD settings on the WAN and a delegated /64 on each LAN.
- Request the ISP-delegated size on the WAN (often /48 or /56), then assign a unique prefix ID per LAN network.
- Prefer the UniFi Network UI for WAN DHCPv6 and LAN Prefix Delegation when those options are available.
```

## UniFi Dream Machine (UDM) IPv6 Setup

```bash
# SSH into UDM if SSH is enabled

ssh root@192.168.1.1

# Check IPv6 status
ip -6 addr show
ip -6 route show

# Verify IPv6 on the default LAN bridge
ip -6 addr show br0

# Capture Router Advertisements on the LAN bridge
tcpdump -i br0 -nn 'icmp6 and ip6[40] == 134' -c 3

# View lease information in the UniFi UI
# UniFi Network 7.4+: Settings > Networks > IP Leases
```

## UniFi IPv6 Firewall Rules

```text
UniFi Network 9.x:
- Settings > Zones > Create Policy
- or Settings > Policy Table > Create New Policy

Built-in External -> Other Zones policies already provide:
- Allow Return Traffic (established/related)
- Block Invalid Traffic
- Block All Traffic

Add custom IPv6 policies only when needed:
Policy 1: Allow ICMPv6 from External to Gateway
- IP Version: IPv6
- Protocol: ICMP
- Source Zone: External
- Destination Zone: Gateway
- Action: Allow

Policy 2: Allow DHCPv6 replies from External to Gateway
- IP Version: IPv6
- Protocol: UDP
- Source Zone: External
- Destination Zone: Gateway
- Source Port: 547
- Destination Port: 546
- Action: Allow
```

```bash
# Via CLI on USG - view IPv6 firewall rules
show firewall ipv6name WAN6_LOCAL statistics

# Add rule via VyOS CLI (USG)
configure
set firewall ipv6-name WAN6_LOCAL rule 10 action accept
set firewall ipv6-name WAN6_LOCAL rule 10 protocol icmpv6
commit
save
```

## Verify Wi-Fi Clients Get IPv6

```bash
# On a connected Wi-Fi client
# macOS
ifconfig en0 | grep inet6
# Should show:
# a global unicast address from the delegated /64

# Windows
netsh interface ipv6 show addresses
# Should show a global unicast address

# Linux/Android
ip -6 addr show

# Test IPv6 connectivity
ping -6 2606:4700:4700::1111    # Cloudflare DNS
curl -6 https://cloudflare.com >/dev/null

# Verify public IPv6 source address
curl -6 https://cloudflare.com/cdn-cgi/trace | grep '^ip='
```

## UniFi IPv6 Troubleshooting

```bash
# Check DHCPv6 client logs on a USG/legacy VyOS-style gateway
ssh root@usg-ip
show log dhcpv6 client interface eth0

# Debug RA not reaching clients
tcpdump -i eth1 -nn 'icmp6 and (ip6[40]==133 or ip6[40]==134)'
# 133 = Router Solicitation, 134 = Router Advertisement

# Check gateway logs for IPv6 messages
grep -Ei 'ipv6|slaac|dhcpv6' /var/log/messages

# UniFi AP SSH debug
ssh <username>@ap-ip
ip -6 addr show
grep -Ei 'ipv6|dhcpv6|icmp6' /var/log/messages
```

UniFi IPv6 deployment works best with ISP prefix delegation (DHCPv6-PD) configured on the WAN interface, which lets the gateway assign a unique /64 to each LAN network when the LAN Interface Type is Prefix Delegation. Wireless clients receive IPv6 addresses via SLAAC from Router Advertisement messages bridged through the UniFi APs acting as transparent L2 bridges.
