# How to Configure WireGuard AllowedIPs for IPv4 Split Tunneling

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: WireGuard, VPN, IPv4, Split Tunneling, Networking, Routing

Description: Understand how WireGuard's AllowedIPs field controls IPv4 routing and how to configure split tunneling to send only selected traffic through the VPN.

The `AllowedIPs` field in a WireGuard peer configuration is both an access control list and a routing directive. Understanding it is key to implementing split tunneling - where only certain IPv4 traffic goes through the VPN while everything else continues on the normal internet connection.

## How AllowedIPs Works

WireGuard uses `AllowedIPs` in two ways:

1. **Outbound (client side):** Routes matching these CIDRs are directed through the WireGuard interface.
2. **Inbound (server side):** Only packets sourced from these IPs are accepted from this peer.

## Full Tunnel vs. Split Tunnel

```text
Full Tunnel:  AllowedIPs = 0.0.0.0/0   → All IPv4 traffic goes through VPN
Split Tunnel: AllowedIPs = 10.0.0.0/24 → Only VPN subnet traffic goes through VPN
```

## Configuring Split Tunneling on the Client

To route only corporate or private subnet traffic through the VPN, list only those CIDRs:

```ini
# /etc/wireguard/wg0.conf (client - split tunnel)

[Interface]
PrivateKey = <CLIENT_PRIVATE_KEY>
Address = 10.0.0.2/24

[Peer]
PublicKey = <SERVER_PUBLIC_KEY>
Endpoint = 203.0.113.1:51820

# Only route the internal corporate subnets through the VPN

# Everything else (internet traffic) bypasses the VPN
AllowedIPs = 10.0.0.0/24, 192.168.10.0/24, 172.16.20.0/22

PersistentKeepalive = 25
```

## Excluding Specific Subnets from a Full Tunnel

If you want a full tunnel but need to exclude a few CIDRs (e.g., your home network), use an online WireGuard AllowedIPs calculator such as the one from Pro Custodibus (https://www.procustodibus.com/blog/2021/03/wireguard-allowedips-calculator/) to compute the complement of `0.0.0.0/0` minus the subnets you want to exclude.

For example, excluding `192.168.1.0/24` from `0.0.0.0/0` produces a list of CIDRs that, together, cover the entire IPv4 address space except for `192.168.1.0/24`. Paste the resulting CIDRs into the `AllowedIPs` field on the client peer.

## Example: Route Only Private RFC 1918 Ranges Through VPN

```ini
# Route all private IPv4 space through the VPN, leave public internet direct
AllowedIPs = 10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16
```

## Verifying Routing on the Client

After bringing up the interface, confirm that the expected routes are installed:

```bash
# View routes associated with the wg0 interface
ip route show dev wg0

# Expected output for the split tunnel example:
# 10.0.0.0/24 dev wg0 proto kernel scope link src 10.0.0.2
# 192.168.10.0/24 dev wg0 scope link
# 172.16.20.0/22 dev wg0 scope link
```

## Key Takeaway

Split tunneling with WireGuard is purely a function of the `AllowedIPs` list. Keep it minimal for performance and privacy, or use `0.0.0.0/0` for security-focused environments where all traffic should traverse the encrypted tunnel.
