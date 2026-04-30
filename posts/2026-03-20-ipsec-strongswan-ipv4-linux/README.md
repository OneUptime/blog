# How to Configure IPSec VPN with StrongSwan for IPv4 on Linux

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPsec, strongSwan, VPN, IPv4, Linux, IKE

Description: Install StrongSwan and configure an IPSec VPN with pre-shared key authentication for IPv4 connectivity on Linux.

StrongSwan is the leading open-source IPSec implementation for Linux. It supports IKEv1 and IKEv2, certificate and PSK authentication, and a wide range of cipher suites.

## Step 1: Install StrongSwan

```bash
# Ubuntu/Debian

sudo apt update
sudo apt install strongswan strongswan-pki libcharon-extra-plugins -y

# RHEL/CentOS
sudo dnf install epel-release -y
sudo dnf install strongswan -y
```

## Step 2: Configure ipsec.conf

The main configuration file is `/etc/ipsec.conf`:

```conf
# /etc/ipsec.conf

config setup
    # Log levels range from -1 to 4
    charondebug="ike 2, knl 2, cfg 2"

conn %default
    # Use IKEv2
    keyexchange=ikev2
    # Enable Dead Peer Detection
    dpdaction=clear
    dpddelay=300s
    rekey=no
    # Left = local side
    left=%defaultroute
    leftsubnet=0.0.0.0/0
    # Right = remote peer
    right=%any
    rightsourceip=10.10.10.0/24
    rightdns=8.8.8.8

conn vpn-psk
    # Extend the default connection
    also=%default
    # Authentication method: PSK (pre-shared key)
    leftauth=psk
    rightauth=psk
    # Load this connection and wait for clients
    auto=add
```

## Step 3: Set the Pre-Shared Key

Edit `/etc/ipsec.secrets`:

```conf
# /etc/ipsec.secrets
# Format: local_ip remote_ip : PSK "your_shared_secret"

# %any means any remote peer
%any %any : PSK "your_strong_pre_shared_key_here"
```

Secure the secrets file:

```bash
sudo chmod 600 /etc/ipsec.secrets
```

## Step 4: Enable IP Forwarding and Configure NAT

```bash
# Enable IP forwarding
sudo sysctl -w net.ipv4.ip_forward=1
echo "net.ipv4.ip_forward = 1" | sudo tee -a /etc/sysctl.conf

# Allow VPN client traffic to be forwarded
sudo iptables -A FORWARD -s 10.10.10.0/24 -j ACCEPT
sudo iptables -A FORWARD -d 10.10.10.0/24 -m conntrack --ctstate RELATED,ESTABLISHED -j ACCEPT

# NAT for VPN clients to access the internet
sudo iptables -t nat -A POSTROUTING -s 10.10.10.0/24 -o eth0 -m policy --pol ipsec --dir out -j ACCEPT
sudo iptables -t nat -A POSTROUTING -s 10.10.10.0/24 -o eth0 -j MASQUERADE

# Allow IPSec traffic
sudo iptables -A INPUT -p udp --dport 500 -j ACCEPT
sudo iptables -A INPUT -p udp --dport 4500 -j ACCEPT
sudo iptables -A INPUT -p esp -j ACCEPT
```

## Step 5: Start StrongSwan

```bash
# Start StrongSwan
sudo systemctl enable strongswan-starter
sudo systemctl start strongswan-starter

# Check status
sudo ipsec statusall

# Load the new configuration without restart
sudo ipsec reload
```

## Monitoring Active Connections

```bash
# List all active IPSec Security Associations
sudo ipsec statusall

# Show Security Associations in the kernel
sudo ip xfrm state list
sudo ip xfrm policy list
```

## Troubleshooting

```bash
# View StrongSwan logs
sudo journalctl -u strongswan-starter -f

# Enable IKE debug logging
sudo ipsec stroke loglevel ike 4
```

StrongSwan is highly configurable - this PSK-based setup provides a working foundation that you can extend with certificate authentication for production environments.
