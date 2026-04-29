# How to Configure IPv6 on Ubiquiti UniFi

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, Ubiquiti, UniFi, DHCPv6, SLAAC, Networking

Description: Configure IPv6 on Ubiquiti UniFi networks through the UniFi Network Controller, enabling DHCPv6 prefix delegation and SLAAC for connected devices.

## Introduction

Ubiquiti UniFi provides IPv6 configuration through its UniFi Network interface. The setup covers WAN IPv6 connectivity (SLAAC, DHCPv6-PD, or static IPv6), LAN network IPv6 mode (SLAAC or DHCPv6), and per-network or per-VLAN IPv6 settings.

## Step 1: Configure WAN IPv6 in UniFi Controller

1. Navigate to **Settings > Internet** (or **WAN** in older versions)
2. Under **IPv6 Configuration** (or **IPv6 Connection** in some versions), select the connection type:
   - **SLAAC**: ISP provides IPv6 connectivity via router advertisements
   - **DHCPv6**: ISP provides a WAN IPv6 address and/or a delegated prefix
   - **Static IPv6**: Enter your ISP-provided static IPv6 address and prefix
   - If your WAN uses **PPPoE**, configure PPPoE on the WAN and then enable IPv6 on that WAN connection

3. For DHCPv6 with Prefix Delegation:
   - Set **IPv6 Connection** to **DHCPv6**
   - Set **Prefix Delegation Size** to match what your ISP provides (commonly `/56` or `/48`)
   - Save

## Step 2: Enable IPv6 on a LAN Network

1. Navigate to **Settings > Networks**
2. Click on the LAN network to edit (or create a new one)
3. Scroll to the **IPv6** section
4. Set **IPv6 Interface Type**:
   - **Static**: Manually enter IPv6 prefix
   - **Prefix Delegation**: Use prefix delegated from WAN (most common for homes/offices)
5. For **Prefix Delegation**, set:
   - **Prefix Delegation Interface**: WAN
   - **Prefix ID**: `1` (or another unique value for this network)
6. Set IPv6 client addressing options:
   - **RA enabled**: On
   - **Client Address Assignment**: Select **SLAAC/Stateless** (recommended for widest client compatibility) or **DHCPv6**
   - **RA Priority**: Medium (default)
7. Click **Save**

## Step 3: Configure IPv6 DNS

In the network settings:
- Set **DNS Server** to your preferred IPv6 DNS:
  - `2606:4700:4700::1111` (Cloudflare)
  - `2001:4860:4860::8888` (Google)
  - Or your internal IPv6 DNS resolver

## Step 4: Verify via CLI on UniFi Gateway

SSH into the UniFi Gateway. The exact shell differs by model, so these Linux commands are the most portable:

```bash
# Show IPv6 addresses on all interfaces
ip -6 addr show

# Show IPv6 routing table
ip -6 route show

# Test IPv6 connectivity
ping -6 -c 3 2606:4700:4700::1111
```

## Step 5: Verify Client IPv6 Assignment

From a client connected to the UniFi network:

```bash
# Linux client - check for global IPv6 address
ip -6 addr show scope global

# macOS client
ifconfig | grep inet6

# Windows client
ipconfig /all

# Verify the address uses the prefix from your delegated pool
# e.g., if ISP delegated 2001:db8::/56 and Prefix ID=1,
# client should have address in 2001:db8:0:1::/64
```

## Troubleshooting Common Issues

**Issue: No IPv6 address on clients**
```bash
# Replace eth0 with your client interface name, then check for RA packets
sudo tcpdump -i eth0 "icmp6 and ip6[40] == 134" -c 3
# Or use rdisc6 on the client interface
rdisc6 eth0
```

**Issue: DHCPv6-PD not working with ISP**
- Some ISPs require provider-specific DHCPv6 settings or client options - check ISP documentation
- Verify the **Prefix Delegation Size** matches what your ISP provides
- Verify the ISP actually provides IPv6 - test from the WAN interface directly

**Issue: IPv6 works but DNS fails**
- Verify RDNSS is being advertised in RA (`rdisc6 eth0`)
- Ensure DNS server in UniFi settings is a valid IPv6 address
- Check that `systemd-resolved` or the system resolver is accepting RDNSS

## Conclusion

UniFi's Controller-based configuration makes IPv6 setup accessible through a web interface. The key steps are enabling DHCPv6-PD on the WAN and configuring Prefix Delegation on LAN networks. For complex multi-VLAN setups, each VLAN network gets its own Prefix ID (0, 1, 2...) derived from the delegated prefix. SSH access on the gateway provides deeper troubleshooting, though the exact CLI differs by model.
