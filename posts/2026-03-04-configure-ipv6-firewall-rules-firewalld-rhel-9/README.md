# How to Configure IPv6 Firewall Rules with firewalld on RHEL 9

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, IPv6, firewalld, Security, Linux

Description: A practical guide to configuring firewalld rules specifically for IPv6 traffic on RHEL 9, covering rich rules, ICMPv6 handling, zone-based policies, and security best practices.

---

One of the nice things about firewalld on RHEL 9 is that it handles both IPv4 and IPv6 by default. When you open a port, it opens on both protocols. But there are situations where you need IPv6-specific rules, and there are IPv6-specific considerations around ICMPv6 that you absolutely must get right or you'll break your network stack.

## How firewalld Handles IPv6

firewalld uses nftables as its backend on RHEL 9. When you add a rule like `--add-service=https`, it creates entries in both the IPv4 and IPv6 tables. This dual-stack behavior is automatic.

```bash
# Verify firewalld is running with nftables backend
sudo firewall-cmd --state
sudo firewall-cmd --get-default-zone

# See the backend in use
grep FirewallBackend /etc/firewalld/firewalld.conf
```

## Understanding ICMPv6 Requirements

This is the single most important thing about IPv6 firewalling. IPv6 relies on ICMPv6 for fundamental operations like Neighbor Discovery, Path MTU Discovery, and Router Advertisements. Blocking ICMPv6 indiscriminately will break your network.

These ICMPv6 types must be allowed:

| Type | Name | Purpose |
|------|------|---------|
| 133 | Router Solicitation | Clients requesting RAs |
| 134 | Router Advertisement | Routers announcing prefixes |
| 135 | Neighbor Solicitation | IPv6 equivalent of ARP |
| 136 | Neighbor Advertisement | Response to NS |
| 2 | Packet Too Big | Path MTU Discovery |

```bash
# Check current ICMPv6 block settings
sudo firewall-cmd --list-icmp-blocks

# firewalld allows essential ICMPv6 by default, but verify
sudo firewall-cmd --get-icmptypes | tr ' ' '\n' | grep -i neigh
```

## Adding IPv6-Specific Rich Rules

Rich rules let you create protocol-specific firewall entries. This is how you write rules that only apply to IPv6 traffic.

```bash
# Allow HTTPS only from a specific IPv6 subnet
sudo firewall-cmd --permanent --add-rich-rule='rule family="ipv6" source address="2001:db8:1::/48" service name="https" accept'

# Block SSH from a specific IPv6 address
sudo firewall-cmd --permanent --add-rich-rule='rule family="ipv6" source address="2001:db8:bad::1/128" service name="ssh" drop'

# Allow a specific port only over IPv6
sudo firewall-cmd --permanent --add-rich-rule='rule family="ipv6" port port="8443" protocol="tcp" accept'

# Apply all changes
sudo firewall-cmd --reload
```

## Rate Limiting ICMPv6

You shouldn't block ICMPv6, but you can rate-limit it to prevent abuse.

```bash
# Rate limit ICMPv6 echo requests (ping6)
sudo firewall-cmd --permanent --add-rich-rule='rule family="ipv6" icmp-type name="echo-request" accept limit value="10/s"'

sudo firewall-cmd --reload
```

## Blocking Specific ICMPv6 Types

Some ICMPv6 types are safe to block. For instance, you might want to block echo requests while keeping the essential NDP types.

```bash
# Block ping6 (echo-request) - safe to block if you don't need it
sudo firewall-cmd --permanent --add-icmp-block=echo-request

# Never block these (they're needed for IPv6 to function):
# - neighbour-solicitation
# - neighbour-advertisement
# - router-solicitation
# - router-advertisement
# - packet-too-big

sudo firewall-cmd --reload
```

## Zone-Based IPv6 Policies

You can assign interfaces to different zones for different security postures.

