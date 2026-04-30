# How to Plan IPv4 Subnets for IoT Device Networks

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv4, IoT, Subnetting, Network Segmentation, Security, VLAN

Description: Design isolated IPv4 subnets for IoT device categories, apply firewall policies to prevent lateral movement, and configure DHCP with short leases suited to high device churn.

## Introduction

IoT devices - sensors, cameras, thermostats, industrial controllers - are frequent attack targets. Isolating them in dedicated IPv4 subnets with restrictive firewall rules limits blast radius when a device is compromised.

## IoT Network Segmentation Model

```text
Corporate LAN:   10.1.0.0/16
IoT Zone:        10.2.0.0/16   (isolated, separate VLANs)

IoT Subnets:
  10.2.1.0/24   Building sensors (temperature, humidity)
  10.2.2.0/24   Security cameras
  10.2.3.0/24   Access control (badge readers)
  10.2.4.0/24   HVAC / BMS controllers
  10.2.5.0/24   Industrial PLCs
  10.2.6.0/25   Medical devices
  10.2.100.0/24 IoT gateway / aggregator
```

## Firewall Rules for IoT Zones

```text
ALLOW  IoT → Internet (specific destinations only, enforced upstream)
ALLOW  IoT → IoT-gateway (10.2.100.x)
DENY   IoT → Corporate LAN
DENY   IoT → IT management (10.1.200.x)
ALLOW  IT management → IoT (for SNMP/SSH management)
DENY   All other inter-IoT traffic
```

## Python Subnet Planning

```python
import ipaddress

IOT_CATEGORIES = {
    "building_sensors":  ("10.2.1.0/24",  200),
    "cameras":           ("10.2.2.0/24",   80),
    "access_control":    ("10.2.3.0/24",   40),
    "hvac_bms":          ("10.2.4.0/24",   30),
    "industrial_plcs":   ("10.2.5.0/24",   15),
    "medical":           ("10.2.6.0/25",   50),
    "iot_gateways":      ("10.2.100.0/24",  5),
}

for cat, (cidr, devices) in IOT_CATEGORIES.items():
    net = ipaddress.IPv4Network(cidr)
    usable = net.num_addresses - 2
    print(f"{cat:<20} {cidr:<18} devices={devices:3d}  "
          f"capacity={usable}  utilization={devices/usable:.0%}")
```

## DHCP Configuration for IoT (ISC DHCP)

```text
subnet 10.2.1.0 netmask 255.255.255.0 {
  option routers 10.2.1.1;
  option domain-name-servers 10.2.100.10;   # local resolver only
  default-lease-time 1800;    # 30 min - short for churn
  max-lease-time    3600;
  pool {
    range 10.2.1.10 10.2.1.200;
    deny unknown-clients;     # requires host declarations for known clients
  }
}
```

## VLAN Configuration (Cisco IOS)

```cisco
! Create IoT VLANs
vlan 210
 name IoT-Sensors
vlan 211
 name IoT-Cameras
!
! SVI with ACL
interface Vlan210
 description IoT-Sensors
 ip address 10.2.1.1 255.255.255.0
 ip access-group IoT-SENSORS-ACL in
!
ip access-list extended IoT-SENSORS-ACL
 remark Allow DNS to local resolver
 permit udp 10.2.1.0 0.0.0.255 host 10.2.100.10 eq domain
 permit tcp 10.2.1.0 0.0.0.255 host 10.2.100.10 eq domain
 remark Allow MQTT to IoT gateway
 permit tcp 10.2.1.0 0.0.0.255 host 10.2.100.10 eq 1883
 permit tcp 10.2.1.0 0.0.0.255 host 10.2.100.10 eq 8883
 remark Block corporate LAN
 deny   ip 10.2.1.0 0.0.0.255 10.1.0.0 0.0.255.255
 remark Block other routed IoT subnets
 deny   ip 10.2.1.0 0.0.0.255 10.2.0.0 0.0.255.255
 remark Permit remaining traffic toward the upstream firewall
 permit ip 10.2.1.0 0.0.0.255 any
```

## 802.1X Device Onboarding

```text
For IoT devices that support 802.1X:
  - Assign to IoT VLAN upon successful EAP authentication
  - Fall back to a quarantine VLAN on authentication failure
  - Use RADIUS to apply dynamic VLAN assignment

For devices without 802.1X:
  - Use MAC authentication bypass (MAB)
  - Maintain a MAC whitelist per IoT VLAN
```

## Conclusion

Isolate IoT devices in dedicated subnets by category, enforce strict north-south firewall rules that block lateral movement to the corporate LAN, and use short DHCP leases with MAC whitelisting to control device inventory. Regular VLAN and ACL audits prevent IoT subnet sprawl.
