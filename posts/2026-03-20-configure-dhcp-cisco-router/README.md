# How to Configure DHCP on a Cisco Router

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: DHCP, Cisco, IOS, Networking, Router Configuration, Sysadmin

Description: Cisco IOS routers have a built-in DHCP server that can be configured with address pools, excluded ranges, and options to serve clients on directly connected interfaces without a dedicated DHCP server.

## Basic DHCP Configuration

```text
! Define addresses to exclude from dynamic assignment (static devices)
ip dhcp excluded-address 192.168.1.1 192.168.1.20

! Create a DHCP pool
ip dhcp pool OFFICE_LAN
   network 192.168.1.0 255.255.255.0
   default-router 192.168.1.1
   dns-server 8.8.8.8 1.1.1.1
   domain-name office.example.com
   lease 1 0 0              ! 1 day, 0 hours, 0 minutes
```

## Multi-Pool Configuration

```text
! Pool for VLAN 10 - Servers (7-day leases)
ip dhcp excluded-address 10.0.10.1 10.0.10.49

ip dhcp pool VLAN10_SERVERS
   network 10.0.10.0 255.255.255.0
   default-router 10.0.10.1
   dns-server 10.0.0.53
   lease 7

! Pool for VLAN 20 - Users (1-day leases)
ip dhcp excluded-address 10.0.20.1 10.0.20.49

ip dhcp pool VLAN20_USERS
   network 10.0.20.0 255.255.255.0
   default-router 10.0.20.1
   dns-server 10.0.0.53
   domain-name corp.example.com
   lease 1

! Pool for VLAN 99 - Guests (2-hour leases)
ip dhcp excluded-address 10.0.99.1

ip dhcp pool VLAN99_GUEST
   network 10.0.99.0 255.255.255.0
   default-router 10.0.99.1
   dns-server 8.8.8.8
   lease 0 2               ! 0 days, 2 hours
```

## Static DHCP Reservations on Cisco

```text
! Reserve a specific IP for a DHCP client identifier (01 + MAC for Ethernet)
ip dhcp pool WEBSERVER
   host 192.168.1.50 255.255.255.0
   client-identifier 01aa.aabb.bbcc.cc
   default-router 192.168.1.1
   dns-server 8.8.8.8
```

## Cisco DHCP Options

```text
! Option 150: TFTP server IP for VoIP phones
ip dhcp pool VOIP_PHONES
   network 10.0.30.0 255.255.255.0
   default-router 10.0.30.1
   option 150 ip 10.0.0.100   ! Cisco TFTP server
   option 66 ascii 10.0.0.100  ! Generic TFTP server name
   lease 0 1                   ! 1-hour leases
```

## Verification Commands

```text
! View current DHCP bindings
show ip dhcp binding

! View DHCP pool statistics (total, used, available)
show ip dhcp pool

! View DHCP server conflicts
show ip dhcp conflict

! Debug DHCP events in real time
debug ip dhcp server events
! (Remember to undebug: undebug all)
```

## DHCP Relay on Cisco (Helper Address)

If the DHCP server is on a different subnet:
```text
interface Vlan10
  ip address 10.0.10.1 255.255.255.0
  ip helper-address 10.0.0.53   ! Forward DHCP to server
```

## Key Takeaways

- Use `ip dhcp excluded-address` to protect static device IPs before creating the pool.
- `show ip dhcp binding` lists current DHCP bindings and assigned IPs.
- `ip helper-address` enables the router to relay DHCP to an external server.
- Cisco pools support custom DHCP options via `option code [instance] {ascii | hex | ip-address}`.
