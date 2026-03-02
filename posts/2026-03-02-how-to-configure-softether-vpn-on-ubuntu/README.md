# How to Configure SoftEther VPN on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, VPN, Networking, Security, SoftEther

Description: Learn how to install and configure SoftEther VPN Server on Ubuntu, supporting multiple VPN protocols including L2TP/IPsec, SSTP, OpenVPN, and the proprietary SoftEther protocol.

---

SoftEther VPN is an open-source, multi-protocol VPN server that supports L2TP/IPsec, SSTP, OpenVPN, SoftEther's own protocol, and several others - all from a single installation. This makes it useful in environments where clients use different operating systems or where you need VPN access without installing custom client software (using built-in OS VPN clients).

Developed by Daiyuu Nobori as a university thesis project in Japan and later open-sourced, SoftEther is genuinely capable software. The multi-protocol support is its main selling point: Windows machines can connect using the built-in L2TP or SSTP client, while other platforms can use OpenVPN or the SoftEther client.

## Installing SoftEther VPN Server

SoftEther isn't in Ubuntu's standard repositories, so you'll download it from the SoftEther project:

```bash
# Install build dependencies
sudo apt update
sudo apt install -y build-essential libssl-dev libreadline-dev zlib1g-dev \
    libncurses-dev libpthread-stubs0-dev

# Download SoftEther VPN Server
# Check https://www.softether-download.com for the latest version
# Select: SoftEther VPN Server, Linux, Intel x64
wget "https://www.softether-download.com/files/softether/v4.43-9799-beta-2023.08.31-tree/Linux/SoftEther_VPN_Server/64bit_-_Intel_x64_or_AMD64/softether-vpnserver-v4.43-9799-beta-2023.08.31-linux-x64-64bit.tar.gz"

# Extract the archive
tar xzf softether-vpnserver-*.tar.gz

# Build SoftEther
cd vpnserver
make
# Accept the agreement during the build process
```

The build process is interactive - you'll be asked to accept the license. After it completes:

```bash
# Move the built server to a permanent location
sudo mv ../vpnserver /usr/local/vpnserver

# Set proper permissions on the executables
sudo chmod 600 /usr/local/vpnserver/*
sudo chmod 700 /usr/local/vpnserver/vpncmd
sudo chmod 700 /usr/local/vpnserver/vpnserver
```

## Creating a systemd Service

```bash
sudo tee /etc/systemd/system/vpnserver.service << 'EOF'
[Unit]
Description=SoftEther VPN Server
After=network.target

[Service]
Type=forking
ExecStart=/usr/local/vpnserver/vpnserver start
ExecStop=/usr/local/vpnserver/vpnserver stop
Restart=on-failure
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl daemon-reload
sudo systemctl enable --now vpnserver

# Verify it started
systemctl status vpnserver
```

## Initial Configuration with vpncmd

SoftEther is configured through the `vpncmd` command-line tool, which connects to the server over its management interface:

```bash
# Connect to the local server management interface
sudo /usr/local/vpnserver/vpncmd

# At the prompt, choose:
# 1. Management of VPN Server or VPN Bridge
# Enter localhost for the server address (just press Enter)
# Press Enter for port (uses default 443)
# Press Enter for virtual hub name (manage the server, not a hub)

# Set the server administrator password
ServerPasswordSet

# Enter your desired password when prompted
```

Or use a single command to set the password:

```bash
sudo /usr/local/vpnserver/vpncmd localhost /SERVER /CMD ServerPasswordSet
```

## Configuring a Virtual Hub

SoftEther uses "virtual hubs" as isolated network segments. Create one for your VPN users:

```bash
sudo /usr/local/vpnserver/vpncmd localhost /SERVER /PASSWORD:your-password /CMD HubCreate MyVPN /PASSWORD:hub-password

# Select the hub for further configuration
sudo /usr/local/vpnserver/vpncmd localhost /SERVER /PASSWORD:your-password /HUB:MyVPN /CMD HubPasswordSet /PASSWORD:hub-password /TYPE:all
```

## Enabling L2TP/IPsec

L2TP/IPsec is built-in to most operating systems (Windows, macOS, iOS, Android):

```bash
sudo /usr/local/vpnserver/vpncmd localhost /SERVER /PASSWORD:your-password /CMD IPsecEnable \
    /L2TP:yes \
    /L2TPRAW:no \
    /ETHERIP:no \
    /PSK:your-pre-shared-key \
    /DEFAULTHUB:MyVPN
```

The pre-shared key (`PSK`) is what clients enter when configuring the L2TP connection on their device.

## Enabling OpenVPN Protocol

```bash
sudo /usr/local/vpnserver/vpncmd localhost /SERVER /PASSWORD:your-password /CMD OpenVpnEnable yes /PORTS:1194

# Download the OpenVPN configuration file (to distribute to clients)
sudo /usr/local/vpnserver/vpncmd localhost /SERVER /PASSWORD:your-password /CMD OpenVpnMakeConfig /SAVEPATH:/tmp/softether_openvpn.zip
```

