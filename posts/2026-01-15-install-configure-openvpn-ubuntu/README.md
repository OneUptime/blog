# How to Install and Configure OpenVPN Server on Ubuntu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ubuntu, OpenVPN, VPN, Security, Network, Tutorial

Description: Complete guide to setting up an OpenVPN server on Ubuntu with certificate authentication and secure client configuration.

---

OpenVPN is a robust, open-source VPN solution that provides secure encrypted tunnels for remote access and site-to-site connectivity. This guide covers setting up an OpenVPN server on Ubuntu with proper certificate-based authentication.

## Prerequisites

- Ubuntu 20.04, 22.04, or 24.04
- Root or sudo access
- Public IP address or domain name
- Port 1194 UDP accessible through firewall

## Installing OpenVPN and Easy-RSA

```bash
# Update package lists
sudo apt update

# Install OpenVPN and Easy-RSA for certificate management
sudo apt install openvpn easy-rsa -y

# Verify installation
openvpn --version
```

## Setting Up the Certificate Authority

### Create PKI Directory

```bash
# Create Easy-RSA directory
make-cadir ~/easy-rsa
cd ~/easy-rsa

# Initialize PKI
./easyrsa init-pki
```

### Configure Easy-RSA Variables

```bash
# Edit vars file for certificate settings
nano vars
```

Add these settings:

```bash
# Easy-RSA configuration
set_var EASYRSA_REQ_COUNTRY    "US"
set_var EASYRSA_REQ_PROVINCE   "California"
set_var EASYRSA_REQ_CITY       "San Francisco"
set_var EASYRSA_REQ_ORG        "MyOrganization"
set_var EASYRSA_REQ_EMAIL      "admin@example.com"
set_var EASYRSA_REQ_OU         "IT Department"
set_var EASYRSA_KEY_SIZE       2048
set_var EASYRSA_ALGO           rsa
set_var EASYRSA_CA_EXPIRE      3650
set_var EASYRSA_CERT_EXPIRE    365
```

### Build Certificate Authority

```bash
# Build the CA (will prompt for passphrase)
./easyrsa build-ca

# Output: CA certificate at ~/easy-rsa/pki/ca.crt
```

## Generate Server Certificates

```bash
# Generate server certificate request (nopass = no password on key)
./easyrsa gen-req server nopass

# Sign the server certificate
./easyrsa sign-req server server
# Type 'yes' to confirm

# Generate Diffie-Hellman parameters (takes a few minutes)
./easyrsa gen-dh

# Generate TLS-Auth key for additional security
openvpn --genkey secret ta.key
```

## Copy Certificates to OpenVPN

```bash
# Copy server certificates
sudo cp pki/ca.crt /etc/openvpn/server/
sudo cp pki/issued/server.crt /etc/openvpn/server/
sudo cp pki/private/server.key /etc/openvpn/server/
sudo cp pki/dh.pem /etc/openvpn/server/
sudo cp ta.key /etc/openvpn/server/

# Set proper permissions
sudo chmod 600 /etc/openvpn/server/server.key
sudo chmod 600 /etc/openvpn/server/ta.key
```

## Configure OpenVPN Server

```bash
# Create server configuration
sudo nano /etc/openvpn/server/server.conf
```

```
# OpenVPN Server Configuration

# Network settings
port 1194
proto udp
dev tun

# Certificate paths
ca /etc/openvpn/server/ca.crt
cert /etc/openvpn/server/server.crt
key /etc/openvpn/server/server.key
dh /etc/openvpn/server/dh.pem
tls-auth /etc/openvpn/server/ta.key 0

# Network topology
topology subnet

# VPN subnet
server 10.8.0.0 255.255.255.0

# Maintain client IP assignments
ifconfig-pool-persist /var/log/openvpn/ipp.txt

# Push routes to clients (access to server's LAN)
push "route 192.168.1.0 255.255.255.0"

# Push DNS servers to clients
push "dhcp-option DNS 8.8.8.8"
push "dhcp-option DNS 8.8.4.4"

# Redirect all traffic through VPN (optional)
# push "redirect-gateway def1 bypass-dhcp"

# Allow client-to-client communication
client-to-client

# Keepalive settings
keepalive 10 120

# Encryption settings
cipher AES-256-GCM
auth SHA256
data-ciphers AES-256-GCM:AES-128-GCM:CHACHA20-POLY1305

# Security
user nobody
group nogroup
persist-key
persist-tun

# Logging
status /var/log/openvpn/openvpn-status.log
log-append /var/log/openvpn/openvpn.log
verb 3
mute 20
```

