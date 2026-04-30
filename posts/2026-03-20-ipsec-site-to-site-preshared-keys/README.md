# How to Configure IPSec Site-to-Site Tunnel with Pre-Shared Keys

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPsec, VPN, Site-to-Site, Pre-Shared Keys, strongSwan, IPv4, Security

Description: Configure an IPSec site-to-site VPN tunnel between two Linux hosts using StrongSwan and pre-shared key authentication to securely connect two IPv4 networks.

## Introduction

IPSec is a suite of protocols that provides cryptographic security for IP communications. A site-to-site IPSec tunnel connects two private networks over the internet, encrypting all traffic between them. StrongSwan is a widely used open-source IPSec implementation on Linux. This guide uses StrongSwan's legacy `ipsec.conf`/`ipsec.secrets` configuration backend, which is still supported, though current StrongSwan documentation recommends `swanctl.conf` for new deployments.

## Network Topology

```yaml
Site A (192.168.1.0/24) --- [Public IP: 203.0.113.1] ===IPSec=== [Public IP: 203.0.113.2] --- Site B (192.168.2.0/24)
```

## Installing StrongSwan

```bash
# Ubuntu/Debian

sudo apt-get install strongswan strongswan-pki

# CentOS/RHEL
sudo yum install strongswan
```

## Configuration on Site A

Edit `/etc/ipsec.conf`:

```bash
# /etc/ipsec.conf - Site A

config setup
    charondebug="ike 1, knl 1, cfg 0"

conn site-a-to-site-b
    # Authentication method
    leftauth=psk                # Authenticate Site A with a pre-shared key
    rightauth=psk               # Require Site B to use a pre-shared key

    # Left side (Site A)
    left=203.0.113.1            # Site A's public IP
    leftsubnet=192.168.1.0/24  # Site A's private network

    # Right side (Site B)
    right=203.0.113.2           # Site B's public IP
    rightsubnet=192.168.2.0/24  # Site B's private network

    # IKE Phase 1 parameters
    ike=aes256-sha256-modp2048!  # Encryption-hash-DH group
    ikelifetime=28800s           # 8 hours

    # IPSec Phase 2 parameters
    esp=aes256-sha256!
    lifetime=3600s               # 1 hour
    
    # Auto-start the tunnel
    auto=start
    keyexchange=ikev2            # Use IKEv2
    type=tunnel
    dpdaction=restart            # Restart tunnel if peer goes down
    dpddelay=30s
```

Edit `/etc/ipsec.secrets`:

```bash
# /etc/ipsec.secrets - Site A
# Format: local_ip remote_ip : PSK "pre-shared-key"
203.0.113.1 203.0.113.2 : PSK "MyStrongPreSharedKey123!@#"
```

## Configuration on Site B (Mirror)

`/etc/ipsec.conf` on Site B (swap left and right):

```bash
conn site-b-to-site-a
    leftauth=psk
    rightauth=psk
    left=203.0.113.2
    leftsubnet=192.168.2.0/24
    right=203.0.113.1
    rightsubnet=192.168.1.0/24
    ike=aes256-sha256-modp2048!
    esp=aes256-sha256!
    auto=start
    keyexchange=ikev2
    type=tunnel
    dpdaction=restart
```

`/etc/ipsec.secrets` on Site B:

```bash
203.0.113.2 203.0.113.1 : PSK "MyStrongPreSharedKey123!@#"
```

## Starting and Verifying the Tunnel

```bash
# Start StrongSwan
sudo ipsec start

# Check tunnel status
sudo ipsec status

# Show active connections
sudo ipsec statusall

# Test connectivity through the tunnel
ping 192.168.2.1   # From Site A, ping a host in Site B's network
```

## Enabling IP Forwarding

For traffic to flow between subnets through the tunnel, enable IP forwarding on both gateways. Hosts behind each site must also route the remote subnet via the local IPSec gateway, and any firewall on the gateways must allow forwarded traffic.

```bash
sudo sysctl -w net.ipv4.ip_forward=1
echo "net.ipv4.ip_forward=1" | sudo tee -a /etc/sysctl.d/99-forward.conf
```

## Troubleshooting

```bash
# Watch IKE negotiation in real time
sudo tail -f /var/log/syslog     # Ubuntu/Debian
# or
sudo tail -f /var/log/messages   # CentOS/RHEL

# Restart StrongSwan and bring the connection up again
sudo ipsec restart
sudo ipsec up site-a-to-site-b
```

## Security Note

Pre-shared keys are simpler than certificates but less secure for large deployments. For production environments with many sites, use certificate-based authentication with a PKI. Choose strong, random PSKs (minimum 32 characters) and rotate them periodically.

## Conclusion

StrongSwan makes IPSec site-to-site VPNs accessible on Linux. The PSK approach works well for small deployments. For scale, migrate to certificate-based IKEv2 with a CA for centralized trust management.
