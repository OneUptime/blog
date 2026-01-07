# How to Configure WireGuard VPN on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Linux, WireGuard, VPN, Security, Networking

Description: Set up WireGuard VPN on Ubuntu for secure network communication with server and client configuration for remote access.

---

## Introduction

WireGuard is a modern, high-performance VPN protocol that has gained significant popularity due to its simplicity, speed, and strong security model. Unlike traditional VPN solutions, WireGuard is designed to be lean and efficient, with a codebase of approximately 4,000 lines compared to OpenVPN's 100,000+ lines. This makes it easier to audit, maintain, and deploy.

In this comprehensive guide, we will walk through setting up a WireGuard VPN server on Ubuntu and configuring clients on Ubuntu, macOS, and Windows. By the end, you will have a fully functional VPN that enables secure remote access to your network.

## WireGuard vs OpenVPN: A Comparison

Before diving into the setup, let's understand why WireGuard might be the better choice for your VPN needs.

### Performance

WireGuard operates at the kernel level and uses state-of-the-art cryptography, resulting in significantly better performance:

| Metric | WireGuard | OpenVPN |
|--------|-----------|---------|
| Throughput | Up to 1 Gbps+ | 200-400 Mbps typical |
| Latency | Lower (kernel-level) | Higher (userspace) |
| CPU Usage | Minimal | Moderate to High |
| Connection Time | Milliseconds | Seconds |

### Security

WireGuard uses modern cryptographic primitives:

- **ChaCha20** for symmetric encryption
- **Curve25519** for key exchange
- **Poly1305** for message authentication
- **BLAKE2s** for hashing
- **SipHash24** for hashtable keys

OpenVPN supports multiple cipher suites, which can lead to misconfiguration. WireGuard's opinionated approach eliminates this risk.

### Simplicity

WireGuard configuration files are straightforward and easy to understand. The protocol itself has no complex state machine, making debugging much simpler.

### When to Choose OpenVPN

Despite WireGuard's advantages, OpenVPN may still be preferable when:

- You need TCP support (WireGuard is UDP-only)
- You require plugin support for authentication backends
- You need to work behind restrictive firewalls that block UDP
- Your organization mandates specific cipher suites for compliance

## Prerequisites

Before starting, ensure you have:

- An Ubuntu 20.04 or later server with root access
- A public IP address for the server
- Basic familiarity with Linux command line
- Port 51820/UDP open on your firewall

## Part 1: Server Installation and Configuration

### Step 1: Install WireGuard

Update your system packages and install WireGuard on the server.

```bash
# Update package lists to ensure we get the latest versions
sudo apt update

# Install WireGuard and required tools
sudo apt install -y wireguard wireguard-tools

# Verify the installation
wg --version
```

### Step 2: Generate Server Keys

WireGuard uses public-key cryptography. We need to generate a private and public key pair for the server.

```bash
# Create a directory for WireGuard configuration with secure permissions
sudo mkdir -p /etc/wireguard
sudo chmod 700 /etc/wireguard

# Navigate to the WireGuard directory
cd /etc/wireguard

# Generate the server's private key
# The umask ensures the private key is only readable by root
wg genkey | sudo tee server_private.key
sudo chmod 600 server_private.key

# Generate the server's public key from the private key
sudo cat server_private.key | wg pubkey | sudo tee server_public.key
```

Store these keys securely. The private key should never be shared. Display your keys:

```bash
# View the generated keys (you'll need these for configuration)
echo "Server Private Key: $(sudo cat /etc/wireguard/server_private.key)"
echo "Server Public Key: $(sudo cat /etc/wireguard/server_public.key)"
```

### Step 3: Configure the Server

Create the WireGuard interface configuration file. Replace the placeholders with your actual values.

```bash
# Create the WireGuard server configuration file
sudo nano /etc/wireguard/wg0.conf
```

Add the following configuration:

