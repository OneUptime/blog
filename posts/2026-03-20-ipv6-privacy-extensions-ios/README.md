# How IPv6 Privacy Extensions Work on iOS

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, Privacy Extensions, IOS, IPhone, IPad, Apple, Security

Description: A guide to understanding IPv6 privacy extensions on iOS and iPadOS, including Apple's Private Wi-Fi Address feature, how it relates to IPv6 privacy, and how developers should handle IPv6 addresses...

iOS implements IPv6 privacy through several complementary mechanisms. Apple states that IPv6 addresses are generated in a way that helps prevent tracking devices across networks, that temporary addresses are used by default for new connections, and that Private Wi-Fi Address randomizes the Wi-Fi MAC address per network. Together, these significantly reduce address-based tracking on iOS and iPadOS.

## Apple's IPv6 Privacy Approach

```text
iOS 14+ IPv6 Privacy Stack:
├── Private Wi-Fi Address (MAC randomization)
│   - Different MAC per Wi-Fi network
│   - Enabled by default since iOS 14
│   - Off / Fixed / Rotating options on iOS 18+
│
└── IPv6 address generation
    - Designed to help prevent tracking across networks
    - Temporary addresses are used by default for new connections
    - Temporary addresses have a preferred lifetime of 24 hours
    - Wi-Fi link-local addresses are unique per network on iOS 14+
```

## Checking IPv6 Address on iOS

Without direct terminal access, checking your IPv6 address on iOS requires:

**Via Settings:**
1. Settings > Wi-Fi > tap the `ⓘ` icon next to your network
2. Scroll down to the "IPv6 Address" section
3. You may see the current IPv6 address and router information for that network

**Via third-party apps:**
```text
Some network utility apps can show interface and address details,
including IPv6 addresses used on the current network
```

**Via a website:**
```text
Visit https://test-ipv6.com or https://ipv6.icanhazip.com in Safari
These sites can show the public IPv6 address used for that web request
```

## Private Wi-Fi Address and IPv6

```bash
# Private Wi-Fi Address randomizes the Wi-Fi MAC per network,
# but iOS does not rely on exposing a hardware-derived EUI-64 IID.

# Apple says:
# 1. IPv6 addresses are generated to help prevent tracking across networks
# 2. Temporary addresses are used by default for new connections
# 3. Temporary addresses have a preferred lifetime of 24 hours
# 4. On iOS 14+, the Wi-Fi link-local address is unique per network
#    and incorporates the network's SSID into address generation

# Private Wi-Fi Address and IPv6 privacy are related,
# but they are not the same mechanism:
# - Private Wi-Fi Address changes the Wi-Fi MAC identity per network
# - IPv6 temporary and stable addresses are generated separately by the OS

# The result: less cross-network correlation from both Wi-Fi MAC
# addresses and IPv6 addresses
```

## Disabling/Enabling Private Address per Network

**Settings > Wi-Fi > [Network Name] > Private Wi-Fi Address**

```text
Rotating: Uses a private MAC address that rotates every 2 weeks
Fixed: Uses a private MAC address that stays consistent for this network
Off: Uses the device's hardware MAC address
```

When Private Wi-Fi Address is OFF, iOS uses the device's hardware MAC address on that Wi-Fi network. But current Apple documentation does not describe modern iOS as deriving its global IPv6 addresses directly from the MAC address. Private Wi-Fi Address improves Wi-Fi-layer privacy, while iOS's IPv6 address generation separately helps prevent address-based tracking.

## iOS for Developers: Handling IPv6

Apple requires all iOS apps to support IPv6:

```swift
import Foundation

// Swift: Don't hardcode IPv4 addresses in iOS apps
// Apple's App Store review tests apps on IPv6-only networks

// BAD: Hardcoded IPv4 address
let badServerURL = URL(string: "http://192.168.1.100/api")!

// GOOD: Use hostnames (DNS handles IPv4/IPv6 transparently)
let goodServerURL = URL(string: "https://api.example.com/")!

// GOOD: Use URLSession and connect by name
let session = URLSession.shared
let task = session.dataTask(with: goodServerURL) { data, response, error in
    // URLSession and CFNetwork already support IPv6 for hostname-based requests.
}
task.resume()
```

```swift
// Swift: Getting the device's IPv6 addresses programmatically
import Darwin
import Foundation

func getIPv6Addresses() -> [String] {
    var addresses: [String] = []
    var ifaddr: UnsafeMutablePointer<ifaddrs>?

    guard getifaddrs(&ifaddr) == 0 else { return addresses }
    defer { freeifaddrs(ifaddr) }

    var ptr = ifaddr
    while ptr != nil {
        guard let addr = ptr?.pointee.ifa_addr else {
            ptr = ptr?.pointee.ifa_next
            continue
        }

        if addr.pointee.sa_family == sa_family_t(AF_INET6) {
            var hostname = [CChar](repeating: 0, count: Int(NI_MAXHOST))
            if getnameinfo(addr, socklen_t(addr.pointee.sa_len),
                          &hostname, socklen_t(hostname.count),
                          nil, 0, NI_NUMERICHOST) == 0 {
                let address = String(cString: hostname)
                // Filter out link-local addresses
                if !address.hasPrefix("fe80") {
                    addresses.append(address)
                }
            }
        }
        ptr = ptr!.pointee.ifa_next
    }
    return addresses
}
```

## IPv6-Only Network Compatibility (Required for App Store)

```swift
// Apple requires apps to work on IPv6-only networks (since 2016)

// Check network connectivity (works for both IPv4 and IPv6)
import Network

let monitor = NWPathMonitor()
monitor.pathUpdateHandler = { path in
    if path.status == .satisfied {
        if path.supportsIPv6 {
            print("IPv6 is available")
        }
        if path.usesInterfaceType(.wifi) {
            print("Connected via Wi-Fi")
        }
    }
}
let queue = DispatchQueue(label: "NetworkMonitor")
monitor.start(queue: queue)
```

## Verifying IPv6-Only App Compatibility

```bash
# Apple recommends testing on an IPv6-only DNS64/NAT64 network
# created with Internet Sharing on a Mac.
#
# Use Internet Sharing and enable the "Create NAT64 Network" option,
# then connect the iPhone or iPad to that Wi-Fi network for testing.
# If the test device has cellular service, turn it off so the test runs
# strictly over the IPv6-only Wi-Fi network.

# Test your app connects correctly on the IPv6-only network
# If it fails, check for hardcoded IPv4 addresses or
# direct socket calls that don't use getaddrinfo()
```

iOS provides strong IPv6 privacy through Private Wi-Fi Address and privacy-oriented IPv6 address generation, which helps reduce tracking across networks. App developers must ensure their apps work on IPv6-only networks (an App Store requirement), using hostname-based connections and URLSession rather than hardcoded IP addresses.
