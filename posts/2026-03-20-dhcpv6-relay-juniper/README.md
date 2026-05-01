# How to Configure DHCPv6 Relay on Juniper

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Juniper, DHCPv6, Relay, Junos, MX, EX, Networking

Description: Configure DHCPv6 relay on Juniper MX and EX series devices to forward DHCPv6 messages from client subnets to remote DHCPv6 servers.

## DHCPv6 Relay on Juniper Junos

Juniper implements DHCPv6 relay through the `forwarding-options dhcp-relay dhcpv6` configuration hierarchy:

```text
# Basic DHCPv6 relay - Junos MX

# Forward from clients on ge-0/0/1.0 to server at 2001:db8::10

set forwarding-options dhcp-relay dhcpv6 server-group DHCP-SERVERS 2001:db8::10
set forwarding-options dhcp-relay dhcpv6 group CLIENT-RELAY active-server-group DHCP-SERVERS
set forwarding-options dhcp-relay dhcpv6 group CLIENT-RELAY interface ge-0/0/1.0
```

## Complete DHCPv6 Relay Configuration

```text
# Full Junos configuration for DHCPv6 relay

# Define DHCPv6 server group
set forwarding-options dhcp-relay dhcpv6 server-group DHCP-SERVERS 2001:db8::10
set forwarding-options dhcp-relay dhcpv6 server-group DHCP-SERVERS 2001:db8::11

# Create relay group
set forwarding-options dhcp-relay dhcpv6 group CLIENTS active-server-group DHCP-SERVERS

# Client-facing interfaces
set forwarding-options dhcp-relay dhcpv6 group CLIENTS interface ge-0/0/1.0
set forwarding-options dhcp-relay dhcpv6 group CLIENTS interface ge-0/0/2.0
set forwarding-options dhcp-relay dhcpv6 group CLIENTS interface irb.100

# Add interface ID option (Option 18) for subscriber identification
set forwarding-options dhcp-relay dhcpv6 group CLIENTS relay-agent-interface-id
```

## DHCPv6 Relay with VRF (Routing Instances)

```text
# Relay in specific routing instance (VRF)
set routing-instances Tenant1 forwarding-options dhcp-relay dhcpv6 server-group DHCP-SERVERS 2001:db8::10
set routing-instances Tenant1 forwarding-options dhcp-relay dhcpv6 group CLIENT-RELAY active-server-group DHCP-SERVERS
set routing-instances Tenant1 forwarding-options dhcp-relay dhcpv6 group CLIENT-RELAY interface irb.100
```

## RA (Router Advertisement) Configuration for DHCPv6

```text
# Configure RA flags to direct clients to use DHCPv6
# M-flag=1: use DHCPv6 for addresses
# O-flag=1: use DHCPv6 for other info only

# Managed (full DHCPv6) - M-flag
set protocols router-advertisement interface ge-0/0/1.0 managed-configuration

# Other (stateless DHCPv6) - O-flag
set protocols router-advertisement interface ge-0/0/1.0 other-stateful-configuration

# Advertise the on-link prefix
set protocols router-advertisement interface ge-0/0/1.0 prefix 2001:db8:1::/64

# RA interval
set protocols router-advertisement interface ge-0/0/1.0 max-advertisement-interval 60
set protocols router-advertisement interface ge-0/0/1.0 min-advertisement-interval 20
```

## EX Series (Switch) DHCPv6 Relay

```text
# Juniper EX switch - VLAN-based DHCPv6 relay
set vlans CLIENTS-VLAN vlan-id 100
set vlans CLIENTS-VLAN l3-interface irb.100

# SVI (IRB) for client VLAN
set interfaces irb unit 100 family inet6 address 2001:db8:1::1/64

# DHCPv6 relay on IRB interface
set forwarding-options dhcp-relay dhcpv6 server-group DHCP-SERVERS 2001:db8::10
set forwarding-options dhcp-relay dhcpv6 group VLAN-RELAY active-server-group DHCP-SERVERS
set forwarding-options dhcp-relay dhcpv6 group VLAN-RELAY interface irb.100
```

## Verification Commands

```text
# Show DHCPv6 relay statistics
show dhcpv6 relay statistics

# Show relay bindings
show dhcpv6 relay binding

# Show configured server groups
show configuration forwarding-options dhcp-relay dhcpv6 server-group

# Show relay groups and interfaces
show configuration forwarding-options dhcp-relay dhcpv6 group

# Monitor relay traffic in real-time
monitor traffic interface ge-0/0/1 detail matching "udp port 547"

# System log for DHCPv6 relay
show log messages | match DHCPV6

# Clear statistics
clear dhcpv6 relay statistics
```

## Troubleshooting

```text
# Check relay configuration
show configuration forwarding-options dhcp-relay dhcpv6 | display set

# Verify server reachability
ping 2001:db8::10 count 5

# Check for relay drops
show dhcpv6 relay statistics | match drop

# Enable DHCPv6 tracing
set forwarding-options dhcp-relay dhcpv6 group CLIENTS interface ge-0/0/1.0 trace
```

## Conclusion

Juniper DHCPv6 relay uses the `forwarding-options dhcp-relay dhcpv6` configuration hierarchy. Server groups can contain multiple servers for redundancy. VRF-aware relay uses per-instance `forwarding-options`. Always configure RA on the client-facing interface so hosts learn the prefix and default gateway, and use the M or O flag as needed to direct clients to DHCPv6. The `relay-agent-interface-id` setting adds Option 18 to relay messages, providing the server with the relay interface identifier for per-subscriber policy. Use `show dhcpv6 relay statistics` to monitor message flow.