```ini
# /etc/wireguard/wg0.conf
# WireGuard Server Configuration

[Interface]
# The private IP address for the VPN server
# This will be the gateway for all VPN clients
Address = 10.0.0.1/24

# The port WireGuard will listen on
# Make sure this port is open in your firewall
ListenPort = 51820

# The server's private key (paste your actual private key here)
PrivateKey = YOUR_SERVER_PRIVATE_KEY

# Save the configuration when the interface goes down
SaveConfig = false

# PostUp commands run when the interface comes up
# These enable IP forwarding and set up NAT
PostUp = iptables -A FORWARD -i %i -j ACCEPT
PostUp = iptables -A FORWARD -o %i -j ACCEPT
PostUp = iptables -t nat -A POSTROUTING -o eth0 -j MASQUERADE

# PostDown commands run when the interface goes down
# These clean up the firewall rules
PostDown = iptables -D FORWARD -i %i -j ACCEPT
PostDown = iptables -D FORWARD -o %i -j ACCEPT
PostDown = iptables -t nat -D POSTROUTING -o eth0 -j MASQUERADE

# Client configurations will be added below as [Peer] sections
```

**Important**: Replace `eth0` with your actual network interface name. Find it using:

```bash
# Find your primary network interface
ip route show default | awk '/default/ {print $5}'
```

### Step 4: Enable IP Forwarding

For the VPN server to route traffic between clients and the internet, IP forwarding must be enabled.

```bash
# Enable IP forwarding temporarily (for testing)
sudo sysctl -w net.ipv4.ip_forward=1

# Enable IP forwarding permanently by editing sysctl.conf
echo "net.ipv4.ip_forward = 1" | sudo tee -a /etc/sysctl.conf

# If you need IPv6 forwarding as well
echo "net.ipv6.conf.all.forwarding = 1" | sudo tee -a /etc/sysctl.conf

# Apply the changes
sudo sysctl -p
```

### Step 5: Configure the Firewall

Set up UFW (Uncomplicated Firewall) to allow WireGuard traffic.

```bash
# Allow WireGuard port through the firewall
sudo ufw allow 51820/udp

# Allow SSH to prevent lockout (if not already allowed)
sudo ufw allow OpenSSH

# Enable the firewall if not already enabled
sudo ufw enable

# Check firewall status
sudo ufw status verbose
```

For more granular control with iptables:

```bash
# Allow incoming WireGuard connections
sudo iptables -A INPUT -p udp --dport 51820 -j ACCEPT

# Allow forwarding for VPN traffic
sudo iptables -A FORWARD -i wg0 -j ACCEPT
sudo iptables -A FORWARD -o wg0 -j ACCEPT

# Enable NAT for VPN clients to access the internet
sudo iptables -t nat -A POSTROUTING -s 10.0.0.0/24 -o eth0 -j MASQUERADE
```

### Step 6: Start the WireGuard Interface

Bring up the WireGuard interface and enable it to start on boot.

```bash
# Start the WireGuard interface
sudo wg-quick up wg0

# Verify the interface is running
sudo wg show

# Enable WireGuard to start automatically on boot
sudo systemctl enable wg-quick@wg0

# Check the status of the service
sudo systemctl status wg-quick@wg0
```

## Part 2: Client Configuration

### Generating Client Keys

For each client, we need to generate a unique key pair. This can be done on the server or on the client machine.

```bash
# Create a directory for client configurations
sudo mkdir -p /etc/wireguard/clients

# Generate keys for a client (repeat for each client)
wg genkey | tee /etc/wireguard/clients/client1_private.key | wg pubkey > /etc/wireguard/clients/client1_public.key

# View the generated keys
echo "Client1 Private Key: $(cat /etc/wireguard/clients/client1_private.key)"
echo "Client1 Public Key: $(cat /etc/wireguard/clients/client1_public.key)"
```

### Adding Client to Server Configuration

Add each client as a peer in the server configuration.

```bash
# Edit the server configuration to add the client peer
sudo nano /etc/wireguard/wg0.conf
```

Add the following peer section for each client:

```ini
# Client 1 Configuration
[Peer]
# Descriptive comment for this peer
# Client: user1-laptop

# The client's public key
PublicKey = CLIENT1_PUBLIC_KEY

# The IP address assigned to this client within the VPN
# Each client must have a unique IP address
AllowedIPs = 10.0.0.2/32

# Optional: Keepalive to maintain connection through NAT
# Sends a keepalive packet every 25 seconds
PersistentKeepalive = 25
```

After adding peers, restart the WireGuard interface:

