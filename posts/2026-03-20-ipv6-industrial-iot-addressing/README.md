# How to Plan IPv6 Addressing for Industrial IoT

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, Industrial IoT, IIoT, OT Networks, Addressing, Purdue Model

Description: Plan IPv6 addressing for Industrial IoT networks following the Purdue Model, with hierarchical addressing for PLCs, SCADA systems, sensors, and IT/OT network segmentation.

## Introduction

Industrial IoT (IIoT) networks follow the Purdue Model for security and segmentation, separating field devices, control systems, and enterprise IT. IPv6 addressing for IIoT must respect these boundaries while providing efficient, scalable addressing for thousands of industrial devices including PLCs, RTUs, sensors, and SCADA systems.

## Purdue Model with IPv6

```mermaid
flowchart TB
    L4["Level 4: Enterprise IT\n2001:db8:1200:4::/64"]
    L35["Level 3.5: DMZ/ICS DMZ\n2001:db8:1200:35::/64"]
    L3["Level 3: Site Operations\n2001:db8:1200:3::/64"]
    L2["Level 2: Area Supervisory\n2001:db8:1200:2::/64"]
    L1["Level 1: Basic Control\n2001:db8:1200:1::/64"]
    L0["Level 0: Field Devices\n2001:db8:1200:0::/64"]

    L4 <--> L35 <--> L3 <--> L2 <--> L1 <--> L0
```

## IPv6 Addressing Scheme

```text
Enterprise /32
└── Industrial Site /40 (2001:db8:1200::/40)
    ├── Level 4 - Enterprise       /64 (2001:db8:1200:4::/64)
    ├── Level 3.5 - ICS DMZ        /64 (2001:db8:1200:35::/64)
    ├── Level 3 - SCADA/HMI        /64 (2001:db8:1200:3::/64)
    ├── Level 2 - DCS/Area Control /64 (2001:db8:1200:2::/64)
    ├── Level 1 - PLCs/RTUs        /64 (2001:db8:1200:1::/64)
    └── Level 0 - Field Devices    /64 (2001:db8:1200:0::/64)
```

## Level 1: PLC and RTU Addressing

```text
# Level 1 addressing plan - PLCs and RTUs

# Base: 2001:db8:1200:1::/64

# Address structure for PLCs:
# 2001:db8:1200:1::<area>:<unit>
# Example:
# 2001:db8:1200:1::1:1   - Area 1, PLC 1
# 2001:db8:1200:1::1:2   - Area 1, PLC 2
# 2001:db8:1200:1::2:1   - Area 2, PLC 1

# In hex addresses:
# 2001:db8:1200:1::1:1    - Area 1, PLC 1
# 2001:db8:1200:1::1:2    - Area 1, PLC 2
# 2001:db8:1200:1::2:1    - Area 2, PLC 1
```

## Level 0: Field Device Addressing

Field devices (sensors, actuators) typically use SLAAC or DHCPv6:

```text
# Example ISC DHCP configuration for Level 0 devices

subnet6 2001:db8:1200:0::/64 {
    # Address pool for dynamic sensors
    range6 2001:db8:1200:0::1000 2001:db8:1200:0::efff;

    # Static reservations for critical field devices
    host pressure-sensor-line-1 {
        host-identifier option dhcp6.client-id 00:03:00:01:00:aa:bb:cc:dd:ee;
        fixed-address6 2001:db8:1200:0::10:1;
    }

    host temperature-transmitter-1 {
        host-identifier option dhcp6.client-id 00:03:00:01:00:11:22:33:44:55;
        fixed-address6 2001:db8:1200:0::20:1;
    }

    option dhcp6.name-servers 2001:db8:1200:3::53;
    option dhcp6.domain-search "industrial.example.com";
}
```

## Firewall Rules Between Purdue Levels

