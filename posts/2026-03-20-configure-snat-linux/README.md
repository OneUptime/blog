# How to Configure Source NAT (SNAT) on Linux

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Networking, NAT, SNAT, Linux, iptables

Description: Learn how to configure Source NAT (SNAT) on Linux using iptables and nftables to translate outbound traffic source addresses.

## What Is SNAT?

Source NAT (SNAT) modifies the **source IP address** of outgoing packets. It is applied in the POSTROUTING chain, after the routing decision has been made.

**Use cases:**
- Translate private IPs to a public IP for internet access
- Make multiple internal hosts appear as a single IP
- Override source IP for policy routing

## SNAT vs MASQUERADE

| Feature | SNAT | MASQUERADE |
|---------|------|-----------|
| Source IP | Fixed (specified) | Dynamic (interface's current IP) |
| Performance | Slightly faster | Slightly slower (checks IP each packet) |
| Best for | Static public IP | DHCP/dynamic public IP |

## Basic SNAT with iptables

```bash
# Enable IP forwarding

echo 1 > /proc/sys/net/ipv4/ip_forward

# Translate all traffic from 192.168.1.0/24 to 203.0.113.1 on eth1
iptables -t nat -A POSTROUTING -s 192.168.1.0/24 -o eth1 \
    -j SNAT --to-source 203.0.113.1
```

## SNAT to an IP Range

```bash
# Distribute outbound traffic across multiple public IPs
iptables -t nat -A POSTROUTING -s 192.168.1.0/24 -o eth1 \
    -j SNAT --to-source 203.0.113.1-203.0.113.10
```

## SNAT for a Specific Host

```bash
# Only translate traffic from 192.168.1.50
iptables -t nat -A POSTROUTING -s 192.168.1.50 -o eth1 \
    -j SNAT --to-source 203.0.113.5
```

## SNAT for Specific Protocol and Port

```bash
# SNAT only for HTTP traffic
iptables -t nat -A POSTROUTING -s 192.168.1.0/24 -o eth1 \
    -p tcp --dport 80 \
    -j SNAT --to-source 203.0.113.1

# SNAT all other traffic with MASQUERADE
iptables -t nat -A POSTROUTING -s 192.168.1.0/24 -o eth1 \
    -j MASQUERADE
```

## SNAT with nftables

```bash
table ip nat {
    chain postrouting {
        type nat hook postrouting priority srcnat;
        
        # SNAT all LAN traffic
        ip saddr 192.168.1.0/24 oifname "eth1" snat to 203.0.113.1
        
        # SNAT range
        # ip saddr 192.168.1.0/24 oifname "eth1" snat to 203.0.113.1-203.0.113.10
    }
}
```

## SNAT for Return Traffic (Policy Routing)

In multi-ISP setups, you may need to SNAT traffic through the correct interface:

```bash
# Traffic going out eth1 uses IP1, traffic out eth2 uses IP2
iptables -t nat -A POSTROUTING -o eth1 -j SNAT --to-source 203.0.113.1
iptables -t nat -A POSTROUTING -o eth2 -j SNAT --to-source 198.51.100.1
```

## Verifying SNAT

```bash
# List POSTROUTING rules
iptables -t nat -L POSTROUTING -n -v

# Watch active SNAT sessions
conntrack -L | grep ESTABLISHED | grep "src=192.168" | head -10

# From an inside host, verify translated IP
curl https://ifconfig.me
# Should return 203.0.113.1
```

## Persistent Configuration

```bash
# Ubuntu/Debian
iptables-save > /etc/iptables/rules.v4
apt install iptables-persistent
netfilter-persistent save

# RHEL/CentOS
service iptables save
```

## Key Takeaways

- SNAT modifies source IP in POSTROUTING after routing decisions.
- Use SNAT for static public IPs; use MASQUERADE for dynamic IPs.
- `--to-source IP1-IP2` distributes outbound traffic across multiple public IPs.
- SNAT rules are evaluated in order; the first match wins.

**Related Reading:**

- [How to Configure Destination NAT (DNAT) on Linux](https://oneuptime.com/blog/post/2026-03-20-configure-dnat-linux/view)
- [How to Configure PAT (Port Address Translation)](https://oneuptime.com/blog/post/2026-03-20-configure-pat-nat-overload/view)
- [How to Configure NAT on Linux Using iptables](https://oneuptime.com/blog/post/2026-03-20-nat-linux-iptables/view)
