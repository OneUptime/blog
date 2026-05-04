# How to Configure Secondary IPv4 Addresses on Router Interfaces

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv4, Secondary Address, Cisco IOS, Router, Migration

Description: Learn how to configure secondary IPv4 addresses on Cisco router interfaces for gradual network migration, multi-subnet hosting, and DHCP relay scenarios.

## When to Use Secondary IP Addresses

Secondary IPv4 addresses on a router interface allow it to serve as the gateway for multiple subnets on the same physical segment:

- **Network migration** - add a new subnet alongside the old one during transition
- **VLAN-free multi-subnet** - serve multiple subnets on a single physical LAN
- **DHCP relay** - relay DHCP for secondary subnets without additional interfaces
- **Testing** - add a test subnet temporarily

## Step 1: Configure a Secondary IP Address

```text
! Primary address (existing)
interface GigabitEthernet0/0
 ip address 192.168.1.1 255.255.255.0
 no shutdown

! Add secondary address
interface GigabitEthernet0/0
 ip address 10.0.0.1 255.255.255.0 secondary

! Add multiple secondary addresses
interface GigabitEthernet0/0
 ip address 10.0.0.1 255.255.255.0 secondary
 ip address 172.16.0.1 255.255.255.0 secondary
```

## Step 2: Verify Secondary Addresses

```text
RouterA# show ip interface GigabitEthernet0/0
GigabitEthernet0/0 is up, line protocol is up
  Internet address is 192.168.1.1/24
  Broadcast address is 255.255.255.255
  Secondary address 10.0.0.1/24
  Secondary address 172.16.0.1/24

RouterA# show ip interface brief
Interface            IP-Address    OK? Method Status    Protocol
GigabitEthernet0/0   192.168.1.1   YES  manual up        up
```

Note: `show ip interface brief` only shows the primary address.

## Step 3: Configure DHCP Scopes for Secondary Subnets

```text
! Configure DHCP scopes for both primary and secondary subnets

ip dhcp excluded-address 192.168.1.1 192.168.1.10
ip dhcp excluded-address 10.0.0.1 10.0.0.10

ip dhcp pool PRIMARY_SUBNET
  network 192.168.1.0 /24
  default-router 192.168.1.1
  dns-server 8.8.8.8

ip dhcp pool SECONDARY_SUBNET
  network 10.0.0.0 /24
  default-router 10.0.0.1
  dns-server 8.8.8.8
```

## Step 4: Network Migration Use Case

Migrating from 192.168.1.0/24 to 10.1.0.0/24 without downtime:

```text
Phase 1: Add new subnet as secondary
  interface GigabitEthernet0/0
   ip address 10.1.0.1 255.255.255.0 secondary

Phase 2: Migrate servers one by one to new subnet
  - Server 1: Change from 192.168.1.10 to 10.1.0.10
  - Server 2: Change from 192.168.1.11 to 10.1.0.11
  - ...

Phase 3: Move client DHCP pool to new subnet
  - Update DHCP scope to 10.1.0.0/24

Phase 4: Verify all clients migrated
  arp -a | grep "192.168.1" | wc -l   (should be 0)

Phase 5: Remove old primary address
  ! Cisco IOS requires secondaries to be removed before the primary
  no ip address 10.1.0.1 255.255.255.0 secondary
  no ip address 192.168.1.1 255.255.255.0
  ! Configure 10.1.0.1 as the new primary
  ip address 10.1.0.1 255.255.255.0
```

## Step 5: Secondary Addresses with OSPF

Secondary addresses are included in OSPF if the `network` statement covers them:

```text
router ospf 1
  ! Include both primary and secondary subnet in OSPF
  network 192.168.1.0 0.0.0.255 area 0
  network 10.0.0.0 0.0.0.255 area 0

! Or use interface-level OSPF:
interface GigabitEthernet0/0
  ip ospf 1 area 0   ! Includes both primary and secondary
```

Note: OSPF doesn't send Hellos on secondary interfaces, which may affect DR/BDR election.

## Step 6: Linux Secondary Address Configuration

```bash
# Linux: Add secondary IP addresses

ip addr add 10.0.0.1/24 dev eth0        # Primary or additional address
ip addr add 172.16.0.1/24 dev eth0      # Additional address

# View all addresses on eth0
ip addr show eth0

# Remove a secondary address
ip addr del 172.16.0.1/24 dev eth0

# Persist in /etc/network/interfaces (Debian/Ubuntu)
auto eth0
iface eth0 inet static
    address 192.168.1.1
    netmask 255.255.255.0
    up ip addr add 10.0.0.1/24 dev eth0    # Add on interface up
    down ip addr del 10.0.0.1/24 dev eth0  # Remove on interface down
```

## Conclusion

Secondary IPv4 addresses allow a single router interface to serve as the gateway for multiple subnets. Configure with `ip address X.X.X.X mask secondary` on Cisco IOS. They're most useful for gradual network migrations (add new subnet, migrate devices, remove old subnet) and for serving DHCP on multiple subnets without sub-interfaces. Verify secondary addresses with `show ip interface <name>` (not `show ip interface brief` which only shows the primary).
