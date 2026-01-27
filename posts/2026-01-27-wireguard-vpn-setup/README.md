# How to Set Up WireGuard VPN for Secure Networking

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: WireGuard, VPN, Networking, Security, Linux

Description: Learn how to set up WireGuard VPN for secure point-to-point and site-to-site connections, including key generation, peer configuration, and routing.

---

> WireGuard uses state-of-the-art cryptography with a minimal attack surface. Its simplicity makes it easier to audit, deploy, and maintain than traditional VPN solutions.

## What is WireGuard and Why Use It

WireGuard is a modern VPN protocol designed to be faster, simpler, and leaner than IPsec or OpenVPN. It lives in the Linux kernel (since version 5.6) and uses proven cryptographic primitives: Curve25519 for key exchange, ChaCha20 for encryption, Poly1305 for authentication, and BLAKE2s for hashing.

Key advantages:

- **Minimal codebase:** Around 4,000 lines of code compared to hundreds of thousands in OpenVPN/IPsec
- **Fast connections:** Roaming-friendly with seamless IP changes
- **Cryptokey routing:** Associates public keys with allowed IP ranges
- **Low overhead:** Excellent performance even on embedded devices

Use WireGuard when you need secure connectivity between servers, remote workers, or entire sites without the complexity of traditional VPN stacks.

## Installing WireGuard

WireGuard is available in most package managers.

```bash
# Debian/Ubuntu
sudo apt update && sudo apt install wireguard

# RHEL/CentOS/Rocky (EPEL required)
sudo dnf install epel-release
sudo dnf install wireguard-tools

# Arch Linux
sudo pacman -S wireguard-tools

# macOS
brew install wireguard-tools

# Verify installation
wg --version
```

On older kernels without native support, the wireguard-dkms package compiles the module. For production, use a kernel 5.6 or newer where WireGuard is built in.

## Key Generation

WireGuard uses asymmetric cryptography. Each peer needs a private key (kept secret) and a public key (shared with peers).

```bash
# Generate a private key
wg genkey > private.key

# Derive the public key from the private key
wg pubkey < private.key > public.key

# Generate both in one command (private key to stdout, public key derived)
wg genkey | tee private.key | wg pubkey > public.key

# Optional: generate a preshared key for extra symmetric encryption layer
wg genpsk > preshared.key
```

Set restrictive permissions on private keys:

```bash
chmod 600 private.key preshared.key
```

Repeat this process on every peer. Never reuse private keys across hosts.

## Server Configuration

Create the server configuration at `/etc/wireguard/wg0.conf`:

```ini
# /etc/wireguard/wg0.conf - Server configuration

[Interface]
# Server's private key (never share this)
PrivateKey = SERVER_PRIVATE_KEY_HERE

# VPN subnet address for this server
Address = 10.0.0.1/24

# UDP port WireGuard listens on
ListenPort = 51820

# Optional: run commands when interface comes up/down
PostUp = iptables -A FORWARD -i wg0 -j ACCEPT; iptables -t nat -A POSTROUTING -o eth0 -j MASQUERADE
PostDown = iptables -D FORWARD -i wg0 -j ACCEPT; iptables -t nat -D POSTROUTING -o eth0 -j MASQUERADE

# Save configuration changes made via wg command
SaveConfig = false

[Peer]
# Client's public key
PublicKey = CLIENT_PUBLIC_KEY_HERE

# Optional: preshared key for additional symmetric encryption
PresharedKey = PRESHARED_KEY_HERE

# IP addresses this peer is allowed to use
AllowedIPs = 10.0.0.2/32

# Optional: keep connection alive through NAT (client usually sets this)
# PersistentKeepalive = 25
```

Replace placeholders with actual keys. The `AllowedIPs` field defines which source IPs are accepted from this peer and which destination IPs are routed to it.

## Client Configuration

Create the client configuration at `/etc/wireguard/wg0.conf`:

```ini
# /etc/wireguard/wg0.conf - Client configuration

[Interface]
# Client's private key
PrivateKey = CLIENT_PRIVATE_KEY_HERE

# VPN address for this client
Address = 10.0.0.2/24

# Optional: DNS server to use when tunnel is active
DNS = 1.1.1.1, 8.8.8.8

[Peer]
# Server's public key
PublicKey = SERVER_PUBLIC_KEY_HERE

# Optional: preshared key (must match server)
PresharedKey = PRESHARED_KEY_HERE

# Route all traffic through VPN (use 0.0.0.0/0 for full tunnel)
# Or specify only the VPN subnet for split tunnel
AllowedIPs = 10.0.0.0/24

# Server's public IP and port
Endpoint = vpn.example.com:51820

# Send keepalive every 25 seconds to maintain NAT mappings
PersistentKeepalive = 25
```

For a full tunnel that routes all traffic through the VPN:

```ini
AllowedIPs = 0.0.0.0/0, ::/0
```

For a split tunnel that only routes VPN traffic:

```ini
AllowedIPs = 10.0.0.0/24, 192.168.1.0/24
```

## Peer Management

Add and remove peers without restarting the interface.