```bash
# Restart WireGuard to apply changes
sudo wg-quick down wg0
sudo wg-quick up wg0

# Alternatively, add peers without restarting (hot reload)
sudo wg set wg0 peer CLIENT1_PUBLIC_KEY allowed-ips 10.0.0.2/32
```

### Ubuntu Client Configuration

Install WireGuard and configure the client on Ubuntu.

```bash
# Install WireGuard on the client
sudo apt update
sudo apt install -y wireguard wireguard-tools resolvconf

# Create the client configuration file
sudo nano /etc/wireguard/wg0.conf
```

Add the following configuration:

```ini
# /etc/wireguard/wg0.conf
# WireGuard Client Configuration for Ubuntu

[Interface]
# The private IP address for this client
# Must match the AllowedIPs on the server for this peer
Address = 10.0.0.2/24

# The client's private key
PrivateKey = CLIENT1_PRIVATE_KEY

# DNS servers to use when connected to the VPN
# You can use your own DNS or public ones like Cloudflare
DNS = 1.1.1.1, 8.8.8.8

[Peer]
# The server's public key
PublicKey = SERVER_PUBLIC_KEY

# The server's public IP address and WireGuard port
Endpoint = YOUR_SERVER_PUBLIC_IP:51820

# Route all traffic through the VPN (full tunnel)
# Use 0.0.0.0/0 for all IPv4 traffic
# Add ::/0 for all IPv6 traffic if needed
AllowedIPs = 0.0.0.0/0

# For split tunneling (only VPN network traffic):
# AllowedIPs = 10.0.0.0/24

# Send keepalive packets to maintain connection through NAT
# Essential for clients behind NAT or firewalls
PersistentKeepalive = 25
```

Connect to the VPN:

```bash
# Start the VPN connection
sudo wg-quick up wg0

# Verify the connection
sudo wg show

# Test connectivity by pinging the server's VPN IP
ping -c 4 10.0.0.1

# Check your public IP to verify traffic is routed through VPN
curl ifconfig.me

# Enable auto-start on boot
sudo systemctl enable wg-quick@wg0
```

### macOS Client Configuration

WireGuard is available for macOS through the App Store or Homebrew.

```bash
# Install WireGuard using Homebrew
brew install wireguard-tools

# Create configuration directory
mkdir -p /usr/local/etc/wireguard
```

Create the configuration file:

```bash
# Create the configuration file
nano /usr/local/etc/wireguard/wg0.conf
```

Add the configuration:

```ini
# /usr/local/etc/wireguard/wg0.conf
# WireGuard Client Configuration for macOS

[Interface]
# The private IP address for this client
Address = 10.0.0.3/24

# The client's private key
PrivateKey = CLIENT_PRIVATE_KEY

# DNS servers (optional but recommended)
DNS = 1.1.1.1

[Peer]
# The server's public key
PublicKey = SERVER_PUBLIC_KEY

# The server's endpoint
Endpoint = YOUR_SERVER_PUBLIC_IP:51820

# Route all traffic through VPN
AllowedIPs = 0.0.0.0/0, ::/0

# Keepalive for NAT traversal
PersistentKeepalive = 25
```

Using the WireGuard macOS app:

1. Download WireGuard from the Mac App Store
2. Click the WireGuard icon in the menu bar
3. Select "Import Tunnel(s) from File" or "Add Empty Tunnel"
4. Paste your configuration
5. Click "Activate" to connect

Command-line usage:

```bash
# Start the VPN (requires root)
sudo wg-quick up wg0

# Stop the VPN
sudo wg-quick down wg0

# Check status
sudo wg show
```

### Windows Client Configuration