## Configure IP Forwarding

```bash
# Enable IP forwarding
echo "net.ipv4.ip_forward=1" | sudo tee -a /etc/sysctl.conf

# Apply immediately
sudo sysctl -p
```

## Configure Firewall (NAT)

### Using UFW

```bash
# Find your default interface
ip route | grep default

# Edit UFW before rules
sudo nano /etc/ufw/before.rules
```

Add at the top (before *filter):

```
# NAT rules for OpenVPN
*nat
:POSTROUTING ACCEPT [0:0]
-A POSTROUTING -s 10.8.0.0/24 -o eth0 -j MASQUERADE
COMMIT
```

Replace `eth0` with your actual interface name.

```bash
# Edit UFW default forward policy
sudo nano /etc/default/ufw
```

Change:
```
DEFAULT_FORWARD_POLICY="ACCEPT"
```

```bash
# Allow OpenVPN port
sudo ufw allow 1194/udp

# Allow SSH (important!)
sudo ufw allow OpenSSH

# Reload UFW
sudo ufw disable
sudo ufw enable
```

### Using iptables directly

```bash
# Enable NAT
sudo iptables -t nat -A POSTROUTING -s 10.8.0.0/24 -o eth0 -j MASQUERADE

# Allow forwarding
sudo iptables -A FORWARD -i tun0 -j ACCEPT
sudo iptables -A FORWARD -o tun0 -j ACCEPT

# Save rules
sudo apt install iptables-persistent -y
sudo netfilter-persistent save
```

## Start OpenVPN Server

```bash
# Create log directory
sudo mkdir -p /var/log/openvpn

# Start and enable OpenVPN server
sudo systemctl start openvpn-server@server
sudo systemctl enable openvpn-server@server

# Check status
sudo systemctl status openvpn-server@server

# Check for errors
sudo journalctl -u openvpn-server@server -f
```

## Generate Client Certificates

### Create Client Certificate

```bash
# Navigate to Easy-RSA directory
cd ~/easy-rsa

# Generate client certificate (replace 'client1' with client name)
./easyrsa gen-req client1 nopass
./easyrsa sign-req client client1
# Type 'yes' to confirm
```

### Create Client Configuration File

```bash
# Create client config directory
mkdir -p ~/client-configs/keys

# Copy required files
cp pki/ca.crt ~/client-configs/keys/
cp pki/issued/client1.crt ~/client-configs/keys/
cp pki/private/client1.key ~/client-configs/keys/
cp ta.key ~/client-configs/keys/

# Create base client configuration
nano ~/client-configs/base.conf
```

Base configuration:

```
# OpenVPN Client Configuration

client
dev tun
proto udp
remote YOUR_SERVER_IP 1194
resolv-retry infinite
nobind

# Security
persist-key
persist-tun
remote-cert-tls server
cipher AES-256-GCM
auth SHA256
key-direction 1
verb 3
```

### Generate Combined Client Config

Create a script to generate .ovpn files:

```bash
nano ~/client-configs/make_config.sh
```

