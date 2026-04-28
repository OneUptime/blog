# How to Set Up NAT with pfSense

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Networking, NAT, pfSense, Firewall, IPv4

Description: Learn how to configure outbound NAT, port forwarding, and 1:1 NAT on pfSense using the web interface.

## pfSense NAT Overview

pfSense handles NAT under **Firewall → NAT** with three types:

| NAT Type | Use Case |
|----------|---------|
| Port Forward | DNAT - inbound port forwarding |
| 1:1 NAT | Static bidirectional IP mapping |
| Outbound NAT | SNAT - internal hosts reach internet |

## Outbound NAT (Masquerade / Source NAT)

pfSense enables automatic outbound NAT by default:

1. Go to **Firewall → NAT → Outbound**
2. The default mode is **Automatic outbound NAT**
3. All LAN traffic is masqueraded through the WAN interface

### Manual Outbound NAT

For more control, switch to **Manual Outbound NAT**:

1. **Firewall → NAT → Outbound → Manual Outbound NAT**
2. Click **Add** to create a mapping
3. Configure:
   - Interface: WAN
   - Protocol: any
   - Source: 192.168.1.0/24
   - Translation: Interface Address (dynamic masquerade)

### Outbound NAT via XML Config

```xml
<nat>
  <outbound>
    <mode>automatic</mode>
    <rule>
      <interface>wan</interface>
      <source><network>192.168.1.0/24</network></source>
      <target>interface-address</target>
    </rule>
  </outbound>
</nat>
```

## Port Forwarding (DNAT)

1. Go to **Firewall → NAT → Port Forward**
2. Click **Add**
3. Configure:
   - Interface: WAN
   - Protocol: TCP
   - Destination: WAN address
   - Destination Port Range: 80 (HTTP)
   - Redirect Target IP: 192.168.1.10
   - Redirect Target Port: 80
4. Check **Add associated filter rule** to auto-create a firewall rule
5. Click **Save** and **Apply Changes**

### pfSense Port Forward via Config

```bash
# Edit config via SSH on pfSense

# File: /cf/conf/config.xml
# Or use pfSense API packages
```

## 1:1 NAT (Static Bidirectional)

1. Go to **Firewall → NAT → 1:1**
2. Click **Add**
3. Configure:
   - Interface: WAN
   - External IP: 203.0.113.10
   - Internal IP: 192.168.1.10
4. Save and Apply

### Outbound NAT Exception for 1:1

When using 1:1 NAT, you need to exclude the host from outbound NAT:

1. **Firewall → NAT → Outbound**
2. Add a "no NAT" rule above the masquerade rule for the specific internal IP

## Verifying NAT on pfSense

- **Diagnostics → States** - view active connection state table
- **Status → System Logs → Firewall** - see blocked or passed connections
- **Diagnostics → Packet Capture** - capture traffic on any interface

### pfSense States Table

Under **Diagnostics → States**, filter by IP to see NAT translations:

```text
Proto  Source (translated)                       Destination       State
TCP    203.0.113.1:54321 (192.168.1.10:54321) →  8.8.8.8:80        ESTABLISHED
```

## Common pfSense NAT Issues

| Problem | Fix |
|---------|-----|
| Port forward not working | Ensure associated firewall rule is created |
| Traffic not reaching internet | Check Outbound NAT mode; verify WAN is up |
| 1:1 NAT not working | Add exception in Outbound NAT for that IP |
| Hairpin NAT issues | Enable NAT Reflection under System → Advanced |

## Key Takeaways

- pfSense's automatic outbound NAT handles most home/office setups without manual config.
- Port forwards require both a NAT rule and an associated firewall rule.
- 1:1 NAT provides static bidirectional mapping with outbound NAT exceptions.
- Use **Diagnostics → States** to verify active NAT translations.

**Related Reading:**

- [How to Configure Hairpin NAT for Internal Access to Public Services](https://oneuptime.com/blog/post/2026-03-20-hairpin-nat-internal-access/view)
- [How to Configure Source NAT (SNAT) on Linux](https://oneuptime.com/blog/post/2026-03-20-configure-snat-linux/view)
