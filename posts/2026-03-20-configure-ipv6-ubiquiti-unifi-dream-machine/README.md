# How to Configure IPv6 on Ubiquiti UniFi Dream Machine

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, Ubiquiti, UniFi, Dream Machine, DHCPv6, Home Lab

Description: Configure IPv6 on Ubiquiti UniFi Dream Machine (UDM) and UDM Pro including prefix delegation, SLAAC, firewall rules, and network settings.

## Supported Devices

- UniFi Dream Machine (UDM)
- UniFi Dream Machine Pro (UDM-Pro)
- UniFi Dream Router (UDR)
- UniFi Dream Machine Special Edition (UDM-SE)

## Accessing UniFi Network Console

Navigate to `https://192.168.1.1` (default gateway) or your custom UniFi Network console IP. Log in with your Ubiquiti account credentials.

## Step 1: Configure WAN IPv6

1. Go to **Settings** (gear icon) → **Internet**
2. Click on your WAN connection
3. Under **IPv6 Connection**, configure:

```text
IPv6 Connection Type:
  ○ Disabled
  ● DHCPv6  ← (most common for cable/fiber ISPs)
  ○ Static IPv6
  ○ PPPoEv6

DHCPv6 Settings:
  Prefix Delegation Size: 56  (or 60 if ISP requires it)
  DUID: auto

IPv6 Rapid Commit: ☑ Enable
```

## Step 2: Configure LAN Network for IPv6

1. Go to **Settings → Networks**
2. Click your LAN network (or create a new one)
3. Under **IPv6**, configure:

```text
IPv6 Interface Type: Prefix Delegation

IPv6 RA (Router Advertisement):
  ☑ Enable

RA Priority: High
RA Interval: 30 seconds

IPv6 Mode: Stateless (SLAAC)
  or
IPv6 Mode: Stateless DHCP (SLAAC for addresses + DHCPv6 for DNS)

DNS Server: [auto from ISP or custom]
```

## Step 3: Multiple Networks (VLANs) with IPv6

For home labs with multiple VLANs, each can get its own /64 from the delegated prefix:

```text
LAN (VLAN 1):   2001:db8:0:00::/64   (from 2001:db8::/56 delegation)
IoT (VLAN 10):  2001:db8:0:10::/64
Lab (VLAN 20):  2001:db8:0:20::/64
```

Configure each VLAN in **Settings → Networks** with Prefix Delegation selected.

## Step 4: Configure IPv6 Firewall Rules

UniFi's default IPv6 firewall blocks all inbound traffic. Add rules for specific services:

1. Go to **Settings → Firewall & Security → Firewall Rules**
2. Select **IPv6 Rules** tab
3. Click **Create New Rule**:

```text
Rule: Allow inbound HTTPS to home server
Direction: WAN Local (or WAN In for transit)
IPv6 Protocol: TCP
Destination: 2001:db8:home::server/128
Port: 443
Action: Accept
```

Critical: Always allow ICMPv6 (required for NDP and PMTUD):

```text
Rule: Allow ICMPv6
Direction: WAN In
Protocol: ICMPv6
Action: Accept
```

## Step 5: Verify IPv6 Configuration

In UniFi Network console:

1. Go to **Statistics → Network** to see IPv6 traffic
2. Check **Clients** - each device should show both IPv4 and IPv6 addresses

From the command line (SSH to UDM):

```bash
# SSH to UDM

ssh root@192.168.1.1

# Check WAN IPv6 address
ip -6 addr show eth8   # or your WAN interface

# Check IPv6 routing table
ip -6 route show

# Verify prefix delegation
cat /run/dhclient6.eth8.pid
```

## Step 6: DNS over IPv6

Configure custom IPv6 DNS in **Settings → Networks → DNS**:

```text
DNS Server 1: 2001:4860:4860::8888
DNS Server 2: 2606:4700:4700::1111
```

## Troubleshooting UDM IPv6

**DHCPv6 not obtaining address:**
- Try changing Prefix Delegation Size between 56, 60, and 64
- Enable IPv6 Rapid Commit if not already enabled
- SSH into UDM and check: `journalctl -u dhclient6 -n 50`

**Clients not getting IPv6:**
- Verify RA is enabled on the LAN network
- Check that the correct network interface has IPv6 prefix assigned
- Temporarily disable and re-enable IPv6 on the network

## Conclusion

The UniFi Dream Machine provides granular IPv6 control suitable for both home users and home lab environments. The combination of Prefix Delegation, SLAAC, and configurable firewall rules makes it one of the best consumer-grade routers for IPv6 deployment.
