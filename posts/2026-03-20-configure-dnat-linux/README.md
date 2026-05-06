# How to Configure Destination NAT (DNAT) on Linux

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Networking, NAT, DNAT, Linux, iptables

Description: Learn how to configure Destination NAT (DNAT) on Linux using iptables and nftables to redirect incoming traffic to different hosts or ports.

## What Is DNAT?

Destination NAT (DNAT) modifies the **destination IP address** (and optionally port) of packets. It is commonly applied in the PREROUTING chain, before routing decisions are made. For locally-generated traffic, it can also be applied in the OUTPUT chain.

**Use cases:**
- Port forwarding to internal servers
- Load balancing across backend servers
- Transparent proxying
- Redirecting traffic to a local process

## Basic DNAT with iptables

```bash
# Enable IP forwarding

echo 1 > /proc/sys/net/ipv4/ip_forward

# Forward incoming port 80 to 192.168.1.10:80
iptables -t nat -A PREROUTING -i eth1 -p tcp --dport 80 \
    -j DNAT --to-destination 192.168.1.10:80

# Allow new forwarded traffic to the internal server
iptables -A FORWARD -i eth1 -o eth0 -p tcp -d 192.168.1.10 --dport 80 \
    -m conntrack --ctstate NEW -j ACCEPT

# Allow return traffic
iptables -A FORWARD -i eth0 -o eth1 \
    -m conntrack --ctstate ESTABLISHED,RELATED -j ACCEPT
```

## DNAT to a Different Port

```bash
# External 2222 → Internal 192.168.1.20:22 (SSH)
iptables -t nat -A PREROUTING -i eth1 -p tcp --dport 2222 \
    -j DNAT --to-destination 192.168.1.20:22

iptables -A FORWARD -i eth1 -o eth0 -p tcp -d 192.168.1.20 --dport 22 \
    -m conntrack --ctstate NEW -j ACCEPT

iptables -A FORWARD -i eth0 -o eth1 \
    -m conntrack --ctstate ESTABLISHED,RELATED -j ACCEPT
```

## DNAT Based on Destination IP

```bash
# Only DNAT traffic arriving for specific public IP
iptables -t nat -A PREROUTING -i eth1 \
    -d 203.0.113.10 -p tcp --dport 80 \
    -j DNAT --to-destination 192.168.1.10:80
```

## DNAT with Port Range

```bash
# Forward ports 8000-8010 to backend
iptables -t nat -A PREROUTING -i eth1 -p tcp --dport 8000:8010 \
    -j DNAT --to-destination 192.168.1.10
```

## DNAT for Local Redirect (OUTPUT Chain)

For locally-generated traffic (not arriving on an external interface):

```bash
# Redirect outgoing traffic to port 80 to a local transparent proxy (port 3128)
iptables -t nat -A OUTPUT -p tcp --dport 80 \
    -j DNAT --to-destination 127.0.0.1:3128
```

## DNAT with nftables

```bash
table ip nat {
    chain prerouting {
        type nat hook prerouting priority -100;
        
        # Basic port forward
        iifname "eth1" tcp dport 80 dnat to 192.168.1.10:80
        
        # External port 2222 → internal SSH
        iifname "eth1" tcp dport 2222 dnat to 192.168.1.20:22
        
        # Multiple ports
        iifname "eth1" tcp dport { 80, 443 } dnat to 192.168.1.10
    }
}
```

## Transparent Proxy with DNAT

```bash
# Exclude a specific LAN host from the proxy
iptables -t nat -A PREROUTING -i eth0 -s 192.168.1.50 -p tcp --dport 80 -j RETURN

# Redirect all other HTTP traffic from LAN to local Squid proxy
iptables -t nat -A PREROUTING -i eth0 -p tcp --dport 80 \
    -j DNAT --to-destination 192.168.1.1:3128
```

## Verifying DNAT Rules

```bash
# List PREROUTING chain
iptables -t nat -L PREROUTING -n -v

# Test port forward from external
nc -zv 203.0.113.1 80
curl http://203.0.113.1

# View active DNAT connections
conntrack -L --dst-nat
```

## Key Takeaways

- DNAT usually modifies destination IP/port in PREROUTING before routing, and can also be used in OUTPUT for locally generated traffic.
- If your FORWARD policy is restrictive, add a corresponding FORWARD rule to allow the DNAT'd traffic to pass.
- nftables DNAT syntax: `dnat to IP:port` or `dnat to IP`.
- DNAT in OUTPUT chain redirects locally generated traffic.

**Related Reading:**

- [How to Configure Source NAT (SNAT) on Linux](https://oneuptime.com/blog/post/2026-03-20-configure-snat-linux/view)
- [How to Set Up Port Forwarding with NAT](https://oneuptime.com/blog/post/2026-03-20-port-forwarding-nat/view)
- [How to Configure NAT on Linux Using iptables](https://oneuptime.com/blog/post/2026-03-20-nat-linux-iptables/view)
