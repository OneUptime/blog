# How to Configure DHCPv6 Relay on MikroTik

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MikroTik, DHCPv6, Relay, RouterOS, Networking, IPv6

Description: Configure DHCPv6 relay on MikroTik RouterOS to forward DHCPv6 messages from clients to remote DHCPv6 servers.

## DHCPv6 Relay on MikroTik RouterOS

MikroTik RouterOS 7.x includes native DHCPv6 relay support:

```text
# RouterOS CLI - Add DHCPv6 relay

# Step 1: Assign IPv6 address to client-facing interface

/ipv6 address
add address=2001:db8:1::1/64 interface=ether2 advertise=no

# Step 2: Configure DHCPv6 relay
/ipv6 dhcp-relay
add name=relay-ether2 \
    interface=ether2 \
    dhcp-server=2001:db8:100::10 \
    link-address=2001:db8:1::1

# Verify relay configuration
/ipv6 dhcp-relay print detail
```

## Multiple Subnets with DHCPv6 Relay

```text
# Relay on multiple client interfaces to the same server
/ipv6 dhcp-relay
add name=relay-vlan10 interface=vlan10 dhcp-server=2001:db8:100::10 link-address=2001:db8:10::1
add name=relay-vlan20 interface=vlan20 dhcp-server=2001:db8:100::10 link-address=2001:db8:20::1
add name=relay-vlan30 interface=vlan30 dhcp-server=2001:db8:100::10 link-address=2001:db8:30::1

# Print all relay configurations
/ipv6 dhcp-relay print
```

## Router Advertisement Configuration (M/O flags)

```text
# Configure RA to tell clients to use DHCPv6
/ipv6 nd
add interface=ether2 \
    managed-address-configuration=yes \
    other-configuration=yes \
    advertise-dns=yes

# For stateless DHCPv6 (address via SLAAC, options via DHCPv6)
# update the same ND entry
/ipv6 nd
set [find interface=ether2] \
    managed-address-configuration=no \
    other-configuration=yes

# Prefix advertisement
/ipv6 nd prefix
add interface=ether2 prefix=2001:db8:1::/64 autonomous=yes on-link=yes
```

## Firewall Rules for DHCPv6 Relay

```text
# Allow DHCPv6 relay traffic
/ipv6 firewall filter

# Allow incoming DHCPv6 from clients (UDP 546→547)
add chain=input \
    protocol=udp src-port=546 dst-port=547 \
    in-interface=ether2 \
    comment="DHCPv6 from clients" \
    action=accept

# Allow outgoing relay messages to server (UDP 547→547)
add chain=output \
    protocol=udp src-port=547 dst-port=547 \
    dst-address=2001:db8:100::10 \
    comment="DHCPv6 relay to server" \
    action=accept

# Allow relay replies from server (UDP 547→547)
add chain=input \
    protocol=udp src-port=547 dst-port=547 \
    src-address=2001:db8:100::10 \
    comment="DHCPv6 reply from server" \
    action=accept

# Allow relay replies back to clients if output filtering is used (UDP 547→546)
add chain=output \
    protocol=udp src-port=547 dst-port=546 \
    out-interface=ether2 \
    comment="DHCPv6 relay reply to clients" \
    action=accept
```

## Monitoring DHCPv6 Relay

```text
# Show relay status
/ipv6 dhcp-relay print detail

# Monitor DHCPv6 activity via logging
/system logging
add topics=dhcp,debug action=memory

# View DHCPv6 log
/log print where topics~"dhcp"

# Check IPv6 neighbors on the client-facing link
/ipv6 neighbor print where interface=ether2

# Monitor with packet sniffer (Winbox alternative: Tools > Packet Sniffer)
/tool/sniffer/quick interface=ether2 ip-protocol=udp port=546,547
```

## Winbox / WebFig Configuration

Via Winbox GUI:
1. Navigate to **IPv6 → DHCP Relay**
2. Click **Add** (blue **+** button)
3. Set:
   - **Name**: relay-ether2
   - **Interface**: ether2 (client-facing)
   - **DHCP Server**: 2001:db8:100::10
   - **Link Address**: 2001:db8:1::1
4. Click **OK**

## Troubleshooting

```text
# Check relay is enabled
/ipv6 dhcp-relay print detail
# Should show "disabled=no"

# Enable relay if disabled
/ipv6 dhcp-relay enable [find name=relay-ether2]

# Trigger a client renew and inspect DHCP logs
/log print where topics~"dhcp"
# If relay is working, you should see relay messages for the client

# Verify DHCP server reachable
/ping address=2001:db8:100::10 src-address=2001:db8:1::1 count=3

# Check routing to DHCP server
/ipv6 route print where dst-address~"2001:db8:100::"
```

## Conclusion

MikroTik RouterOS 7.x provides simple DHCPv6 relay via the `/ipv6 dhcp-relay` menu with `interface`, `dhcp-server`, and `link-address` parameters. The link address should identify the client-facing link and should normally be a globally scoped address from that subnet, such as the router's IPv6 address on the client-facing interface. Configure RA flags to match the client behavior you want: use `managed-address-configuration=yes` for stateful DHCPv6 addressing, or `other-configuration=yes` for stateless DHCPv6 options alongside SLAAC. Firewall rules should allow client-to-relay traffic on UDP 547, relay-to-server traffic on UDP 547, and, if the output chain is filtered, relay replies back to clients on UDP 546.
