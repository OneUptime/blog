# How to Set Up OpenVPN Server on Ubuntu from Scratch

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, VPN, OpenVPN, Networking, Security

Description: Complete step-by-step guide to installing and configuring an OpenVPN server on Ubuntu, including certificate generation, network configuration, and client setup.

---

OpenVPN is one of the most widely deployed VPN solutions for self-hosted infrastructure. It uses TLS for authentication, supports both UDP and TCP transport, and works reliably across firewalls and NAT. This guide walks through a complete server setup on Ubuntu.

## Prerequisites

- Ubuntu 22.04 or 24.04 server
- Root or sudo access
- A static public IP address or domain name
- Port 1194/UDP open in your firewall
- Basic knowledge of Linux networking

## Install OpenVPN and Easy-RSA

```bash
# Update package lists
sudo apt update

# Install OpenVPN and Easy-RSA (PKI management tool)
sudo apt install openvpn easy-rsa

# Verify installations
openvpn --version
```

## Set Up the PKI (Certificate Authority)

OpenVPN uses TLS certificates to authenticate both the server and clients. Easy-RSA manages this PKI.

```bash
# Create a directory for the CA
mkdir -p ~/openvpn-ca
cp -r /usr/share/easy-rsa/* ~/openvpn-ca/
cd ~/openvpn-ca

# Initialize the PKI
./easyrsa init-pki

# Build the Certificate Authority
# You'll be prompted for a CA passphrase and common name
./easyrsa build-ca

# Example prompts:
# Enter New CA Key Passphrase: [set a strong passphrase]
# Common Name (eg: your user, host, or server name): MyVPN-CA
```

### Generate the Server Certificate

```bash
# Generate the server certificate and key (no passphrase on the server key)
./easyrsa gen-req server nopass

# Sign the server certificate with the CA
./easyrsa sign-req server server
# Confirm by typing 'yes' and entering the CA passphrase
```

### Generate Diffie-Hellman Parameters

```bash
# This takes a few minutes
./easyrsa gen-dh
```

### Generate a TLS Authentication Key

```bash
# Generate the ta.key for additional TLS authentication
openvpn --genkey secret ~/openvpn-ca/ta.key
```

## Copy Certificates to OpenVPN Directory

```bash
# Copy server certificate and key
sudo cp ~/openvpn-ca/pki/ca.crt /etc/openvpn/server/
sudo cp ~/openvpn-ca/pki/issued/server.crt /etc/openvpn/server/
sudo cp ~/openvpn-ca/pki/private/server.key /etc/openvpn/server/
sudo cp ~/openvpn-ca/pki/dh.pem /etc/openvpn/server/
sudo cp ~/openvpn-ca/ta.key /etc/openvpn/server/

# Set proper permissions
sudo chmod 600 /etc/openvpn/server/server.key
sudo chmod 600 /etc/openvpn/server/ta.key
```

## Configure the OpenVPN Server

Create the server configuration file:

```bash
sudo nano /etc/openvpn/server/server.conf
```

```conf
# Use UDP on port 1194
proto udp
port 1194

# Use TUN interface (routed mode)
dev tun

# Certificate and key files
ca /etc/openvpn/server/ca.crt
cert /etc/openvpn/server/server.crt
key /etc/openvpn/server/server.key
dh /etc/openvpn/server/dh.pem

# TLS authentication key (tls-auth)
tls-auth /etc/openvpn/server/ta.key 0

# VPN subnet - clients will get IPs from this range
server 10.8.0.0 255.255.255.0

# Maintain a list of client-IP mappings across restarts
ifconfig-pool-persist /var/log/openvpn/ipp.txt

# Push routing rules to clients
push "redirect-gateway def1 bypass-dhcp"

# Push DNS servers to clients
push "dhcp-option DNS 8.8.8.8"
push "dhcp-option DNS 8.8.4.4"

# Keep connections alive
keepalive 10 120

# Cipher settings
cipher AES-256-CBC
auth SHA256

# Run with reduced privileges
user nobody
group nogroup

# Persist settings across restarts
persist-key
persist-tun

# Log verbosity (0-9, 4 is a good balance)
verb 3

# Log file
log-append /var/log/openvpn/openvpn.log
status /var/log/openvpn/openvpn-status.log
```

Create the log directory:

```bash
sudo mkdir -p /var/log/openvpn
```

## Enable IP Forwarding

Clients need to route traffic through the server, which requires IP forwarding:

```bash
# Enable IP forwarding temporarily
sudo sysctl -w net.ipv4.ip_forward=1

# Make it permanent
sudo nano /etc/sysctl.conf
# Add or uncomment:
# net.ipv4.ip_forward=1

# Apply the change
sudo sysctl -p
```

## Configure NAT (Masquerading)

The server needs to masquerade client traffic so it appears to originate from the server's public IP:

