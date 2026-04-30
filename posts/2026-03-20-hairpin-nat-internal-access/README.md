# How to Configure Hairpin NAT for Internal Access to Public Services

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Networking, NAT, Hairpin NAT, Linux, pfSense

Description: Learn how to configure hairpin NAT (NAT loopback) so internal clients can reach internal servers using their public IP address.

## What Is Hairpin NAT?

Hairpin NAT (also called NAT loopback or NAT reflection) allows internal clients to reach internal servers using the **public/external IP address** instead of the private IP.

**Problem without hairpin NAT:**

```text
Client (192.168.1.50) → DNS returns → 203.0.113.1 (public IP)
Client sends to 203.0.113.1 → router → does not loop the traffic back to the internal server
```

**With hairpin NAT:**

```text
Client (192.168.1.50) → 203.0.113.1 → router hairpins → 192.168.1.10 (web server)
```

## Configuring Hairpin NAT on Linux

```bash
# Interfaces:

# eth0 = LAN (192.168.1.1/24)
# eth1 = WAN (203.0.113.1/24)
# Web server: 192.168.1.10:80

# DNAT: Incoming port 80 → web server (already exists for external access)
iptables -t nat -A PREROUTING -i eth1 -d 203.0.113.1 -p tcp --dport 80 \
    -j DNAT --to-destination 192.168.1.10:80

# Hairpin DNAT: Internal clients accessing public IP
iptables -t nat -A PREROUTING -i eth0 -d 203.0.113.1 -p tcp --dport 80 \
    -j DNAT --to-destination 192.168.1.10:80

# SNAT for hairpin: Rewrite the source to the router's LAN IP so replies return through it
iptables -t nat -A POSTROUTING -o eth0 -s 192.168.1.0/24 -d 192.168.1.10 -p tcp --dport 80 \
    -j SNAT --to-source 192.168.1.1

# Forward rule
iptables -A FORWARD -i eth0 -d 192.168.1.10 -p tcp --dport 80 -j ACCEPT
```

The key is the POSTROUTING source NAT rule: it rewrites the source IP so the web server sends replies back to the router (which then forwards to the client) instead of trying to reply directly.

## Hairpin NAT with nftables

```bash
# `table inet nat` for stateful NAT requires Linux kernel 5.2+
table inet nat {
    chain prerouting {
        type nat hook prerouting priority -100;
        # External access
        iifname "eth1" ip daddr 203.0.113.1 tcp dport 80 dnat ip to 192.168.1.10:80
        # Hairpin access from LAN
        iifname "eth0" ip daddr 203.0.113.1 tcp dport 80 dnat ip to 192.168.1.10:80
    }
    chain postrouting {
        type nat hook postrouting priority 100;
        # Standard outbound NAT
        ip saddr 192.168.1.0/24 oifname "eth1" masquerade
        # Hairpin SNAT
        ip saddr 192.168.1.0/24 ip daddr 192.168.1.10 tcp dport 80 oifname "eth0" snat ip to 192.168.1.1
    }
}
```

## Hairpin NAT on pfSense

1. Go to **System → Advanced → Firewall & NAT**
2. Under **Network Address Translation**, set **NAT Reflection mode for port forwards**: `Pure NAT`
3. Check **Enable NAT Reflection for 1:1 NAT**
4. Check **Enable automatic outbound NAT for Reflection**
5. Click **Save**

## Hairpin NAT on Cisco

```cisco
! Cisco hairpin NAT is platform-specific.
! Do not assume classic ip nat inside/ip nat outside automatically provides NAT loopback.
! On IOS/IOS XE, review NAT Virtual Interface (NVI) configurations, which use ip nat enable on participating interfaces.

! Verify with:
show ip nat translations
show ip nat statistics
```

## Testing Hairpin NAT

```bash
# From an internal host (192.168.1.50):
curl http://203.0.113.1
# Should reach the internal web server (192.168.1.10)

# If hairpin is not working, try the private IP directly:
curl http://192.168.1.10
# This should work if the service is reachable directly on the LAN
```

## Key Takeaways

- Hairpin NAT allows internal clients to access internal servers via public IP.
- Requires both DNAT (for port forwarding) and source NAT (SNAT or MASQUERADE) for the return path.
- On pfSense, enable NAT Reflection under System → Advanced → Firewall & NAT.
- The source NAT in POSTROUTING for internal → internal traffic is the critical step.

**Related Reading:**

- [How to Set Up Port Forwarding with NAT](https://oneuptime.com/blog/post/2026-03-20-port-forwarding-nat/view)
- [How to Set Up NAT with pfSense](https://oneuptime.com/blog/post/2026-03-20-nat-pfsense-setup/view)
- [How to Understand NAT Hairpinning and Loopback](https://oneuptime.com/blog/post/2026-03-20-nat-hairpinning-loopback/view)
