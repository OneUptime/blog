# How to Create an OpenVPN Certificate Authority and Generate IPv4 Client Keys

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenVPN, PKI, Certificate Authority, IPv4, VPN, Security

Description: Set up an OpenVPN PKI using EasyRSA to create a Certificate Authority, generate server and client certificates, and configure IPv4 VPN connectivity.

## Introduction

OpenVPN uses TLS certificates for authentication. Each VPN endpoint (server and client) needs a certificate signed by a common Certificate Authority (CA). EasyRSA is a CLI tool that simplifies PKI management for OpenVPN deployments.

## Installing EasyRSA

```bash
# Download and extract EasyRSA

wget https://github.com/OpenVPN/easy-rsa/releases/download/v3.1.7/EasyRSA-3.1.7.tgz
tar xvf EasyRSA-3.1.7.tgz
cd EasyRSA-3.1.7/
```

## Initializing the PKI and Creating the CA

```bash
# Initialize the PKI directory
./easyrsa init-pki

# Build the Certificate Authority (creates ca.crt and ca.key)
# You will be prompted for a CA name and passphrase
./easyrsa build-ca
```

This creates:
- `pki/ca.crt` - The CA certificate (distribute to all clients)
- `pki/private/ca.key` - The CA private key (keep secret, never distribute)

## Generating the Server Certificate

```bash
# Generate server key and certificate signing request (CSR)
# Use "nopass" to skip password protection on the server key
./easyrsa gen-req server nopass

# Sign the server certificate with the CA
./easyrsa sign-req server server
```

This creates:
- `pki/issued/server.crt` - Signed server certificate
- `pki/private/server.key` - Server private key

## Generating the Diffie-Hellman Parameters

```bash
# Generate DH parameters (takes several minutes)
./easyrsa gen-dh

# Or generate DH parameters directly with openssl
openssl dhparam -out pki/dh.pem 2048
```

## Generating a Client Certificate

```bash
# Generate a client certificate for "client1"
./easyrsa gen-req client1 nopass

# Sign the client certificate
./easyrsa sign-req client client1
```

Repeat for each VPN client, using unique names (client2, client3, etc.).

## Generating a TLS Authentication Key (ta.key)

```bash
# Generate pre-shared TLS auth key for additional HMAC authentication
openvpn --genkey secret ta.key
```

## Server Configuration

```bash
# /etc/openvpn/server.conf
proto udp
dev tun
port 1194

# Certificate files
ca   /etc/openvpn/easy-rsa/pki/ca.crt
cert /etc/openvpn/easy-rsa/pki/issued/server.crt
key  /etc/openvpn/easy-rsa/pki/private/server.key
dh   /etc/openvpn/easy-rsa/pki/dh.pem

# TLS auth
tls-auth /etc/openvpn/ta.key 0

# IPv4 tunnel subnet
server 10.8.0.0 255.255.255.0

# Push routes and DNS to clients
push "redirect-gateway def1 bypass-dhcp"
push "dhcp-option DNS 8.8.8.8"
push "dhcp-option DNS 8.8.4.4"

keepalive 10 120
cipher AES-256-CBC
user nobody
group nogroup
persist-key
persist-tun
```

## Client Configuration

```ovpn
# client.ovpn
client
dev tun
proto udp
remote vpn.example.com 1194

ca   ca.crt
cert client1.crt
key  client1.key
tls-auth ta.key 1

cipher AES-256-CBC
verb 3
```

## Revoking a Client Certificate

```bash
# Revoke a specific client certificate
./easyrsa revoke client1

# Regenerate the Certificate Revocation List
./easyrsa gen-crl

# Add to server.conf
# crl-verify /etc/openvpn/easy-rsa/pki/crl.pem
```

## Conclusion

EasyRSA makes PKI management for OpenVPN straightforward. Always store the CA private key offline or in a secure vault, rotate client certificates periodically, and use certificate revocation to immediately cut access for compromised or departed users.
