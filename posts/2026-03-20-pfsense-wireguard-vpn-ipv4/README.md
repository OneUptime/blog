# How to Configure WireGuard VPN for IPv4 on pfSense

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: pfSense, WireGuard, IPv4, VPN, Remote Access, Security

Description: Configure WireGuard VPN on pfSense for IPv4 remote access, including tunnel interface creation, peer configuration, routing, and firewall rules.

## Introduction

WireGuard is a modern, high-performance VPN protocol available on pfSense via the WireGuard package. It uses UDP and asymmetric cryptography with minimal configuration compared to OpenVPN.

## Step 1: Install WireGuard Package

Navigate to **System > Packages > Available Packages**:
- Install: `WireGuard`

(Earlier base-system WireGuard support was removed after pfSense Plus 21.02-p1 / pfSense CE 2.5.0; on current pfSense releases, install the package.)

## Step 2: Create WireGuard Tunnel

Navigate to **VPN > WireGuard > Tunnels > Add Tunnel**:

```text
Description:   WG Remote Access

Listen port:   51820
Interface keys: Generate (creates server public/private key pair)
```

Copy the **Public Key** - clients need this.

## Step 3: Add Client Peer

Navigate to **VPN > WireGuard > Peers > Add Peer**:

```text
Description:    Laptop-Alice
Dynamic Endpoint: checked
Public key:     <Alice's WireGuard public key>
Allowed IPs:    10.6.0.2/32   (this client's tunnel IP)
Endpoint:       (leave blank for road warrior - dynamic IP)
Keepalive:      25
```

## Step 4: Assign WireGuard Interface

If **System > Routing** is using an automatic default gateway, set it to your WAN gateway before assigning the WireGuard interface.

Navigate to **Interfaces > Assignments**:
- Add `tun_wg0` → creates `OPT2` (or similar)

Navigate to **Interfaces > OPT2**:
- Enable: checked
- IPv4 Configuration Type: Static IPv4
- IPv4 Address: `10.6.0.1/24`

## Step 5: Firewall Rules

Navigate to **Firewall > Rules > WAN > Add**:
```text
Action: Pass
Protocol: UDP
Destination: WAN address
Destination port: 51820
Description: Allow WireGuard
```

Navigate to **Firewall > Rules > OPT2 (WG) > Add**:
```text
Action: Pass
Source: any
Destination: any
Description: Allow WireGuard clients to LAN
```

## Client Configuration

```ini
[Interface]
PrivateKey = <Alice's private key>
Address = 10.6.0.2/24
DNS = 10.6.0.1

[Peer]
PublicKey = <pfSense WireGuard public key>
Endpoint = 203.0.113.1:51820
AllowedIPs = 0.0.0.0/0         # Full tunnel (all traffic via VPN)
# AllowedIPs = 10.6.0.1/32, 192.168.1.0/24  # Split tunnel (tunnel IP + LAN only)

PersistentKeepalive = 25
```

## Generate Client Keys

```bash
# On the client machine
wg genkey | tee privatekey | wg pubkey > publickey
cat privatekey   # Use in [Interface] PrivateKey
cat publickey    # Add to pfSense peer configuration
```

## Verify WireGuard

Navigate to **VPN > WireGuard > Status**:
- Shows connected peers, transfer stats, last handshake time

```bash
# pfSense shell (console/SSH or Diagnostics > Command Prompt)
wg show tun_wg0
wg show tun_wg0 latest-handshakes
```

## Conclusion

WireGuard on pfSense requires creating a tunnel, adding client peers with their public keys, assigning the tunnel as an interface with a static IP, and adding firewall rules for UDP/51820 inbound and forwarding from WireGuard clients. Client configurations are minimal - 10–15 lines of INI-format config.
