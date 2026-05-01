# How to Enable IPv6 on Your Home Router

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, Home Router, SLAAC, DHCPv6, Setup, Consumer Networking

Description: Enable IPv6 on your home router step-by-step, covering DHCPv6, SLAAC, and prefix delegation for typical residential connections.

## Prerequisites

Before enabling IPv6 on your home router, confirm:
1. Your ISP provides IPv6 (check at `test-ipv6.com` from a device connected to your home network)
2. Your router firmware is up to date
3. You know your router's admin panel address (usually `192.168.1.1` or `192.168.0.1`)

## Step 1: Log Into Your Router Admin Panel

Open a browser and navigate to your router's IP or vendor hostname. Common defaults:
- Asus: `asusrouter.com` or `192.168.50.1`
- TP-Link: `192.168.0.1` or `tplinkwifi.net`
- Netgear: `192.168.1.1` or `routerlogin.net`
- Linksys: `192.168.1.1` or `linksyssmartwifi.com`

## Step 2: Find IPv6 Settings

Navigate to the IPv6 settings section. The exact location varies by router:
- Asus: Advanced Settings → IPv6
- TP-Link: Advanced → IPv6
- Netgear: Advanced → Advanced Setup → IPv6
- Linksys: Connectivity → Internet Settings → IPv6

## Step 3: Choose the Right IPv6 Connection Type

Most home routers support these IPv6 connection types:

| Connection Type | When to Use |
|----------------|------------|
| Auto-detect / Automatic | Try this first - works with most ISPs |
| Native / Dynamic IP (SLAAC/DHCPv6) | ISP provides native IPv6, often with DHCPv6 prefix delegation |
| PPPoE | ISP requires PPPoE credentials for IPv6 service |
| Static IPv6 | ISP gave you fixed IPv6 settings |
| 6rd / 6in4 / 6to4 | Use only if your ISP or tunnel provider specifically requires a transition tunnel |

For most residential ISPs, start with **Auto-detect** or the router's **Automatic / Native / Dynamic IP** option.

## Step 4: Configure Prefix Delegation for LAN

Enable prefix delegation so your router receives a LAN prefix from the ISP and advertises it to home devices:

```text
WAN IPv6 Type: Use the ISP-required type from Step 3
Prefix Delegation: Enable
Requested Prefix Size: Leave automatic, or use the size your ISP documents
                       (commonly /56, /60, or /64)

LAN IPv6 Settings:
  Mode: SLAAC, or SLAAC + Stateless DHCPv6 if your router offers it
  IPv6 Address Auto-Assign: Enable
```

This lets phones, laptops, smart TVs, and IoT devices on your LAN configure global IPv6 addresses automatically.

## Step 5: Configure IPv6 DNS

Set IPv6 DNS servers. You can use your ISP's DNS or a public DNS over IPv6:

| Provider | IPv6 DNS Addresses |
|---------|-------------------|
| Google | `2001:4860:4860::8888`, `2001:4860:4860::8844` |
| Cloudflare | `2606:4700:4700::1111`, `2606:4700:4700::1001` |
| Quad9 | `2620:fe::fe`, `2620:fe::9` |

## Step 6: Save and Verify

After saving settings, verify IPv6 is working:

1. From a connected device, visit `https://test-ipv6.com`
2. Check your device has a global IPv6 address (not just fe80::):
   - Windows: `ipconfig` (look for IPv6 Address line)
   - Mac: System Settings → Network → your active connection → Details → TCP/IP
   - Android/iOS: Settings → WiFi → tap your network → IPv6 addresses

## Troubleshooting

If IPv6 still doesn't work after configuration:
- Reboot the router and modem
- Check if the ISP requires a specific DHCPv6 Client DUID
- Try changing the requested prefix size if your router exposes that option (some ISPs give /60 instead of /56)
- Contact ISP support to confirm IPv6 is provisioned on your account

## Conclusion

Enabling IPv6 on a home router typically requires selecting the ISP-required IPv6 mode in the WAN settings and enabling prefix delegation for the LAN. Once configured, all modern devices on your network automatically receive IPv6 addresses and can connect to IPv6 services.
