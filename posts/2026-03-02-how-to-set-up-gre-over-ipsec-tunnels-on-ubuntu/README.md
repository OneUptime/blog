# How to Set Up GRE over IPsec Tunnels on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, GRE, IPsec, VPN, Networking

Description: Configure a GRE over IPsec tunnel on Ubuntu to create an encrypted, routable point-to-point tunnel between two sites with support for dynamic routing protocols.

---

GRE (Generic Routing Encapsulation) tunnels can carry any network layer protocol and support multicast, which makes them useful for running dynamic routing protocols like OSPF or BGP between sites. IPsec provides the encryption. Combining them gives you an encrypted, protocol-agnostic tunnel that dynamic routing protocols can operate over.

The two components serve different purposes: GRE handles encapsulation and creates the virtual point-to-point link; IPsec handles encryption and authentication of the traffic between the tunnel endpoints.

## Architecture Overview

```text
Site A                                 Site B
192.168.1.0/24                        192.168.2.0/24

Ubuntu-A (203.0.113.10) === GRE/IPsec === Ubuntu-B (198.51.100.20)
  gre0: 10.0.0.1/30                       gre0: 10.0.0.2/30
```

The GRE tunnel uses addresses from 10.0.0.0/30 as the tunnel link. The real traffic (192.168.x.x) is routed over the tunnel.

## Installing strongSwan

IPsec is provided by strongSwan on Ubuntu:

```bash
# Install strongSwan for IPsec
sudo apt update
sudo apt install -y strongswan strongswan-pki

# Verify installation
ipsec version
```

## Configuring IPsec (Transport Mode)

When using GRE over IPsec, use IPsec in **transport mode** rather than tunnel mode. Transport mode encrypts the GRE payload but leaves the outer IP header intact. This is more efficient and avoids double-encapsulation overhead.

### Generating a Pre-Shared Key

```bash
# Generate a strong random PSK
openssl rand -base64 32
# Example output: K7v2mXpRqN8wYcFjDhBnZeL4tUiOsAl3

# For production, use certificate-based authentication instead
```

### IPsec Configuration on Both Hosts

```bash
# /etc/ipsec.conf on Ubuntu-A
sudo tee /etc/ipsec.conf > /dev/null <<'EOF'
config setup
    charondebug="ike 1, knl 1"

conn gre-ipsec
    # Use transport mode - IPsec protects GRE, not the inner payload directly
    type=transport
    auto=start

    # Authentication method
    authby=secret

    # Left (local) side
    left=203.0.113.10
    leftprotoport=gre

    # Right (remote) side
    right=198.51.100.20
    rightprotoport=gre

    # IKE and ESP algorithms
    ike=aes256-sha256-modp2048
    esp=aes256-sha256

    # Keep the connection alive and retry on failure
    keyingtries=%forever
    dpdaction=restart
    dpddelay=30s
EOF
```

```bash
# /etc/ipsec.secrets on Ubuntu-A
sudo tee /etc/ipsec.secrets > /dev/null <<'EOF'
# Pre-shared key for the GRE/IPsec connection
203.0.113.10 198.51.100.20 : PSK "K7v2mXpRqN8wYcFjDhBnZeL4tUiOsAl3"
EOF

sudo chmod 600 /etc/ipsec.secrets
```

Apply the same configuration on Ubuntu-B, swapping `left` and `right` addresses.

## Starting IPsec

```bash
# Start strongSwan
sudo systemctl start strongswan-starter
sudo systemctl enable strongswan-starter

# Check that the SA (security association) is established
sudo ipsec statusall

# You should see: gre-ipsec{1}:  INSTALLED, TRANSPORT, reqid 1
# and: gre-ipsec[1]: ESTABLISHED
```

## Creating the GRE Tunnel

With IPsec protecting the GRE packets, create the GRE interface:

```bash
# On Ubuntu-A: create a GRE tunnel to Ubuntu-B
sudo ip tunnel add gre0 mode gre \
    local 203.0.113.10 \
    remote 198.51.100.20 \
    ttl 255

# Assign an IP address to the tunnel interface
sudo ip addr add 10.0.0.1/30 dev gre0

# Bring the tunnel interface up
sudo ip link set gre0 up

# Verify the interface
ip addr show gre0
ip -d link show gre0
```

```bash
# On Ubuntu-B: create the corresponding GRE tunnel
sudo ip tunnel add gre0 mode gre \
    local 198.51.100.20 \
    remote 203.0.113.10 \
    ttl 255

sudo ip addr add 10.0.0.2/30 dev gre0
sudo ip link set gre0 up
```

## Adding Routes

