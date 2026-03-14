# How to Set Up IKEv2 VPN with strongSwan on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, VPN, StrongSwan, IKEv2, IPsec

Description: Step-by-step guide to deploying an IKEv2 VPN server on Ubuntu using strongSwan, with certificate-based authentication compatible with Windows, macOS, iOS, and Android clients.

---

IKEv2 is the modern standard for IPsec VPN negotiation. It is faster than IKEv1, supports MOBIKE for seamless network changes (useful on mobile devices), and handles NAT traversal cleanly. strongSwan is the go-to IKEv2 implementation on Linux. This guide sets up a server that native OS VPN clients can connect to without installing extra software.

## Prerequisites

- Ubuntu 22.04 or 24.04 server with a public IP
- A domain name pointing to the server (optional but recommended for certificate CN)
- Root or sudo access
- Ports 500/udp and 4500/udp open in your firewall

## Installing strongSwan

```bash
# Install strongSwan and the certificate utilities
sudo apt update
sudo apt install -y strongswan strongswan-pki libcharon-extra-plugins libcharon-extauth-plugins

# Verify installation
ipsec version
```

## Creating the Certificate Authority

IKEv2 with certificate authentication requires a PKI. You will create a simple one using strongSwan's built-in `pki` tool.

```bash
# Create a directory structure for the PKI
mkdir -p ~/pki/{cacert,certs,private}
chmod 700 ~/pki

# Generate the CA private key (4096-bit RSA)
pki --gen --type rsa --size 4096 --outform pem > ~/pki/private/ca.key.pem

# Self-sign the CA certificate
# Adjust the --dn value to match your organization
pki --self \
    --ca \
    --lifetime 3650 \
    --in ~/pki/private/ca.key.pem \
    --type rsa \
    --dn "CN=VPN Root CA, O=MyOrg, C=US" \
    --outform pem > ~/pki/cacert/ca.cert.pem
```

## Generating the Server Certificate

```bash
# Generate the server's private key
pki --gen --type rsa --size 4096 --outform pem > ~/pki/private/server.key.pem

# Create a certificate signing request and issue the server cert
# Replace vpn.example.com with your server's domain or IP
pki --pub \
    --in ~/pki/private/server.key.pem \
    --type rsa | \
pki --issue \
    --lifetime 1825 \
    --cacert ~/pki/cacert/ca.cert.pem \
    --cakey ~/pki/private/ca.key.pem \
    --dn "CN=vpn.example.com, O=MyOrg, C=US" \
    --san "vpn.example.com" \
    --flag serverAuth \
    --flag ikeIntermediate \
    --outform pem > ~/pki/certs/server.cert.pem
```

## Installing Certificates

```bash
# Copy certificates and keys to strongSwan's directories
sudo cp ~/pki/cacert/ca.cert.pem /etc/ipsec.d/cacerts/
sudo cp ~/pki/certs/server.cert.pem /etc/ipsec.d/certs/
sudo cp ~/pki/private/server.key.pem /etc/ipsec.d/private/

# Restrict permissions on the private key
sudo chmod 600 /etc/ipsec.d/private/server.key.pem
```

## Configuring strongSwan

```bash
# Back up the original config
sudo cp /etc/ipsec.conf /etc/ipsec.conf.bak

# Write the main configuration
sudo tee /etc/ipsec.conf > /dev/null <<'EOF'
config setup
    charondebug="ike 1, knl 1, cfg 0"

conn ikev2-vpn
    # This connection accepts inbound connections
    auto=add
    compress=no
    type=tunnel

    # Fragmentation and MOBIKE support
    fragmentation=yes
    forceencaps=yes
    mobike=yes

    # IKEv2 only
    keyexchange=ikev2
    ike=chacha20poly1305-sha512-curve25519-prfsha512,aes256gcm16-sha384-prfsha384-ecp384,aes256-sha1-modp1024,aes128-sha1-modp1024,3des-sha1-modp1024!
    esp=chacha20poly1305-sha512,aes256gcm16-ecp384,aes256-sha256,aes256-sha1,3des-sha1!

    # Server side
    left=%any
    leftid=@vpn.example.com
    leftcert=server.cert.pem
    leftsendcert=always
    leftsubnet=0.0.0.0/0

    # Client side
    right=%any
    rightid=%any
    rightauth=eap-mschapv2
    rightsourceip=10.10.10.0/24
    rightdns=8.8.8.8,8.8.4.4

    # EAP is used for username/password authentication
    eap_identity=%identity
EOF
```

