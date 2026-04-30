# How to Configure IPv6 on Netgear Routers

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, Netgear, Router, DHCPv6, SLAAC, Home Network

Description: Configure IPv6 on Netgear routers including Nighthawk and Orbi series, enabling DHCPv6 prefix delegation and SLAAC for home and small business networks.

## Introduction

Netgear routers support IPv6 across the Nighthawk, Orbi, and business-grade lineup. IPv6 is configured through the web admin interface at `http://routerlogin.net`, `http://routerlogin.com`, or `http://orbilogin.com` depending on the model. This guide covers setting up IPv6 for ISP connectivity and LAN distribution.

## Step 1: Access IPv6 Settings

1. Log in to the router admin interface
2. Navigate to **Advanced > Advanced Setup > IPv6**
3. On some models, the menu wording differs slightly, such as **Settings > Advanced Settings > IPv6**

## Step 2: Configure WAN IPv6

Select the appropriate connection type based on your ISP:

**For Auto Detect / Auto Config:**
1. If your model offers **Auto Detect** and you are not sure which IPv6 connection type your ISP uses, start there
2. Use **Auto Config** only if your ISP's IPv6 service is not **PPPoE**, **DHCP**, or **Fixed**
3. Check the status after saving - you should see **Router's IPv6 Address on WAN** and **Router's IPv6 Address on LAN**

**For DHCPv6 (including automatic prefix delegation on supported ISPs):**
1. Select **DHCP** from the Internet Connection Type dropdown
2. Leave **DHCP User Class** and **Domain Name** blank unless your ISP specifically provided values
3. Use automatic IPv6 DNS from the ISP unless your ISP requires manual DNS server entries
4. Click **Apply** and verify the router shows both WAN and LAN IPv6 addresses

**For Static IPv6:**
1. Select **Fixed** from the Internet Connection Type dropdown
2. Enter:
   - IPv6 Address/Prefix Length: (your ISP-provided address and prefix length)
   - Default IPv6 Gateway: (your ISP-provided gateway)
   - Primary/Secondary DNS: IPv6 DNS addresses
3. Under LAN setup, choose **IP Address Assignment** and enter the LAN **IPv6 Address/Prefix Length** if the page requires it
4. Click **Apply**

## Step 3: Configure LAN IPv6

1. Under the LAN section of the IPv6 settings, set **IP Address Assignment**:
   - **Auto Config**: Default on many models and the simplest option for SLAAC-style client addressing
   - **Use DHCP Server**: Passes more information to LAN devices, but some IPv6 systems might not support the DHCPv6 client function
2. Optionally enable **Use This Interface ID** if you want to pin the router's LAN interface ID; otherwise the router generates it from its MAC address
3. If you selected **Fixed** for the WAN connection type, enter the router's LAN **IPv6 Address/Prefix Length** as required by the page
4. Click **Apply**

## Step 4: Verify the Configuration

In the router's status page:

1. Stay on the **IPv6** page, or open the router's status page if your model exposes IPv6 there
2. Look for the **IPv6** section showing:
   - Router's IPv6 Address on WAN (should be a global unicast address)
   - Router's IPv6 Address on LAN (for SLAAC on the LAN, this is typically a /64)

## Step 5: Test from a Client

```bash
# From a Windows PC on the network

ipconfig /all
# Look for "IPv6 Address" under the adapter - should show a global address

# Test connectivity
ping -6 2606:4700:4700::1111

# From a Linux client
ip -6 addr show scope global
ping -6 2606:4700:4700::1111
curl -6 https://ifconfig.me
```

## Troubleshooting Common Issues

**Issue: "Auto Detect" not finding IPv6 connection**

```bash
# Connect a laptop directly to the modem/ONT and confirm that it receives
# a global IPv6 address and a default IPv6 route:
ip -6 addr show scope global
ip -6 route show default
```

If this works, the router's selected IPv6 connection type does not match what the ISP expects.

**Issue: WAN IPv6 address is assigned but LAN clients don't get IPv6**

This typically means the router did not obtain or advertise a usable LAN prefix:
1. Verify the IPv6 page shows **Router's IPv6 Address on LAN**, not just a WAN address
2. Set **IP Address Assignment** to **Auto Config** for SLAAC-style client addressing or **Use DHCP Server** if you specifically need DHCPv6
3. If the LAN address remains **Not Available**, confirm with your ISP that your service delegates a usable IPv6 prefix to downstream routers

**Issue: IPv6 connectivity but no DNS over IPv6**

1. If your model offers **Get Automatically from ISP**, try that first unless your ISP requires manual DNS servers
2. If you enter manual IPv6 DNS servers, verify the configured server is reachable, for example: `ping -6 2606:4700:4700::1111`
3. Confirm the client actually learned an IPv6 DNS server from the router using your OS's network status tools

## Netgear Orbi Mesh Specifics

For Orbi systems:
1. Log in at `http://orbilogin.com`
2. Navigate to **Advanced > Advanced Setup > IPv6**
3. The main Orbi router handles IPv6; satellites inherit settings automatically
4. Ensure all satellites have updated firmware matching the router

## Conclusion

Netgear routers provide a functional if somewhat variable IPv6 experience depending on the model and firmware version. The correct WAN mode depends on the ISP, but Auto Detect (when available), DHCP, and Auto Config cover many common scenarios. After enabling IPv6 on the WAN, set the LAN to **Auto Config** for the simplest SLAAC-style client configuration, and verify that both the WAN and LAN sections show valid IPv6 addresses on the IPv6 page or router status page.
