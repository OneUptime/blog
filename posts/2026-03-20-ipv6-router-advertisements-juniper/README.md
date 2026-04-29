# How to Configure IPv6 Router Advertisements on Juniper

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, Juniper, Junos, Router Advertisement, SLAAC, Networking

Description: Configure IPv6 Router Advertisements on Juniper Junos routers to enable SLAAC and deliver prefix and DNS information to network clients.

## Introduction

Juniper Junos handles IPv6 Router Advertisements through the `protocols router-advertisement` stanza. Unlike Cisco where RA is configured under the interface, Juniper separates the RA configuration into its own protocol section, providing a clean separation between interface addressing and RA behavior.

## Prerequisites

- Juniper device running a Junos release that supports the options you plan to use (`dns-server-address` was introduced in Junos 14.1)
- IPv6 forwarding enabled (default on most Junos platforms)
- Interface with IPv6 address configured

## Basic Router Advertisement Configuration

```text
# Enable IPv6 Router Advertisements on ge-0/0/1 (LAN interface)

set interfaces ge-0/0/1 unit 0 family inet6 address 2001:db8:1:1::1/64

set protocols router-advertisement interface ge-0/0/1.0 prefix 2001:db8:1:1::/64

# Set advertisement interval (in seconds)

set protocols router-advertisement interface ge-0/0/1.0 max-advertisement-interval 100
set protocols router-advertisement interface ge-0/0/1.0 min-advertisement-interval 30

# Router lifetime (how long this router is considered a valid default gateway)
set protocols router-advertisement interface ge-0/0/1.0 default-lifetime 1800
```

## Configuring Prefix Options

```text
# Configure prefix with custom lifetimes
set protocols router-advertisement interface ge-0/0/1.0 prefix 2001:db8:1:1::/64 valid-lifetime 86400
set protocols router-advertisement interface ge-0/0/1.0 prefix 2001:db8:1:1::/64 preferred-lifetime 14400

# Disable SLAAC for this prefix (pair this with the M flag and DHCPv6 if you want stateful IPv6 addresses)
set protocols router-advertisement interface ge-0/0/1.0 prefix 2001:db8:1:1::/64 no-autonomous

# Explicitly advertise the prefix as on-link
set protocols router-advertisement interface ge-0/0/1.0 prefix 2001:db8:1:1::/64 on-link
```

## Setting M and O Flags

```text
# M flag (managed) = 1: clients should use DHCPv6 for addresses
set protocols router-advertisement interface ge-0/0/1.0 managed-configuration

# O flag (other) = 1: clients should use DHCPv6 for DNS and other config
set protocols router-advertisement interface ge-0/0/1.0 other-stateful-configuration
```

## Configuring RDNSS (DNS via RA)

Junos supports RA-based DNS options (RDNSS/DNSSL) on releases that include the `dns-server-address` and `dns-search-list` statements:

```text
# Advertise DNS server via Router Advertisement
set protocols router-advertisement interface ge-0/0/1.0 dns-server-address 2001:db8:1:1::53

# If your Junos release supports DNSSL, you can also advertise a search list
# set protocols router-advertisement interface ge-0/0/1.0 dns-search-list corp.example.com lifetime 1800
```

## Full Configuration in Stanza Format

```text
protocols {
    router-advertisement {
        interface ge-0/0/1.0 {
            max-advertisement-interval 100;
            min-advertisement-interval 30;
            default-lifetime 1800;
            prefix 2001:db8:1:1::/64 {
                valid-lifetime 86400;
                preferred-lifetime 14400;
                on-link;
            }
            dns-server-address 2001:db8:1:1::53;
        }
    }
}
```

## Suppressing RA on Specific Interfaces

```text
# Junos sends RAs only on interfaces configured under protocols router-advertisement.
# To stop advertising on the WAN/uplink interface, remove its RA stanza:
delete protocols router-advertisement interface ge-0/0/0.0
```

## Verifying Router Advertisement Configuration

```text
# Show RA configuration
show configuration protocols router-advertisement

# Show RA interface status and statistics
show ipv6 router-advertisement

# Show router advertisement information for a specific interface
show ipv6 router-advertisement interface ge-0/0/1.0

# Verify IPv6 neighbors on the link
show ipv6 neighbors
```

Sample output of `show ipv6 router-advertisement`:

```text
Interface: ge-0/0/1.0
  Advertisements sent: 37, last sent 00:01:41 ago
  Solicits received: 0
  Advertisements received: 38
  Advertisement from fe80::200:5eff:fe00:53, heard 00:05:46 ago
    Managed: 0
    Other configuration: 0
    Reachable time: 0 ms
    Default lifetime: 1800 sec
    Retransmit timer: 0 ms
    Current hop limit: 64
    RDNSS address: 2001:db8:1:1::53
    Lifetime: 1800 sec
    Prefix: 2001:db8:1:1::/64
    Valid lifetime: 86400 sec
    Preferred lifetime: 14400 sec
    On link: 1
    Autonomous: 1
```

## Conclusion

Juniper Junos provides clean, hierarchical Router Advertisement configuration through the `protocols router-advertisement` stanza. The separation from interface configuration makes it easy to manage RA policies independently from IP addressing. Use the prefix options to control SLAAC behavior and the DNS server configuration to deliver resolver addresses to clients without a DHCPv6 server.
