# How to Configure NAT Reflection on Your Firewall

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Networking, NAT, Firewall, pfSense, Linux

Description: Learn how to configure NAT reflection (loopback) on pfSense, Linux, and other firewalls so internal hosts can access services via their public IP.

## What Is NAT Reflection?

NAT reflection (also called NAT loopback or hairpin NAT) allows hosts inside your network to connect to internal services using the **external/public IP address**. Without it, accessing your server via your domain name from the same network fails.

**Problem scenario:**
- Web server: 192.168.1.10 (private)
- Public DNS: `myserver.example.com` → 203.0.113.1 (public IP)
- From inside: `curl http://myserver.example.com` → fails

**With NAT reflection:**
- Request to 203.0.113.1 from inside is "reflected" back to 192.168.1.10

## pfSense NAT Reflection Configuration

pfSense has built-in NAT reflection support:

1. Go to **System → Advanced → Firewall & NAT**
2. Find **Network Address Translation** section
3. Set **NAT Reflection mode for port forwards**:
   - **Disabled** - no reflection (default)
   - **NAT + Proxy** - uses a proxy daemon, works with split DNS
   - **Pure NAT** - uses iptables-style NAT, more reliable
4. Check **Enable automatic outbound NAT for Reflection**
5. Click **Save**

**Recommendation**: Use **Pure NAT** mode for most configurations.

## Linux iptables NAT Reflection

```bash
# Assumption:

# eth0 = LAN interface (192.168.1.1/24)
# eth1 = WAN interface
# Web server: 192.168.1.10:80
# Public IP: 203.0.113.1

# Standard port forward (for external access)
iptables -t nat -A PREROUTING -i eth1 -p tcp --dport 80 \
    -j DNAT --to-destination 192.168.1.10:80

# NAT Reflection DNAT (for internal access via public IP)
iptables -t nat -A PREROUTING -i eth0 -d 203.0.113.1 -p tcp --dport 80 \
    -j DNAT --to-destination 192.168.1.10:80

# NAT Reflection MASQUERADE (for correct return path)
iptables -t nat -A POSTROUTING -s 192.168.1.0/24 -d 192.168.1.10 \
    -p tcp --dport 80 \
    -j MASQUERADE

# Allow forwarded traffic
iptables -A FORWARD -i eth0 -d 192.168.1.10 -p tcp --dport 80 -j ACCEPT
```

## Linux nftables NAT Reflection

```bash
table inet nat {
    chain prerouting {
        type nat hook prerouting priority -100;
        
        # External access
        iifname "eth1" tcp dport 80 dnat to 192.168.1.10:80
        
        # NAT reflection (internal clients using public IP)
        iifname "eth0" ip daddr 203.0.113.1 tcp dport 80 dnat to 192.168.1.10:80
    }
    chain postrouting {
        type nat hook postrouting priority 100;
        
        # Standard outbound NAT
        oifname "eth1" masquerade
        
        # Reflection: masquerade source for internal hairpin traffic
        ip saddr 192.168.1.0/24 ip daddr 192.168.1.10 tcp dport 80 masquerade
    }
}
```

## Better Alternative: Split DNS

Instead of NAT reflection, use **Split DNS** to return the private IP for internal queries:

```bash
# Example with dnsmasq:
# /etc/dnsmasq.conf
address=/myserver.example.com/192.168.1.10

# Internal clients get 192.168.1.10 directly
# External clients get 203.0.113.1 from public DNS
```

Split DNS avoids the complexity of NAT reflection entirely.

## Testing NAT Reflection

```bash
# From inside network, access service via public IP
curl -v http://203.0.113.1
# Should reach 192.168.1.10 web server

# Or via domain name (if DNS resolves to public IP)
curl -v http://myserver.example.com
```

## Key Takeaways

- NAT reflection allows internal clients to reach internal services using public IPs.
- pfSense supports it natively under System → Advanced → Firewall & NAT.
- Linux requires both DNAT on the LAN interface and MASQUERADE for return traffic.
- Split DNS is often a cleaner alternative to NAT reflection for production environments.

**Related Reading:**

- [How to Configure Hairpin NAT for Internal Access to Public Services](https://oneuptime.com/blog/post/2026-03-20-hairpin-nat-internal-access/view)
- [How to Understand NAT Hairpinning and Loopback](https://oneuptime.com/blog/post/2026-03-20-nat-hairpinning-loopback/view)
- [How to Set Up NAT with pfSense](https://oneuptime.com/blog/post/2026-03-20-nat-pfsense-setup/view)
