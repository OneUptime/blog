# How to Disable IPv6 on macOS via System Settings

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, macOS, System Settings, Network Configuration, Disable IPv6

Description: Step-by-step guide to disabling IPv6 on macOS using the System Settings GUI for both Wi-Fi and Ethernet connections.

## Set IPv6 to Link-local Only via System Settings (macOS Ventura/Sonoma)

```sql
Steps:
1. Click Apple menu (top-left) → System Settings

2. In the left sidebar, click "Network"

3. Select your active connection:
   - Click "Wi-Fi" and click "Details"
   - Or click "Ethernet" and click "Details"

4. Click the "TCP/IP" tab

5. Find "Configure IPv6" dropdown

6. Change from "Automatically" to:
   - "Link-local only" - Limits IPv6 traffic to the local network

7. Click "OK"
```

## Set IPv6 to Link-local Only via System Preferences (macOS Monterey and earlier)

```sql
Steps:
1. Apple menu → System Preferences

2. Click "Network"

3. Select the network interface from the left list
   (Wi-Fi or Ethernet)

4. Click "Advanced..." button (bottom right)

5. Click "TCP/IP" tab

6. "Configure IPv6" → select "Link-local only"

7. Click "OK"

8. Click "Apply" in the Network preferences window
```

## Apply on Multiple Interfaces

```text
For dual-stack machines, repeat the setting on all relevant network services:

1. Repeat the steps above for:
   - Wi-Fi
   - Ethernet (if connected)
   - Thunderbolt Bridge (if present)
   - Any other network services that expose TCP/IP settings

Note: Each network service has its own IPv6 setting
```

## Verify IPv6 is Link-local Only

After changing the setting via GUI, verify using Terminal:

```bash
# Find the correct interface name for the network service you changed
networksetup -listallhardwareports

# Check IPv6 addresses on that interface (replace en0 with your interface name)
ifconfig en0 | grep inet6

# With "Link-local only", you should only see link-local addresses, for example:
# inet6 fe80::1234:5678%en0 prefixlen 64 scopeid 0x4

# Global IPv6 addresses should no longer appear

# Optional: test that a global IPv6 route is unavailable
ping6 -c 3 2001:4860:4860::8888
# This should fail with a routing error, such as "No route to host"
```

## Restore Automatic IPv6 Configuration

```sql
Steps:
1. System Settings → Network → Details → TCP/IP

2. Configure IPv6 → select "Automatically"

3. Click OK

IPv6 is set back to automatic configuration and may acquire addresses via SLAAC or DHCPv6, depending on the network
```

## Summary

Set IPv6 to **Link-local only** on macOS via **System Settings → Network → [Interface] Details → TCP/IP → Configure IPv6 → Link-local only**. This is the GUI option that limits IPv6 traffic to the local network. For Monterey and earlier, the path is **System Preferences → Network → Advanced → TCP/IP**. To re-enable automatic IPv6 configuration, select **Automatically**. Verify by finding the correct interface with `networksetup -listallhardwareports`, then checking `ifconfig` output for only `fe80::` addresses.
