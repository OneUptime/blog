# How to Set Up Port Forwarding with IPv6 at Home

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, Port Forwarding, Firewall, Home Router, Remote Access

Description: Understand how to enable inbound access to home services over IPv6, which differs fundamentally from IPv4 port forwarding.

## IPv6 Port Forwarding is Different

In IPv4, port forwarding translates a public port to an internal private address (NAT). In typical home IPv6 deployments, there is usually no NAT - devices can have globally routable addresses. So "port forwarding" in IPv6 means creating a firewall rule that allows inbound traffic to reach a specific device and port.

Think of it as: IPv4 = Port Forwarding, IPv6 = Firewall Allow Rule.

## Step 1: Find Your Device's IPv6 Address

First, identify the static or consistent IPv6 address of the device you want to expose:

```bash
# Linux server: find global IPv6 address

ip -6 addr show scope global

# For home lab server
# Assign a static or reserved address for consistency (see home lab guide)
```

Note: SLAAC temporary/privacy addresses can change. Assign a static or reserved address for any service you want to expose consistently.

## Step 2: OpenWrt Firewall Allow Rule

On OpenWrt, add a firewall rule to allow inbound access:

```text
# /etc/config/firewall

config rule
    option name         'Allow-HomeServer-HTTPS'
    option family       'ipv6'
    option src          'wan'
    option dest         'lan'
    option dest_ip      '2001:db8:1::10'       # Your server's IPv6 address
    option dest_port    '443'
    option proto        'tcp'
    option target       'ACCEPT'
```

Apply: `service firewall restart`

## Step 3: Allowing Access on Common Router UIs

**Asus Router (ASUSWRT):**
1. Advanced Settings → Firewall → General
2. Enable IPv6 Firewall if needed, then add an inbound rule:
   - Local IP: Your server's IPv6 address
   - Port Range: Service port
   - Protocol: Matching protocol

**UniFi Dream Machine:**
1. Settings → Security → Firewall (or Firewall & Security on older controllers)
2. Create an IPv6 inbound allow rule/policy for Internet v6 / External → Internal
3. Destination: Your server's /128 address
4. Port: Your service port
5. Action: Accept/Allow

**TP-Link Advanced Routers:**
1. Advanced → IPv6
2. In Firewall Rules, click Add
3. Set the service name, port/protocol, and Internal IP to your server's IPv6 address

## Step 4: Test the Rule

From an external network (mobile data, different WiFi):

```bash
# Test TCP connectivity to your service
nc -zv -6 your-server-ipv6 443

# Or curl (skip certificate verification when testing by IP literal)
curl -6 -vk https://[2001:db8:1::10]/

# Or nmap from a remote server
nmap -6 -p 443 2001:db8:1::10
```

## Step 5: Dynamic IPv6 Address Problem

If your ISP changes your prefix regularly, your device's IPv6 address changes too. Solutions:

**Option 1: Dynamic DNS with IPv6 (DDNS)**

Services like Hurricane Electric's `dns.he.net` support AAAA record DDNS:

```bash
# Update DDNS on address change (run via cron or network hook)
#!/bin/bash
IPV6=$(ip -6 -o addr show dev eth0 scope global | awk '!/temporary/ {print $4; exit}' | cut -d/ -f1)
curl "https://dyn.dns.he.net/nic/update?hostname=myserver.dyn.example.com&password=mypass&myip=$IPV6"
```

**Option 2: Use a DHCPv6 reservation or fixed host identifier**

If your router supports it, configure a reservation or fixed host identifier for a specific server so the host portion stays consistent even if the delegated prefix changes.

## IPv6 vs IPv4 Port Forwarding Comparison

| Feature | IPv4 Port Forwarding | IPv6 Firewall Allow |
|---------|---------------------|---------------------|
| NAT needed | Yes | Usually no |
| Device address | Private (RFC1918) | Global (public) |
| Configuration | Router NAT table | Router firewall rule |
| Multiple services same port | One device per port | Unlimited (each device has unique IP) |

## Conclusion

IPv6 "port forwarding" is usually just a firewall allow rule - the device usually already has a globally routable address, so you only need to permit inbound traffic. This is simpler than IPv4 NAT and allows unlimited services on the same port across different devices. The main challenge is ensuring device addresses are stable, which requires stable address assignment.
