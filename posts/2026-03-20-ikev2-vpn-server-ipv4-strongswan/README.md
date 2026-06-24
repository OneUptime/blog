# How to Set Up IKEv2 VPN Server with IPv4 Using StrongSwan

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IKEv2, strongSwan, VPN, IPv4, PKI, Linux

Description: Build a production-ready IKEv2 VPN server with StrongSwan using certificate authentication for secure IPv4 remote access.

IKEv2 is the modern standard for IPSec key exchange, offering faster renegotiation, MOBIKE for mobility, and better security than IKEv1. Combined with server certificate authentication and EAP-MSCHAPv2 user authentication, it provides a robust VPN solution compatible with Windows, macOS, and iOS native VPN clients, plus Android clients such as the strongSwan app.

## Step 1: Generate the PKI

```bash
# Create directory for PKI material

mkdir -p ~/pki/{cacerts,certs,private}
chmod 700 ~/pki

# Generate the CA private key
ipsec pki --gen --type rsa --size 4096 --outform pem > ~/pki/private/ca-key.pem

# Self-sign the CA certificate (valid 10 years)
ipsec pki --self --ca --lifetime 3650 \
  --in ~/pki/private/ca-key.pem \
  --type rsa \
  --dn "CN=VPN Root CA" \
  --outform pem > ~/pki/cacerts/ca-cert.pem

# Generate the server private key
ipsec pki --gen --type rsa --size 4096 --outform pem > ~/pki/private/server-key.pem

# Generate and sign the server certificate
# Replace vpn.example.com with your server's FQDN
ipsec pki --pub --in ~/pki/private/server-key.pem --type rsa | \
  ipsec pki --issue --lifetime 1825 \
  --cacert ~/pki/cacerts/ca-cert.pem \
  --cakey ~/pki/private/ca-key.pem \
  --dn "CN=vpn.example.com" \
  --san "vpn.example.com" \
  --flag serverAuth --flag ikeIntermediate \
  --outform pem > ~/pki/certs/server-cert.pem

# Copy to StrongSwan directories
sudo cp ~/pki/private/server-key.pem /etc/ipsec.d/private/
sudo cp ~/pki/cacerts/ca-cert.pem /etc/ipsec.d/cacerts/
sudo cp ~/pki/certs/server-cert.pem /etc/ipsec.d/certs/
```

## Step 2: Configure StrongSwan for IKEv2

```conf
# /etc/ipsec.conf

config setup
    charondebug="ike 1, knl 1, cfg 0"
    uniqueids=no

conn ikev2-vpn
    auto=add
    compress=no
    type=tunnel
    keyexchange=ikev2
    fragmentation=yes
    forceencaps=yes
    # Dead Peer Detection
    dpdaction=clear
    dpddelay=300s
    rekey=no
    # Server side
    left=%any
    leftid=@vpn.example.com
    leftauth=pubkey
    leftcert=server-cert.pem
    leftsendcert=always
    leftsubnet=0.0.0.0/0
    # Client side
    right=%any
    rightid=%any
    rightauth=eap-mschapv2
    rightsourceip=10.10.0.0/24
    rightdns=8.8.8.8, 8.8.4.4
    rightsendcert=never
    # EAP authentication
    eap_identity=%identity
```

## Step 3: Set Up User Credentials

```conf
# /etc/ipsec.secrets

# Server's private key
: RSA "server-key.pem"

# EAP users (username : EAP "password")
alice : EAP "SecurePassword1!"
bob   : EAP "SecurePassword2!"
```

## Step 4: Enable Forwarding and Firewall Rules

```bash
sudo sysctl -w net.ipv4.ip_forward=1

# Allow IKEv2 and NAT-T
sudo iptables -A INPUT -p udp --dport 500 -j ACCEPT
sudo iptables -A INPUT -p udp --dport 4500 -j ACCEPT
sudo iptables -A FORWARD -s 10.10.0.0/24 -j ACCEPT
sudo iptables -A FORWARD -m conntrack --ctstate RELATED,ESTABLISHED -j ACCEPT
sudo iptables -t nat -A POSTROUTING -s 10.10.0.0/24 -o eth0 -j MASQUERADE
```

## Step 5: Start and Test

```bash
sudo ipsec restart
sudo ipsec statusall
```

Clients can now connect using the built-in IKEv2 VPN clients on Windows, macOS, and iOS, or an Android IKEv2 client such as the strongSwan app, after trusting the CA certificate and entering a configured username and password.
