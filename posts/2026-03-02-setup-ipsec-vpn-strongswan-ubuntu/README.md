# How to Set Up IPsec VPN with strongSwan on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, VPN, IPsec, StrongSwan, Networking

Description: Complete guide to configuring an IPsec VPN server using strongSwan on Ubuntu, including certificate setup, IKEv2 configuration, and client compatibility.

---

strongSwan is a robust, open-source IPsec implementation for Linux. Unlike OpenVPN or WireGuard, IPsec is a standards-based protocol that's natively supported by most operating systems - Windows, macOS, iOS, and Android can connect to an IPsec VPN without installing additional software.

This guide sets up an IKEv2/IPsec server using strongSwan on Ubuntu.

## Prerequisites

- Ubuntu 22.04 or 24.04 server with a static public IP
- Root or sudo access
- Port 500/UDP and 4500/UDP open in your firewall
- A domain name pointing to your server (recommended for certificate validation)

## Install strongSwan

```bash
# Update package list
sudo apt update

# Install strongSwan and related packages
sudo apt install strongswan strongswan-pki libcharon-extra-plugins libcharon-extauth-plugins libstrongswan-extra-plugins

# Verify installation
ipsec version
```

## Set Up the PKI (Certificate Authority)

IKEv2 uses X.509 certificates for authentication. We'll create our own CA.

```bash
# Create directories for PKI
sudo mkdir -p /etc/ipsec.d/{cacerts,certs,private}

# Generate the CA private key
sudo ipsec pki --gen --size 4096 --type rsa --outform pem | sudo tee /etc/ipsec.d/private/ca-key.pem > /dev/null

# Self-sign the CA certificate
sudo ipsec pki --self --ca --lifetime 3650 \
  --in /etc/ipsec.d/private/ca-key.pem \
  --type rsa \
  --dn "CN=VPN Root CA" \
  --outform pem | sudo tee /etc/ipsec.d/cacerts/ca-cert.pem > /dev/null

# Set secure permissions
sudo chmod 600 /etc/ipsec.d/private/ca-key.pem
```

### Generate the Server Certificate

```bash
# Generate the server private key
sudo ipsec pki --gen --size 4096 --type rsa --outform pem | sudo tee /etc/ipsec.d/private/server-key.pem > /dev/null

# Generate a certificate signing request (CSR) and sign it with the CA
# Replace 'vpn.example.com' with your server's actual domain or IP
sudo ipsec pki --pub \
  --in /etc/ipsec.d/private/server-key.pem \
  --type rsa | sudo ipsec pki --issue \
  --lifetime 1825 \
  --cacert /etc/ipsec.d/cacerts/ca-cert.pem \
  --cakey /etc/ipsec.d/private/ca-key.pem \
  --dn "CN=vpn.example.com" \
  --san "vpn.example.com" \
  --san "@203.0.113.1" \
  --flag serverAuth \
  --flag ikeIntermediate \
  --outform pem | sudo tee /etc/ipsec.d/certs/server-cert.pem > /dev/null

sudo chmod 600 /etc/ipsec.d/private/server-key.pem
```

Replace `vpn.example.com` with your domain and `203.0.113.1` with your server's public IP.

## Configure strongSwan

### Main Configuration File

```bash
sudo nano /etc/ipsec.conf
```

```conf
config setup
    # Enable strict CISCO IPsec compliance
    strictcrlpolicy=no
    # Enable unique IDs
    uniqueids=no

# Default connection settings
conn %default
    ikelifetime=60m
    keylife=20m
    rekeymargin=3m
    keyingtries=1
    keyexchange=ikev2
    authby=rsasig

# IKEv2 connection for roadwarrior clients
conn roadwarrior
    left=%any
    leftid=vpn.example.com
    leftcert=server-cert.pem
    leftsendcert=always
    leftsubnet=0.0.0.0/0

    right=%any
    rightid=%any
    rightauth=eap-mschapv2
    rightsourceip=10.10.10.0/24
    rightdns=8.8.8.8,8.8.4.4

    # Cipher suites
    ike=aes256gcm16-sha384-prfsha384-ecp384!
    esp=aes256gcm16-sha384!

    auto=add
    compress=no
    type=tunnel
    dpdaction=clear
    dpddelay=300s
    rekey=no
    fragmentation=yes

    # Assign VPN IP from pool
    rightsourceip=10.10.10.0/24
```

### Secrets File

```bash
sudo nano /etc/ipsec.secrets
```

```text
# RSA private key for the server certificate
: RSA server-key.pem

# User credentials (username : EAP "password")
# Add one line per user
alice : EAP "AliceSecurePass123!"
bob : EAP "BobSecurePass456!"
```

```bash
# Secure the secrets file
sudo chmod 600 /etc/ipsec.secrets
```

## Configure Network Settings

Enable IP forwarding:

```bash
# Enable immediately
sudo sysctl -w net.ipv4.ip_forward=1

# Make permanent
sudo nano /etc/sysctl.conf
# Uncomment: net.ipv4.ip_forward=1

sudo sysctl -p
```

Add NAT masquerading for VPN clients:

```bash
# Find your public interface
ip route | grep default
# Example: eth0

# Add masquerade rule
sudo iptables -t nat -A POSTROUTING -s 10.10.10.0/24 -o eth0 -j MASQUERADE

# Allow forwarding
sudo iptables -A FORWARD -s 10.10.10.0/24 -j ACCEPT

# Save rules
sudo apt install iptables-persistent
sudo netfilter-persistent save
```

