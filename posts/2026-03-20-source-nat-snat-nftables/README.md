# How to Configure Source NAT (SNAT) with nftables

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: nftables, Linux, SNAT, NAT, Networking, Firewall

Description: Configure Source NAT (SNAT) with nftables to rewrite the source IP of outgoing packets to a specific static public IP address.

## Introduction

Source NAT (SNAT) rewrites the source IP address of outgoing packets to a fixed IP you specify. Unlike masquerade (which dynamically uses the interface IP), SNAT is preferred when your server has a static public IP. It is slightly more efficient because the kernel does not need to look up the interface address on every packet.

## Prerequisites

- Linux router with a static public IP on the WAN interface (`eth0`) and LAN interface (`eth1`)
- nftables installed
- IP forwarding enabled

## Enable IP Forwarding

```bash
sysctl -w net.ipv4.ip_forward=1
echo "net.ipv4.ip_forward = 1" >> /etc/sysctl.d/99-forwarding.conf
```

## Create the NAT Table and Postrouting Chain

SNAT rules go in the `postrouting` chain, just like masquerade. The key difference is specifying the exact source IP with `snat to`.

```bash
# Create the nat table

nft add table ip nat

# Create the postrouting chain
nft add chain ip nat postrouting { type nat hook postrouting priority 100 \; }

# SNAT: rewrite source IP to 203.0.113.1 for all LAN traffic leaving eth0
nft add rule ip nat postrouting oifname "eth0" snat to 203.0.113.1
```

## SNAT for a Specific Source Subnet Only

If you want SNAT applied only to a particular private subnet:

```bash
# Apply SNAT only to traffic originating from 10.0.0.0/24
nft add rule ip nat postrouting ip saddr 10.0.0.0/24 oifname "eth0" snat to 203.0.113.1
```

## SNAT to an IP Range (Load Distribution)

nftables supports SNAT to a range of source IPs, distributing connections across a pool:

```bash
# SNAT to a range of public IPs
nft add rule ip nat postrouting oifname "eth0" snat to 203.0.113.1-203.0.113.5
```

## Full SNAT Configuration

```bash
#!/usr/sbin/nft -f

flush ruleset

table ip nat {
    chain postrouting {
        type nat hook postrouting priority 100; policy accept;

        # SNAT all private 10.0.0.0/24 traffic to static public IP
        ip saddr 10.0.0.0/24 oifname "eth0" snat to 203.0.113.1
    }
}

table inet filter {
    chain input {
        type filter hook input priority 0; policy drop;

        iifname lo accept
        ct state established,related accept
        ct state invalid drop
        tcp dport 22 accept
    }

    chain forward {
        type filter hook forward priority 0; policy drop;

        # Allow LAN hosts to reach the internet
        iifname "eth1" oifname "eth0" ct state new,established,related accept
        iifname "eth0" oifname "eth1" ct state established,related accept
    }

    chain output {
        type filter hook output priority 0; policy accept;
    }
}
```

## Masquerade vs SNAT

| Feature | Masquerade | SNAT |
|---|---|---|
| Source IP | Dynamic (interface IP) | Fixed (specified) |
| Performance | Slightly lower | Slightly higher |
| Use case | Dynamic IP | Static IP |
| Config | `masquerade` | `snat to <ip>` |

## Verify and Save

```bash
# Check the NAT table
nft list table ip nat

# From a LAN client, check the public IP used
curl -4 ifconfig.me

# Save rules
nft list ruleset > /etc/nftables.conf
systemctl enable nftables
```

## Conclusion

SNAT with nftables provides deterministic source address translation for environments with static public IPs. Use `snat to <address>` in the `postrouting` chain for efficient, fixed-IP NAT. For dynamic IPs, masquerade is more appropriate.
