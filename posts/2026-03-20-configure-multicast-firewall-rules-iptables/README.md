# How to Configure Multicast Firewall Rules in iptables

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Networking, Multicast, iptables, Firewall, Linux, Security

Description: Write iptables rules to allow or restrict IPv4 multicast traffic, permit IGMP control messages, and forward multicast between interfaces on a Linux router.

## Introduction

By default, Linux iptables policies can block multicast traffic if set to DROP. Configuring explicit rules ensures legitimate multicast - such as mDNS, streaming, or routing protocols - flows correctly while unwanted multicast is filtered.

## Allow IGMP Control Messages

IGMP (IP protocol 2) must be permitted for group membership to work:

```bash
# Allow incoming IGMP from any host on all interfaces

sudo iptables -A INPUT -p igmp -j ACCEPT

# Allow outgoing IGMP membership reports
sudo iptables -A OUTPUT -p igmp -j ACCEPT
```

## Allow a Specific Multicast Group

```bash
# Allow UDP traffic to multicast group 239.1.2.3 on port 5000
sudo iptables -A INPUT -d 239.1.2.3 -p udp --dport 5000 -j ACCEPT
```

## Allow All Multicast (Wide-Open Policy)

For a trusted internal network where you want all multicast to flow:

```bash
# Allow all IPv4 multicast in and out
sudo iptables -A INPUT  -d 224.0.0.0/4 -j ACCEPT
sudo iptables -A OUTPUT -d 224.0.0.0/4 -j ACCEPT
```

## Allow Link-Local Multicast Only

Routing protocols (OSPF, EIGRP) and mDNS use 224.0.0.0/24. Allow this range but block routable multicast:

```bash
# Allow link-local multicast
sudo iptables -A INPUT -d 224.0.0.0/24 -j ACCEPT

# Block all other multicast
sudo iptables -A INPUT -d 224.0.0.0/4 -j DROP
```

## Forward Multicast Between Interfaces

On a Linux router or multicast proxy, enable IP forwarding and allow multicast in the FORWARD chain:

```bash
# Enable IP forwarding so the FORWARD chain applies to multicast packets.
# Note: actually routing multicast across subnets also requires a multicast
# routing daemon (e.g. smcroute, pimd, mrouted), which sets mc_forwarding
# automatically via MRT_INIT - the mc_forwarding sysctl itself is read-only.
echo 1 | sudo tee /proc/sys/net/ipv4/ip_forward

# Allow multicast forwarding between eth0 and eth1
sudo iptables -A FORWARD -i eth0 -o eth1 -d 224.0.0.0/4 -j ACCEPT
sudo iptables -A FORWARD -i eth1 -o eth0 -d 224.0.0.0/4 -j ACCEPT
```

## Rate-Limit Multicast Traffic

Prevent a runaway sender from flooding the segment:

```bash
# Limit incoming multicast to 1 Mbit equivalent via packet rate
sudo iptables -A INPUT -d 224.0.0.0/4 \
  -m limit --limit 1000/sec --limit-burst 2000 \
  -j ACCEPT

# Drop excess
sudo iptables -A INPUT -d 224.0.0.0/4 -j DROP
```

## Block Specific Multicast Groups

To deny a specific group while allowing others:

```bash
# Block multicast group 239.99.99.99 specifically
sudo iptables -A INPUT -d 239.99.99.99 -j DROP

# Then allow remaining multicast
sudo iptables -A INPUT -d 224.0.0.0/4 -j ACCEPT
```

## Making Rules Persistent

```bash
# Save current rules (Debian/Ubuntu)
sudo apt install iptables-persistent
sudo netfilter-persistent save

# Save on RHEL/CentOS
sudo service iptables save
```

## Viewing the Multicast Rules

```bash
# List INPUT chain rules with packet/byte counters
sudo iptables -L INPUT -n -v --line-numbers | grep -E "224|igmp|239"
```

## Conclusion

Always explicitly allow IGMP (protocol 2) before setting a DROP default policy, or multicast group membership will silently fail. Use destination address matching with `224.0.0.0/4` for broad multicast rules, and narrow down to specific groups or ports for tighter security.
