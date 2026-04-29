# How to Plan IPv6 Addressing for Smart Building Networks

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, Smart Building, IoT, IPAM, Planning, Networking

Description: Plan IPv6 address allocation for smart building networks with thousands of sensors, actuators, and building management systems using a hierarchical addressing scheme.

## Introduction

Smart buildings contain thousands of IPv6-connected devices: HVAC sensors, lighting controllers, access control readers, fire panels, and energy meters. A well-planned IPv6 addressing scheme enables efficient routing, management, and security for these diverse device populations.

## Smart Building IPv6 Hierarchy

A typical smart building receives a /48 from the enterprise, which is subdivided for different building systems:

```text
Enterprise /32
└── Building-A /48 (2001:db8:a::/48)
    ├── HVAC /64 (2001:db8:a:1::/64)          - 18 quintillion addresses
    ├── Lighting /64 (2001:db8:a:2::/64)
    ├── Access Control /64 (2001:db8:a:3::/64)
    ├── Fire & Safety /64 (2001:db8:a:4::/64)
    ├── Energy Meters /64 (2001:db8:a:5::/64)
    ├── Security Cameras /64 (2001:db8:a:6::/64)
    ├── Building Management /64 (2001:db8:a:7::/64)
    ├── Guest IoT /64 (2001:db8:a:8::/64)
    └── Reserved /56 (2001:db8:a:100::/56)
```

## Example Addressing Plan

```bash
#!/bin/bash
# building_ipv6_plan.sh

# Generate IPv6 addressing plan for a smart building

BUILDING_PREFIX="2001:db8:a"

declare -A SUBNETS=(
    ["hvac"]="1"
    ["lighting"]="2"
    ["access-control"]="3"
    ["fire-safety"]="4"
    ["energy"]="5"
    ["cameras"]="6"
    ["bms"]="7"         # Building Management System
    ["guest-iot"]="8"
)

echo "Smart Building IPv6 Addressing Plan"
echo "======================================"
echo "Building Prefix: ${BUILDING_PREFIX}::/48"
echo ""

for system in "${!SUBNETS[@]}"; do
    subnet="${SUBNETS[$system]}"
    printf "%-20s %s:%s::/64\n" "$system" "$BUILDING_PREFIX" "$subnet"
done
```

## Addressing Within Each System

For the HVAC system, structured addresses help with operations:

```text
HVAC Subnet: 2001:db8:a:1::/64

2001:db8:a:1::1      - HVAC controller (gateway)
2001:db8:a:1::10-ff  - Floor controllers (1 per floor for 240 floors)
2001:db8:a:1::100-1ff - Zone controllers
2001:db8:a:1::1000-ffff - Sensors and actuators (static/DHCPv6)
```

## DHCPv6 Configuration for Building Systems

```text
# /etc/kea/kea-dhcp6.conf (abbreviated)
{
    "Dhcp6": {
        "subnet6": [
            {
                "subnet": "2001:db8:a:1::/64",
                "pools": [
                    {"pool": "2001:db8:a:1::1000 - 2001:db8:a:1::1fff"}
                ],
                "reservations": [
                    {
                        "hw-address": "00:11:22:33:44:55",
                        "ip-addresses": ["2001:db8:a:1::10"],
                        "hostname": "hvac-controller-floor-1.bms.example.com"
                    }
                ],
                "option-data": [
                    {"name": "dns-servers", "data": "2001:db8:a:7::53"}
                ],
                "user-context": {
                    "comment": "HVAC System - Building A"
                }
            }
        ]
    }
}
```

## DNS Zone Design for Smart Buildings

```text
# DNS forward zone: bms.example.com
# Naming convention: <device-type>-<location>.<system>.<building>.bms.example.com

hvac-ctrl-floor1.hvac.building-a.bms.example.com.   AAAA 2001:db8:a:1::10
temp-sensor-room101.hvac.building-a.bms.example.com. AAAA 2001:db8:a:1::1001
light-ctrl-zone2.lighting.building-a.bms.example.com. AAAA 2001:db8:a:2::20
camera-lobby.security.building-a.bms.example.com.   AAAA 2001:db8:a:6::101
```

## Firewall Policy for Building Systems

```bash
# Inter-system firewall rules
# BMS can reach all subsystems for management
ip6tables -A FORWARD -s 2001:db8:a:7::/64 -j ACCEPT  # BMS to all

# HVAC can only talk to BMS (not to cameras or access control)
ip6tables -A FORWARD -s 2001:db8:a:1::/64 -d 2001:db8:a:7::/64 -j ACCEPT
ip6tables -A FORWARD -s 2001:db8:a:1::/64 -j DROP

# Fire safety has emergency access to all systems
ip6tables -A FORWARD -s 2001:db8:a:4::/64 -j ACCEPT

# Guest IoT is completely isolated
ip6tables -A FORWARD -s 2001:db8:a:8::/64 -d 2001:db8:a::/48 -j DROP
ip6tables -A FORWARD -s 2001:db8:a:8::/64 -j ACCEPT  # Internet only
```

## Tracking and IPAM

```bash
# Use NetBox or phpIPAM for building IPv6 address management
# Key attributes to track:
# - System (HVAC, Lighting, etc.)
# - Floor/Zone
# - Device type (sensor, controller, camera)
# - Manufacturer and model
# - Maintenance contract expiry
# - Physical location (room/rack)

# Example NetBox API call to create a prefix
curl -s -X POST https://netbox.example.com/api/ipam/prefixes/ \
    -H "Authorization: Token $TOKEN" \
    -H "Content-Type: application/json" \
    -d '{
        "prefix": "2001:db8:a:1::/64",
        "description": "HVAC System - Building A",
        "tags": ["building-a", "iot", "hvac"],
        "tenant": {"name": "Building Management"}
    }'
```

## Conclusion

Planning IPv6 addressing for smart buildings requires a hierarchical approach that maps to the physical and functional organization of building systems. Allocating separate /64 subnets per system enables precise firewall policies, simplified monitoring, and clear DNS naming. DHCPv6 with reservations provides address tracking, while an IPAM tool ensures the addressing plan remains current as devices are added, moved, or replaced. The vast IPv6 address space means you never need to reuse addresses - each device can have a unique, descriptive address for its entire lifetime.
