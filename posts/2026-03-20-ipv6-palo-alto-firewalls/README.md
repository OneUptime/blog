# How to Configure IPv6 on Palo Alto Networks Firewalls

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, Palo Alto, PAN-OS, Firewall, Security, Networking

Description: Configure IPv6 addressing, security policies, and routing on Palo Alto Networks firewalls running PAN-OS for enterprise IPv6 deployments.

## Introduction

Palo Alto Networks firewalls (running PAN-OS) support IPv6 with full security policy enforcement, threat prevention, and App-ID for IPv6 traffic. IPv6 is configured through either Panorama (centralized management) or the device's web interface and CLI.
Before configuring IPv6 on interfaces, enable **IPv6 Firewalling** under **Device > Setup > Session**; otherwise, PAN-OS ignores IPv6-based configuration.

## Step 1: Enable IPv6 on an Interface

Via the GUI:
1. Navigate to **Network > Interfaces > Ethernet**
2. Click on the interface (e.g., `ethernet1/1`)
3. In the **IPv6** tab:
   - Check **Enable IPv6 on the Interface**
   - Click **Add** to add an IPv6 address
   - Enter the address (e.g., `2001:db8:0:1::2/64`)
   - Check **Enable Address on Interface**

Via the CLI:
```bash
# Enable IPv6 globally, then configure a Layer 3 interface for IPv6

set deviceconfig setting session ipv6-firewalling yes
set network interface ethernet ethernet1/1 layer3 ipv6 enabled yes
set network interface ethernet ethernet1/1 layer3 ipv6 address 2001:db8:0:1::2/64 enable-on-interface yes
commit
```

## Step 2: Configure IPv6 Virtual Router

```bash
# Add the interface to a virtual router
set network virtual-router default interface ethernet1/1
set network virtual-router default interface ethernet1/2

# Add a static default IPv6 route
set network virtual-router default routing-table ipv6 static-route DEFAULT-V6 \
    path-monitor enable no
set network virtual-router default routing-table ipv6 static-route DEFAULT-V6 \
    nexthop ipv6-address 2001:db8:0:1::1
set network virtual-router default routing-table ipv6 static-route DEFAULT-V6 \
    destination ::/0
set network virtual-router default routing-table ipv6 static-route DEFAULT-V6 \
    interface ethernet1/1

commit
```

## Step 3: Configure Router Advertisements

```bash
# Configure IPv6 on the LAN interface and advertise the prefix
set network interface ethernet ethernet1/2 layer3 ipv6 enabled yes
set network interface ethernet ethernet1/2 layer3 ipv6 address 2001:db8:1:1::1/64 \
    enable-on-interface yes
set network interface ethernet ethernet1/2 layer3 ipv6 address 2001:db8:1:1::1/64 \
    advertise enable yes
set network interface ethernet ethernet1/2 layer3 ipv6 address 2001:db8:1:1::1/64 \
    advertise onlink-flag yes
set network interface ethernet ethernet1/2 layer3 ipv6 address 2001:db8:1:1::1/64 \
    advertise auto-config-flag yes
set network interface ethernet ethernet1/2 layer3 ipv6 address 2001:db8:1:1::1/64 \
    advertise valid-lifetime 86400
set network interface ethernet ethernet1/2 layer3 ipv6 address 2001:db8:1:1::1/64 \
    advertise preferred-lifetime 14400

# Enable RA on the LAN interface
set network interface ethernet ethernet1/2 layer3 ipv6 neighbor-discovery \
    router-advertisement enable yes
set network interface ethernet ethernet1/2 layer3 ipv6 neighbor-discovery \
    router-advertisement max-interval 100
set network interface ethernet ethernet1/2 layer3 ipv6 neighbor-discovery \
    router-advertisement min-interval 30
set network interface ethernet ethernet1/2 layer3 ipv6 neighbor-discovery \
    router-advertisement lifetime 1800

commit
```

## Step 4: Create IPv6 Security Policies

Palo Alto uses zone-based security policies that work identically for IPv4 and IPv6:

```bash
# Create an outbound policy (LAN to WAN) for IPv6
set rulebase security rules LAN-to-WAN-IPv6 \
    from trust \
    to untrust \
    source any \
    destination any \
    application any \
    service application-default \
    action allow \
    profile-setting profiles virus default \
    profile-setting profiles spyware default

commit
```

## Step 5: Configure IPv6 Address Objects

```bash
# Create an IPv6 address object
set address Internal-LAN-IPv6 \
    ip-netmask 2001:db8:1:1::/64 \
    description "Internal LAN IPv6 prefix"

# Use in a security policy
set rulebase security rules BLOCK-EXTERNAL-TO-LAN \
    from untrust \
    to trust \
    source any \
    destination Internal-LAN-IPv6 \
    application any \
    service any \
    action deny

commit
```

## Verification Commands

```bash
# Show configured IPv6 settings on the interface
show network interface ethernet ethernet1/1 layer3 ipv6

# Show IPv6 routing table
show routing route virtual-router default afi ipv6

# Show IPv6 neighbors
show neighbor ndp-monitor

# Show IPv6 sessions
show session all filter ip6 yes

# Test connectivity
ping inet6 yes source 2001:db8:0:1::2 host 2606:4700:4700::1111
```

## Important PAN-OS IPv6 Notes

- IPv6 security policies use the same rule-matching model as IPv4, including source zone, destination zone, source and destination address, application, and service
- Threat Prevention, App-ID, and URL Filtering all work with IPv6 traffic
- NAT64 (translating IPv6 to IPv4) is supported for IPv6-only clients reaching IPv4 servers, typically alongside DNS64 for IPv6-initiated traffic
- DHCPv6 relay is supported, and the firewall can also act as a DHCPv6 client with prefix delegation; the built-in DHCP server supports IPv4 only

## Conclusion

Palo Alto Networks firewalls provide the same security capabilities for IPv6 as for IPv4, including App-ID, Threat Prevention, and URL Filtering. The zone-based security model applies uniformly regardless of IP version. Configure IPv6 on interfaces, add static routes to the virtual router, enable RA for LAN segments, and apply security policies using the same zone-based approach as IPv4.