## Configuring Users

```bash
# EAP-MSCHAPv2 credentials go in ipsec.secrets
sudo tee /etc/ipsec.secrets > /dev/null <<'EOF'
# Server certificate private key
: RSA "server.key.pem"

# User credentials: username : EAP "password"
alice : EAP "SecurePassword123"
bob   : EAP "AnotherPassword456"
EOF

sudo chmod 600 /etc/ipsec.secrets
```

## Configuring IP Forwarding and NAT

```bash
# Enable IP forwarding
sudo tee /etc/sysctl.d/99-strongswan.conf > /dev/null <<'EOF'
net.ipv4.ip_forward = 1
net.ipv4.conf.all.accept_redirects = 0
net.ipv4.conf.all.send_redirects = 0
EOF

sudo sysctl -p /etc/sysctl.d/99-strongswan.conf

# Add NAT masquerade rule so VPN clients can reach the internet
# Replace eth0 with your actual outbound interface
sudo iptables -t nat -A POSTROUTING -s 10.10.10.0/24 -o eth0 -j MASQUERADE
sudo iptables -A FORWARD -s 10.10.10.0/24 -j ACCEPT

# Make iptables rules persistent
sudo apt install -y iptables-persistent
sudo netfilter-persistent save
```

## Starting strongSwan

```bash
# Restart strongSwan to apply the new configuration
sudo systemctl restart strongswan-starter
sudo systemctl enable strongswan-starter

# Check the status
sudo systemctl status strongswan-starter

# View active connections
sudo ipsec statusall
```

## Firewall Configuration

```bash
# Allow IKE and NAT-T ports
sudo ufw allow 500/udp
sudo ufw allow 4500/udp

# Allow ESP protocol (for non-NAT-T scenarios)
sudo ufw allow proto esp

# If UFW is blocking forwarded packets, edit /etc/default/ufw:
# DEFAULT_FORWARD_POLICY="ACCEPT"
# Then reload UFW
sudo ufw reload
```

## Client Configuration

### Windows

On Windows 10/11, go to Settings - Network - VPN - Add VPN. Set:
- VPN type: IKEv2
- Server name: vpn.example.com
- Sign-in info: Username and password

You need to install the CA certificate before connecting. Copy `ca.cert.pem` to the Windows machine and import it into the "Trusted Root Certification Authorities" store using `certmgr.msc`.

### macOS and iOS

On macOS, go to System Settings - VPN - Add VPN Configuration - IKEv2. Enter the server address and account credentials. Install the CA certificate by double-clicking it and trusting it in Keychain Access.

On iOS, go to Settings - VPN - Add VPN Configuration - IKEv2.

### Exporting the CA Certificate for Distribution

```bash
# Convert the PEM CA cert to DER format for Windows import
openssl x509 -in ~/pki/cacert/ca.cert.pem -outform der -out ~/pki/cacert/ca.cert.der

# Or create a PKCS12 bundle if needed
# openssl pkcs12 -export -in ~/pki/certs/server.cert.pem \
#     -inkey ~/pki/private/server.key.pem \
#     -certfile ~/pki/cacert/ca.cert.pem \
#     -out ~/pki/server.p12
```

## Monitoring and Troubleshooting

```bash
# Watch IKE negotiations in real time
sudo journalctl -fu strongswan-starter

# Check current security associations
sudo ipsec statusall

# Show loaded connection configurations
sudo ipsec listconn

# Test config syntax without restarting
sudo ipsec checkconfig

# If a client connects but cannot reach the internet:
# Verify forwarding is enabled and NAT rule is in place
sysctl net.ipv4.ip_forward
sudo iptables -t nat -L POSTROUTING -v -n
```

A successful connection shows an SA (security association) entry in `ipsec statusall` output. The client gets an IP in the 10.10.10.0/24 range and can ping the server's tunnel address. If connections fail immediately, the most common cause is a certificate CN or SAN that does not match the server address the client is connecting to.