## Firewall Rules

```bash
# Allow IKE/ISAKMP (IKEv2 key exchange)
sudo ufw allow 500/udp

# Allow IPsec NAT-Traversal
sudo ufw allow 4500/udp

# Allow ESP protocol (for non-NAT scenarios)
sudo ufw allow in on eth0 proto esp

# Allow forwarding from VPN subnet
sudo ufw route allow in on eth0 out on eth0 from 10.10.10.0/24
```

Also ensure UFW allows forwarding by editing `/etc/default/ufw`:

```bash
sudo nano /etc/default/ufw
# Change: DEFAULT_FORWARD_POLICY="ACCEPT"
sudo ufw reload
```

## Start strongSwan

```bash
# Start the service
sudo systemctl start strongswan-starter

# Enable at boot
sudo systemctl enable strongswan-starter

# Check status
sudo systemctl status strongswan-starter

# Check if IPsec is running
sudo ipsec status
```

## Setting Up Client Configuration

### Exporting the CA Certificate

Clients need to trust your CA certificate. Export it for distribution:

```bash
# The CA cert is at:
cat /etc/ipsec.d/cacerts/ca-cert.pem

# For convenience, copy it to a web-accessible location or email it to users
sudo cp /etc/ipsec.d/cacerts/ca-cert.pem /var/www/html/ca.pem
```

### Connecting from Windows (Native IKEv2)

1. Import `ca-cert.pem` to the "Trusted Root Certification Authorities" store
2. Add a VPN connection:
   - Type: IKEv2
   - Server: vpn.example.com
   - Authentication: Username/Password (EAP-MSCHAPv2)
   - Username and password: from `/etc/ipsec.secrets`

### Connecting from macOS

1. Import the CA certificate via Keychain Access
2. Go to System Preferences > Network > Add VPN (IKEv2)
3. Fill in the server address and credentials

### Connecting from iOS/Android

Both platforms have native IKEv2 clients. Import the CA certificate first, then create a new IKEv2 VPN profile with your server address and credentials.

### Connecting from Ubuntu (Using networkmanager-strongswan)

```bash
# Install the NetworkManager strongSwan plugin
sudo apt install network-manager-strongswan

# Import the CA certificate
sudo cp /path/to/ca-cert.pem /etc/ipsec.d/cacerts/

# Create a connection via nmcli
nmcli connection add type vpn vpn-type strongswan \
  connection.id "My IKEv2 VPN" \
  vpn.data "address=vpn.example.com, certificate=/etc/ipsec.d/cacerts/ca-cert.pem, method=eap, user=alice, virtual=yes" \
  vpn.secrets "password=AliceSecurePass123!"

# Connect
nmcli connection up "My IKEv2 VPN"
```

## Certificate-Based Authentication (Alternative to EAP)

Instead of username/password, you can use client certificates:

```bash
# Generate a client key pair
sudo ipsec pki --gen --size 4096 --type rsa --outform pem > /tmp/client-key.pem

# Issue a client certificate
sudo ipsec pki --pub --in /tmp/client-key.pem --type rsa | \
  sudo ipsec pki --issue \
  --lifetime 730 \
  --cacert /etc/ipsec.d/cacerts/ca-cert.pem \
  --cakey /etc/ipsec.d/private/ca-key.pem \
  --dn "CN=alice@example.com" \
  --outform pem > /tmp/client-cert.pem

# Create a PKCS12 bundle for easy client import
openssl pkcs12 -export \
  -inkey /tmp/client-key.pem \
  -in /tmp/client-cert.pem \
  -certfile /etc/ipsec.d/cacerts/ca-cert.pem \
  -out /tmp/alice.p12
```

Update the server config to use certificate authentication:

```conf
conn roadwarrior-cert
    # Same interface/server config as before
    left=%any
    leftid=vpn.example.com
    leftcert=server-cert.pem
    leftsendcert=always
    leftsubnet=0.0.0.0/0

    right=%any
    rightid=%any
    rightauth=pubkey       # Certificate authentication instead of EAP
    rightsourceip=10.10.10.0/24

    ike=aes256gcm16-sha384-prfsha384-ecp384!
    esp=aes256gcm16-sha384!

    auto=add
```

## Monitoring and Management

```bash
# Show active connections
sudo ipsec status

# Show detailed connection information
sudo ipsec statusall

# Show security associations
sudo ipsec listcerts
sudo ipsec listsas

# Reload configuration after changes
sudo ipsec reload

# Reload secrets
sudo ipsec rereadsecrets

# Test configuration syntax
sudo ipsec verify
```

## Revoking a User's Access

For EAP authentication, simply remove the user's line from `/etc/ipsec.secrets`:

```bash
sudo nano /etc/ipsec.secrets
# Remove the user's line, e.g.: alice : EAP "AliceSecurePass123!"

# Reload secrets
sudo ipsec rereadsecrets

# Terminate any active sessions for that user
sudo ipsec down alice
```

For certificate-based auth, add the certificate to a CRL or use OCSP. StrongSwan checks the CRL during each new connection.

strongSwan's IKEv2 implementation is mature and compatible with virtually every device your users will have. The initial setup requires careful attention to the PKI and cipher configuration, but once it's running, the management overhead is minimal.
