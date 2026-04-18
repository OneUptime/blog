# How to Understand Why Some Devices Get IPv6 and Others Don't

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, SLAAC, Home Network, Troubleshooting, Device Compatibility

Description: Understand why some devices on your home network receive IPv6 addresses while others don't, and how to fix inconsistent IPv6 assignment.

## Why IPv6 Assignment is Inconsistent

When you enable IPv6 on your home router, you might notice that your laptop gets an IPv6 address, but your smart TV or older IoT device doesn't. There are several reasons this happens.

## Reason 1: Device Doesn't Support IPv6

Some older devices and cheap IoT products simply don't implement IPv6 in their network stack:

- **IPv4-only IoT devices**: Many smart home gadgets from 2015 and earlier
- **Older game consoles**: Pre-2018 firmware on some consoles
- **Legacy industrial devices**: PLCs, IP cameras from older manufacturers

These devices will work fine on IPv4 but will never receive an IPv6 address. This is expected behavior.

## Reason 2: Privacy Extensions Creating Confusion

Modern devices use privacy extensions (RFC 4941) which generate temporary, random IPv6 addresses. You might see multiple IPv6 addresses per device:

```text
fe80::1234:5678:9abc:def0   → Link-local (always present)
2001:db8:1:1::1             → SLAAC EUI-64 (from MAC address) - may not be shown
2001:db8:1:1:a1b2:c3d4:e5f6:7890  → Temporary privacy address (used for outgoing)
```

The temporary address is what's used for outbound connections, which can make it look like the device has multiple or changing IPv6 addresses.

## Reason 3: Router Advertisement Not Reaching the Device

Some devices are on isolated VLANs, behind a switch without RA forwarding, or connected to a port where RAs are blocked:

```bash
# Check if RA is reaching the device (run on the device)

# Linux:
tcpdump -i eth0 'icmp6 and ip6[40] == 134' -c 3

# Windows (requires Wireshark or pktmon):
pktmon filter add RAFilter -t ICMPv6
pktmon start --capture --file-name c:\temp\capture.etl
```

If no RAs arrive, check router RA settings and any RA Guard policies on managed switches.

## Reason 4: Device Has IPv6 Disabled

Some operating systems allow per-device IPv6 disabling:

```bash
# Check if IPv6 is disabled on Linux
cat /proc/sys/net/ipv6/conf/eth0/disable_ipv6
# 1 = disabled, 0 = enabled

# Re-enable
sysctl -w net.ipv6.conf.eth0.disable_ipv6=0

# Check on Windows
netsh interface ipv6 show interfaces
netsh interface ipv6 set interface "Ethernet" routerdiscovery=enabled
```

## Reason 5: accept_ra is Disabled

Linux devices may have Router Advertisement acceptance disabled:

```bash
# Check
sysctl net.ipv6.conf.eth0.accept_ra
# Should be 1 or 2

# Fix
sysctl -w net.ipv6.conf.eth0.accept_ra=1
sysctl -w net.ipv6.conf.eth0.autoconf=1
```

## Reason 6: Android/iOS Behavior

Mobile devices frequently change their IPv6 address (every 24-48 hours) for privacy. This is normal:

- **Android**: Uses privacy extensions by default, changes address daily
- **iOS**: Rotates MAC address per network (from iOS 14+), which changes the SLAAC-derived address

## Diagnosing Per-Device IPv6 Status

A simple script to check all devices on your LAN:

```bash
#!/bin/bash
# Scan LAN for IPv6 devices using ping6 multicast

# Ping all-nodes multicast (ff02::1) on LAN interface
ping6 -c 3 ff02::1%br-lan 2>/dev/null

# Check NDP cache to see which devices responded
echo "Devices with IPv6 on this LAN:"
ip -6 neigh show dev br-lan | grep -v "FAILED" | \
  awk '{print $1, $5}'
```

## Summary Table

| Situation | Cause | Fix |
|-----------|-------|-----|
| IoT device has no IPv6 | Device doesn't support IPv6 | Expected; use IPv4 |
| Laptop shows multiple IPv6 | Privacy extensions | Normal behavior |
| No RA on isolated VLAN | RA not forwarded | Configure RA on VLAN interface |
| Device has IPv6 disabled | sysctl or OS setting | Enable accept_ra |
| Mobile IPv6 keeps changing | Privacy/MAC randomization | Normal, expected |

## Conclusion

Mixed IPv6 support across devices is completely normal. Older IoT devices often lack IPv6, while modern devices use privacy extensions that create multiple or rotating addresses. Focus troubleshooting on devices that should support IPv6 but don't, checking RA delivery and accept_ra settings.
