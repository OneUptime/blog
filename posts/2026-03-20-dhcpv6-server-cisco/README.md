# How to Configure a DHCPv6 Server on Cisco IOS

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: DHCPv6, IPv6, Cisco, IOS, Networking, Prefix Delegation, Router

Description: Learn how to configure a DHCPv6 server on Cisco IOS and IOS-XE routers to assign IPv6 addresses, deliver DNS options, and delegate prefixes to downstream devices.

---

Cisco IOS routers can act as DHCPv6 servers, allowing them to assign IPv6 addresses and deliver network configuration to clients on directly connected interfaces. This guide covers stateful DHCPv6, stateless options, prefix delegation, and verification commands.

---

## Prerequisites

- Cisco IOS 12.4(24)T or later, or IOS-XE 3.x+
- IPv6 unicast routing enabled
- Interface IPv6 addresses configured

---

## Enable IPv6 Routing

```cisco
ipv6 unicast-routing
ipv6 cef
```

---

## Basic Stateful DHCPv6 Pool

```cisco
! Define the DHCPv6 pool
ipv6 dhcp pool CLIENTS
 address prefix 2001:db8:1::/64 lifetime 86400 43200
 dns-server 2001:db8:ff::53
 domain-name corp.example.com

! Apply the pool to the client-facing interface
interface GigabitEthernet0/1
 ipv6 address 2001:db8:1::1/64
 ipv6 dhcp server CLIENTS
 ipv6 nd prefix default 1800 1800 no-autoconfig
 ! Disable SLAAC address creation and advertise DHCPv6 state/options
 ipv6 nd managed-config-flag
 ipv6 nd other-config-flag
```

---

## Stateless DHCPv6 (Options Only, SLAAC for Addresses)

```cisco
ipv6 dhcp pool OPTIONS-ONLY
 dns-server 2001:db8:ff::53
 domain-name corp.example.com

interface GigabitEthernet0/1
 ipv6 address 2001:db8:1::1/64
 ipv6 dhcp server OPTIONS-ONLY
 ! O=1 only - clients use SLAAC for addresses, DHCPv6 for options
 ipv6 nd other-config-flag
```

---

## DHCPv6 Prefix Delegation

```cisco
! Pool for delegating /56 prefixes from a /40 block
ipv6 dhcp pool PD-POOL
 prefix-delegation pool DELEGATED-PREFIXES lifetime 86400 43200
 dns-server 2001:db8:ff::53

ipv6 local pool DELEGATED-PREFIXES 2001:db8:100::/40 56

interface GigabitEthernet0/0
 ipv6 address 2001:db8:ff::1/64
 ipv6 dhcp server PD-POOL
```

---

## Reserved Infrastructure Addresses

```cisco
ipv6 dhcp pool CLIENTS
 address prefix 2001:db8:1::/64 lifetime 86400 43200
 dns-server 2001:db8:ff::53

! Cisco IOS DHCPv6 does not have an IPv4-style excluded-address command.
! Reserve infrastructure addresses with static IPv6 assignments instead of
! relying on DHCPv6 to keep specific individual addresses free.
```

---

## Static Prefix Delegation Reservations

```cisco
ipv6 dhcp pool PD-POOL
 ! Reserve a delegated prefix for a specific downstream router DUID
 prefix-delegation 2001:db8:100:10::/56 0001000128abc123001122334455
 dns-server 2001:db8:ff::53
```

---

## Verification Commands

```cisco
! Show all DHCPv6 bindings (leases)
show ipv6 dhcp binding

! Show DHCPv6 pool details
show ipv6 dhcp pool

! Show interface DHCPv6 configuration
show ipv6 dhcp interface GigabitEthernet0/1

! Show the router's DHCPv6 DUID
show ipv6 dhcp

! Show conflicts
show ipv6 dhcp conflict

! Debug DHCPv6 (use carefully in production)
debug ipv6 dhcp detail
```

---

## Example Output

```text
Router# show ipv6 dhcp binding

Client: FE80::211:22FF:FE33:4455
  DUID: 0001000128ABC123001122334455
  Username : unassigned
  VRF : default
  Interface: GigabitEthernet0/1
  IA NA: IA ID 0x00000001, T1 21600, T2 34560
    Address: 2001:DB8:1::D9F7:61C:D803:DCF1
            preferred lifetime 43200, valid lifetime 86400
            expires at Mar 21 2026 10:00:00
```

---

## Troubleshooting

```cisco
! Check if DHCPv6 is listening on the interface
show ipv6 dhcp interface

! Check RA flags and prefix advertisement behavior
show ipv6 interface GigabitEthernet0/1

! Clear a specific binding
clear ipv6 dhcp binding FE80::211:22FF:FE33:4455

! Clear all bindings (use with caution)
clear ipv6 dhcp binding
```

---

## Best Practices

1. **Set RA behavior appropriately** - use `managed-config-flag` for stateful DHCPv6, `other-config-flag` for stateless DHCPv6, and disable SLAAC address creation for stateful deployments with `ipv6 nd prefix ... no-autoconfig`
2. **Set appropriate lifetimes** - T1 = 50% of preferred lifetime, T2 = 80% of preferred lifetime
3. **Use static IPv6 assignments for infrastructure devices** because Cisco IOS DHCPv6 address pools are prefix-based rather than IPv4-style start/end ranges
4. **Monitor bindings** regularly to detect address exhaustion
5. **Enable logging** for DHCPv6 events on production routers

---

## Conclusion

Cisco IOS provides a full-featured DHCPv6 server capable of stateful address assignment, stateless option delivery, and prefix delegation. Configure the pool, apply it to the interface with correct RA flags and prefix advertisement behavior, and use `show ipv6 dhcp binding` to verify client assignments.

---

*Monitor your Cisco network and IPv6 infrastructure with [OneUptime](https://oneuptime.com).*
