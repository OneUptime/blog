# How to Configure IPsec Site-to-Site VPN on Linux with strongSwan

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPsec, strongSwan, VPN, Linux, Site-to-Site, IKEv2

Description: Set up a production-ready IPsec site-to-site VPN between two Linux systems using strongSwan IKEv2 with pre-shared key authentication.

strongSwan is the leading open-source IPsec implementation for Linux. This guide creates a site-to-site tunnel that encrypts all traffic between two private networks.

## Network Topology

```text
Gateway A (Left):          Gateway B (Right):
LAN: 192.168.1.0/24        LAN: 192.168.2.0/24
WAN: 1.2.3.4               WAN: 5.6.7.8
```

## Installation

```bash
# On both gateways

sudo apt install strongswan strongswan-pki -y
```

## Gateway A Configuration

```conf
# /etc/ipsec.conf on Gateway A

config setup
    charondebug="ike 1, knl 1"

conn site-to-site
    type=tunnel
    keyexchange=ikev2
    auto=start

    # Left = this gateway (A)
    left=1.2.3.4
    leftsubnet=192.168.1.0/24
    leftid=@gateway-a
    leftauth=psk

    # Right = remote gateway (B)
    right=5.6.7.8
    rightsubnet=192.168.2.0/24
    rightid=@gateway-b
    rightauth=psk

    # Encryption settings
    ike=aes256-sha256-modp2048!
    esp=aes256-sha256!
    ikelifetime=8h
    lifetime=1h

    # Dead Peer Detection
    dpdaction=restart
    dpddelay=30s
```

```conf
# /etc/ipsec.secrets on Gateway A
@gateway-a @gateway-b : PSK "ChangeThisToALongRandomSecret!"
```

## Gateway B Configuration

```conf
# /etc/ipsec.conf on Gateway B
config setup
    charondebug="ike 1, knl 1"

conn site-to-site
    type=tunnel
    keyexchange=ikev2
    auto=start
    left=5.6.7.8
    leftsubnet=192.168.2.0/24
    leftid=@gateway-b
    leftauth=psk
    right=1.2.3.4
    rightsubnet=192.168.1.0/24
    rightid=@gateway-a
    rightauth=psk
    ike=aes256-sha256-modp2048!
    esp=aes256-sha256!
    ikelifetime=8h
    lifetime=1h
    dpdaction=restart
    dpddelay=30s
```

```conf
# /etc/ipsec.secrets on Gateway B
@gateway-b @gateway-a : PSK "ChangeThisToALongRandomSecret!"
```

## Enabling IP Forwarding on Both Gateways

```bash
sudo sysctl -w net.ipv4.ip_forward=1
echo "net.ipv4.ip_forward = 1" | sudo tee -a /etc/sysctl.conf
```

## Firewall Rules

```bash
# Allow IKE (UDP 500) and NAT-T (UDP 4500)
sudo iptables -A INPUT -p udp --dport 500 -j ACCEPT
sudo iptables -A INPUT -p udp --dport 4500 -j ACCEPT
sudo iptables -A INPUT -p esp -j ACCEPT

# Allow forwarding between LANs
sudo iptables -A FORWARD -s 192.168.1.0/24 -d 192.168.2.0/24 -j ACCEPT
sudo iptables -A FORWARD -s 192.168.2.0/24 -d 192.168.1.0/24 -j ACCEPT
```

## Starting and Verifying

```bash
# Start strongSwan
sudo systemctl enable strongswan-starter
sudo systemctl start strongswan-starter

# auto=start already tries to bring the tunnel up at daemon start.
# If it is not already established, bring it up manually:
sudo ipsec up site-to-site

# Check status
sudo ipsec status
sudo ipsec statusall
# Look for: ESTABLISHED, INSTALLED,TUNNEL

# Verify XFRM policies in kernel
sudo ip xfrm policy

# Test connectivity
ping 192.168.2.10  # From a host on Gateway A's LAN
```

## Troubleshooting

```bash
# View IKE negotiation logs
sudo journalctl -u strongswan-starter -f

# Check which IKE version was negotiated
sudo ipsec status | grep IKEv
```

The `!` suffix on cipher algorithms prevents strongSwan from appending its default proposals, so only the explicitly configured algorithms are accepted.
