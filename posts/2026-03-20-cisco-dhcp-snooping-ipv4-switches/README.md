# How to Configure DHCP Snooping for IPv4 on Cisco Switches

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Cisco, DHCP Snooping, IPv4, Switching, Security, IOS

Description: Configure Cisco DHCP snooping to prevent rogue DHCP servers from distributing unauthorized IPv4 addresses, building a binding table used by Dynamic ARP Inspection and IP Source Guard.

## Introduction

DHCP snooping validates DHCP messages on untrusted ports, blocks DHCP server responses from access ports, and builds a binding table mapping MAC addresses to leased IPv4 addresses. This binding table is the foundation for Dynamic ARP Inspection and IP Source Guard.

## Enable DHCP Snooping

```cisco
! Enable globally and per VLAN
ip dhcp snooping
ip dhcp snooping vlan 10,20,30

! Optional: disable option 82 insertion only if the upstream DHCP server rejects it
! no ip dhcp snooping information option

! Trust the uplink/trunk that receives legitimate DHCP server replies
interface GigabitEthernet0/24
 description Uplink-to-Distribution
 ip dhcp snooping trust

! Access ports are untrusted by default - no additional config needed
interface GigabitEthernet0/1
 description User-Workstation
 switchport mode access
 switchport access vlan 10
 ! ip dhcp snooping limit rate 15  ! Optional: limit DHCP packets/sec
```

## Rate Limiting on Untrusted Ports

```cisco
! Prevent DHCP flood attacks
interface range GigabitEthernet0/1 - 20
 ip dhcp snooping limit rate 15   ! Max 15 DHCP packets/sec per port
```

## Verify DHCP Snooping

```cisco
! Show DHCP snooping status and configuration
show ip dhcp snooping

! Show the binding table (MAC → IP → VLAN → port)
show ip dhcp snooping binding

! Example binding table:
! MacAddress          IpAddress       Lease(sec)  Type    VLAN  Interface
! ------------------  --------------- ----------  ------  ----  --------------------
! 00:1a:2b:3c:4d:5e  10.1.10.100     86400       dhcp-snooping   10  GigabitEthernet0/1

! Show statistics
show ip dhcp snooping statistics
```

## DHCP Snooping with Port Security

```cisco
! Combined configuration
interface GigabitEthernet0/5
 switchport mode access
 switchport access vlan 10
 ip dhcp snooping limit rate 15
 switchport port-security
 switchport port-security maximum 1
 switchport port-security mac-address sticky
 switchport port-security violation restrict
```

## Exporting the Binding Database

```cisco
! Save binding table to a file (survives switch reload)
ip dhcp snooping database flash:/dhcp-snooping.db
ip dhcp snooping database write-delay 300  ! Write every 5 minutes
```

## Common Issues

```cisco
! Issue: Legitimate DHCP offers dropped from external server
! Fix: Trust the uplink port connecting to DHCP relay/server
interface GigabitEthernet0/24
 ip dhcp snooping trust

! Issue: Option 82 causing upstream DHCP server to reject requests
! Fix:
no ip dhcp snooping information option

! Issue: Binding table lost after reload
! Fix: Configure persistent database
ip dhcp snooping database flash:/dhcp-snooping.db
```

## Conclusion

DHCP snooping stops rogue DHCP servers from handing out unauthorized IPv4 addresses. Trust only the port or ports that carry legitimate DHCP server replies, rate-limit untrusted ports, disable option 82 insertion only if your DHCP server rejects it, and persist the binding database to survive reloads. The binding table then enables Dynamic ARP Inspection and IP Source Guard.