```bash
# Find your public network interface name
ip route | grep default
# Example output: default via 192.168.1.1 dev eth0
# The interface is eth0 in this example - use yours

# Add NAT masquerading rule
sudo iptables -t nat -A POSTROUTING -s 10.8.0.0/8 -o eth0 -j MASQUERADE

# Allow forwarding from VPN to internet
sudo iptables -A FORWARD -i tun0 -j ACCEPT
sudo iptables -A FORWARD -i tun0 -o eth0 -m state --state RELATED,ESTABLISHED -j ACCEPT
sudo iptables -A FORWARD -i eth0 -o tun0 -m state --state RELATED,ESTABLISHED -j ACCEPT
```

### Make iptables Rules Persistent

```bash
# Install iptables-persistent
sudo apt install iptables-persistent

# Save current rules
sudo netfilter-persistent save

# Verify
sudo iptables-save | grep MASQUERADE
```

## Start and Enable OpenVPN

```bash
# Start the OpenVPN service
sudo systemctl start openvpn-server@server

# Enable it to start on boot
sudo systemctl enable openvpn-server@server

# Check status
sudo systemctl status openvpn-server@server

# Check logs if there's an issue
sudo journalctl -u openvpn-server@server --since "5 minutes ago"
```

After a successful start, a `tun0` interface should appear:

```bash
ip addr show tun0
# Should show the 10.8.0.1 address
```

## Generate Client Certificates

For each client that needs to connect:

```bash
cd ~/openvpn-ca

# Generate a client certificate and key (replace 'client1' with the client name)
./easyrsa gen-req client1 nopass

# Sign the client certificate
./easyrsa sign-req client client1
# Type 'yes' and enter the CA passphrase
```

## Create Client Configuration Files

A client needs a `.ovpn` file that contains or references all necessary certificates. Creating a self-contained file is easiest:

```bash
# Create a script to generate client configs
cat > ~/make_client_config.sh << 'EOF'
#!/bin/bash
CLIENT=$1
CA_DIR=~/openvpn-ca

echo "client"
echo "dev tun"
echo "proto udp"
echo "remote YOUR_SERVER_IP 1194"   # Replace with your server IP
echo "resolv-retry infinite"
echo "nobind"
echo "persist-key"
echo "persist-tun"
echo "remote-cert-tls server"
echo "cipher AES-256-CBC"
echo "auth SHA256"
echo "verb 3"
echo "key-direction 1"
echo ""
echo "<ca>"
cat ${CA_DIR}/pki/ca.crt
echo "</ca>"
echo "<cert>"
cat ${CA_DIR}/pki/issued/${CLIENT}.crt
echo "</cert>"
echo "<key>"
cat ${CA_DIR}/pki/private/${CLIENT}.key
echo "</key>"
echo "<tls-auth>"
cat ${CA_DIR}/ta.key
echo "</tls-auth>"
EOF

chmod +x ~/make_client_config.sh

# Generate the client config file
~/make_client_config.sh client1 > ~/client1.ovpn
```

Replace `YOUR_SERVER_IP` with your server's actual public IP or domain name.

## Firewall Configuration with UFW

If you're using UFW:

```bash
# Allow OpenVPN port
sudo ufw allow 1194/udp

# Allow forwarding - edit UFW's sysctl settings
sudo nano /etc/ufw/sysctl.conf
# Uncomment: net/ipv4/ip_forward=1

# Edit UFW before.rules to add NAT
sudo nano /etc/ufw/before.rules
# Add before the *filter section:
# *nat
# :POSTROUTING ACCEPT [0:0]
# -A POSTROUTING -s 10.8.0.0/8 -o eth0 -j MASQUERADE
# COMMIT

# Allow forwarding policy
sudo nano /etc/default/ufw
# Change: DEFAULT_FORWARD_POLICY="ACCEPT"

# Reload UFW
sudo ufw disable && sudo ufw enable
```

## Verify the Connection

From a client machine with OpenVPN installed:

```bash
# Connect using the generated config
sudo openvpn --config client1.ovpn

# In another terminal, verify the VPN IP
ip addr show tun0

# Check that traffic routes through the VPN
curl ifconfig.me
# Should show the server's public IP, not the client's
```

## Revoking Client Access

When a client no longer needs access:

```bash
cd ~/openvpn-ca

# Revoke the certificate
./easyrsa revoke client1

# Generate a new CRL (certificate revocation list)
./easyrsa gen-crl

# Copy the CRL to OpenVPN
sudo cp ~/openvpn-ca/pki/crl.pem /etc/openvpn/server/

# Add CRL verification to server.conf
sudo nano /etc/openvpn/server/server.conf
# Add: crl-verify /etc/openvpn/server/crl.pem

# Reload OpenVPN
sudo systemctl reload openvpn-server@server
```

An OpenVPN server gives you full control over your VPN infrastructure, from certificate management to routing policies. Once the initial setup is done, adding new clients is just a matter of generating a certificate and distributing the `.ovpn` file.
