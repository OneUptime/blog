# How to Configure IPv6 on Netgear Home Routers

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, Netgear, Home Router, DHCPv6, Consumer Networking, Nighthawk

Description: Configure IPv6 on Netgear Nighthawk and Orbi routers through the web admin interface and Netgear mobile app.

## Supported Netgear Routers

IPv6 is supported on modern Netgear routers:
- Nighthawk AX12, AX8, RAX200
- Nighthawk AC1900, AC2300, AC3200
- Orbi RBK852, RBK753, RBK50

## Accessing Router Admin

Navigate to `http://192.168.1.1` or `http://routerlogin.net`. The default admin username is `admin` and the password is `password` (change this if you haven't).

## Step 1: Find IPv6 Settings

1. Log in to the router admin panel
2. Click **Advanced** at the top
3. Select **Advanced Setup** → **IPv6**

## Step 2: Choose Connection Type

Netgear offers these IPv6 connection modes:

| Mode | Description |
|------|-------------|
| None | Disable IPv6 |
| Auto Detect | Automatically choose connection method |
| Auto Config | Use RA/SLAAC from upstream |
| 6to4 Tunnel | Legacy tunnel |
| Fixed | Static IPv6 address from ISP |
| DHCP | Dynamic address via DHCPv6 |
| PPP | PPPoEv6 for DSL connections |
| Pass Through | Bridge mode |

For most users: try **Auto Detect** first.

## Step 3: Auto Detect Configuration

When Auto Detect is selected, Netgear probes for SLAAC and DHCPv6 automatically:

```text
IPv6 Connection Type: Auto Detect

If connection succeeds, you'll see:
  Connection Status: Connected
  IPv6 Address: 2001:xxxx:xxxx:xxxx::1/64
  Default IPv6 Gateway: fe80::xxxx
  IPv6 Domain Name Server: 2001:xxxx::1
```

## Step 4: DHCP IPv6 Configuration

If Auto Detect fails, configure DHCP explicitly:

```text
IPv6 Connection Type: DHCP

Router's IPv6 Address:
  ☑ Get IPv6 Address Automatically

Domain Name Server (DNS) Address:
  ☑ Get Automatically From ISP

Prefix Delegation (PD):
  ☑ Enable IPv6 Prefix Delegation
  Prefix Length: 56 or 60 (ask ISP)
```

## Step 5: LAN IPv6 Configuration

Under the **LAN Setup** section in IPv6 settings:

```text
LAN IPv6 Address Mode:
  ☑ Enable IPv6 LAN
  Address Mode: Auto (derived from WAN prefix)

IPv6 Address for this Router:
  (auto-filled from delegated prefix)

IPv6 RDNSS:
  DNS Server 1: 2001:4860:4860::8888
  DNS Server 2: 2606:4700:4700::1111

☑ Enable Router Advertisement
```

## Netgear Orbi IPv6 Configuration

For Orbi mesh systems, IPv6 is configured from the main Orbi router (not satellites):

1. Log into `orbilogin.net`
2. Go to **Advanced** → **Advanced Setup** → **IPv6**
3. Follow the same steps as above

Orbi satellites automatically receive IPv6 configuration from the main node.

## Step 6: Verify IPv6 Operation

From the Netgear admin panel, check **Advanced → Administration → Router Status**:

```text
IPv6 Status:
  WAN IPv6 Address: (global address if ISP supports IPv6)
  Default IPv6 Gateway: fe80::xxxx

LAN IPv6 Address: 2001:xxxx::/64
```

From a LAN device, test:

```powershell
# Windows: check IPv6 address

ipconfig | findstr /i "IPv6"

# Ping test
ping -6 ipv6.google.com -n 4
```

## Firmware Updates

Ensure your Netgear router has the latest firmware - IPv6 support and stability improves significantly in newer releases:

1. Admin panel → Advanced → Administration → Firmware Update
2. Click Check for Updates

## Troubleshooting

- If **Auto Detect** shows "Not Connected", try **DHCP** mode explicitly
- Ensure the WAN modem is in bridge mode if ISP-provided
- Try releasing and renewing: Advanced → Advanced Setup → IPv6 → **Release/Renew**

## Conclusion

Netgear routers support IPv6 configuration through a straightforward interface. Auto Detect handles most ISP configurations automatically. When manually configured with DHCP and Prefix Delegation enabled, Netgear routers distribute IPv6 addresses to all LAN devices via Router Advertisements.
