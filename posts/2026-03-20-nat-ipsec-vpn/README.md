# How to Use NAT with IPsec VPN Tunnels

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Networking, NAT, IPsec, VPN, Linux

Description: Learn how NAT interacts with IPsec VPN tunnels, how to configure NAT exemptions, and how to handle NAT-T for IPsec through NAT devices.

## NAT and IPsec Fundamentals

IPsec has inherent conflicts with NAT because:

1. **ESP (IP Protocol 50)** - no port numbers, so PAT cannot track sessions
2. **IKE integrity checks** - some IPsec modes verify packet headers including IPs
3. **AH (Authentication Header)** - cryptographically signs the IP header; NAT breaks it

## IPsec NAT Traversal (NAT-T)

NAT-T (RFC 3947) wraps ESP packets in UDP on port 4500, allowing PAT to track them:

```text
Without NAT-T:   [IP Header][ESP Header][Encrypted Payload]
With NAT-T:      [IP Header][UDP:4500][NAT-T Header][ESP][Encrypted Payload]
```

IKE (UDP 500) detects NAT presence by comparing internal IP with external IP. If different, it switches to NAT-T mode.

## Configuring IPsec with NAT-T on Linux (strongSwan)

```bash
# /etc/ipsec.conf

conn site-to-site
    type=tunnel
    keyexchange=ikev2
    left=192.168.1.1           # Local private IP
    leftid=203.0.113.1         # Public IP identity
    leftsubnet=192.168.1.0/24
    right=198.51.100.1         # Remote gateway
    rightsubnet=10.0.0.0/24
    forceencaps=yes            # Force NAT-T even if NAT not detected
    ike=aes256-sha256-modp2048!
    esp=aes256-sha256!
    auto=start
```

## NAT Exemptions (No-NAT Rules)

When traffic through an IPsec tunnel should **not** be NAT'd, add exemption rules:

### iptables Exemption

```bash
# Mark IPsec traffic to bypass MASQUERADE
iptables -t nat -I POSTROUTING -s 192.168.1.0/24 -d 10.0.0.0/24 \
    -m policy --dir out --pol ipsec \
    -j ACCEPT

# Or use RETURN to skip NAT for tunnel traffic
iptables -t nat -I POSTROUTING 1 \
    -s 192.168.1.0/24 -d 10.0.0.0/24 \
    -j RETURN

# Then standard MASQUERADE for everything else
iptables -t nat -A POSTROUTING -s 192.168.1.0/24 -o eth1 -j MASQUERADE
```

### nftables Exemption

```bash
table inet nat {
    chain postrouting {
        type nat hook postrouting priority 100;
        
        # Exclude IPsec tunnel traffic from NAT
        ip saddr 192.168.1.0/24 ip daddr 10.0.0.0/24 return
        
        # NAT everything else
        ip saddr 192.168.1.0/24 oifname "eth1" masquerade
    }
}
```

## NAT for Overlapping Subnets in IPsec

If both VPN endpoints use the same subnet (e.g., both use 192.168.1.0/24), use NAT to translate:

```bash
# Translate local 192.168.1.0/24 to 10.100.1.0/24 before entering tunnel
iptables -t nat -A POSTROUTING -s 192.168.1.0/24 -d 10.0.0.0/24 \
    -j NETMAP --to 10.100.1.0/24

# Translate incoming 10.100.1.0/24 back to 192.168.1.0/24
iptables -t nat -A PREROUTING -s 10.0.0.0/24 -d 10.100.1.0/24 \
    -j NETMAP --to 192.168.1.0/24
```

## Allowing IPsec Through a Firewall

```bash
# Allow IKE (key exchange)
iptables -A INPUT -p udp --dport 500 -j ACCEPT
iptables -A INPUT -p udp --dport 4500 -j ACCEPT

# Allow ESP protocol
iptables -A INPUT -p esp -j ACCEPT

# Allow forwarding of tunneled traffic
iptables -A FORWARD -m policy --dir in --pol ipsec -j ACCEPT
iptables -A FORWARD -m policy --dir out --pol ipsec -j ACCEPT
```

## Key Takeaways

- IPsec uses NAT-T (UDP 4500) to traverse NAT devices - ensure port 4500 is open.
- Add NAT exemptions so traffic going through IPsec tunnels is not also SNAT'd.
- `forceencaps=yes` in strongSwan forces NAT-T even when NAT is not detected.
- Overlapping subnets in IPsec can be handled by NATting one side to a different range.

**Related Reading:**

- [How to Configure NAT for VPN Passthrough](https://oneuptime.com/blog/post/2026-03-20-nat-vpn-passthrough/view)
- [How to Configure NAT on Linux Using iptables](https://oneuptime.com/blog/post/2026-03-20-nat-linux-iptables/view)
- [How to Troubleshoot NAT Translation Issues](https://oneuptime.com/blog/post/2026-03-20-troubleshoot-nat-translation/view)
