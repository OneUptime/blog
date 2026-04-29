# How to Set Up NAT Masquerade on MikroTik for IPv4

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MikroTik, RouterOS, NAT, Masquerade, IPv4, Internet Access

Description: Configure NAT masquerade on MikroTik RouterOS to enable multiple LAN hosts to share a single public IPv4 address for internet access, with port forwarding for inbound services.

## Introduction

NAT masquerade on MikroTik dynamically translates private IPv4 source addresses to the router's WAN IP. It is the RouterOS equivalent of Linux `iptables MASQUERADE` and is ideal when the WAN IP is dynamically assigned.

## Basic Masquerade Configuration

```mikrotik
# Enable masquerade for all LAN traffic going out ether1 (WAN)

/ip firewall nat add \
  chain=srcnat \
  out-interface=ether1 \
  action=masquerade \
  comment="NAT Masquerade - Internet"
```

## Masquerade for Specific Source Subnet

```mikrotik
/ip firewall nat add \
  chain=srcnat \
  src-address=192.168.1.0/24 \
  out-interface=ether1 \
  action=masquerade \
  comment="LAN to Internet"
```

## Port Forwarding (Destination NAT)

```mikrotik
# Forward external port 80 to internal web server
/ip firewall nat add \
  chain=dstnat \
  dst-address=203.0.113.2 \
  protocol=tcp \
  dst-port=80 \
  action=dst-nat \
  to-addresses=192.168.1.100 \
  to-ports=80 \
  comment="Forward HTTP to web server"

# Forward SSH on non-standard port
/ip firewall nat add \
  chain=dstnat \
  protocol=tcp \
  dst-port=2222 \
  action=dst-nat \
  to-addresses=192.168.1.200 \
  to-ports=22 \
  comment="SSH port forward"
```

## NAT with src-nat (Static Public IP)

```mikrotik
# When WAN IP is static, use src-nat instead of masquerade
/ip firewall nat add \
  chain=srcnat \
  src-address=192.168.1.0/24 \
  action=src-nat \
  to-addresses=203.0.113.2 \
  comment="Static SNAT"
```

## Hairpin NAT (LAN Access to External IP)

```mikrotik
# Allow LAN hosts to reach internal server via its public IP
# In srcnat (postrouting) the dst-address is the post-dstnat internal IP
/ip firewall nat add \
  chain=srcnat \
  src-address=192.168.1.0/24 \
  dst-address=192.168.1.100 \
  protocol=tcp \
  dst-port=80 \
  action=masquerade \
  comment="Hairpin NAT"
```

## Verify NAT Rules

```mikrotik
# Show all NAT rules
/ip firewall nat print

# Show with statistics (packet/byte counts)
/ip firewall nat print stats

# Show active connections
/ip firewall connection print

# Check if masquerade is translating
/ip firewall connection print where src-address~"192.168.1"
```

## Conclusion

MikroTik NAT masquerade is a single `/ip firewall nat add chain=srcnat action=masquerade` command. Use `masquerade` for dynamic WAN IPs and `src-nat to-addresses` for static WAN IPs. Add `dstnat` rules for port forwarding and verify translations with `/ip firewall connection print`.
