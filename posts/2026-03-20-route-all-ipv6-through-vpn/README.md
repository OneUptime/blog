# How to Route All IPv6 Traffic Through a VPN Tunnel

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, VPN, Routing, Full Tunnel, Network Security, Privacy

Description: A guide to configuring various VPN clients to route all IPv6 traffic through the tunnel, preventing IPv6 from bypassing VPN protection.

Routing all IPv6 traffic through a VPN requires specific configuration for each VPN protocol. Without explicit configuration, many VPN setups only route IPv4 traffic through the tunnel, leaving IPv6 unprotected. This guide covers per-VPN configuration for full IPv6 routing.

## Why All IPv6 Must Be Routed Through VPN

A split configuration where IPv4 goes through VPN but IPv6 goes direct exposes:
- Your real IPv6 address to every site you visit
- IPv6 traffic to your ISP's monitoring
- Potentially different geographic routing for IPv6

## WireGuard: Route All IPv6

```ini
# /etc/wireguard/wg0.conf

[Interface]
Address = 10.0.0.2/32
Address = fd42:42:42::2/128
PrivateKey = <private-key>
DNS = 8.8.8.8, 2001:4860:4860::8888

[Peer]
PublicKey = <server-public-key>
Endpoint = vpn.example.com:51820

# Include ::/0 to route ALL IPv6

AllowedIPs = 0.0.0.0/0, ::/0

PersistentKeepalive = 25
```

```bash
# Verify all IPv6 routes through wg0
ip -6 route show table all | grep 'default.*wg0'
# Expected with wg-quick: default dev wg0 table 51820 ...
```

## OpenVPN: Route All IPv6

```ini
# /etc/openvpn/client.conf

client
dev tun

remote vpn.example.com 1194 udp6

ca ca.crt
cert client.crt
key client.key

# Route IPv6 Internet traffic through tunnel
redirect-gateway ipv6

pull
```

Server must provide IPv6 addressing and can push the IPv6 route:
```ini
# Server config:
push "redirect-gateway ipv6"
server-ipv6 fd42:100:200::/64
```

## IPsec (strongSwan swanctl): Route All IPv6

```conf
# /etc/swanctl/swanctl.conf

connections {
    full-tunnel {
        version = 2
        remote_addrs = vpn.example.com
        vips = ::

        local {
            auth = eap-mschapv2
        }

        remote {
            auth = pubkey
            certs = server-cert.pem
        }

        children {
            all-traffic {
                # Route all IPv6 through tunnel
                local_ts = dynamic
                remote_ts = ::/0
                mode = tunnel
            }
        }
    }
}
```

## Verifying Full IPv6 Tunnel

```bash
# Verify IPv6 default route points to VPN
ip -6 route show table all | grep -E 'default|::/0|2000::/4|3000::/4'

# For WireGuard:
# default dev wg0 table 51820 ...

# For OpenVPN:
# 2000::/4 and 3000::/4 routes via tun0 ... (metric varies by OS/config)

# Test that IPv6 traffic exits through the VPN
curl -6 https://ifconfig.co
# Should return the VPN exit IPv6 address, not your ISP-assigned address

# Confirm no IPv6 leaks
ping -6 -c 2 2001:4860:4860::8888   # Should work (through VPN)
traceroute -6 2001:4860:4860::8888  # Should show the VPN path, not your local ISP path
```

## Kill Switch for IPv6

If the VPN disconnects, block all IPv6 traffic:

```bash
# Create kill switch rules (run before connecting to VPN)
VPN_SERVER_IPV6="<your-vpn-server-ipv6>"
VPN_IFACE="wg0"       # Use tun0 for OpenVPN
VPN_PORT="51820"      # Use 1194 for OpenVPN UDP

sudo ip6tables -A OUTPUT -o lo -j ACCEPT
sudo ip6tables -A OUTPUT -p ipv6-icmp --icmpv6-type router-solicitation -j ACCEPT
sudo ip6tables -A OUTPUT -p ipv6-icmp --icmpv6-type neighbor-solicitation -j ACCEPT
sudo ip6tables -A OUTPUT -p ipv6-icmp --icmpv6-type neighbor-advertisement -j ACCEPT
sudo ip6tables -A OUTPUT -d "$VPN_SERVER_IPV6" -p udp --dport "$VPN_PORT" -j ACCEPT
sudo ip6tables -A OUTPUT -o "$VPN_IFACE" -j ACCEPT    # Allow through VPN
sudo ip6tables -A OUTPUT -j DROP                       # Block all other IPv6
```

## NetworkManager Configuration

For GUI-managed VPNs:

```bash
# For WireGuard in NetworkManager
# Ensure the WireGuard peer's AllowedIPs include ::/0
nmcli connection modify "WireGuard VPN" \
  ipv6.never-default no \
  wireguard.peer-routes yes \
  wireguard.ip6-auto-default-route yes

# For OpenVPN in NetworkManager
# Enable "Use this connection only for resources on its network" = OFF
# This allows pushed default routes, including IPv6, to be used
```

## Testing Full IPv6 Routing

```bash
#!/bin/bash
# test-full-ipv6-vpn.sh

VPN_EXIT_IPV6="<expected-vpn-exit-ipv6>"

echo "Testing IPv6 routing through VPN..."

# Get current exit IPv6
MY_IPV6=$(curl -s -6 https://ifconfig.co 2>/dev/null)

if [ "$MY_IPV6" = "$VPN_EXIT_IPV6" ]; then
    echo "PASS: IPv6 exits at VPN exit ($MY_IPV6)"
elif [ -z "$MY_IPV6" ]; then
    echo "INFO: No IPv6 connectivity (may be blocked)"
else
    echo "FAIL: IPv6 exits at $MY_IPV6 (not expected VPN exit)"
fi
```

Full IPv6 tunnel routing is essential for any deployment where consistent security policy for all traffic is required, whether for privacy, compliance, or enterprise security requirements.
