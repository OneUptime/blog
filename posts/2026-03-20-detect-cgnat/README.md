# How to Detect If You Are Behind Carrier-Grade NAT (CGNAT)

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Networking, NAT, CGNAT, IPv4, ISP

Description: Learn how to detect if your ISP is placing you behind Carrier-Grade NAT and what it means for port forwarding and hosting services.

## What Is CGNAT?

Carrier-Grade NAT (CGNAT), also called Large-Scale NAT (LSN), is NAT performed by your ISP before traffic reaches your home router. Many ISPs assign you a **shared address** from the 100.64.0.0/10 range (RFC 6598) instead of a public IPv4 address.

```text
[Your PC]          [Your Router]    [ISP CGNAT]       [Internet]
192.168.1.10 → NAT → 100.64.x.x → NAT → 203.0.113.1 → 8.8.8.8
```

## CGNAT Address Range

The shared address space defined in RFC 6598:

```text
100.64.0.0/10 (100.64.0.0 – 100.127.255.255)
```

This range is specifically reserved for ISP CGNAT use and is not routable on the internet.

## Method 1: Check Your Router's WAN IP

```python
# Check if your router's WAN IP is in 100.64.0.0/10
# Look up the WAN/Internet IP in your router UI, then test it

import ipaddress

def is_cgnat(ip_str):
    ip = ipaddress.ip_address(ip_str)
    cgnat = ipaddress.ip_network('100.64.0.0/10')
    private_ranges = [
        ipaddress.ip_network('10.0.0.0/8'),
        ipaddress.ip_network('172.16.0.0/12'),
        ipaddress.ip_network('192.168.0.0/16'),
    ]
    if ip in cgnat:
        return "CGNAT (100.64.0.0/10)"
    for r in private_ranges:
        if ip in r:
            return f"Private ({r})"
    return "Public IP"

# Check your router's WAN IP
wan_ip = "100.64.0.1"  # example
print(f"{wan_ip}: {is_cgnat(wan_ip)}")
```

## Method 2: Compare Router WAN IP to External IP

```bash
# Get your router's WAN IP (varies by router)
# Many routers expose this at 192.168.1.1 under WAN settings

# Get external IPv4 (what the internet sees for IPv4)
curl -4 -s https://ifconfig.me/ip

# If router WAN IPv4 ≠ external IPv4: you're behind upstream NAT (CGNAT or double NAT)
# If router WAN IPv4 = external IPv4: you have a public IPv4
```

## Method 3: traceroute Analysis

```bash
# Run traceroute to an internet host
traceroute 8.8.8.8

# Indicators of CGNAT:
# - First hop: your router (often 192.168.1.1)
# - An early ISP-side hop in 100.64.x.x strongly suggests CGNAT
# - Some ISPs hide or filter these hops, so traceroute alone is not definitive

# Example CGNAT traceroute:
# 1. 192.168.1.1
# 2. 100.64.1.1     ← shared address space inside ISP
# 3. 203.0.113.1    ← ISP infrastructure / public side
```

## Method 4: Try Port Forwarding Test

```bash
# Set up a listener on your machine
python3 -m http.server 8080

# Configure port forward on your router: WAN:8080 → LAN:8080
# Then test from outside (use your phone on mobile data)
curl http://YOUR_EXTERNAL_IP:8080

# If you can't reach it even with correct port forwarding and host firewall rules,
# you're likely behind CGNAT or another upstream NAT
```

## What CGNAT Prevents

- Hosting public servers (web, game, VPN)
- Port forwarding that works from outside the ISP network
- Pointing a public DNS A record directly at your home connection
- Running a personal VPN server

## Workarounds for CGNAT

1. **Request a public IP from ISP** - many offer it as an upgrade
2. **Use a VPN with port forwarding** - some providers, such as AirVPN, offer port forwarding through their servers
3. **Use a cloud relay** - route traffic through a VPS (frp, ngrok, bore)
4. **IPv6** - IPv6 can avoid IPv4 CGNAT for IPv6 traffic, though inbound access still depends on firewall rules

## Key Takeaways

- CGNAT commonly uses the 100.64.0.0/10 range (RFC 6598 shared address space).
- If your router's WAN IPv4 is in 100.64.0.0/10, you're behind CGNAT. If it differs from your external IPv4, you're behind upstream NAT (CGNAT or double NAT).
- traceroute showing 100.64.x.x as an early hop strongly suggests CGNAT.
- Contact your ISP for a public IP, or use cloud relay/IPv6 as workarounds.

**Related Reading:**

- [How to Work Around CGNAT for Port Forwarding](https://oneuptime.com/blog/post/2026-03-20-cgnat-workaround-port-forwarding/view)
- [How to Diagnose and Fix Double NAT Problems](https://oneuptime.com/blog/post/2026-03-20-double-nat-problems/view)