```bash
#!/bin/bash
# Generate OpenVPN client configuration file

KEY_DIR=~/client-configs/keys
OUTPUT_DIR=~/client-configs/files
BASE_CONFIG=~/client-configs/base.conf

mkdir -p ${OUTPUT_DIR}

cat ${BASE_CONFIG} \
    <(echo -e '<ca>') \
    ${KEY_DIR}/ca.crt \
    <(echo -e '</ca>\n<cert>') \
    ${KEY_DIR}/${1}.crt \
    <(echo -e '</cert>\n<key>') \
    ${KEY_DIR}/${1}.key \
    <(echo -e '</key>\n<tls-auth>') \
    ${KEY_DIR}/ta.key \
    <(echo -e '</tls-auth>') \
    > ${OUTPUT_DIR}/${1}.ovpn

echo "Created ${OUTPUT_DIR}/${1}.ovpn"
```

```bash
# Make executable
chmod +x ~/client-configs/make_config.sh

# Generate client config
./make_config.sh client1
```

## Transfer Client Configuration

Transfer the `.ovpn` file to the client securely:

```bash
# Using SCP from client machine
scp user@server:~/client-configs/files/client1.ovpn ~/

# Or using SFTP
sftp user@server
get ~/client-configs/files/client1.ovpn
```

## Client Setup

### Linux Client

```bash
# Install OpenVPN
sudo apt install openvpn -y

# Connect using config file
sudo openvpn --config client1.ovpn

# Or install as service
sudo cp client1.ovpn /etc/openvpn/client.conf
sudo systemctl start openvpn@client
```

### Windows/macOS

Download OpenVPN client:
- Windows: OpenVPN GUI or OpenVPN Connect
- macOS: Tunnelblick or OpenVPN Connect

Import the `.ovpn` file and connect.

## Revoke Client Access

```bash
cd ~/easy-rsa

# Revoke certificate
./easyrsa revoke client1

# Generate new CRL
./easyrsa gen-crl

# Copy CRL to OpenVPN
sudo cp pki/crl.pem /etc/openvpn/server/

# Add CRL to server config
echo "crl-verify /etc/openvpn/server/crl.pem" | sudo tee -a /etc/openvpn/server/server.conf

# Restart OpenVPN
sudo systemctl restart openvpn-server@server
```

## Monitoring and Logging

### View Connected Clients

```bash
# Status file
cat /var/log/openvpn/openvpn-status.log

# Real-time connections
watch -n 5 cat /var/log/openvpn/openvpn-status.log
```

### View Logs

```bash
# OpenVPN log
sudo tail -f /var/log/openvpn/openvpn.log

# System journal
sudo journalctl -u openvpn-server@server -f
```

## Troubleshooting

### Connection Refused

```bash
# Check OpenVPN is running
sudo systemctl status openvpn-server@server

# Check port is open
sudo ss -ulnp | grep 1194

# Check firewall
sudo ufw status
```

### TLS Handshake Failed

```bash
# Verify certificates are correct
openssl verify -CAfile /etc/openvpn/server/ca.crt /etc/openvpn/server/server.crt

# Check ta.key direction (server=0, client=1)
```

### No Internet After Connecting

```bash
# Check IP forwarding
cat /proc/sys/net/ipv4/ip_forward

# Verify NAT rules
sudo iptables -t nat -L POSTROUTING -n -v
```

### Client Can't Reach LAN

```bash
# Verify push route in server config
grep "push.*route" /etc/openvpn/server/server.conf

# Check server LAN routing
ip route
```

## Security Best Practices

1. **Use strong encryption**: AES-256-GCM with SHA256
2. **TLS-Auth**: Adds HMAC signature to packets
3. **Unique certificates**: One per client, revoke when needed
4. **Regular updates**: Keep OpenVPN and OS updated
5. **Limit access**: Use firewall to restrict VPN source IPs
6. **Monitor logs**: Watch for failed authentication attempts

---

OpenVPN provides enterprise-grade VPN security with certificate-based authentication. While the initial setup requires multiple steps, the result is a robust and secure VPN solution. For easier management of multiple clients, consider using a management interface like OpenVPN Access Server or web-based tools like Pritunl.
