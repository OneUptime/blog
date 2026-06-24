# How to Block Unnecessary Broadcast Traffic with Firewall Rules

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Networking, Broadcast, iptables, Firewall, Linux, Security

Description: Use iptables to selectively block unnecessary broadcast traffic such as NetBIOS, unnecessary SSDP, and directed broadcasts while preserving essential services like DHCP and ARP.

## Introduction

Not all broadcast traffic is useful. Legacy protocols like NetBIOS and noisy service discovery traffic waste bandwidth and CPU cycles. Selectively blocking unnecessary broadcast and local multicast traffic with iptables reduces noise without breaking essential network services.

## Essential Broadcasts to Always Allow

Before blocking anything, whitelist what you need:

```bash
# Allow DHCP client traffic if you use a default-deny policy - critical for host boot

sudo iptables -A OUTPUT -p udp --sport 68 --dport 67 -j ACCEPT
sudo iptables -A INPUT  -p udp --sport 67 --dport 68 -j ACCEPT

# Allow ARP - handled at Layer 2, not by iptables, but note here for completeness
# ARP is not filtered by iptables (use arptables for L2 ARP filtering)
```

## Block NetBIOS Broadcasts

NetBIOS name service (port 137) generates heavy broadcast traffic in Windows environments. Unless your network requires it:

```bash
# Block NetBIOS name service broadcasts
sudo iptables -A INPUT -p udp --dport 137 -d 255.255.255.255 -j DROP
sudo iptables -A INPUT -p udp --dport 137 -d 192.168.1.255 -j DROP

# Block NetBIOS datagram broadcasts (port 138)
sudo iptables -A INPUT -p udp --dport 138 -d 255.255.255.255 -j DROP
sudo iptables -A INPUT -p udp --dport 138 -d 192.168.1.255 -j DROP
```

## Block SSDP (UPnP Discovery) Multicast

SSDP uses the multicast group `239.255.255.250:1900` and can generate constant discovery floods:

```bash
# Block SSDP multicast
sudo iptables -A INPUT -p udp --dport 1900 -d 239.255.255.250 -j DROP
sudo iptables -A OUTPUT -p udp --dport 1900 -d 239.255.255.250 -j DROP
```

## Block Directed Broadcasts on Linux Routers

Linux routers do not forward directed broadcasts by default, but you can enforce an explicit drop policy in iptables:

```bash
# Drop directed broadcast packets from being forwarded
# Assumes your LAN subnet is 192.168.0.0/16
sudo iptables -A FORWARD -d 192.168.255.255 -j DROP

# Example for a /24 LAN:
sudo iptables -A FORWARD -d 192.168.1.255 -j DROP

# Or broadly, block all directed broadcast forwarding
sudo iptables -A FORWARD -m addrtype --dst-type BROADCAST -j DROP
```

## Block mDNS on Untrusted Interfaces

mDNS (`224.0.0.251`) should only flow on trusted segments:

```bash
# Block mDNS on the WAN/untrusted interface (eth0)
sudo iptables -A INPUT  -i eth0 -p udp --dport 5353 -j DROP
sudo iptables -A OUTPUT -o eth0 -p udp --dport 5353 -j DROP
```

## Log Before Dropping

Add a LOG rule before DROP to audit what you are blocking:

```bash
# Rate-limit NetBIOS broadcast logs to 5 messages per minute before dropping them
sudo iptables -A INPUT -p udp --dport 137 -d 255.255.255.255 \
  -m limit --limit 5/min \
  -j LOG --log-prefix "NETBIOS-BCAST: " --log-level 4

sudo iptables -A INPUT -p udp --dport 137 -d 255.255.255.255 -j DROP
```

## Save the Rules

```bash
# Persist rules on Debian/Ubuntu if netfilter-persistent is installed
sudo netfilter-persistent save
```

## Summary of Rules

| Protocol | Port | Action | Reason |
|---|---|---|---|
| DHCP | 67/68 | ACCEPT | Essential for host boot |
| NetBIOS NS | 137 | DROP | Unnecessary noise |
| NetBIOS DG | 138 | DROP | Unnecessary noise |
| SSDP | 1900 | DROP | UPnP not needed in most prod environments |
| mDNS | 5353 | DROP on WAN | Should not leave trusted segment |

## Conclusion

Blocking unnecessary broadcast and local multicast traffic at the firewall level reduces unnecessary processing on the systems enforcing the rules and, on routers, can keep noisy traffic from crossing segment boundaries. Always whitelist essential services (DHCP) first, then use targeted DROP rules for specific protocols you have confirmed are unnecessary in your environment.
