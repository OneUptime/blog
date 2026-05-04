# How to Configure IPv6 on Asus Home Routers

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, Asus, Home Router, DHCPv6, SLAAC, Consumer Networking

Description: Step-by-step guide to enabling and configuring IPv6 on Asus home routers using the ASUSWRT admin interface.

## Supported Asus Routers

Most modern Asus routers running ASUSWRT support IPv6, including:
- RT-AX88U, RT-AX86U, RT-AX68U
- RT-AC88U, RT-AC86U, RT-AC68U
- ZenWiFi AX, ZenWiFi Pro

## Accessing IPv6 Settings

1. Open a browser and navigate to `http://192.168.1.1` (default Asus router IP)
2. Log in with your credentials (default: admin/admin)
3. Go to **Advanced Settings → IPv6**

## Step 1: Select Connection Type

In the IPv6 settings page, choose the connection type:

| Connection Type | Description |
|----------------|-------------|
| Native | ISP provides IPv6 via SLAAC/RA |
| DHCPv6 | ISP assigns IPv6 via DHCPv6 |
| Passthrough | Pass ISP IPv6 to a single LAN device |
| 6in4 / 6to4 | Tunnel IPv6 over IPv4 |
| FLET'S IPv6 | Japan-specific (NTT Flet's) |

For most ISPs in the US and Europe, select **Native** or **DHCPv6**.

## Step 2: WAN Settings for Native IPv6

For **Native** connection type:

```text
Connection type: Native

Auto Configuration Setting:
  Auto: enabled (router auto-detects SLAAC or DHCPv6)

DUID Type:
  DUID-LLT (default, recommended)

Prefix length: 64 (or as provided by ISP)
```

## Step 3: LAN IPv6 Settings

Configure how LAN devices receive IPv6:

```text
LAN IPv6 Address:
  Auto (derived from WAN prefix)

DHCP/SLAAC:
  Enabled

IP pool starting address: auto
DNS server: 2001:4860:4860::8888 (Google IPv6 DNS)

Enable Router Advertisement: Yes
```

For networks where some devices require specific addresses, enable DHCPv6:

```text
Enable DHCPv6 server: Yes
Stateless DHCPv6: Yes (provides DNS but not addresses - SLAAC handles addresses)
```

## Step 4: Configure IPv6 Firewall

Asus routers have an IPv6 firewall. By default, it blocks all inbound connections:

1. Go to **Firewall → IPv6 Firewall**
2. Review the default policy: "Drop all inbound from WAN to LAN"
3. To allow specific inbound access, add a rule:

```text
IPv6 Firewall Rule:
  Source IP: ::/0 (any)
  Destination IP: 2001:db8:1::/64 (your LAN prefix)
  Service: HTTPS (port 443)
  Action: Allow
```

## Step 5: Verify IPv6 on Asus Router

In the admin panel, check **Network Map → WAN** or **System Log → IPv6**:

```text
Expected WAN status:
  IPv6 Address: 2001:xxx:xxx:xxx::1 (from ISP)
  IPv6 Gateway: fe80::xxxx (ISP router link-local)
  IPv6 Prefix: 2001:xxx:xxx::/56 (delegated block)
```

From a LAN device, test connectivity:

```bash
# Windows: verify global IPv6 address

ipconfig | findstr /i "ipv6"

# Test connectivity
ping -6 ipv6.google.com
```

## Troubleshooting Asus IPv6

**IPv6 not obtained from ISP:**
- Try toggling between Native and DHCPv6 connection types
- Reboot modem and router after changing settings
- Check firmware is updated (Settings → Administration → Firmware Upgrade)

**Devices don't get IPv6 addresses:**
- Ensure Router Advertisement is enabled in LAN settings
- Verify the correct prefix length is set

## Using Merlin Firmware for Advanced IPv6

For advanced control, install ASUSWRT-Merlin firmware which adds:
- DHCPv6-PD size configuration
- Custom DUID settings
- Enhanced IPv6 firewall rules

## Conclusion

Configuring IPv6 on Asus routers is straightforward through the ASUSWRT interface. Select Native or DHCPv6 based on your ISP's provisioning method, enable Router Advertisements for LAN devices, and verify the firewall policy matches your security requirements.
