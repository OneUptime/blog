# How to Fix 'Failed to Obtain IP Address' on Android WiFi

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Android, WiFi, DHCP, IP Address, Troubleshooting, Mobile

Description: Learn how to fix the 'Failed to obtain IP address' error on Android WiFi by troubleshooting DHCP issues, router configuration, and Android network settings.

## What Causes "Failed to Obtain IP Address"?

Android shows this error when it cannot complete the DHCP process after connecting to a WiFi network. Common causes:
- DHCP server pool exhausted
- Router ACLs or filtering blocking DHCP traffic
- Incorrect security settings causing reconnect loops before DHCP completes
- Android's DHCP client failing to get a response
- MAC address filtering blocking the device
- IP address conflict

## Step 1: Basic Fixes on Android

**Forget and Reconnect:**
1. Settings → WiFi → Long-press the network
2. Forget network
3. Reconnect and enter the password carefully

**Toggle WiFi:**
```text
Settings → WiFi → Toggle OFF (10 seconds) → Toggle ON
```

**Airplane Mode Toggle:**
```text
Settings → Enable Airplane Mode (5 seconds) → Disable
```

## Step 2: Set a Static IP on Android

If DHCP consistently fails, temporarily set a static IP to confirm the issue is DHCP-related:

1. Settings → WiFi → Long-press the network → Modify Network
2. Show advanced options
3. IP settings: Change **DHCP** to **Static**
4. Enter:
   - **IP address**: 192.168.1.150 (unused address)
   - **Gateway**: 192.168.1.1 (your router IP)
   - **Network prefix length**: 24
   - **DNS 1**: 8.8.8.8
   - **DNS 2**: 8.8.4.4
5. Save

## Step 3: Check Router-Side DHCP Settings

On the router:
```text
# Log into router (usually 192.168.1.1 or 192.168.0.1)

# Check DHCP settings:
# - Pool range: should have available addresses
# - Max clients: should not be exceeded
# - MAC filtering: Android device MAC should not be blocked
```

**Check DHCP pool capacity:**
```bash
# On a Linux-based router that uses dnsmasq
cat /var/lib/misc/dnsmasq.leases | wc -l    # Current leases (lease file path varies by distro)
grep "^dhcp-range" /etc/dnsmasq.conf        # Configured pool range

# Example dnsmasq range if the pool is exhausted:
dhcp-range=192.168.1.50,192.168.1.250,12h
```

## Step 4: Check Android MAC Randomization

Android 10+ uses randomized MAC addresses by default for WiFi connections, which can cause issues:
- Router may block unknown MACs
- DHCP reservations won't work

```text
Settings → WiFi → Select network → Privacy
Change from "Use randomized MAC" to "Use device MAC"
```

On Android 9:
```text
Connected-network MAC randomization was an optional Developer setting and is usually OFF by default
```

## Step 5: Clear Android Network Settings

```text
Settings → System / General Management → Reset options → Reset WiFi, mobile & Bluetooth
```

This resets all WiFi, Bluetooth, and mobile network settings. You'll need to reconnect to all WiFi networks.

## Step 6: Check Android DNS Settings

DNS settings do not cause the initial "Failed to obtain IP address" error, but if you switch the network to Static IP in Step 2, you must enter valid DNS servers:

1. Settings → WiFi → Long-press network → Modify
2. Show advanced
3. If **IP settings** is **Static**, enter DNS 1: 8.8.8.8, DNS 2: 1.1.1.1

Or, if WiFi connects but websites still do not resolve, check Private DNS:
```text
Settings → Network & Internet → Private DNS
Enter: dns.google
```

## Step 7: Router Debugging

On the router, capture DHCP traffic while Android is connecting:

```bash
# On Linux-based router
sudo tcpdump -n -i any 'port 67 or port 68'

# Look for:
# DHCPDISCOVER from Android MAC
# DHCPOFFER from router
# DHCPREQUEST from Android
# DHCPACK from router

# If DISCOVER appears but no OFFER: DHCP server/service is not responding
# If OFFER appears but no REQUEST: the client did not accept or receive the offer
# If REQUEST appears but no ACK: the server did not complete the lease
```

## Conclusion

"Failed to obtain IP address" on Android is commonly resolved by reconnecting, checking the router's DHCP pool, or temporarily using a static IP to confirm that DHCP is the failing step. Check for MAC randomization (Android 10+) that may be triggering MAC-based filtering on the router. If a static IP works but DHCP fails, the router's DHCP service has an issue - capture packets with `tcpdump -n -i any 'port 67 or port 68'` on the router to identify where the DORA sequence breaks down.
