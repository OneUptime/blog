# How IPv6 Privacy Extensions Work on Android

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, Privacy Extensions, Android, Mobile, SLAAC, Security

Description: A guide to understanding and verifying IPv6 privacy extensions on Android devices, including address generation behavior, per-network randomization, and privacy implications of Android's IPv6...

Android has included IPv6 privacy extensions support since Android 4.0 (Ice Cream Sandwich). Modern Android (8.0+) enables temporary IPv6 addresses and uses stable-privacy SLAAC for its non-temporary global address, providing strong privacy protection without exposing the hardware MAC address in global IPv6 interface IDs.

## Android's IPv6 Privacy Implementation

Modern Android combines stable-privacy SLAAC with temporary addresses:

```text
Android 7.0 and earlier:
  - Supported IPv6 privacy extensions
  - Generated temporary addresses that rotate periodically
  - Non-temporary address generation depended more on kernel/device behavior

Android 8.0 (Oreo) and later:
  - Enables IPv6 privacy extensions on network interfaces
  - Uses RFC 7217 stable-privacy address generation for the non-temporary SLAAC address when supported
  - Prefers temporary addresses for new outbound connections
  - Reconnecting to the same Wi-Fi can recreate the temporary address, but the stable address for the same prefix can remain the same
```

## Checking IPv6 Addresses on Android

```bash
# Via ADB (Android Debug Bridge) - requires USB debugging enabled

# Connect phone via USB and enable USB debugging

adb shell ip -6 addr show

# Filter for global addresses
adb shell ip -6 addr show | grep "scope global"

# Example output:
# inet6 2001:db8:a:b:1234:5678:9abc:def0/64 scope global dynamic
#   valid_lft 2591985sec preferred_lft 604785sec

# Some devices/networks will also show a second `temporary` global address on the same interface
# No `ff:fe` pattern means the address is not modified EUI-64, but that alone does not prove it is temporary
```

## Verifying Privacy on Android

```bash
# Step 1: Note current IPv6 address
adb shell ip -6 addr show wlan0 | grep "scope global"
# Write down the address

# Step 2: Disconnect from Wi-Fi and reconnect
adb shell svc wifi disable
sleep 5
adb shell svc wifi enable
sleep 15

# Step 3: Check the new IPv6 address
adb shell ip -6 addr show wlan0 | grep "scope global"
# You may see a new temporary address after reconnecting
# The stable RFC 7217 address for the same prefix can remain the same

# Optional: compare the externally visible IPv6 address if the device shell includes `curl`
adb shell curl -6 https://ipv6.icanhazip.com
```

## Android IPv6 Configuration Per Network

```bash
# Different networks usually yield different IPv6 addresses because the advertised prefix changes
# Wi-Fi MAC randomization can also change the link-local address between networks

# Check current Wi-Fi connection
adb shell dumpsys wifi | grep -i "current network\|SSID\|ipv6"

# Check all interfaces
adb shell ip addr show | grep -A 3 -E "wlan|rmnet"

# Check routing table for IPv6
adb shell ip -6 route show
```

## Privacy Addresses in Android Apps

For Android app developers who work with IPv6:

```java
// Java: Get the active network's current IPv6 address
// Requires ACCESS_NETWORK_STATE
import android.content.Context;
import android.net.ConnectivityManager;
import android.net.LinkAddress;
import android.net.LinkProperties;
import android.net.Network;
import java.net.InetAddress;
import java.net.Inet6Address;

public static String getIPv6Address(Context context) {
    ConnectivityManager cm = context.getSystemService(ConnectivityManager.class);
    Network network = cm.getActiveNetwork();
    if (network == null) {
        return null;
    }

    LinkProperties lp = cm.getLinkProperties(network);
    if (lp == null) {
        return null;
    }

    for (LinkAddress linkAddress : lp.getLinkAddresses()) {
        InetAddress addr = linkAddress.getAddress();
        if (addr instanceof Inet6Address
                && !addr.isLoopbackAddress()
                && !addr.isLinkLocalAddress()) {
            return addr.getHostAddress();
        }
    }

    return null;
}
```

```kotlin
// Kotlin: Check if a LinkAddress is a temporary privacy address
import android.net.LinkAddress
import android.system.OsConstants

fun isTemporaryPrivacyAddress(linkAddress: LinkAddress): Boolean {
    return (linkAddress.flags and OsConstants.IFA_F_TEMPORARY) != 0
}
```

## IPv6 Privacy on Mobile Networks (LTE/5G)

```bash
# On cellular connections, IPv6 address assignment varies by carrier:
# - Android supports IPv6 operation on cellular networks
# - The network may expose a global IPv6 address on rmnet_data0 or another rmnet_data* interface
# - Prefix and address stability are carrier-specific; do not assume they change every session

# Check cellular interface
adb shell ip -6 addr show rmnet_data0

# Some devices use a different rmnet_data* interface name
# Verify the actual prefix and lifetime on the device you are testing
```

## Checking IPv6 Connectivity and Privacy

```bash
# Full IPv6 connectivity test via ADB
adb shell ping -6 -c 3 2001:4860:4860::8888

# DNS AAAA resolution plus IPv6 reachability
adb shell ping -6 -c 3 ipv6.google.com

# Check for modified EUI-64 interface IDs
# EUI-64 contains ff:fe in position 11-12 of the interface ID
adb shell ip -6 addr show | grep "ff:fe"
# No output suggests the addresses shown are not modified EUI-64,
# but that alone does not distinguish stable-privacy from temporary addresses
```

## Privacy Limitations on Android

```bash
# Known limitations:
# 1. Some Android OEMs may modify IPv6 behavior
# 2. VPN apps may use their own IPv6 assignment (potentially less private)
# 3. Address stability on cellular networks is carrier-specific

# Check if VPN is changing IPv6 behavior
adb shell ip -6 addr show tun0   # OpenVPN
adb shell ip -6 addr show wg0    # WireGuard
# VPN interface IPv6 address may be stable (assigned by VPN server)

# Enterprise or always-on VPN configurations can change the address visible to apps and services
adb shell ip -6 addr show | grep -E "scope global"
```

Android's IPv6 privacy model combines RFC 7217 stable-privacy addresses with temporary addresses. Users do not need to configure anything; privacy is enabled by default on modern Android. On a given network prefix, the stable address can remain the same while temporary addresses are recreated and rotated over time; across different networks, different prefixes help limit cross-network tracking via IPv6 addressing.