```bash
#!/bin/bash
# industrial_ipv6_firewall.sh
# Implement Purdue Model firewall rules with IPv6

# Define level prefixes
L0="2001:db8:1200:0::/64"
L1="2001:db8:1200:1::/64"
L2="2001:db8:1200:2::/64"
L3="2001:db8:1200:3::/64"
L35="2001:db8:1200:35::/64"
L4="2001:db8:1200:4::/64"

# Default drop
ip6tables -P FORWARD DROP

# Allow established/related
ip6tables -A FORWARD -m conntrack --ctstate ESTABLISHED,RELATED -j ACCEPT

# Allow essential ICMPv6 transit/error traffic
ip6tables -A FORWARD -p ipv6-icmp --icmpv6-type destination-unreachable -j ACCEPT
ip6tables -A FORWARD -p ipv6-icmp --icmpv6-type packet-too-big -j ACCEPT
ip6tables -A FORWARD -p ipv6-icmp --icmpv6-type ttl-zero-during-transit -j ACCEPT
ip6tables -A FORWARD -p ipv6-icmp --icmpv6-type unknown-header-type -j ACCEPT
ip6tables -A FORWARD -p ipv6-icmp --icmpv6-type unknown-option -j ACCEPT

# Allow only adjacent Purdue levels
# Level 0 <-> Level 1
ip6tables -A FORWARD -s "$L0" -d "$L1" -j ACCEPT
ip6tables -A FORWARD -s "$L1" -d "$L0" -j ACCEPT

# Level 1 <-> Level 2
ip6tables -A FORWARD -s "$L1" -d "$L2" -j ACCEPT
ip6tables -A FORWARD -s "$L2" -d "$L1" -j ACCEPT

# Level 2 <-> Level 3
ip6tables -A FORWARD -s "$L2" -d "$L3" -j ACCEPT
ip6tables -A FORWARD -s "$L3" -d "$L2" -j ACCEPT

# Level 3 <-> Level 3.5 DMZ
ip6tables -A FORWARD -s "$L3" -d "$L35" -j ACCEPT
ip6tables -A FORWARD -s "$L35" -d "$L3" -j ACCEPT

# Level 3.5 DMZ ↔ Level 4 (controlled)
ip6tables -A FORWARD -s "$L35" -d "$L4" -j ACCEPT
ip6tables -A FORWARD -s "$L4" -d "$L35" -j ACCEPT
```

## Industrial Protocol Support over IPv6

If you want port-specific policy instead of broad adjacent-level allow rules, replace the generic `ACCEPT` lines above with rules such as:

```bash
# EtherNet/IP messaging (port 44818)
ip6tables -A FORWARD -s "$L2" -d "$L1" -p tcp --dport 44818 -j ACCEPT

# Modbus Application Protocol (port 502)
ip6tables -A FORWARD -s "$L2" -d "$L1" -p tcp --dport 502 -j ACCEPT

# OPC UA connection protocol (port 4840)
ip6tables -A FORWARD -s "$L3" -d "$L2" -p tcp --dport 4840 -j ACCEPT

# Secure MQTT (port 8883)
ip6tables -A FORWARD -s "$L2" -d "$L3" -p tcp --dport 8883 -j ACCEPT
```

## DNS for Industrial Devices

```text
# DNS naming convention for industrial devices
# Format: <device-type>-<area>-<unit>.<level>.industrial.example.com

plc-area1-unit1.l1.industrial.example.com.   AAAA 2001:db8:1200:1::1:1
scada-server-1.l3.industrial.example.com.    AAAA 2001:db8:1200:3::30:1
hmi-line1.l2.industrial.example.com.         AAAA 2001:db8:1200:2::20:1
```

## Conclusion

IPv6 addressing for Industrial IoT follows the Purdue Model's hierarchical segmentation, with each level in this example receiving a dedicated /64 prefix and strict firewall rules controlling inter-level communication. Static IPv6 assignments or DHCPv6 reservations for critical devices ensure predictable, auditable addressing, while SLAAC or DHCPv6 can handle less critical field devices. The addressing scheme encodes the device's role and location, simplifying operations and troubleshooting. Security is maintained by enforcing that communication only flows between adjacent levels, never bypassing the segmentation boundaries.
