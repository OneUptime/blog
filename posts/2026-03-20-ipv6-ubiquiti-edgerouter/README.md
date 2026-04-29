# How to Configure IPv6 on Ubiquiti EdgeRouter

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, Ubiquiti, EdgeRouter, EdgeOS, DHCPv6, Networking

Description: Configure IPv6 on Ubiquiti EdgeRouter using EdgeOS with DHCPv6 prefix delegation, stateless address autoconfiguration, and IPv6 firewall rules.

## Introduction

Ubiquiti EdgeRouter runs EdgeOS, which is based on Vyatta (a Linux-based routing platform). IPv6 configuration on EdgeRouter uses the `set` command structure with a hierarchical configuration model similar to Junos.

## Step 1: Configure WAN Interface with DHCPv6-PD

```bash
# Connect to the EdgeRouter via SSH

# Configure DHCPv6 client on the WAN interface

configure

# Configure eth0 (WAN) for DHCPv6 with prefix delegation
set interfaces ethernet eth0 dhcpv6-pd rapid-commit enable
# Replace /56 with the prefix length delegated by your ISP
set interfaces ethernet eth0 dhcpv6-pd pd 0 prefix-length /56

# Assign the delegated prefix to the LAN interface (eth1)
set interfaces ethernet eth0 dhcpv6-pd pd 0 interface eth1 host-address ::1
set interfaces ethernet eth0 dhcpv6-pd pd 0 interface eth1 prefix-id :1
set interfaces ethernet eth0 dhcpv6-pd pd 0 interface eth1 service slaac
```

## Step 2: Configure Static IPv6 Address (Alternative)

If your ISP provides a static IPv6 prefix:

```bash
# Assign a static IPv6 address to the WAN interface
set interfaces ethernet eth0 address 2001:db8:0:1::2/64

# Configure a default IPv6 route
set protocols static route6 ::/0 next-hop 2001:db8:0:1::1

# Assign a /64 to the LAN interface
set interfaces ethernet eth1 address 2001:db8:1:1::1/64
```

## Step 3: Configure SLAAC via Router Advertisements

If you are using static IPv6 on the LAN rather than `service slaac` under DHCPv6-PD:

```bash
# Enable Router Advertisements on the LAN interface
set interfaces ethernet eth1 ipv6 router-advert send-advert true
set interfaces ethernet eth1 ipv6 router-advert max-interval 100
set interfaces ethernet eth1 ipv6 router-advert min-interval 30
set interfaces ethernet eth1 ipv6 router-advert managed-flag false
set interfaces ethernet eth1 ipv6 router-advert other-config-flag false
set interfaces ethernet eth1 ipv6 router-advert default-lifetime 1800

# Configure the prefix to advertise
set interfaces ethernet eth1 ipv6 router-advert prefix 2001:db8:1:1::/64 autonomous-flag true
set interfaces ethernet eth1 ipv6 router-advert prefix 2001:db8:1:1::/64 on-link-flag true
set interfaces ethernet eth1 ipv6 router-advert prefix 2001:db8:1:1::/64 valid-lifetime 86400
set interfaces ethernet eth1 ipv6 router-advert prefix 2001:db8:1:1::/64 preferred-lifetime 14400

# Advertise DNS server
set interfaces ethernet eth1 ipv6 router-advert dns-server 2606:4700:4700::1111

commit
save
```

## Step 4: Configure IPv6 Firewall

```bash
# Create IPv6 firewall rulesets for WAN transit and traffic to the router
set firewall ipv6-name WAN_IN_V6 default-action drop
set firewall ipv6-name WAN_IN_V6 description "WAN to LAN IPv6"
set firewall ipv6-name WAN_LOCAL_V6 default-action drop
set firewall ipv6-name WAN_LOCAL_V6 description "WAN to router IPv6"

# Allow established and related
set firewall ipv6-name WAN_IN_V6 rule 10 action accept
set firewall ipv6-name WAN_IN_V6 rule 10 description "Allow established/related"
set firewall ipv6-name WAN_IN_V6 rule 10 state established enable
set firewall ipv6-name WAN_IN_V6 rule 10 state related enable
set firewall ipv6-name WAN_IN_V6 rule 15 action drop
set firewall ipv6-name WAN_IN_V6 rule 15 description "Drop invalid state"
set firewall ipv6-name WAN_IN_V6 rule 15 state invalid enable

# Allow ICMPv6 (required for IPv6 operation)
set firewall ipv6-name WAN_IN_V6 rule 20 action accept
set firewall ipv6-name WAN_IN_V6 rule 20 description "Allow ICMPv6"
set firewall ipv6-name WAN_IN_V6 rule 20 protocol icmpv6

# Allow established and related traffic to the router itself
set firewall ipv6-name WAN_LOCAL_V6 rule 10 action accept
set firewall ipv6-name WAN_LOCAL_V6 rule 10 description "Allow established/related"
set firewall ipv6-name WAN_LOCAL_V6 rule 10 state established enable
set firewall ipv6-name WAN_LOCAL_V6 rule 10 state related enable
set firewall ipv6-name WAN_LOCAL_V6 rule 15 action drop
set firewall ipv6-name WAN_LOCAL_V6 rule 15 description "Drop invalid state"
set firewall ipv6-name WAN_LOCAL_V6 rule 15 state invalid enable

# Allow ICMPv6 and DHCPv6 to the router
set firewall ipv6-name WAN_LOCAL_V6 rule 20 action accept
set firewall ipv6-name WAN_LOCAL_V6 rule 20 description "Allow ICMPv6"
set firewall ipv6-name WAN_LOCAL_V6 rule 20 protocol icmpv6
set firewall ipv6-name WAN_LOCAL_V6 rule 30 action accept
set firewall ipv6-name WAN_LOCAL_V6 rule 30 description "Allow DHCPv6"
set firewall ipv6-name WAN_LOCAL_V6 rule 30 protocol udp
set firewall ipv6-name WAN_LOCAL_V6 rule 30 source port 547
set firewall ipv6-name WAN_LOCAL_V6 rule 30 destination port 546

# Apply to WAN interface
set interfaces ethernet eth0 firewall in ipv6-name WAN_IN_V6
set interfaces ethernet eth0 firewall local ipv6-name WAN_LOCAL_V6

commit
save
```

## Step 5: Verify Configuration

```bash
# Show IPv6 addresses
show interfaces detail | grep inet6

# Show IPv6 routing table
show ipv6 route

# Show IPv6 neighbors
show ipv6 neighbors

# Ping test
ping6 2606:4700:4700::1111 count 3
```

## GUI Alternative (Wizard)

For a quick setup via the web interface:

1. Navigate to **Wizards > Basic Setup**
2. In the **DHCPv6** section, set the delegated prefix length from your ISP, enable the IPv6 firewall, and select the LAN interfaces that should receive IPv6 connectivity
3. The wizard configures prefix delegation and SLAAC automatically

For more advanced settings, use the **Config Tree** tab in the web UI which provides GUI access to the full `set` command hierarchy.

## Conclusion

Ubiquiti EdgeRouter's EdgeOS provides a clean IPv6 configuration experience through its hierarchical `set` command structure. DHCPv6-PD is the standard way to obtain a prefix from residential ISPs, and the integrated RA configuration on LAN interfaces enables SLAAC for clients. The IPv6 firewall mirrors the IPv4 firewall structure with named rulesets applied to interfaces, and should protect both forwarded traffic and traffic destined to the router itself.
