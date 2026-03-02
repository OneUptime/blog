# How to Configure OpenVPN Client on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, VPN, OpenVPN, Networking, Security

Description: How to install and configure the OpenVPN client on Ubuntu, including importing .ovpn files, running as a systemd service, and troubleshooting connection issues.

---

Connecting an Ubuntu machine to an OpenVPN server is straightforward once you have the client configuration file. This post covers everything from installing the client to managing the connection as a systemd service, and working through common issues.

## Installing the OpenVPN Client

```bash
# Update package list
sudo apt update

# Install OpenVPN client
sudo apt install openvpn

# Verify installation
openvpn --version
```

For GNOME desktop environments, you can also install the NetworkManager plugin for a graphical interface:

```bash
# Install NetworkManager OpenVPN plugin
sudo apt install network-manager-openvpn network-manager-openvpn-gnome

# Restart NetworkManager
sudo systemctl restart NetworkManager
```

## Getting the Client Configuration File

The client configuration file (`.ovpn`) should come from your VPN server administrator. It typically contains:

- Server address and port
- Protocol (UDP or TCP)
- Embedded certificates (CA, client cert, client key)
- TLS authentication key

If the certificates are separate files, the config might reference them by path:

```conf
# Config with separate certificate files
ca /path/to/ca.crt
cert /path/to/client.crt
key /path/to/client.key
tls-auth /path/to/ta.key 1
```

In this case, make sure all referenced files are in the correct paths before connecting.

## Connecting via Command Line

The simplest way to test the connection:

```bash
# Connect using a .ovpn file
sudo openvpn --config /path/to/client1.ovpn

# Connect with verbose logging for troubleshooting
sudo openvpn --config /path/to/client1.ovpn --verb 4
```

If the connection succeeds, you'll see output like:

```
Initialization Sequence Completed
```

And a `tun0` interface will appear:

```bash
# In another terminal, verify the VPN interface
ip addr show tun0

# Check that you're routing through the VPN
curl ifconfig.me
# Should return the VPN server's public IP
```

Press `Ctrl+C` to disconnect.

## Running OpenVPN as a Systemd Service

For a persistent connection that starts automatically at boot, use the systemd integration:

```bash
# Copy the .ovpn file to the OpenVPN config directory
sudo cp /path/to/client1.ovpn /etc/openvpn/client/client1.conf
# Note: systemd expects .conf extension, not .ovpn

# Set restrictive permissions (it contains private keys)
sudo chmod 600 /etc/openvpn/client/client1.conf

# Enable and start the service
# The service name is openvpn-client@[config-name-without-extension]
sudo systemctl enable openvpn-client@client1
sudo systemctl start openvpn-client@client1

# Check status
sudo systemctl status openvpn-client@client1
```

### View Connection Logs

```bash
# View OpenVPN client logs
sudo journalctl -u openvpn-client@client1 -f

# View the last 50 lines
sudo journalctl -u openvpn-client@client1 -n 50

# View logs since last boot
sudo journalctl -u openvpn-client@client1 -b
```

### Stop and Disable the Service

```bash
# Stop the VPN connection
sudo systemctl stop openvpn-client@client1

# Disable auto-start
sudo systemctl disable openvpn-client@client1
```

## Handling Password-Protected Private Keys

If your client private key is encrypted with a passphrase, OpenVPN will prompt for it on startup. This breaks automated starts. To handle this:

### Option 1: Store the passphrase in a file

```bash
# Create a file with just the passphrase
echo "your-passphrase-here" | sudo tee /etc/openvpn/client/client1.pass
sudo chmod 600 /etc/openvpn/client/client1.pass

# Reference it in the config
sudo nano /etc/openvpn/client/client1.conf
# Add: askpass /etc/openvpn/client/client1.pass
```

### Option 2: Remove the passphrase from the key

```bash
# Remove passphrase from the key (requires entering the current passphrase)
openssl rsa -in client1.key -out client1-nopass.key
# Then use the nopass version in your config
```

## Using NetworkManager (GUI)

For desktop users, the NetworkManager approach is more convenient:

### Import via Command Line

```bash
# Import the .ovpn file into NetworkManager
nmcli connection import type openvpn file /path/to/client1.ovpn

# List connections to verify import
nmcli connection show

# Connect
nmcli connection up client1

# Disconnect
nmcli connection down client1
```

