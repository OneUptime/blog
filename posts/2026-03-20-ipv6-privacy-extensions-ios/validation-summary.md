# Validation Summary: How IPv6 Privacy Extensions Work on iOS

## Status
validated

## Post Type
Guide

## Technologies Covered
- IPv6
- iOS and iPadOS networking
- Apple Private Wi-Fi Address
- Swift
- URLSession and CFNetwork
- Network framework (`NWPathMonitor`)
- DNS64/NAT64
- RFC 3972
- RFC 7217
- RFC 8981

## Sources Consulted
- Apple Platform Security, "IPv6 security": https://support.apple.com/en-euro/guide/security/seccb625dcd9/web
- Apple Support, "Use private Wi-Fi addresses on Apple devices": https://support.apple.com/en-us/102509
- Apple Support, "Use a private network address on iPhone": https://support.apple.com/guide/iphone/use-a-private-network-address-iph6b324bb33/ios
- Apple Developer Support, "Supporting IPv6-only Networks": https://developer.apple.com/support/ipv6/
- Apple Networking Overview, "Supporting IPv6 DNS64/NAT64 Networks": https://developer.apple.com/library/archive/documentation/NetworkingInternetWeb/Conceptual/NetworkingOverview/UnderstandingandPreparingfortheIPv6Transition/UnderstandingandPreparingfortheIPv6Transition.html
- Apple Developer Documentation, `NWPath`: https://developer.apple.com/documentation/network/nwpath
- Apple iOS manual page, `getifaddrs(3)`: https://developer.apple.com/library/archive/documentation/System/Conceptual/ManPages_iPhoneOS/man3/getifaddrs.3.html
- Apple iOS manual page, `getnameinfo(3)`: https://developer.apple.com/library/archive/documentation/System/Conceptual/ManPages_iPhoneOS/man3/getnameinfo.3.html
- RFC 3972, "Cryptographically Generated Addresses (CGA)": https://www.rfc-editor.org/rfc/rfc3972
- RFC 7217, "A Method for Generating Semantically Opaque Interface Identifiers with IPv6 Stateless Address Autoconfiguration (SLAAC)": https://www.rfc-editor.org/rfc/rfc7217
- RFC 8981, "Temporary Address Extensions for Stateless Address Autoconfiguration in IPv6": https://www.rfc-editor.org/rfc/rfc8981

## Issues Found

1. **Overstated and partly incorrect IPv6 privacy model**: The post said iOS implements IPv6 privacy as RFC 8981 temporary addresses plus Private Wi-Fi Address, and that Private Wi-Fi Address prevents EUI-64 derivation entirely. Apple’s current security documentation instead describes iOS IPv6 address generation as privacy-oriented, based on cryptographically generated addresses, with temporary addresses used by default for new connections and unique Wi-Fi link-local addresses per network. I rewrote the overview and diagram to match Apple’s documented behavior.

2. **Incorrect EUI-64 explanation**: The post claimed iOS generates IPv6 addresses from the randomized MAC via EUI-64 and that disabling Private Wi-Fi Address may expose the real MAC in the IPv6 address. Apple’s documentation for modern iOS does not describe global IPv6 addresses this way. I replaced that explanation with a separation between Wi-Fi MAC randomization and the OS’s IPv6 address-generation behavior.

3. **Overly absolute tracking claim**: The post concluded that iOS makes it impossible to track devices across networks using IPv6 addresses. That is too strong. Apple and the RFCs describe these mechanisms as reducing or helping prevent tracking, not making it impossible. I softened the wording accordingly.

4. **Inaccurate NAT64 testing instructions**: The post directed readers to Xcode Devices and Simulators and implied generic IPv6-only Internet Sharing setup. Apple’s documented workflow is to create a DNS64/NAT64 test network on a Mac using Internet Sharing with the "Create NAT64 Network" option, and to disable cellular on the test device. I corrected that section.

5. **Swift sample redeclared `serverURL` in the same scope**: The networking example as written would not compile if copied directly because `serverURL` was declared twice. I renamed the examples to `badServerURL` and `goodServerURL` and updated the explanation to match Apple’s hostname-based IPv6 guidance.

6. **Unverified/too-specific address-inspection claims**: The post said Settings should show multiple IPv6 addresses and named specific third-party apps. I changed this to more conservative wording that matches typical iOS behavior without asserting UI details Apple does not document in the referenced sources.

7. **Website-address explanation was too specific**: The post said external sites would show the device’s current temporary IPv6 address. In practice, those sites show the public IPv6 address used for that specific request. I corrected that wording.

## Review Notes
- Apple documents the privacy properties and algorithms used by its platforms, but it does not explicitly say that iOS implements RFC 8981 verbatim. The revised post therefore describes Apple’s documented behavior directly instead of asserting an exact RFC implementation.
- `NWPath.supportsIPv6` indicates whether the current path can route IPv6 traffic; it is useful for observation, but it is not a substitute for end-to-end IPv6/DNS64/NAT64 testing.
- Apple notes that a Mac-based DNS64/NAT64 test network is useful but not identical to native IPv6 service-provider networks, because the local test setup always synthesizes IPv6 addresses. Readers should still verify that servers really work over native IPv6.
