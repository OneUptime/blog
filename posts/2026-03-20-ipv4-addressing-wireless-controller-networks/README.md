# How to Design IPv4 Addressing for Wireless Controller Networks

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv4, Wireless, Wi-Fi, Network Design, VLAN, CAPWAP, Cisco WLC

Description: Design IPv4 addressing for wireless controller networks including management, AP management, CAPWAP tunnel, and client SSIDs with VLAN mapping and DHCP scopes.

## Introduction

Wireless networks have unique IPv4 addressing needs: the wireless LAN controller (WLC), AP management addresses, CAPWAP tunnel endpoints, and per-SSID client subnets all require careful planning to avoid conflicts and enable scalable management.

## Wireless Network Address Layers

```text
Layer               VLAN   Subnet             Purpose
──────────────────────────────────────────────────────────────
WLC Management       99   10.1.99.0/28       Controller web/SSH
AP Management        50   10.1.52.0/22       One IP per AP
CAPWAP Tunnels        -   (uses AP/WLC mgmt IPs)  Control/data tunnel
SSID-Corp          100   10.1.100.0/22       Employee Wi-Fi
SSID-Guest         200   10.1.200.0/22       Guest Wi-Fi
SSID-IoT           300   10.1.50.0/23        IoT devices
```

## AP Addressing Strategy

```text
For 500 APs across a campus:
  AP management subnet: 10.1.52.0/22  (1022 usable IPs)
  Allocate by building:
    Building A:  10.1.52.1  – 10.1.52.100
    Building B:  10.1.53.1  – 10.1.53.100
    Building C:  10.1.54.1  – 10.1.54.100
  Reserve 10.1.55.x for future expansion
```

## Python AP Subnet Planner

```python
import ipaddress

AP_MGMT = ipaddress.IPv4Network("10.1.52.0/22")
BUILDINGS = ["BuildingA", "BuildingB", "BuildingC"]

subnets = list(AP_MGMT.subnets(new_prefix=24))

for building, subnet in zip(BUILDINGS, subnets):
    start = subnet.network_address + 1
    end   = subnet.network_address + 100
    print(f"{building}: {start} – {end} (100 IPs)")

print(f"Reserved for future expansion: {subnets[-1]}")
```

## DHCP Option 43 for AP Discovery (Cisco WLC)

```text
# ISC DHCP - DHCP option 43 for LWAPP/CAPWAP

option space Cisco_LWAPP_AP;
option Cisco_LWAPP_AP.server-address code 241 = array of ip-address;

subnet 10.1.52.0 netmask 255.255.252.0 {
  range 10.1.52.10 10.1.55.250;
  option routers 10.1.52.1;
  vendor-option-space Cisco_LWAPP_AP;
  option Cisco_LWAPP_AP.server-address 10.1.99.10;   # WLC management IP
  default-lease-time 86400;
}
```

## Cisco WLC Interface Configuration

```text
! WLC management interface
Interface Name:    management
VLAN:              99
IP Address:        10.1.99.10
Subnet Mask:       255.255.255.240
Default Gateway:   10.1.99.1

! Dynamic interface per SSID
Interface Name:    ssid-corp
VLAN:              100
IP Address:        10.1.100.1
Subnet Mask:       255.255.252.0
DHCP Server:       10.1.1.20

Interface Name:    ssid-guest
VLAN:              200
IP Address:        10.1.200.1
Subnet Mask:       255.255.252.0
DHCP Server:       10.1.1.20
```

## Client DHCP Scopes

```text
# Corporate SSID - 1000 concurrent clients
subnet 10.1.100.0 netmask 255.255.252.0 {
  range 10.1.100.10 10.1.103.250;
  option routers 10.1.100.1;
  option domain-name-servers 10.1.1.10, 8.8.8.8;
  default-lease-time 3600;
  max-lease-time    7200;
}

# Guest SSID - limited to internet only, shorter lease
subnet 10.1.200.0 netmask 255.255.252.0 {
  range 10.1.200.10 10.1.203.250;
  option routers 10.1.200.1;
  option domain-name-servers 8.8.8.8, 1.1.1.1;  # no internal DNS
  default-lease-time 1800;
  max-lease-time    3600;
}
```

## Conclusion

Wireless controller networks require separate subnets for WLC management, AP management, and each SSID. Use DHCP option 43 for automatic AP-to-WLC discovery. Allocate AP management addresses by building or floor for easy troubleshooting, and size client subnets with peak concurrent client count in mind, not total registered users.