## Enabling SSTP (for Windows native client)

SSTP uses HTTPS (port 443) which works through most corporate firewalls:

```bash
sudo /usr/local/vpnserver/vpncmd localhost /SERVER /PASSWORD:your-password /CMD SstpEnable yes
```

## Setting Up Virtual NAT and DHCP

For clients to get IP addresses and access the internet through the VPN, set up SecureNAT (SoftEther's built-in NAT+DHCP):

```bash
# Enable SecureNAT on the virtual hub
sudo /usr/local/vpnserver/vpncmd localhost /SERVER /PASSWORD:your-password /HUB:MyVPN /CMD SecureNatEnable

# Configure the virtual DHCP server
sudo /usr/local/vpnserver/vpncmd localhost /SERVER /PASSWORD:your-password /HUB:MyVPN /CMD NatSet \
    /MTU:1500 \
    /TCPTIMEOUT:3600 \
    /UDPTIMEOUT:1800 \
    /LOG:yes

# Configure DHCP to assign specific IP range
sudo /usr/local/vpnserver/vpncmd localhost /SERVER /PASSWORD:your-password /HUB:MyVPN /CMD DhcpSet \
    /START:192.168.30.10 \
    /END:192.168.30.200 \
    /MASK:255.255.255.0 \
    /EXPIRE:7200 \
    /GW:192.168.30.1 \
    /DNS:8.8.8.8 \
    /DNS2:8.8.4.4 \
    /DOMAIN: \
    /LOG:yes
```

## Adding VPN Users

```bash
# Create a user
sudo /usr/local/vpnserver/vpncmd localhost /SERVER /PASSWORD:your-password /HUB:MyVPN /CMD UserCreate john /GROUP:none /REALNAME:"John Smith" /NOTE:""

# Set a password for the user
sudo /usr/local/vpnserver/vpncmd localhost /SERVER /PASSWORD:your-password /HUB:MyVPN /CMD UserPasswordSet john /PASSWORD:user-password

# List users
sudo /usr/local/vpnserver/vpncmd localhost /SERVER /PASSWORD:your-password /HUB:MyVPN /CMD UserList
```

## Firewall Configuration

```bash
# SoftEther listens on multiple ports
# 443 - HTTPS/SSTP and main management port
# 992 - SoftEther VPN protocol (alternative SSL port)
# 5555 - SoftEther VPN protocol
# 1194 - OpenVPN
# 1701 - L2TP (UDP)
# 4500 - IPsec NAT-T (UDP)
# 500 - IKE (UDP)

sudo ufw allow 443/tcp
sudo ufw allow 443/udp
sudo ufw allow 1194/udp
sudo ufw allow 500/udp
sudo ufw allow 1701/udp
sudo ufw allow 4500/udp

# Enable IP forwarding
echo "net.ipv4.ip_forward=1" | sudo tee -a /etc/sysctl.conf
sudo sysctl -p
```

## Connecting Windows Clients with L2TP/IPsec

On a Windows client:
1. Open Network and Sharing Center -> Set up a new connection -> Connect to a workplace
2. Use your internet connection (VPN)
3. Enter the server's public IP or hostname
4. Destination name: anything descriptive
5. In advanced settings, select L2TP/IPsec with pre-shared key
6. Enter the PSK you set with `IPsecEnable`
7. Username: `john` (with hub prefix: `john@MyVPN` if connecting multiple hubs)
8. Password: the user password

## Using the SoftEther VPN Manager GUI

SoftEther also provides a Windows/Linux GUI called VPN Server Manager for remote management. Download the "SoftEther VPN Server Manager for Windows" from the SoftEther website, connect to your server's IP on port 443, and use it as an alternative to `vpncmd`.

## Monitoring and Logs

```bash
# View the server log
ls /usr/local/vpnserver/server_log/

# View hub logs (connection events)
ls /usr/local/vpnserver/packet_log/MyVPN/

# Check current sessions
sudo /usr/local/vpnserver/vpncmd localhost /SERVER /PASSWORD:your-password /HUB:MyVPN /CMD SessionList

# Server status
sudo /usr/local/vpnserver/vpncmd localhost /SERVER /PASSWORD:your-password /CMD ServerStatusGet
```

## Updating SoftEther

Since SoftEther is compiled from source, updates require downloading and rebuilding:

```bash
# Stop the service
sudo systemctl stop vpnserver

# Download and build the new version (same process as initial install)
# Then replace the files in /usr/local/vpnserver
# The configuration is separate (usually in /usr/local/vpnserver/*.config)
# Backup the config files before replacing

# Restart
sudo systemctl start vpnserver
```

SoftEther's broad protocol support makes it useful when you need to accommodate clients that can't install custom software. The L2TP/IPsec support in particular means any modern smartphone or laptop can connect without additional apps, which reduces the barrier to getting users connected.