For Windows, download the official WireGuard client from [wireguard.com/install](https://www.wireguard.com/install/).

1. Install the WireGuard application
2. Open WireGuard and click "Add Tunnel" > "Add empty tunnel"
3. Enter the configuration:

```ini
# WireGuard Client Configuration for Windows

[Interface]
# The private IP address for this client
Address = 10.0.0.4/24

# The client's private key (auto-generated or paste your own)
PrivateKey = CLIENT_PRIVATE_KEY

# DNS servers
DNS = 1.1.1.1, 8.8.8.8

[Peer]
# The server's public key
PublicKey = SERVER_PUBLIC_KEY

# The server's endpoint
Endpoint = YOUR_SERVER_PUBLIC_IP:51820

# Route all traffic through VPN
AllowedIPs = 0.0.0.0/0

# Keepalive
PersistentKeepalive = 25
```

4. Click "Save" and then "Activate" to connect

For automated deployment on Windows, you can use PowerShell:

```powershell
# Install WireGuard via Chocolatey
choco install wireguard -y

# Import a configuration file
wireguard /installtunnelservice "C:\path\to\wg0.conf"

# Start the tunnel
net start WireGuardTunnel$wg0
```

## Part 3: NAT and Firewall Configuration

### Understanding NAT with WireGuard

Network Address Translation (NAT) allows VPN clients to access the internet through the server's public IP. The PostUp/PostDown rules in the server configuration handle this automatically.

For advanced NAT scenarios:

```bash
# Masquerade all VPN traffic going out to the internet
sudo iptables -t nat -A POSTROUTING -s 10.0.0.0/24 -o eth0 -j MASQUERADE

# Allow established connections back through
sudo iptables -A FORWARD -m conntrack --ctstate RELATED,ESTABLISHED -j ACCEPT

# Allow forwarding from VPN interface to external interface
sudo iptables -A FORWARD -i wg0 -o eth0 -j ACCEPT
```

### Making iptables Rules Persistent

Install iptables-persistent to save rules across reboots.

```bash
# Install iptables-persistent
sudo apt install -y iptables-persistent

# Save current rules
sudo netfilter-persistent save

# Rules are stored in these files:
# /etc/iptables/rules.v4
# /etc/iptables/rules.v6
```

### Firewall Rules for Specific Use Cases

Allow VPN clients to access a specific internal service:

```bash
# Allow VPN clients to access an internal web server
sudo iptables -A FORWARD -i wg0 -d 192.168.1.100 -p tcp --dport 80 -j ACCEPT
sudo iptables -A FORWARD -i wg0 -d 192.168.1.100 -p tcp --dport 443 -j ACCEPT
```

Restrict VPN clients to only access certain networks (split tunneling server-side):

```bash
# Only allow VPN clients to access the internal network
sudo iptables -A FORWARD -i wg0 -d 192.168.1.0/24 -j ACCEPT
sudo iptables -A FORWARD -i wg0 -j DROP
```

## Part 4: Persistent Connections and Reliability

### Automatic Reconnection

WireGuard handles reconnection automatically due to its stateless design. However, you can enhance reliability with systemd.

Create a systemd service for monitoring:

```bash
# Create a WireGuard health check script
sudo nano /usr/local/bin/wg-health-check.sh
```

Add the health check script:

```bash
#!/bin/bash
# WireGuard Health Check Script
# Checks if the VPN tunnel is working and restarts if necessary

VPN_GATEWAY="10.0.0.1"
INTERFACE="wg0"
LOG_FILE="/var/log/wireguard-health.log"

# Function to log messages with timestamps
log_message() {
    echo "$(date '+%Y-%m-%d %H:%M:%S') - $1" >> "$LOG_FILE"
}

# Check if the interface exists
if ! ip link show "$INTERFACE" &> /dev/null; then
    log_message "Interface $INTERFACE not found. Starting WireGuard..."
    wg-quick up "$INTERFACE"
    exit 0
fi

# Ping the VPN gateway to check connectivity
if ! ping -c 3 -W 5 "$VPN_GATEWAY" &> /dev/null; then
    log_message "VPN gateway unreachable. Restarting WireGuard..."
    wg-quick down "$INTERFACE"
    sleep 2
    wg-quick up "$INTERFACE"
    log_message "WireGuard restarted."
else
    log_message "VPN connection healthy."
fi
```

Make the script executable and create a systemd timer:

```bash
# Make the script executable
sudo chmod +x /usr/local/bin/wg-health-check.sh

# Create a systemd service
sudo nano /etc/systemd/system/wg-health-check.service
```

Add the service configuration:

```ini
# /etc/systemd/system/wg-health-check.service
[Unit]
Description=WireGuard Health Check
After=network.target

[Service]
Type=oneshot
ExecStart=/usr/local/bin/wg-health-check.sh
```

Create a timer to run the health check periodically:

```bash
# Create the timer
sudo nano /etc/systemd/system/wg-health-check.timer
```

Add the timer configuration:

```ini
# /etc/systemd/system/wg-health-check.timer
[Unit]
Description=Run WireGuard Health Check every 5 minutes

[Timer]
OnBootSec=1min
OnUnitActiveSec=5min

[Install]
WantedBy=timers.target
```

Enable and start the timer:

```bash
# Reload systemd to recognize new units
sudo systemctl daemon-reload

# Enable and start the timer
sudo systemctl enable wg-health-check.timer
sudo systemctl start wg-health-check.timer

# Check timer status
sudo systemctl list-timers | grep wg-health
```

### PersistentKeepalive Explained

The `PersistentKeepalive` setting sends empty packets at regular intervals to keep NAT mappings alive.

```ini
# In peer configuration
PersistentKeepalive = 25
```

- Set to 25 seconds for most NAT scenarios
- Use 0 to disable (when not behind NAT)
- Higher values save bandwidth but risk connection drops

## Part 5: Troubleshooting

### Common Issues and Solutions

#### Issue: Cannot connect to VPN server

Check server-side logs and interface status:

```bash
# Check if WireGuard interface is up
sudo wg show

# Check system logs for WireGuard errors
sudo journalctl -u wg-quick@wg0 -f

# Verify the interface is listening
sudo ss -ulnp | grep 51820

# Check if the port is reachable from the internet
# Run this from a different machine
nc -zvu YOUR_SERVER_IP 51820
```

#### Issue: Connected but no internet access

Verify IP forwarding and NAT rules:

```bash
# Check if IP forwarding is enabled
cat /proc/sys/net/ipv4/ip_forward
# Should return 1

# Verify NAT rules are in place
sudo iptables -t nat -L POSTROUTING -v -n

# Check FORWARD chain
sudo iptables -L FORWARD -v -n

# Ensure the correct interface is being used for NAT
ip route show default
```

#### Issue: DNS not resolving

Fix DNS issues on the client:

```bash
# Check if resolvconf is installed (Linux)
which resolvconf || sudo apt install resolvconf

# Manually set DNS for testing
echo "nameserver 1.1.1.1" | sudo tee /etc/resolv.conf

# For systemd-resolved systems, check DNS settings
resolvectl status wg0
```

#### Issue: Handshake not completing

Debug handshake issues:

```bash
# Check the latest handshake time
sudo wg show wg0

# A "latest handshake" of "never" or very old indicates issues
# Common causes:
# 1. Incorrect public key
# 2. Firewall blocking UDP 51820
# 3. Wrong endpoint IP/port
# 4. NAT issues

# Enable kernel debugging for more info
echo module wireguard +p | sudo tee /sys/kernel/debug/dynamic_debug/control
sudo dmesg -w | grep wireguard
```

### Diagnostic Commands Reference

Here is a collection of useful diagnostic commands:

```bash
# Show WireGuard interface status with detailed info
sudo wg show all

# Show interface traffic statistics
sudo wg show wg0 transfer

# List all WireGuard interfaces
ip link show type wireguard

# Check routing table
ip route show

# Test VPN connectivity
ping -c 4 10.0.0.1

# Trace route through VPN
traceroute 10.0.0.1

# Check public IP (should show VPN server IP when connected)
curl -s ifconfig.me

# Monitor real-time traffic on the interface
sudo tcpdump -i wg0 -n

# Check for configuration syntax errors
sudo wg-quick strip wg0
```

### Logging and Monitoring

Enable detailed logging for troubleshooting:

```bash
# Enable WireGuard kernel module debug logging
echo 'module wireguard +p' | sudo tee /sys/kernel/debug/dynamic_debug/control

# View kernel messages related to WireGuard
sudo dmesg | grep wireguard

# Monitor WireGuard logs in real-time
sudo journalctl -f -k | grep wireguard
```

Create a monitoring script to track connection status:

```bash
# Create a monitoring script
sudo nano /usr/local/bin/wg-monitor.sh
```

Add the monitoring script:

```bash
#!/bin/bash
# WireGuard Connection Monitor
# Displays real-time status of WireGuard connections

while true; do
    clear
    echo "========================================"
    echo "WireGuard Connection Monitor"
    echo "Time: $(date)"
    echo "========================================"
    echo ""

    # Show interface status
    sudo wg show all

    echo ""
    echo "----------------------------------------"
    echo "Interface Statistics:"
    echo "----------------------------------------"

    # Show interface statistics
    if ip link show wg0 &> /dev/null; then
        ip -s link show wg0
    else
        echo "Interface wg0 is not active"
    fi

    echo ""
    echo "Press Ctrl+C to exit"

    sleep 5
done
```

Make it executable:

```bash
sudo chmod +x /usr/local/bin/wg-monitor.sh
```

## Part 6: Advanced Configuration

### Multiple Clients Configuration

For managing multiple clients efficiently, create a script:

```bash
# Create a client management script
sudo nano /usr/local/bin/wg-add-client.sh
```

Add the script content:

```bash
#!/bin/bash
# WireGuard Client Management Script
# Usage: wg-add-client.sh <client-name> <client-ip>

CLIENT_NAME=$1
CLIENT_IP=$2
WG_DIR="/etc/wireguard"
CLIENTS_DIR="$WG_DIR/clients"
SERVER_PUBLIC_KEY=$(cat $WG_DIR/server_public.key)
SERVER_ENDPOINT="YOUR_SERVER_PUBLIC_IP:51820"

if [ -z "$CLIENT_NAME" ] || [ -z "$CLIENT_IP" ]; then
    echo "Usage: $0 <client-name> <client-ip>"
    echo "Example: $0 laptop 10.0.0.5"
    exit 1
fi

# Create clients directory if it doesn't exist
mkdir -p "$CLIENTS_DIR"

# Generate client keys
wg genkey | tee "$CLIENTS_DIR/${CLIENT_NAME}_private.key" | wg pubkey > "$CLIENTS_DIR/${CLIENT_NAME}_public.key"
chmod 600 "$CLIENTS_DIR/${CLIENT_NAME}_private.key"

CLIENT_PRIVATE_KEY=$(cat "$CLIENTS_DIR/${CLIENT_NAME}_private.key")
CLIENT_PUBLIC_KEY=$(cat "$CLIENTS_DIR/${CLIENT_NAME}_public.key")

# Create client configuration file
cat > "$CLIENTS_DIR/${CLIENT_NAME}.conf" << EOF
# WireGuard Client Configuration
# Client: $CLIENT_NAME

[Interface]
Address = $CLIENT_IP/24
PrivateKey = $CLIENT_PRIVATE_KEY
DNS = 1.1.1.1

[Peer]
PublicKey = $SERVER_PUBLIC_KEY
Endpoint = $SERVER_ENDPOINT
AllowedIPs = 0.0.0.0/0
PersistentKeepalive = 25
EOF

# Add peer to server configuration
cat >> "$WG_DIR/wg0.conf" << EOF

# Client: $CLIENT_NAME
[Peer]
PublicKey = $CLIENT_PUBLIC_KEY
AllowedIPs = $CLIENT_IP/32
PersistentKeepalive = 25
EOF

echo "Client configuration created: $CLIENTS_DIR/${CLIENT_NAME}.conf"
echo "Client added to server configuration."
echo ""
echo "Restart WireGuard to apply changes:"
echo "  sudo wg-quick down wg0 && sudo wg-quick up wg0"
echo ""
echo "Or add peer without restart:"
echo "  sudo wg set wg0 peer $CLIENT_PUBLIC_KEY allowed-ips $CLIENT_IP/32"
```

Make it executable:

```bash
sudo chmod +x /usr/local/bin/wg-add-client.sh
```

### QR Code Generation for Mobile Clients

Generate QR codes for easy mobile client configuration:

```bash
# Install qrencode
sudo apt install -y qrencode

# Generate a QR code for a client configuration
qrencode -t ansiutf8 < /etc/wireguard/clients/client1.conf

# Save QR code as an image
qrencode -o /etc/wireguard/clients/client1_qr.png < /etc/wireguard/clients/client1.conf
```

### Site-to-Site VPN Configuration

For connecting two networks:

Server A configuration:

```ini
# /etc/wireguard/wg0.conf on Server A
[Interface]
Address = 10.0.0.1/24
PrivateKey = SERVER_A_PRIVATE_KEY
ListenPort = 51820
PostUp = iptables -A FORWARD -i %i -j ACCEPT; iptables -t nat -A POSTROUTING -o eth0 -j MASQUERADE
PostDown = iptables -D FORWARD -i %i -j ACCEPT; iptables -t nat -D POSTROUTING -o eth0 -j MASQUERADE

[Peer]
PublicKey = SERVER_B_PUBLIC_KEY
Endpoint = SERVER_B_PUBLIC_IP:51820
AllowedIPs = 10.0.0.2/32, 192.168.2.0/24
PersistentKeepalive = 25
```

Server B configuration:

```ini
# /etc/wireguard/wg0.conf on Server B
[Interface]
Address = 10.0.0.2/24
PrivateKey = SERVER_B_PRIVATE_KEY
ListenPort = 51820
PostUp = iptables -A FORWARD -i %i -j ACCEPT; iptables -t nat -A POSTROUTING -o eth0 -j MASQUERADE
PostDown = iptables -D FORWARD -i %i -j ACCEPT; iptables -t nat -D POSTROUTING -o eth0 -j MASQUERADE

[Peer]
PublicKey = SERVER_A_PUBLIC_KEY
Endpoint = SERVER_A_PUBLIC_IP:51820
AllowedIPs = 10.0.0.1/32, 192.168.1.0/24
PersistentKeepalive = 25
```

## Security Best Practices

### Key Management

Follow these practices for secure key management:

```bash
# Rotate keys periodically (generate new keys and update configurations)
# Create a key rotation script
sudo nano /usr/local/bin/wg-rotate-keys.sh
```

```bash
#!/bin/bash
# WireGuard Key Rotation Script
# Generates new server keys and backs up old ones

DATE=$(date +%Y%m%d)
BACKUP_DIR="/etc/wireguard/backup_$DATE"

# Create backup
mkdir -p "$BACKUP_DIR"
cp /etc/wireguard/*.key "$BACKUP_DIR/"
cp /etc/wireguard/wg0.conf "$BACKUP_DIR/"

# Generate new keys
wg genkey | tee /etc/wireguard/server_private.key | wg pubkey > /etc/wireguard/server_public.key
chmod 600 /etc/wireguard/server_private.key

echo "New keys generated. Update wg0.conf with the new private key."
echo "Distribute the new public key to all clients."
echo "Old configuration backed up to: $BACKUP_DIR"
```

### Limiting Access

Restrict WireGuard management to specific users:

```bash
# Create a dedicated group for WireGuard management
sudo groupadd wireguard

# Add users to the group
sudo usermod -aG wireguard yourusername

# Set permissions on WireGuard directory
sudo chown -R root:wireguard /etc/wireguard
sudo chmod 750 /etc/wireguard
sudo chmod 640 /etc/wireguard/*.conf
sudo chmod 600 /etc/wireguard/*.key
```

## Conclusion

WireGuard provides a modern, efficient, and secure VPN solution that is significantly easier to configure than traditional alternatives like OpenVPN. In this guide, we covered:

- The advantages of WireGuard over OpenVPN
- Complete server installation and configuration on Ubuntu
- Client setup for Ubuntu, macOS, and Windows
- NAT and firewall configuration for internet access
- Persistent connections with health monitoring
- Comprehensive troubleshooting techniques
- Advanced configurations including multi-client management and site-to-site VPN

With WireGuard properly configured, you have a fast, secure, and reliable VPN that protects your network communications. Remember to keep your keys secure, regularly update your system, and monitor your connections for any issues.

For production deployments, consider implementing additional security measures such as fail2ban for brute-force protection, regular key rotation, and comprehensive logging for audit purposes.

## Additional Resources

- [WireGuard Official Documentation](https://www.wireguard.com/quickstart/)
- [WireGuard White Paper](https://www.wireguard.com/papers/wireguard.pdf)
- [Ubuntu Server Guide](https://ubuntu.com/server/docs)
- [Linux IP Forwarding Guide](https://www.kernel.org/doc/Documentation/networking/ip-sysctl.txt)