```bash
# On Ubuntu-A: route Site B's subnet through the tunnel
sudo ip route add 192.168.2.0/24 dev gre0

# On Ubuntu-B: route Site A's subnet through the tunnel
sudo ip route add 192.168.1.0/24 dev gre0

# Test connectivity through the encrypted tunnel
ping 10.0.0.2    # Tunnel endpoint
ping 192.168.2.1  # Host on the remote site
```

## Making the Configuration Persistent

GRE tunnels created with `ip tunnel` are not persistent across reboots. The cleanest way to persist them is with a systemd service combined with Netplan for IPsec.

```bash
# Create a tunnel setup script
sudo tee /usr/local/sbin/setup-gre-ipsec.sh > /dev/null <<'EOF'
#!/bin/bash

# Remove existing tunnel if present
ip tunnel del gre0 2>/dev/null || true

# Create the GRE tunnel (adjust addresses for each host)
ip tunnel add gre0 mode gre \
    local 203.0.113.10 \
    remote 198.51.100.20 \
    ttl 255

ip addr add 10.0.0.1/30 dev gre0
ip link set gre0 up

# Add route to remote site
ip route add 192.168.2.0/24 dev gre0

echo "GRE tunnel configured"
EOF

sudo chmod +x /usr/local/sbin/setup-gre-ipsec.sh

# Create the systemd service
sudo tee /etc/systemd/system/gre-ipsec.service > /dev/null <<'EOF'
[Unit]
Description=GRE over IPsec Tunnel
After=network-online.target strongswan-starter.service
Wants=network-online.target
Requires=strongswan-starter.service

[Service]
Type=oneshot
ExecStart=/usr/local/sbin/setup-gre-ipsec.sh
RemainAfterExit=yes
ExecStop=/sbin/ip tunnel del gre0

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl daemon-reload
sudo systemctl enable gre-ipsec.service
```

## Running OSPF Over the GRE Tunnel

One of the main advantages of GRE over bare IPsec is support for multicast, which OSPF requires:

```bash
# Install FRRouting
sudo apt install -y frr

# Enable ospfd
sudo sed -i 's/ospfd=no/ospfd=yes/' /etc/frr/daemons
sudo sed -i 's/zebra=no/zebra=yes/' /etc/frr/daemons
sudo systemctl restart frr

# Configure OSPF on both sites
sudo vtysh
```

```text
configure terminal

router ospf
  ospf router-id 1.1.1.1
  network 10.0.0.0/30 area 0       ! GRE tunnel link
  network 192.168.1.0/24 area 0    ! Site A local subnet

exit

write memory
```

On Site B, use router-id 2.2.2.2 and add 192.168.2.0/24 instead.

## Verifying the Encrypted Tunnel

```bash
# Check that GRE packets are being encrypted by IPsec
# Traffic between the public IPs should show as ESP (protocol 50), not GRE
sudo tcpdump -i eth0 -n 'host 198.51.100.20'

# If working correctly, you see ESP packets, not raw GRE
# The GRE is inside the ESP payload

# Check IPsec statistics
sudo ipsec statusall

# View the kernel XFRM policies (what traffic gets encrypted)
sudo ip xfrm policy

# View active SAs
sudo ip xfrm state

# Test that traffic actually goes through the tunnel and is encrypted
# On Ubuntu-A, capture on the GRE interface (decrypted view)
sudo tcpdump -i gre0 -n icmp
# Then ping from Site A to Site B - you see ICMP on gre0
# On eth0 you see only encrypted ESP - confirming encryption works
```

## Troubleshooting

```bash
# GRE tunnel is up but no traffic flows:
# Check that IPsec SA is established
sudo ipsec statusall

# Check that both ends have matching configurations
sudo ip xfrm policy
sudo ip xfrm state

# If IPsec reports "no matching kernel state":
# The GRE traffic type must match the leftprotoport/rightprotoport in ipsec.conf
# GRE protocol number is 47

# Check firewall rules
# GRE needs protocol 47 allowed, and IPsec needs UDP 500 and 4500
sudo iptables -L -n | grep -E '500|4500|47'

# Allow if blocked
sudo iptables -A INPUT -p gre -j ACCEPT
sudo iptables -A OUTPUT -p gre -j ACCEPT
sudo iptables -A INPUT -p udp --dport 500 -j ACCEPT
sudo iptables -A INPUT -p udp --dport 4500 -j ACCEPT
sudo iptables -A INPUT -p esp -j ACCEPT
```

The GRE over IPsec pattern is a mature, well-understood way to build encrypted site-to-site links that also support dynamic routing protocols. For most enterprise networking use cases involving site-to-site connectivity, it remains the practical choice over more complex solutions.
