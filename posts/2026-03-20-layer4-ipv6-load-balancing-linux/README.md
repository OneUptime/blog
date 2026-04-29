# How to Configure Layer 4 IPv6 Load Balancing on Linux

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, Layer 4, Load Balancing, Linux, IPVS, Ip6tables, Networking

Description: A guide to configuring Layer 4 IPv6 load balancing on Linux using IPVS, nftables, and ip6tables for TCP and UDP traffic distribution.

Layer 4 load balancing distributes TCP and UDP traffic based on source/destination IP and port without inspecting application-layer content. Linux provides multiple approaches for IPv6 Layer 4 load balancing: IPVS (highest performance), nftables (modern and flexible), ip6tables, and HAProxy in TCP mode.

## Method 1: IPVS (Best Performance)

IPVS operates in the kernel and provides the highest performance:

```bash
# Load required modules

sudo modprobe ip_vs ip_vs_rr ip_vs_wrr ip_vs_lc

# Enable IPv6 forwarding for NAT mode
sudo sysctl -w net.ipv6.conf.all.forwarding=1

# TCP load balancing (round-robin)
sudo ipvsadm -A -t [2001:db8::100]:443 -s rr

sudo ipvsadm -a -t [2001:db8::100]:443 -r [2001:db8:1::101]:443 -m
sudo ipvsadm -a -t [2001:db8::100]:443 -r [2001:db8:1::102]:443 -m

# UDP load balancing (DNS)
sudo ipvsadm -A -u [2001:db8::53]:53 -s wrr

sudo ipvsadm -a -u [2001:db8::53]:53 -r [2001:db8:1::53]:53 -m -w 2
sudo ipvsadm -a -u [2001:db8::53]:53 -r [2001:db8:1::54]:53 -m -w 1

# View statistics
sudo ipvsadm -L -n --stats
```

## Method 2: nftables with Load Balancing

nftables supports `numgen` for round-robin distribution and `jhash` for consistent hashing:

```bash
# Create nftables load balancing rules
sudo nft -f - << 'EOF'
table ip6 lb {
    chain prerouting {
        type nat hook prerouting priority dstnat;

        # Round-robin across 3 servers
        ip6 daddr 2001:db8::100 tcp dport 80 \
            dnat to numgen inc mod 3 map {
                0 : 2001:db8:1::101,
                1 : 2001:db8:1::102,
                2 : 2001:db8:1::103
            }
    }

    chain postrouting {
        type nat hook postrouting priority srcnat;
        # Masquerade client traffic toward the backend subnet
        ip6 daddr 2001:db8:1::/64 oifname "eth1" masquerade
    }
}
EOF
```

## Method 3: Consistent Hash Load Balancing (nftables)

Consistent hashing ensures the same client always goes to the same server:

```bash
sudo nft -f - << 'EOF'
table ip6 lb_hash {
    chain prerouting {
        type nat hook prerouting priority dstnat;

        # Hash based on source IP (same client → same server)
        ip6 daddr 2001:db8::100 tcp dport 80 \
            dnat to jhash ip6 saddr mod 2 map {
                0 : 2001:db8:1::101,
                1 : 2001:db8:1::102
            }
    }
}
EOF
```

## Method 4: ip6tables DNAT

```bash
# Enable IPv6 forwarding
sudo sysctl -w net.ipv6.conf.all.forwarding=1

# DNAT to alternate between two servers using statistic module
sudo ip6tables -t nat -A PREROUTING \
  -d 2001:db8::100 -p tcp --dport 80 \
  -m statistic --mode nth --every 2 --packet 0 \
  -j DNAT --to-destination [2001:db8:1::101]:80

sudo ip6tables -t nat -A PREROUTING \
  -d 2001:db8::100 -p tcp --dport 80 \
  -j DNAT --to-destination [2001:db8:1::102]:80

# Masquerade client traffic toward the backend subnet
sudo ip6tables -t nat -A POSTROUTING \
  -d 2001:db8:1::/64 -o eth1 \
  -j MASQUERADE
```

## Method 5: HAProxy (TCP Mode)

```text
# /etc/haproxy/haproxy.cfg

global
    daemon
    maxconn 50000

defaults
    mode tcp
    timeout connect 5s
    timeout client 30s
    timeout server 30s

frontend ipv6_frontend
    bind [2001:db8::100]:443
    default_backend ipv6_backend

backend ipv6_backend
    balance roundrobin
    server s1 [2001:db8:1::101]:443 check
    server s2 [2001:db8:1::102]:443 check
    server s3 [2001:db8:1::103]:443 check
```

## Choosing the Right Method

| Method | Throughput | Flexibility | Health Check | Complexity |
|---|---|---|---|---|
| IPVS | Highest (kernel) | Medium | External needed | Low |
| nftables | High (kernel) | High | External needed | Medium |
| ip6tables | High (kernel) | Medium | External needed | Low |
| HAProxy TCP | Medium | High | Built-in | Low |

For maximum throughput: IPVS + keepalived (for VIP failover + health checking)
For flexibility: nftables
For simplicity: HAProxy

Layer 4 IPv6 load balancing on Linux is well-supported across all methods, with IPVS providing the best performance for high-traffic scenarios.
