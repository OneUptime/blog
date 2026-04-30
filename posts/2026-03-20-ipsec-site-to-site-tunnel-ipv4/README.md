# How to Configure IPSec Site-to-Site Tunnel for IPv4 Networks

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPsec, strongSwan, VPN, IPv4, Site-to-Site, Networking

Description: Configure a StrongSwan IPSec site-to-site tunnel between two IPv4 networks using IKEv2 and pre-shared key authentication.

An IPSec site-to-site tunnel encrypts all traffic between two network sites at the IP layer. This guide uses StrongSwan's legacy `ipsec.conf` and `ipsec.secrets` files with IKEv2 and PSK on both sides.

## Topology

```text
Site A:               Site B:
10.1.0.0/24           10.2.0.0/24
[Gateway A]  <-IPSec-> [Gateway B]
Public: 198.51.100.10  Public: 203.0.113.10
```

## Gateway A Configuration

```conf
# /etc/ipsec.conf on Gateway A

conn site-to-site
    type=tunnel
    keyexchange=ikev2
    auto=start
    # Local gateway
    left=198.51.100.10
    leftsubnet=10.1.0.0/24
    leftid=@gateway-a
    leftauth=psk
    # Remote gateway
    right=203.0.113.10
    rightsubnet=10.2.0.0/24
    rightid=@gateway-b
    rightauth=psk
    # Crypto settings
    ike=aes256-sha256-modp2048!
    esp=aes256-sha256!
    ikelifetime=28800s
    lifetime=3600s
    margintime=540s
    # Dead Peer Detection
    dpdaction=restart
    dpddelay=30s
```

```conf
# /etc/ipsec.secrets on Gateway A

@gateway-a @gateway-b : PSK "SharedSecret123!"
```

## Gateway B Configuration

```conf
# /etc/ipsec.conf on Gateway B

conn site-to-site
    type=tunnel
    keyexchange=ikev2
    auto=start
    left=203.0.113.10
    leftsubnet=10.2.0.0/24
    leftid=@gateway-b
    leftauth=psk
    right=198.51.100.10
    rightsubnet=10.1.0.0/24
    rightid=@gateway-a
    rightauth=psk
    ike=aes256-sha256-modp2048!
    esp=aes256-sha256!
    ikelifetime=28800s
    lifetime=3600s
    dpdaction=restart
    dpddelay=30s
```

```conf
# /etc/ipsec.secrets on Gateway B
@gateway-b @gateway-a : PSK "SharedSecret123!"
```

## Start and Verify

```bash
# On both gateways
sudo ipsec restart

# Initiate the tunnel from Gateway A
sudo ipsec up site-to-site

# Check Security Associations
sudo ipsec status
sudo ipsec statusall

# Verify kernel XFRM policies
sudo ip xfrm policy list
```

## Test Connectivity

```bash
# From Site A, ping a host in Site B
ping 10.2.0.10

# From Gateway A, trace the path
traceroute 10.2.0.10
```

## Firewall Rules

```bash
# Allow IKE and ESP on both gateways
sudo iptables -A INPUT -p udp --dport 500 -j ACCEPT
sudo iptables -A INPUT -p udp --dport 4500 -j ACCEPT
sudo iptables -A INPUT -p esp -j ACCEPT

# Allow forwarding between the two subnets
sudo iptables -A FORWARD -s 10.1.0.0/24 -d 10.2.0.0/24 -j ACCEPT
sudo iptables -A FORWARD -s 10.2.0.0/24 -d 10.1.0.0/24 -j ACCEPT

# Enable IP forwarding
sudo sysctl -w net.ipv4.ip_forward=1
```

The `!` suffix on the IKE and ESP proposals tells strongSwan to use only the configured proposals instead of appending its broader default proposal set.
