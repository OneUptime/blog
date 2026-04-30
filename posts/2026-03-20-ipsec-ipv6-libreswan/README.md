# How to Configure IPsec VPN with IPv6 on Libreswan

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPsec, IPv6, Libreswan, VPN, IKEv2, RHEL, Fedora

Description: A guide to configuring Libreswan IPsec VPN with IPv6 support using IKEv2, the standard IPsec implementation on Red Hat/Fedora/CentOS systems.

Libreswan is the IPsec implementation included in Red Hat Enterprise Linux, Fedora, and CentOS. It fully supports IPv6 for both IKE negotiations and data plane traffic. This guide covers configuring Libreswan for IPv6 IPsec tunnels.

## Installing Libreswan

```bash
# RHEL/CentOS/Fedora

sudo dnf install libreswan

# Debian/Ubuntu (less common)
sudo apt-get install libreswan

# Check version
ipsec version
```

## Basic IPv6 Tunnel Configuration

### /etc/ipsec.d/ipv6-tunnel.conf

```conf
# IPv6 site-to-site tunnel
conn ipv6-site-to-site
    # IKE version
    ikev2=insist    # Use IKEv2 only

    # Authentication
    authby=secret   # Pre-shared key
    # Or: authby=rsasig   # RSA certificates

    # Left (local) side
    left=2001:db8:0:1::1
    leftsubnet=2001:db8:1::/48

    # Right (remote) side
    right=2001:db8:0:2::1
    rightsubnet=2001:db8:2::/48

    # Crypto algorithms
    ike=aes256-sha2_256;dh14
    esp=aes256-sha2_256

    # Connection behavior
    auto=start      # Establish on startup
    type=tunnel
```

## Road Warrior (Remote Client) Configuration

### Server Config

```conf
# /etc/ipsec.d/ipv6-roadwarrior.conf

conn ipv6-roadwarrior
    ikev2=insist
    authby=secret

    # Server's IPv6 address
    left=2001:db8:0:10::1
    leftsubnet=::/0      # Allow access to any IPv6

    # Any remote client
    right=%any

    # Assign IPv6 address to client
    rightaddresspool=fd00:100::/64

    # DNS to push to clients
    modecfgdns=2001:4860:4860::8888

    narrowing=yes

    auto=add
```

### Pre-Shared Key Configuration

```bash
# /etc/ipsec.secrets
# Shared secret between server and all clients
2001:db8:0:10::1 %any6 : PSK "your-strong-pre-shared-key"

# Per-peer shared key
2001:db8:0:1::1 2001:db8:0:2::1 : PSK "site-specific-key"
```

## Certificate-Based Authentication

```conf
# /etc/ipsec.d/ipv6-cert.conf

conn ipv6-cert-auth
    ikev2=insist
    authby=rsasig

    # Server certificate
    left=2001:db8:0:10::1
    leftcert=vpn.example.com     # Certificate nickname in the NSS database
    leftid=@vpn.example.com
    leftsendcert=always
    leftsubnet=::/0
    leftrsasigkey=%cert

    right=%any
    rightca=%same    # Client must use cert from same CA
    rightrsasigkey=%cert

    rightaddresspool=fd00:100::/64
    modecfgdns=2001:4860:4860::8888
    narrowing=yes
    auto=add
```

```bash
# Import certificates
sudo ipsec import server-cert.p12
sudo certutil -d sql:/var/lib/ipsec/nss -L   # List installed certs
```

## Managing Libreswan

```bash
# Start the IKE daemon
sudo systemctl start ipsec
sudo systemctl enable ipsec

# Load and start the configuration
sudo ipsec auto --add ipv6-site-to-site
sudo ipsec auto --up ipv6-site-to-site

# Check status
sudo ipsec status
sudo ipsec whack --status

# Show active tunnels
sudo ipsec trafficstatus

# Test configuration syntax
sudo ipsec checkconfig
```

## Verifying IPv6 IPsec Tunnel

```bash
# Check kernel IPsec policies for IPv6
sudo ip xfrm policy

# Check IPsec SAs (Security Associations)
sudo ip xfrm state

# Test connectivity through tunnel
ping -6 -c 3 2001:db8:2::1

# Monitor IKE negotiations
sudo journalctl -u ipsec -f

# Enable debug logging
sudo ipsec whack --debug all
```

## Enabling IPv6 Forwarding

```bash
# Required for site-to-site tunnels
sudo sysctl -w net.ipv6.conf.all.forwarding=1

# Persist across reboots
echo "net.ipv6.conf.all.forwarding=1" | sudo tee -a /etc/sysctl.conf
sudo sysctl -p
```

## Troubleshooting Common Issues

| Issue | Diagnosis | Fix |
|---|---|---|
| No IKE response | Firewall blocking UDP 500/4500 | Open firewall ports |
| SA not established | Certificate mismatch | Verify the certificate SAN or ID matches `leftid/rightid` |
| Ping fails after SA up | Routing issue | Check `leftsubnet/rightsubnet` |
| Constant rekeying | Clock skew | Sync NTP on both sides |

```bash
# Check firewall allows IPsec
sudo firewall-cmd --add-service=ipsec --permanent
sudo firewall-cmd --reload
```

Libreswan's robust IPv6 support makes it the recommended IPsec implementation for Red Hat-based environments, providing site-to-site and remote access IPv6 VPN functionality with standard configuration files.
