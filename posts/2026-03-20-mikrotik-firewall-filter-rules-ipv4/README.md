# How to Configure Firewall Filter Rules for IPv4 on MikroTik

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MikroTik, RouterOS, Firewall, IPv4, Security, Filter Rules

Description: Configure MikroTik RouterOS firewall filter rules to protect the router and LAN from unauthorized IPv4 access, using the forward, input, and output chains with stateful connection tracking.

## Introduction

MikroTik's firewall filter processes packets in three chains: `input` (to the router), `forward` (through the router), and `output` (from the router). Rules are evaluated top-to-bottom; the first match wins.

## Basic Stateful Firewall for the Router

```mikrotik
# Chain: input - protect the router itself

# Accept established/related connections (stateful return traffic)

/ip firewall filter add \
  chain=input \
  connection-state=established,related \
  action=accept \
  comment="Allow established"

# Drop invalid connections
/ip firewall filter add \
  chain=input \
  connection-state=invalid \
  action=drop \
  comment="Drop invalid"

# Accept from LAN (management)
/ip firewall filter add \
  chain=input \
  src-address=192.168.1.0/24 \
  action=accept \
  comment="Allow LAN mgmt"

# Accept ICMP ping
/ip firewall filter add \
  chain=input \
  protocol=icmp \
  action=accept \
  comment="Allow ICMP"

# Drop all other input
/ip firewall filter add \
  chain=input \
  action=drop \
  comment="Drop all other input"
```

## Forward Chain - LAN to Internet

```mikrotik
# Allow established forwarded connections
/ip firewall filter add \
  chain=forward \
  connection-state=established,related \
  action=accept \
  comment="Forward established"

# Drop invalid forwarded
/ip firewall filter add \
  chain=forward \
  connection-state=invalid \
  action=drop

# Allow LAN to internet
/ip firewall filter add \
  chain=forward \
  src-address=192.168.1.0/24 \
  out-interface=ether1 \
  action=accept \
  comment="LAN to Internet"

# Block everything else forwarded
/ip firewall filter add \
  chain=forward \
  action=drop \
  comment="Drop unmatched forward"
```

## Block Specific IP or Subnet

```mikrotik
/ip firewall filter add \
  chain=forward \
  src-address=10.10.5.100 \
  action=drop \
  comment="Block rogue host" \
  place-before=0
```

## Rate Limit New Connections

```mikrotik
# Rate limit new SSH connections (anti-brute force)
# Accept up to 3 new connections per minute per source IP
/ip firewall filter add \
  chain=input \
  protocol=tcp \
  dst-port=22 \
  connection-state=new \
  dst-limit=3/1m,3,src-address/1m \
  action=accept \
  comment="Allow SSH within rate limit"

# Drop new SSH connections that exceed the rate limit
/ip firewall filter add \
  chain=input \
  protocol=tcp \
  dst-port=22 \
  connection-state=new \
  action=drop \
  comment="Drop excess SSH attempts"
```

## View and Manage Rules

```mikrotik
# Show all filter rules with stats
/ip firewall filter print stats

# Disable a rule by number
/ip firewall filter disable 5

# Move rule to position 0
/ip firewall filter move 5 destination=0

# Remove rule
/ip firewall filter remove 5
```

## Conclusion

MikroTik firewall filter rules use connection tracking to efficiently handle return traffic. Always accept `established,related` before any drop rules, drop `invalid` connections, and end each chain with a catch-all drop. Use `connection-state=new` to apply rate limiting only to new connections without impacting established flows.
