# How to Configure Port Security with IPv4 on Cisco Switches

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Cisco, Port Security, IPv4, Switching, IOS, Security, MAC Address

Description: Configure Cisco IOS port security to restrict switch access ports to specific MAC addresses, preventing unauthorized device connections in IPv4 network segments.

## Introduction

Port security limits which MAC addresses can communicate on a switch port. It prevents rogue devices from plugging into your network and can learn or enforce secure MAC addresses, complementing IPv4 protections such as DHCP snooping and IP Source Guard on access ports.

## Basic Port Security

```cisco
interface GigabitEthernet0/1
 description User-Workstation
 switchport mode access
 switchport access vlan 10
 !
 switchport port-security
 switchport port-security maximum 1            ! Only 1 MAC allowed
 switchport port-security mac-address sticky   ! Learn and add MAC to running config
 switchport port-security violation shutdown   ! Disable port on violation
```

## Static MAC Address

```cisco
interface GigabitEthernet0/2
 switchport mode access
 switchport access vlan 10
 !
 switchport port-security
 switchport port-security maximum 1
 switchport port-security mac-address 001A.2B3C.4D5E     ! Static MAC
 switchport port-security violation restrict  ! Drop + log, don't shut port
```

## Violation Modes

| Mode | Action | Port State |
|------|--------|-----------|
| `shutdown` | Disables port, logs, increments counter, sends SNMP trap | err-disabled |
| `restrict` | Drops frames, logs, increments counter, sends SNMP trap | Still up |
| `protect` | Drops frames silently | Still up |

## Multiple MACs (e.g., IP phone + PC)

```cisco
interface GigabitEthernet0/3
 switchport mode access
 switchport access vlan 10
 switchport voice vlan 20
 !
 switchport port-security
 switchport port-security maximum 2     ! 1 phone + 1 PC
 switchport port-security mac-address sticky
 switchport port-security violation restrict
```

## Recover from err-disabled

```cisco
! Manual recovery
interface GigabitEthernet0/1
 shutdown
 no shutdown

! Automatic recovery (global setting)
errdisable recovery cause psecure-violation
errdisable recovery interval 300         ! Try to recover after 5 minutes
```

## Verify Port Security

```cisco
! Show all ports with port security
show port-security

! Show specific interface
show port-security interface GigabitEthernet0/1

! Show secured MAC addresses
show port-security address

! Example output:
! Secure Port  MaxSecureAddr  CurrentAddr  SecurityViolation  Security Action
! -----------  -------------  -----------  -----------------  ---------------
!      Gi0/1               1            1                  0          Shutdown
```

## Port Security with DHCP Snooping

```cisco
! Enable DHCP snooping (prerequisite for IP Source Guard)
ip dhcp snooping
ip dhcp snooping vlan 10

! Trust uplink ports
interface GigabitEthernet0/24
 ip dhcp snooping trust

! Enable IP Source Guard on access ports
interface GigabitEthernet0/1
 ip verify source
```

## Conclusion

Port security restricts which MAC addresses can use a switch port, preventing unauthorized device connections. Use `sticky` MAC learning to automatically capture the first connected device, `shutdown` mode for high-security ports, and `restrict` mode when you want violations logged without error-disabling the port. Combine with DHCP snooping and IP Source Guard for stronger IPv4 access-port security.
