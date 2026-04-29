# Validation Summary: How IPv6 Privacy Extensions Work on Android

## Status
validated

## Post Type
Guide

## Technologies Covered
- Android
- IPv6
- SLAAC
- RFC 7217 stable privacy addressing
- RFC 4941 / RFC 8981 temporary addresses
- ADB
- Java
- Kotlin

## Sources Consulted
- Android AOSP `InterfaceController.cpp` (`setIPv6AddrGenMode`, `setIPv6PrivacyExtensions`): https://android.googlesource.com/platform/system/netd/+/android-9.0.0_r33/server/InterfaceController.cpp
- Android AOSP NetworkStack `InterfaceController.java` (`setIPv6PrivacyExtensions`, `setIPv6AddrGenModeIfSupported`): https://android.googlesource.com/platform/packages/modules/NetworkStack/+/a986ec7e809d7dcdbcc48062d4dee1701c6f2d7f/common/moduleutils/src/android/net/ip/InterfaceController.java
- Android AOSP `IpClient` defaulting to stable privacy and enabling privacy extensions: https://android.googlesource.com/platform/frameworks/base/+/fe530062ff99ffa61061fd2d66da0c41649df3c9/services/net/java/android/net/ip/IpClient.java
- Android AOSP Wi-Fi commit documenting RFC 7217 stable privacy versus EUI-64 link-local behavior with MAC randomization: https://android.googlesource.com/platform/frameworks/opt/net/wifi/+/9ce03caaec5f1612a4798ca48f9556c8198066f2
- Android Developers `LinkAddress` reference (`getFlags()`): https://developer.android.com/reference/android/net/LinkAddress
- Android Developers `OsConstants` reference (`IFA_F_TEMPORARY`): https://developer.android.com/reference/android/system/OsConstants
- Android Developers `ConnectivityManager#getLinkProperties`: https://developer.android.com/reference/android/net/ConnectivityManager#getLinkProperties(android.net.Network)
- Android Developers `Read network state`: https://developer.android.com/develop/connectivity/network-ops/reading-network-state
- Android AOSP `svc` shell command (`svc wifi [enable|disable]`): https://android.googlesource.com/platform//frameworks/base/+/refs/heads/android12-qpr3-s2-release/cmds/svc/svc
- Android AOSP shell utilities list (shows `ping`, `ping6`, `ifconfig`, and absence of stock `curl`/`nslookup`): https://android.googlesource.com/platform/system/core/+/master/shell_and_utilities/README.md
- Android AOSP `iproute2` commit using `ip -6 addr show dev wlan0` in tests: https://android.googlesource.com/platform/external/iproute2/+/7df19cae857bc1dc495f172ed0e9fa6faae16cb9
- RFC 7217: https://www.rfc-editor.org/rfc/rfc7217
- RFC 4941: https://www.rfc-editor.org/rfc/rfc4941
- RFC 8981: https://www.rfc-editor.org/rfc/rfc8981

## Issues Found
- The post’s main claim said Android 8.0+ generates a brand-new random interface ID on every connection. I corrected this to Android’s actual model: stable-privacy SLAAC for the non-temporary address plus temporary addresses for outbound privacy.
- The implementation section described Android as “stricter than RFC 8981” and implied no persistent address exists across reconnects. I changed that to reflect RFC 7217 stable addresses coexisting with temporary addresses, and noted that reconnecting can recreate the temporary address while the stable address for the same prefix can remain the same.
- The address-inspection sections treated absence of `ff:fe` as proof of a privacy address. I corrected that because non-EUI-64 addresses can be either stable-privacy or temporary.
- The per-network section said each Wi-Fi SSID gets a different random interface ID. I corrected this to the technically accurate behavior: different networks usually produce different addresses because the advertised IPv6 prefix changes, and Wi-Fi MAC randomization can affect link-local addresses.
- The Android app code used `NetworkInterface` scanning and a byte-pattern heuristic that would not reliably identify the active network’s current IPv6 address or distinguish temporary addresses. I replaced it with a `ConnectivityManager`/`LinkProperties` example and a correct `IFA_F_TEMPORARY` flag check using `LinkAddress`.
- The mobile-network section claimed many carriers use DHCPv6 Prefix Delegation and that the /64 changes every session. I removed those unsupported assumptions and replaced them with carrier-specific guidance.
- The connectivity section used `nslookup` and implied `ping6` could verify Happy Eyeballs behavior. I replaced that with portable stock-Android `ping -6` checks and removed the incorrect Happy Eyeballs claim.
- The `curl` example was left in place but marked optional because stock Android shells do not generally ship with `curl`.

## Review Notes
- The post is now technically accurate, but actual address presentation still varies by Android release, kernel support, OEM customization, and carrier behavior.
- On modern Android, the stable RFC 7217 address and the temporary address can both appear on the same interface at the same time.
- Verifying the externally visible IPv6 address from ADB is device-dependent unless extra shell tools such as `curl` are installed.