### Import via GUI

1. Open Settings > Network
2. Click the `+` button next to VPN
3. Choose "Import from file..."
4. Select your `.ovpn` file
5. Review and save
6. Toggle the VPN connection on

### Set Connection to Auto-Connect

```bash
# Enable auto-connect for the VPN connection
nmcli connection modify client1 connection.autoconnect yes

# Verify
nmcli connection show client1 | grep autoconnect
```

## Client Configuration Options

Understanding the key directives in a client config file:

```conf
# Mode: client mode
client

# Network device type
dev tun

# Protocol: udp or tcp
proto udp

# Server address and port
remote vpn.example.com 1194

# Retry DNS resolution indefinitely
resolv-retry infinite

# Don't bind to a specific local port
nobind

# Keep credentials in memory
persist-key
persist-tun

# Verify the server's certificate has the "server" key usage
remote-cert-tls server

# Cipher must match the server's setting
cipher AES-256-CBC

# HMAC algorithm must match the server
auth SHA256

# Log verbosity
verb 3

# TLS key direction (1 for client when server uses 0)
key-direction 1
```

## Routing: Full Tunnel vs Split Tunnel

By default, if the server pushes `redirect-gateway def1`, all traffic goes through the VPN. To override this and use split tunneling from the client side:

```bash
# Edit the client config
sudo nano /etc/openvpn/client/client1.conf

# Add this line to pull routes but not default gateway
pull-filter ignore "redirect-gateway"

# Then add specific routes for what should go through VPN
route 192.168.100.0 255.255.255.0
```

This sends only traffic for 192.168.100.0/24 through the VPN while other traffic goes directly.

## Troubleshooting Common Issues

### Connection Timeout

```bash
# Test if the server port is reachable
nc -u -z -v vpn.example.com 1194   # for UDP
nc -z -v vpn.example.com 1194       # for TCP

# If UDP fails, try TCP - edit the config
# proto tcp
# remote vpn.example.com 443   # Use port 443 to bypass firewalls
```

### TLS Handshake Failed

```bash
# Check the log for the specific error
sudo journalctl -u openvpn-client@client1 | grep "TLS"

# Common causes:
# - key-direction mismatch (client should be 1 if server is 0)
# - Cipher mismatch between client and server
# - Expired certificates

# Check certificate expiry
openssl x509 -in /path/to/client.crt -noout -dates
```

### "Cannot allocate TUN/TAP dev"

```bash
# Load the tun module
sudo modprobe tun

# Confirm it loaded
lsmod | grep tun

# Make it persist across reboots
echo "tun" | sudo tee -a /etc/modules
```

### Routing Not Working After Connection

```bash
# Check if the VPN interface is up
ip addr show tun0

# Check the routing table
ip route show

# The VPN should add a route - if missing, check server push configuration
sudo journalctl -u openvpn-client@client1 | grep "PUSH"
```

### DNS Leaks

When connected to a full-tunnel VPN, DNS queries should go through the VPN. To verify:

```bash
# Install DNS leak test tool
sudo apt install dnsutils

# Check which DNS server is being used
dig +short myip.opendns.com @resolver1.opendns.com

# Or test online at a DNS leak test website
```

If DNS is leaking, add to the client config:

```conf
# Use DNS servers pushed by the server
dhcp-option DNS 8.8.8.8
script-security 2
up /etc/openvpn/update-resolv-conf
down /etc/openvpn/update-resolv-conf
```

Install the DNS update script:

```bash
sudo apt install openvpn-systemd-resolved
```

## Connecting to Multiple VPN Servers

You can run multiple OpenVPN connections simultaneously, each using a different config file:

```bash
# Start two different VPN connections
sudo systemctl start openvpn-client@office
sudo systemctl start openvpn-client@datacenter

# Each gets its own tun interface (tun0, tun1, etc.)
ip addr show | grep tun
```

Routes from each VPN are added to the routing table, and Linux handles traffic routing based on destination addresses.

The OpenVPN client on Ubuntu is flexible enough to handle everything from a simple single-server setup to complex multi-VPN configurations. Starting with the command-line client for testing and then moving to systemd service management is the right progression for production environments.