```bash
# Bring up the interface
sudo wg-quick up wg0

# Check current status
sudo wg show

# Add a peer dynamically
sudo wg set wg0 peer CLIENT_PUBLIC_KEY allowed-ips 10.0.0.3/32

# Remove a peer
sudo wg set wg0 peer CLIENT_PUBLIC_KEY remove

# View detailed peer information
sudo wg show wg0

# Bring down the interface
sudo wg-quick down wg0
```

Enable the interface at boot:

```bash
sudo systemctl enable wg-quick@wg0
sudo systemctl start wg-quick@wg0
```

## Routing and NAT

For the VPN server to route traffic between clients and the internet, enable IP forwarding and configure NAT.

```bash
# Enable IP forwarding (temporary)
sudo sysctl -w net.ipv4.ip_forward=1
sudo sysctl -w net.ipv6.conf.all.forwarding=1

# Make it permanent
echo "net.ipv4.ip_forward = 1" | sudo tee -a /etc/sysctl.conf
echo "net.ipv6.conf.all.forwarding = 1" | sudo tee -a /etc/sysctl.conf
sudo sysctl -p
```

The PostUp/PostDown rules in the server config handle NAT automatically. For more control, configure iptables manually:

```bash
# Allow forwarding for the WireGuard interface
sudo iptables -A FORWARD -i wg0 -j ACCEPT
sudo iptables -A FORWARD -o wg0 -j ACCEPT

# NAT outbound traffic from VPN clients
sudo iptables -t nat -A POSTROUTING -s 10.0.0.0/24 -o eth0 -j MASQUERADE

# Save rules to persist across reboots
sudo iptables-save | sudo tee /etc/iptables/rules.v4
```

For site-to-site connections, add routes to remote subnets:

```bash
# On Server A, route to Server B's network
sudo ip route add 192.168.2.0/24 via 10.0.0.2 dev wg0
```

## Persistent Connections

WireGuard is connectionless by design. Use `PersistentKeepalive` on clients behind NAT to maintain the tunnel:

```ini
[Peer]
PublicKey = SERVER_PUBLIC_KEY_HERE
Endpoint = vpn.example.com:51820
AllowedIPs = 0.0.0.0/0
PersistentKeepalive = 25
```

The keepalive sends an empty packet every 25 seconds, keeping NAT mappings active. Only the client behind NAT needs this setting.

For high-availability setups, consider:

- Multiple WireGuard servers with DNS failover
- Watchdog scripts that restart the interface on connectivity loss
- Monitoring endpoints with tools like OneUptime

## Troubleshooting Connectivity

Common issues and how to diagnose them:

```bash
# Check if interface is up
ip link show wg0

# Verify configuration
sudo wg show wg0

# Test connectivity to peer
ping 10.0.0.1

# Check if UDP port is open on server
sudo ss -ulnp | grep 51820

# Verify firewall allows WireGuard traffic
sudo iptables -L -n | grep 51820
sudo ufw status  # if using ufw

# Check for handshake (should show recent timestamp)
sudo wg show wg0
```

If handshakes are not completing:

1. Verify both peers have correct public keys
2. Check that the server's UDP port is reachable from the client
3. Ensure `Endpoint` is set correctly on the client
4. Confirm firewall rules allow UDP traffic on port 51820

If traffic is not flowing after handshake:

1. Verify `AllowedIPs` includes the correct ranges
2. Check IP forwarding is enabled on the server
3. Confirm NAT/masquerade rules are active
4. Look for routing conflicts with `ip route show`

Debug with packet capture:

```bash
# Capture WireGuard traffic
sudo tcpdump -i eth0 udp port 51820

# Capture traffic on the tunnel interface
sudo tcpdump -i wg0
```

## Security Best Practices

1. **Protect private keys:** Store them with 600 permissions, never commit to version control
2. **Use preshared keys:** Adds post-quantum resistance to the key exchange
3. **Limit AllowedIPs:** Only permit the IP ranges each peer actually needs
4. **Run on a non-default port:** Change ListenPort to reduce automated scanning
5. **Keep systems updated:** WireGuard is in the kernel - update your kernel regularly
6. **Monitor connections:** Log peer handshakes and track unusual patterns
7. **Rotate keys periodically:** Generate new keypairs and update configurations
8. **Use firewall rules:** Restrict which IPs can reach the WireGuard port
9. **Disable unused peers:** Remove peer configurations for devices no longer in use
10. **Audit configurations:** Regularly review who has access to the VPN

Example firewall rules to restrict access:

```bash
# Only allow WireGuard from specific IP ranges
sudo iptables -A INPUT -p udp --dport 51820 -s 203.0.113.0/24 -j ACCEPT
sudo iptables -A INPUT -p udp --dport 51820 -j DROP
```

## Summary

WireGuard provides a fast, secure, and simple VPN solution:

- Install with your package manager
- Generate keypairs for each peer
- Configure server with Interface and Peer sections
- Configure clients with server endpoint
- Enable IP forwarding and NAT for routing
- Use PersistentKeepalive for NAT traversal
- Monitor handshakes and traffic for troubleshooting

The cryptokey routing model means every peer is identified by its public key, making configuration straightforward and secure by default.

---

Monitor your WireGuard VPN endpoints and infrastructure health with [OneUptime](https://oneuptime.com) - open-source observability for modern DevOps teams.
