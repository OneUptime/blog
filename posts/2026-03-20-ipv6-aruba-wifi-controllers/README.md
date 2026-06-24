# How to Configure IPv6 on Aruba Wi-Fi Controllers

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, Aruba, Wi-Fi, Wireless Controller, AOS, SLAAC, DHCPv6

Description: Configure IPv6 support on Aruba wireless controllers and AOS, including management interface IPv6 addressing, RA forwarding to wireless clients, and IPv6 firewall policies.

---

Aruba Networks (HPE) wireless controllers running AOS support IPv6 for management interfaces, client addressing, and inter-controller communication. In tunnel-forwarded deployments, APs tunnel client traffic back to the controller, so IPv6 services and policy can be centralized there.

## Aruba Controller Management IPv6

```bash
# AOS CLI - Configure IPv6 on management VLAN

# Enter configuration mode

(Aruba) # configure terminal

# Enable IPv6 globally first
(Aruba) (config) # ipv6 enable

# On 7000/7200 controllers, reboot after enabling IPv6 globally.

# Configure IPv6 address on VLAN interface
(Aruba) (config) # interface vlan 1
(Aruba) (config-subif)# ipv6 address 2001:db8:0:100::2/64

# Set IPv6 default gateway
(Aruba) (config) # ipv6 default-gateway 2001:db8:0:100::1 1

# Optional: configure IPv6 on the out-of-band management interface (7000 Series)
(Aruba) (config) # interface mgmt
(Aruba) (config-subif)# ipv6 address 2001:db8:0:100::10/64

# Save configuration
(Aruba) (config) # write memory
```

## Configure DHCPv6 Server on Aruba Controller

```bash
# Enable DHCPv6 globally in the WebUI before using DHCPv6 pools.

# Create IPv6 DHCP pool for wireless clients
(Aruba) (config) # ipv6 dhcp pool CORP-WIRELESS
(Aruba) (config-ipv6-pool)# domain-name example.com
(Aruba) (config-ipv6-pool)# dns-server 2001:4860:4860::8888
(Aruba) (config-ipv6-pool)# dns-server 2001:4860:4860::8844
(Aruba) (config-ipv6-pool)# lease 0 1 0 0
(Aruba) (config-ipv6-pool)# network 2001:db8:0:10::/64

# Assign pool to interface
(Aruba) (config) # interface vlan 10
(Aruba) (config-subif)# ipv6 address 2001:db8:0:10::1/64
(Aruba) (config-subif)# ipv6 dhcp server CORP-WIRELESS
(Aruba) (config-subif)# ipv6 nd ra enable
(Aruba) (config-subif)# ipv6 nd ra managed-config-flag
(Aruba) (config-subif)# ipv6 nd ra other-config-flag
```

## Configure RA on Aruba for SLAAC

```bash
# Configure Router Advertisement on VLAN interface for SLAAC
(Aruba) (config) # interface vlan 10
(Aruba) (config-subif)# ipv6 nd ra enable
(Aruba) (config-subif)# ipv6 nd ra prefix 2001:db8:0:10::/64
(Aruba) (config-subif)# ipv6 nd ra interval 30 10
(Aruba) (config-subif)# ipv6 nd ra life-time 1800

# Stateless mode (SLAAC only, DNS via RA)
(Aruba) (config-subif)# no ipv6 nd ra managed-config-flag
(Aruba) (config-subif)# no ipv6 nd ra other-config-flag
(Aruba) (config-subif)# ipv6 nd ra dns 2001:4860:4860::8888

# Verify RA configuration
(Aruba) # show ipv6 interface
(Aruba) # show ipv6 ra status
```

## Aruba IPv6 Firewall Policy

```bash
# Create IPv6 firewall policy for wireless clients
(Aruba) (config) # ip access-list session V6-WIRELESS-POLICY
(Aruba) (config-sess-nacl)# ipv6 any any svc-v6-icmp permit
(Aruba) (config-sess-nacl)# ipv6 any any svc-v6-dhcp permit
(Aruba) (config-sess-nacl)# ipv6 any any svc-https permit
(Aruba) (config-sess-nacl)# ipv6 any any svc-http permit
(Aruba) (config-sess-nacl)# ipv6 any any svc-dns permit
(Aruba) (config-sess-nacl)# ipv6 any any any deny

# Apply to user role
(Aruba) (config) # user-role wireless-employee
(Aruba) (config-role)# session-acl V6-WIRELESS-POLICY position 1
```

## Aruba ClearPass for IPv6 Client Tracking

```bash
# ClearPass Network Access Control tracks IPv6 clients

# Verify ClearPass sees IPv6 addresses
# Admin > Endpoint > Endpoints
# Filter by: IP Address contains "2001:"

# RADIUS accounting shows IPv6 attributes:
# Framed-IPv6-Address (Attribute 168)
# Framed-IPv6-Prefix (Attribute 97)

# Verify the attributes in Access Tracker > Request Details > Accounting
```

## Aruba ArubaOS 8.x IPv6 Show Commands

```bash
# Show IPv6 global status
show ipv6 global

# Show all IPv6 addresses on controller
show ipv6 interface brief

# Show IPv6 routing table
show ipv6 route

# Show IPv6 DHCP leases issued
show ipv6 dhcp binding

# Show configured IPv6 neighbors
show ipv6 neighbors

# Show wireless clients with IPv6
show ipv6 user-table

# Show RA status
show ipv6 ra status

# Ping IPv6 from controller
ping ipv6 2606:4700:4700::1111

# Trace path over IPv6
tracepath 2001:db8:0:100::1
```

## Aruba Instant (IAP) IPv6

```bash
# For Aruba Instant (controller-less) APs:

# Access IAP CLI
ssh admin@ap-ip-address

# Enable dual-stack mode
(Instant AP)(config)# ip-mode v4-prefer

# Configure the virtual controller IPv6 address
(Instant AP)(config)# virtual-controller-ipv6 2001:db8:0:20::10

# Commit the change
(Instant AP)(config)# end
(Instant AP)# commit apply

# Verify
(Instant AP)# show ipv6 interface brief
```

Aruba Wi-Fi controller IPv6 deployment requires configuring IPv6 on VLAN interfaces, enabling RA for default-router and prefix advertisement, and optionally attaching a DHCPv6 pool. In tunnel-forwarded deployments, user roles and session ACLs are enforced centrally on the controller; bridge-mode WLANs do not centralize all client IPv6 traffic there.
