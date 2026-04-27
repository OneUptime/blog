# How to Configure OpenVPN for IPv4 Site-to-Site Connectivity

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenVPN, VPN, IPv4, Site-to-Site, Networking, Linux

Description: Set up an OpenVPN routed site-to-site tunnel between two IPv4 networks using static key or certificate-based authentication.

Site-to-site OpenVPN connects two networks rather than individual clients. One side acts as server, the other as client, and both sides announce their local subnets so traffic can be routed between networks.

## Option 1: Static Key (Simple, Two-Site Only)

Static key mode is simpler but only supports exactly two endpoints.

```bash
# Generate a shared static key on the server

openvpn --genkey secret /etc/openvpn/static.key

# Copy static.key to the remote site securely
scp /etc/openvpn/static.key user@remote-site:/etc/openvpn/
```

Server configuration:

```conf
# /etc/openvpn/site-server.conf

dev tun
ifconfig 10.7.0.1 10.7.0.2
secret /etc/openvpn/static.key
port 1194
proto udp

# Route for the remote site's LAN
route 192.168.2.0 255.255.255.0

# Keep tunnel alive
keepalive 10 60
```

Client (remote site) configuration:

```conf
# /etc/openvpn/site-client.conf

dev tun
ifconfig 10.7.0.2 10.7.0.1
remote 203.0.113.1 1194
proto udp
secret /etc/openvpn/static.key

# Route for the local site's LAN (on the server side)
route 192.168.1.0 255.255.255.0

keepalive 10 60
```

## Option 2: Certificate-Based (Scalable)

### Server Config with Route Announcements

```conf
# /etc/openvpn/server/server.conf

dev tun
server 10.8.0.0 255.255.255.0
proto udp
port 1194

ca /etc/openvpn/server/ca.crt
cert /etc/openvpn/server/server.crt
key /etc/openvpn/server/server.key
dh /etc/openvpn/server/dh.pem

# Announce the server-side LAN to clients
push "route 192.168.1.0 255.255.255.0"

# Allow clients to announce their subnets to each other and the server
route 192.168.2.0 255.255.255.0

# Per-client config directory (required so the CCD file below is read)
client-config-dir /etc/openvpn/ccd
```

Add a CCD file for the remote site's OpenVPN client:

```conf
# /etc/openvpn/ccd/remote-site

# Fixed IP for the remote site's OpenVPN client (net30 /30 endpoints)
ifconfig-push 10.8.0.10 10.8.0.9

# Route for the remote site's LAN, through this client
iroute 192.168.2.0 255.255.255.0
```

### Remote Site Client Config

```conf
# /etc/openvpn/client.conf

client
dev tun
remote 203.0.113.1 1194
proto udp

ca /etc/openvpn/ca.crt
cert /etc/openvpn/remote-site.crt
key /etc/openvpn/remote-site.key
```

## Enable Forwarding on Both Sides

```bash
# On both server and remote site router
sudo sysctl -w net.ipv4.ip_forward=1
```

## Testing Connectivity

```bash
# From Site A, ping a host in Site B
ping 192.168.2.10

# View the tunnel routing table
ip route show dev tun0
```

The `iroute` directive in the CCD file is critical - it tells the OpenVPN server to direct traffic for that subnet through the specified client connection.