```bash
# Create a custom zone for an IPv6-only DMZ
sudo firewall-cmd --permanent --new-zone=ipv6-dmz

# Set allowed services in the DMZ zone
sudo firewall-cmd --permanent --zone=ipv6-dmz --add-service=http
sudo firewall-cmd --permanent --zone=ipv6-dmz --add-service=https

# Assign an interface to the zone
sudo firewall-cmd --permanent --zone=ipv6-dmz --change-interface=ens224

# Reload to apply
sudo firewall-cmd --reload

# Verify the zone assignment
sudo firewall-cmd --get-active-zones
```

## Logging IPv6 Traffic

For auditing and troubleshooting, you can log specific IPv6 traffic.

```bash
# Log dropped IPv6 packets from a specific prefix
sudo firewall-cmd --permanent --add-rich-rule='rule family="ipv6" source address="2001:db8:bad::/48" log prefix="IPv6-DROP: " level="warning" drop'

# Log all new IPv6 SSH connections
sudo firewall-cmd --permanent --add-rich-rule='rule family="ipv6" service name="ssh" log prefix="IPv6-SSH: " level="info" accept'

sudo firewall-cmd --reload

# View the logs
journalctl -k | grep "IPv6-"
```

## Allowing IPv6 Forwarding Through the Firewall

If your RHEL 9 box acts as a router, you need to enable forwarding in firewalld as well as in the kernel.

```bash
# Enable masquerading for a zone (IPv6 NAT, though uncommon)
# Note: IPv6 masquerading is rarely needed since addresses are abundant
# More commonly, you just enable forwarding:

# Check if forwarding is enabled in the zone
sudo firewall-cmd --zone=public --query-masquerade

# For inter-zone forwarding, use policy objects (RHEL 9 / firewalld 1.0+)
sudo firewall-cmd --permanent --new-policy=forward-traffic
sudo firewall-cmd --permanent --policy=forward-traffic --add-ingress-zone=internal
sudo firewall-cmd --permanent --policy=forward-traffic --add-egress-zone=external
sudo firewall-cmd --permanent --policy=forward-traffic --set-target=ACCEPT
sudo firewall-cmd --reload
```

## Viewing Current IPv6 Rules

To see what is actually in effect:

```bash
# List everything in the active zone
sudo firewall-cmd --list-all

# List rich rules specifically
sudo firewall-cmd --list-rich-rules

# See the raw nftables rules for IPv6
sudo nft list table inet firewalld
```

## Security Best Practices for IPv6 Firewalling

1. **Don't block all ICMPv6.** This cannot be overstated. It breaks NDP and PMTUD.

2. **Filter by source prefix.** Use your assigned prefixes in rich rules to limit access.

3. **Block bogon IPv6 ranges** on external interfaces:

```bash
# Block traffic from documentation/example ranges on external interfaces
sudo firewall-cmd --permanent --zone=external --add-rich-rule='rule family="ipv6" source address="2001:db8::/32" drop'

# Block deprecated 6to4 relay addresses
sudo firewall-cmd --permanent --zone=external --add-rich-rule='rule family="ipv6" source address="2002::/16" drop'

sudo firewall-cmd --reload
```

4. **Use connection tracking.** firewalld uses stateful inspection by default, so return traffic is automatically allowed.

## Testing Your Rules

Always verify your rules work as expected.

```bash
# From another machine, test IPv6 connectivity to allowed services
curl -6 https://[2001:db8:1::50]:443

# Test that blocked traffic is actually blocked
ping6 -c 2 2001:db8:1::50

# Watch the firewall log for drops
journalctl -kf | grep IPv6
```

## Wrapping Up

Firewalling IPv6 on RHEL 9 with firewalld is straightforward once you internalize two things: rules apply to both protocols by default, and ICMPv6 is not optional. Use rich rules with `family="ipv6"` when you need protocol-specific filtering, keep essential ICMPv6 types open, and test your rules from both sides. The zone and policy model in firewalld gives you plenty of flexibility for even complex network architectures.
