# How to Set Up a Seedbox on Ubuntu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ubuntu, Seedbox, Linux, Torrents, qBittorrent, Deluge, rTorrent, VPN, Server, Self-Hosting

Description: A comprehensive guide to building a fully-featured seedbox on Ubuntu with multiple torrent clients, VPN integration, automation, and monitoring.

---

A seedbox is a dedicated remote server optimized for high-speed torrent downloading and uploading. By moving torrent operations to a seedbox, you gain faster speeds, improved privacy, and the ability to maintain high seed ratios without consuming your home bandwidth. This guide walks through building a production-grade seedbox on Ubuntu.

## What is a Seedbox and Why Use One?

A seedbox is essentially a high-bandwidth server dedicated to BitTorrent operations. Here are the primary use cases:

- **Privacy**: Your home IP address is never exposed to torrent swarms
- **Speed**: Data center connections often exceed 1 Gbps, dramatically reducing download times
- **Ratio Building**: Maintain excellent upload ratios on private trackers with always-on seeding
- **Bandwidth Offloading**: Keep your home connection free for regular use
- **Remote Access**: Download torrents from anywhere via web interfaces
- **Legal Distribution**: Share large open-source projects, Linux ISOs, and creative commons content efficiently

## Prerequisites

Before starting, ensure you have:

- A VPS or dedicated server running Ubuntu 22.04 LTS or newer
- Root or sudo access
- A domain name (optional but recommended for SSL)
- At least 1 TB storage space
- Minimum 2 GB RAM (4 GB recommended)

Update your system before proceeding.

```bash
# Update package lists and upgrade all installed packages
sudo apt update && sudo apt upgrade -y

# Install essential utilities for the setup process
sudo apt install -y curl wget git unzip software-properties-common
```

## Installing qBittorrent with Web UI

qBittorrent is a popular choice for its excellent web interface and feature parity with the desktop version.

Add the qBittorrent repository and install the headless version (no GUI required on servers).

```bash
# Add the qBittorrent-nox repository for the latest stable release
sudo add-apt-repository ppa:qbittorrent-team/qbittorrent-stable -y
sudo apt update

# Install the headless version (nox = no X server required)
sudo apt install -y qbittorrent-nox
```

Create a dedicated system user for qBittorrent to enhance security by isolating the service.

```bash
# Create a system user with no login shell and a home directory for downloads
sudo adduser --system --group --no-create-home qbittorrent

# Create the download directory and set permissions
sudo mkdir -p /home/downloads/qbittorrent
sudo chown -R qbittorrent:qbittorrent /home/downloads/qbittorrent
```

Create a systemd service file to manage qBittorrent as a background daemon.

```bash
# Create the systemd service file for qBittorrent
sudo tee /etc/systemd/system/qbittorrent-nox.service > /dev/null <<EOF
[Unit]
Description=qBittorrent-nox Daemon
Documentation=man:qbittorrent-nox(1)
After=network.target

[Service]
Type=simple
User=qbittorrent
Group=qbittorrent
UMask=007
ExecStart=/usr/bin/qbittorrent-nox --webui-port=8080
Restart=on-failure
TimeoutStopSec=300

[Install]
WantedBy=multi-user.target
EOF
```

Enable and start the qBittorrent service.

```bash
# Reload systemd to recognize the new service file
sudo systemctl daemon-reload

# Enable the service to start on boot
sudo systemctl enable qbittorrent-nox

# Start the service immediately
sudo systemctl start qbittorrent-nox

# Check the service status to verify it is running
sudo systemctl status qbittorrent-nox
```

Access the web UI at `http://your-server-ip:8080`. The default credentials are `admin` / `adminadmin`. Change these immediately in Settings > Web UI.

## Installing Deluge with Web UI

Deluge is lightweight and highly extensible through plugins. Many users prefer it for private trackers.

Install Deluge daemon and web interface components.

```bash
# Install Deluge daemon, web interface, and console client
sudo apt install -y deluged deluge-web deluge-console
```

Create a dedicated user and necessary directories for Deluge.

```bash
# Create system user for Deluge
sudo adduser --system --group --no-create-home deluge

# Create configuration and download directories
sudo mkdir -p /home/downloads/deluge
sudo mkdir -p /var/lib/deluge/.config/deluge
sudo chown -R deluge:deluge /home/downloads/deluge
sudo chown -R deluge:deluge /var/lib/deluge
```

Create the systemd service file for the Deluge daemon.

```bash
# Create systemd service for Deluge daemon
sudo tee /etc/systemd/system/deluged.service > /dev/null <<EOF
[Unit]
Description=Deluge Bittorrent Client Daemon
Documentation=man:deluged
After=network-online.target

[Service]
Type=simple
User=deluge
Group=deluge
UMask=007
ExecStart=/usr/bin/deluged -d -c /var/lib/deluge/.config/deluge
Restart=on-failure
TimeoutStopSec=300

[Install]
WantedBy=multi-user.target
EOF
```

Create the systemd service file for the Deluge web interface.

```bash
# Create systemd service for Deluge web UI
sudo tee /etc/systemd/system/deluge-web.service > /dev/null <<EOF
[Unit]
Description=Deluge Bittorrent Client Web Interface
Documentation=man:deluge-web
After=network-online.target deluged.service
Wants=deluged.service

[Service]
Type=simple
User=deluge
Group=deluge
UMask=027
ExecStart=/usr/bin/deluge-web -d -c /var/lib/deluge/.config/deluge
Restart=on-failure

[Install]
WantedBy=multi-user.target
EOF
```

Enable and start both Deluge services.

```bash
# Reload systemd and enable both services
sudo systemctl daemon-reload
sudo systemctl enable deluged deluge-web
sudo systemctl start deluged deluge-web

# Verify both services are running
sudo systemctl status deluged
sudo systemctl status deluge-web
```

Access the Deluge web UI at `http://your-server-ip:8112`. The default password is `deluge`. Change it immediately after first login.

## Installing rTorrent with ruTorrent

rTorrent is a powerful command-line client, and ruTorrent provides a feature-rich web frontend. This combination is popular among power users and private tracker enthusiasts.

Install rTorrent and required dependencies for ruTorrent.

```bash
# Install rTorrent and XML-RPC support
sudo apt install -y rtorrent

# Install web server and PHP for ruTorrent
sudo apt install -y nginx php-fpm php-cli php-geoip php-xml php-zip

# Install additional tools ruTorrent needs for full functionality
sudo apt install -y mediainfo ffmpeg unrar-free
```

Create a dedicated user for rTorrent operations.

```bash
# Create the rtorrent user with a home directory
sudo adduser --system --group rtorrent
sudo mkdir -p /home/rtorrent
sudo chown rtorrent:rtorrent /home/rtorrent

# Create download directories
sudo mkdir -p /home/downloads/rtorrent/{watch,session,complete,incomplete}
sudo chown -R rtorrent:rtorrent /home/downloads/rtorrent
```

Create the rTorrent configuration file with optimized settings.

```bash
# Create the rTorrent configuration file
sudo tee /home/rtorrent/.rtorrent.rc > /dev/null <<'EOF'
# Directory settings - where torrents and data are stored
directory.default.set = /home/downloads/rtorrent/incomplete
session.path.set = /home/downloads/rtorrent/session

# Watch directory - drop .torrent files here for automatic loading
schedule2 = watch_directory,5,5,load.start=/home/downloads/rtorrent/watch/*.torrent
schedule2 = untied_directory,5,5,stop_untied=
schedule2 = tied_directory,5,5,start_tied=

# Move completed downloads to the complete directory
method.insert = d.get_finished_dir, simple, "cat=/home/downloads/rtorrent/complete/,$d.custom1="
method.insert = d.move_to_complete, simple, "d.directory.set=$argument.1=; execute=mkdir,-p,$argument.1=; execute=mv,-u,$argument.0=,$argument.1=; d.save_full_session="
method.set_key = event.download.finished,move_complete,"d.move_to_complete=$d.data_path=,$d.get_finished_dir="

# Connection settings - adjust based on your server capacity
throttle.global_down.max_rate.set_kb = 0
throttle.global_up.max_rate.set_kb = 0
throttle.max_peers.normal.set = 100
throttle.max_peers.seed.set = 50
throttle.max_uploads.global.set = 100
throttle.min_peers.normal.set = 40
throttle.min_peers.seed.set = 10

# Network settings for high-speed connections
network.port_range.set = 50000-50000
network.port_random.set = no
protocol.encryption.set = allow_incoming,try_outgoing,enable_retry
network.max_open_files.set = 1024
network.max_open_sockets.set = 300

# DHT and peer exchange settings
dht.mode.set = auto
protocol.pex.set = yes
trackers.use_udp.set = yes

# SCGI socket for ruTorrent communication
network.scgi.open_local = /var/run/rtorrent/rpc.socket
execute.nothrow = chmod,770,/var/run/rtorrent/rpc.socket

# Logging
log.open_file = "rtorrent", /var/log/rtorrent/rtorrent.log
log.add_output = "info", "rtorrent"
EOF

sudo chown rtorrent:rtorrent /home/rtorrent/.rtorrent.rc
```

Create necessary directories and set permissions.

```bash
# Create directories for socket and logs
sudo mkdir -p /var/run/rtorrent /var/log/rtorrent
sudo chown rtorrent:rtorrent /var/run/rtorrent /var/log/rtorrent

# Add www-data to rtorrent group for socket access
sudo usermod -aG rtorrent www-data
```

Create the systemd service file for rTorrent using tmux for session management.

```bash
# Install tmux for session management
sudo apt install -y tmux

# Create systemd service for rTorrent
sudo tee /etc/systemd/system/rtorrent.service > /dev/null <<EOF
[Unit]
Description=rTorrent Daemon
After=network.target

[Service]
Type=forking
User=rtorrent
Group=rtorrent
UMask=002
ExecStartPre=/bin/mkdir -p /var/run/rtorrent
ExecStartPre=/bin/chown rtorrent:rtorrent /var/run/rtorrent
ExecStart=/usr/bin/tmux -L rtorrent new-session -d -s rtorrent /usr/bin/rtorrent
ExecStop=/usr/bin/tmux -L rtorrent send-keys -t rtorrent C-q
Restart=on-failure

[Install]
WantedBy=multi-user.target
EOF
```

Download and configure ruTorrent.

```bash
# Download ruTorrent to the web directory
cd /var/www
sudo git clone https://github.com/Novik/ruTorrent.git rutorrent
sudo chown -R www-data:www-data /var/www/rutorrent

# Set correct permissions for ruTorrent
sudo chmod -R 755 /var/www/rutorrent
sudo chmod -R 777 /var/www/rutorrent/share
```

Configure the ruTorrent settings to communicate with rTorrent.

```bash
# Update ruTorrent configuration
sudo tee /var/www/rutorrent/conf/config.php > /dev/null <<'EOF'
<?php
// rTorrent SCGI socket path for communication
$scgi_port = 0;
$scgi_host = "unix:///var/run/rtorrent/rpc.socket";

// Path settings for external tools
$pathToExternals = array(
    "php"    => '/usr/bin/php',
    "curl"   => '/usr/bin/curl',
    "gzip"   => '/bin/gzip',
    "id"     => '/usr/bin/id',
    "stat"   => '/usr/bin/stat',
    "mediainfo" => '/usr/bin/mediainfo',
    "ffmpeg" => '/usr/bin/ffmpeg',
);

// Localization
$defaultLocale = "UTF8";

// Enable plugins (comma-separated list to disable)
$enabledPlugins = array();
$disabledPlugins = array();
EOF
```

Create the Nginx configuration for ruTorrent.

```bash
# Create Nginx server block for ruTorrent
sudo tee /etc/nginx/sites-available/rutorrent > /dev/null <<'EOF'
server {
    listen 8090;
    server_name _;
    root /var/www/rutorrent;
    index index.html index.php;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;

    # Deny access to sensitive files
    location ~ /\.ht {
        deny all;
    }

    location ~ /\.svn {
        deny all;
    }

    # PHP handling
    location ~ \.php$ {
        fastcgi_split_path_info ^(.+\.php)(/.+)$;
        fastcgi_pass unix:/var/run/php/php-fpm.sock;
        fastcgi_index index.php;
        include fastcgi_params;
        fastcgi_param SCRIPT_FILENAME $document_root$fastcgi_script_name;
    }

    # RPC endpoint for SCGI
    location /RPC2 {
        include scgi_params;
        scgi_pass unix:/var/run/rtorrent/rpc.socket;
    }
}
EOF

# Enable the site and restart Nginx
sudo ln -sf /etc/nginx/sites-available/rutorrent /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl restart nginx
```

Enable and start rTorrent.

```bash
# Start rTorrent service
sudo systemctl daemon-reload
sudo systemctl enable rtorrent
sudo systemctl start rtorrent

# Verify rTorrent is running
sudo systemctl status rtorrent
```

Access ruTorrent at `http://your-server-ip:8090`.

## VPN Configuration for Privacy

Using a VPN ensures your seedbox traffic is encrypted and your server IP is masked. WireGuard is recommended for its performance and simplicity.

Install WireGuard on your seedbox.

```bash
# Install WireGuard
sudo apt install -y wireguard wireguard-tools

# Enable IP forwarding for VPN routing
echo "net.ipv4.ip_forward=1" | sudo tee -a /etc/sysctl.conf
echo "net.ipv6.conf.all.forwarding=1" | sudo tee -a /etc/sysctl.conf
sudo sysctl -p
```

Create the WireGuard configuration. Replace the placeholder values with your VPN provider's details.

```bash
# Create WireGuard configuration file
sudo tee /etc/wireguard/wg0.conf > /dev/null <<'EOF'
[Interface]
# Your private key (generate with: wg genkey)
PrivateKey = YOUR_PRIVATE_KEY_HERE

# VPN-assigned address from your provider
Address = 10.x.x.x/32

# Use VPN's DNS to prevent leaks
DNS = 1.1.1.1, 1.0.0.1

# Mark torrent traffic to route through VPN
Table = 51820
PostUp = ip rule add from 10.x.x.x table 51820
PostDown = ip rule del from 10.x.x.x table 51820

[Peer]
# VPN server's public key
PublicKey = VPN_SERVER_PUBLIC_KEY

# Allow all traffic through the tunnel
AllowedIPs = 0.0.0.0/0, ::/0

# VPN server endpoint
Endpoint = vpn.example.com:51820

# Keep connection alive behind NAT
PersistentKeepalive = 25
EOF

# Set secure permissions on the config file
sudo chmod 600 /etc/wireguard/wg0.conf
```

Enable and start the WireGuard interface.

```bash
# Enable WireGuard to start on boot
sudo systemctl enable wg-quick@wg0

# Start the WireGuard tunnel
sudo wg-quick up wg0

# Verify the tunnel is active
sudo wg show

# Test that traffic routes through VPN (should show VPN IP)
curl -s https://api.ipify.org
```

Configure your torrent clients to bind to the VPN interface IP to ensure all torrent traffic uses the VPN.

## Firewall Rules

Configure UFW (Uncomplicated Firewall) to protect your seedbox while allowing necessary services.

```bash
# Install UFW if not present
sudo apt install -y ufw

# Set default policies - deny incoming, allow outgoing
sudo ufw default deny incoming
sudo ufw default allow outgoing

# Allow SSH (change port if you use non-standard SSH port)
sudo ufw allow 22/tcp comment 'SSH'

# Allow web interfaces for torrent clients
sudo ufw allow 8080/tcp comment 'qBittorrent Web UI'
sudo ufw allow 8112/tcp comment 'Deluge Web UI'
sudo ufw allow 8090/tcp comment 'ruTorrent Web UI'

# Allow torrent incoming connections (peer connections)
sudo ufw allow 50000/tcp comment 'rTorrent incoming'
sudo ufw allow 50001/tcp comment 'qBittorrent incoming'
sudo ufw allow 50002/tcp comment 'Deluge incoming'

# Allow FTP/SFTP if needed
sudo ufw allow 21/tcp comment 'FTP'
sudo ufw allow 22/tcp comment 'SFTP'

# Enable the firewall
sudo ufw enable

# Check firewall status
sudo ufw status verbose
```

For additional security, limit access to web interfaces by IP address.

```bash
# Allow web UI access only from your IP address (replace YOUR_IP)
sudo ufw delete allow 8080/tcp
sudo ufw allow from YOUR_IP to any port 8080 proto tcp comment 'qBittorrent from home'
```

## Bandwidth Management

Proper bandwidth management ensures your seedbox performs optimally and maintains good ratios on trackers.

Configure per-client bandwidth limits. This example shows qBittorrent settings via the configuration file.

```bash
# Create bandwidth management script
sudo tee /usr/local/bin/seedbox-bw-manager.sh > /dev/null <<'EOF'
#!/bin/bash
# Bandwidth management script for seedbox
# Adjusts limits based on time of day

HOUR=$(date +%H)

# Peak hours (8 AM - 11 PM): limit to 500 Mbps
# Off-peak (11 PM - 8 AM): unlimited

if [ $HOUR -ge 8 ] && [ $HOUR -lt 23 ]; then
    # Peak hours - set limits
    # qBittorrent: Use API to set limits
    curl -s "http://localhost:8080/api/v2/transfer/setDownloadLimit" \
        -d "limit=62500000" > /dev/null  # 500 Mbps in bytes
    curl -s "http://localhost:8080/api/v2/transfer/setUploadLimit" \
        -d "limit=62500000" > /dev/null

    echo "$(date): Peak hours - bandwidth limited to 500 Mbps"
else
    # Off-peak - remove limits
    curl -s "http://localhost:8080/api/v2/transfer/setDownloadLimit" \
        -d "limit=0" > /dev/null  # 0 = unlimited
    curl -s "http://localhost:8080/api/v2/transfer/setUploadLimit" \
        -d "limit=0" > /dev/null

    echo "$(date): Off-peak hours - bandwidth unlimited"
fi
EOF

sudo chmod +x /usr/local/bin/seedbox-bw-manager.sh
```

Add a cron job to run the bandwidth manager every hour.

```bash
# Add cron job for bandwidth management
(crontab -l 2>/dev/null; echo "0 * * * * /usr/local/bin/seedbox-bw-manager.sh >> /var/log/seedbox-bw.log 2>&1") | crontab -
```

Configure connection limits to prevent resource exhaustion.

```bash
# Optimize system for high connection counts
sudo tee -a /etc/sysctl.conf > /dev/null <<'EOF'

# Seedbox network optimizations
# Increase maximum connections
net.core.somaxconn = 65535
net.ipv4.tcp_max_syn_backlog = 65535

# Increase file descriptor limits
fs.file-max = 2097152

# TCP buffer sizes for high bandwidth
net.core.rmem_max = 67108864
net.core.wmem_max = 67108864
net.ipv4.tcp_rmem = 4096 87380 67108864
net.ipv4.tcp_wmem = 4096 65536 67108864

# Enable TCP BBR congestion control for better throughput
net.core.default_qdisc = fq
net.ipv4.tcp_congestion_control = bbr
EOF

# Apply the settings
sudo sysctl -p
```

## Rsync for File Transfers

Rsync provides efficient file transfers from your seedbox to local storage with resume capability.

Install and configure rsync on both server and client.

```bash
# Install rsync (usually pre-installed on Ubuntu)
sudo apt install -y rsync

# Create rsync configuration for the seedbox
sudo tee /etc/rsyncd.conf > /dev/null <<'EOF'
# Global settings
uid = nobody
gid = nogroup
use chroot = yes
max connections = 10
timeout = 300
log file = /var/log/rsync.log

# Downloads module - read-only access to completed downloads
[downloads]
    path = /home/downloads
    comment = Seedbox Downloads
    read only = yes
    list = yes
    auth users = seedbox
    secrets file = /etc/rsyncd.secrets
EOF

# Create secrets file with username:password
echo "seedbox:YOUR_SECURE_PASSWORD" | sudo tee /etc/rsyncd.secrets > /dev/null
sudo chmod 600 /etc/rsyncd.secrets
```

Create a convenient download script for your local machine.

```bash
# Local machine: Create sync script
cat > ~/sync-seedbox.sh <<'EOF'
#!/bin/bash
# Sync completed downloads from seedbox to local storage

SEEDBOX_HOST="your-seedbox-ip"
SEEDBOX_USER="seedbox"
LOCAL_DIR="$HOME/Downloads/Seedbox"
REMOTE_DIR="/home/downloads/complete/"

# Create local directory if it does not exist
mkdir -p "$LOCAL_DIR"

# Rsync with progress, compression, and partial resume
rsync -avhP --compress --partial \
    --bwlimit=50000 \
    -e "ssh -p 22" \
    "${SEEDBOX_USER}@${SEEDBOX_HOST}:${REMOTE_DIR}" \
    "$LOCAL_DIR/"

echo "Sync completed at $(date)"
EOF

chmod +x ~/sync-seedbox.sh
```

For automated syncing, use incrontab to trigger rsync when new files appear.

```bash
# Install incron for filesystem event monitoring
sudo apt install -y incron

# Allow the user to use incron
echo "rtorrent" | sudo tee -a /etc/incron.allow

# Create incron rule to sync on new file completion
# (Run as rtorrent user)
echo "/home/downloads/rtorrent/complete IN_CLOSE_WRITE,IN_MOVED_TO /usr/local/bin/notify-complete.sh \$@/\$#" | incrontab -
```

## FTP/SFTP Access Setup

Set up secure file access for downloading files from your seedbox.

SFTP is recommended as it uses the existing SSH connection and requires no additional setup.

```bash
# SFTP is enabled by default with SSH
# Configure SSH for secure SFTP-only access for download users

# Create a dedicated downloads user with SFTP-only access
sudo adduser --home /home/downloads --shell /usr/sbin/nologin ftpuser

# Add to the download groups so they can read files
sudo usermod -aG qbittorrent,deluge,rtorrent ftpuser

# Configure SSH for chrooted SFTP
sudo tee -a /etc/ssh/sshd_config > /dev/null <<'EOF'

# SFTP-only configuration for ftpuser
Match User ftpuser
    ChrootDirectory /home/downloads
    ForceCommand internal-sftp
    AllowTcpForwarding no
    X11Forwarding no
    PasswordAuthentication yes
EOF

# Set correct ownership for chroot to work
sudo chown root:root /home/downloads
sudo chmod 755 /home/downloads

# Restart SSH
sudo systemctl restart sshd
```

If FTP is required, install and configure vsftpd with TLS.

```bash
# Install vsftpd FTP server
sudo apt install -y vsftpd

# Generate SSL certificate for FTPS
sudo openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
    -keyout /etc/ssl/private/vsftpd.key \
    -out /etc/ssl/certs/vsftpd.crt \
    -subj "/CN=seedbox/O=Seedbox/C=US"

# Configure vsftpd for secure FTP
sudo tee /etc/vsftpd.conf > /dev/null <<'EOF'
# Basic settings
listen=YES
listen_ipv6=NO
anonymous_enable=NO
local_enable=YES
write_enable=NO
local_umask=022
dirmessage_enable=YES
use_localtime=YES
xferlog_enable=YES
connect_from_port_20=YES

# Passive mode settings (adjust for your server)
pasv_enable=YES
pasv_min_port=40000
pasv_max_port=40100

# Security settings
chroot_local_user=YES
allow_writeable_chroot=YES
secure_chroot_dir=/var/run/vsftpd/empty

# SSL/TLS configuration for encrypted transfers
ssl_enable=YES
allow_anon_ssl=NO
force_local_data_ssl=YES
force_local_logins_ssl=YES
ssl_tlsv1=YES
ssl_sslv2=NO
ssl_sslv3=NO
require_ssl_reuse=NO
ssl_ciphers=HIGH
rsa_cert_file=/etc/ssl/certs/vsftpd.crt
rsa_private_key_file=/etc/ssl/private/vsftpd.key
EOF

# Restart vsftpd
sudo systemctl restart vsftpd
sudo systemctl enable vsftpd

# Allow FTP ports through firewall
sudo ufw allow 21/tcp
sudo ufw allow 40000:40100/tcp
```

## Automation with autodl-irssi

autodl-irssi automatically downloads torrents from IRC announce channels, essential for maintaining ratios on private trackers.

Install irssi and autodl-irssi.

```bash
# Install irssi IRC client
sudo apt install -y irssi libarchive-zip-perl libnet-ssleay-perl libhtml-parser-perl \
    libxml-libxml-perl libjson-perl libjson-xs-perl libxml-libxslt-perl

# Create directory structure for the rtorrent user
sudo -u rtorrent mkdir -p /home/rtorrent/.irssi/scripts/autorun

# Download autodl-irssi
cd /tmp
wget https://github.com/autodl-community/autodl-irssi/releases/download/v2.6.2/autodl-irssi-v2.6.2.zip
sudo -u rtorrent unzip autodl-irssi-v2.6.2.zip -d /home/rtorrent/.irssi/scripts/

# Create autorun symlinks
sudo -u rtorrent ln -s /home/rtorrent/.irssi/scripts/autodl-irssi.pl \
    /home/rtorrent/.irssi/scripts/autorun/

# Download autodl-trackers
wget https://github.com/autodl-community/autodl-trackers/releases/latest/download/autodl-trackers.zip
sudo -u rtorrent unzip autodl-trackers.zip -d /home/rtorrent/.irssi/scripts/
```

Create the autodl configuration file.

```bash
# Create autodl configuration directory
sudo -u rtorrent mkdir -p /home/rtorrent/.autodl

# Create autodl.cfg configuration
sudo -u rtorrent tee /home/rtorrent/.autodl/autodl.cfg > /dev/null <<'EOF'
[options]
# GUI communication settings (for ruTorrent plugin)
gui-server-port = 12345
gui-server-password = YOUR_AUTODL_PASSWORD

# Upload method - send to rTorrent via command
upload-type = rtorrent
rt-address = /var/run/rtorrent/rpc.socket

[tracker example-tracker]
# Example tracker configuration
# Replace with your actual tracker settings
irc-server = irc.example-tracker.com
irc-port = 6697
irc-ssl = true
irc-nick = YourNickname
irc-channels = #announce

[filter example-filter]
# Example filter - downloads specific releases
match-releases = *1080p*BluRay*
max-size = 20GB
upload-delay-secs = 5
EOF

sudo chmod 600 /home/rtorrent/.autodl/autodl.cfg
```

Create a systemd service for irssi with autodl.

```bash
# Create systemd service for irssi/autodl
sudo tee /etc/systemd/system/irssi.service > /dev/null <<'EOF'
[Unit]
Description=irssi with autodl-irssi
After=network.target rtorrent.service

[Service]
Type=forking
User=rtorrent
Group=rtorrent
ExecStart=/usr/bin/tmux -L irssi new-session -d -s irssi '/usr/bin/irssi'
ExecStop=/usr/bin/tmux -L irssi kill-session -t irssi
Restart=on-failure

[Install]
WantedBy=multi-user.target
EOF

# Enable and start irssi
sudo systemctl daemon-reload
sudo systemctl enable irssi
sudo systemctl start irssi
```

Install the ruTorrent autodl-irssi plugin for web-based filter management.

```bash
# Download and install autodl-irssi ruTorrent plugin
cd /var/www/rutorrent/plugins
sudo git clone https://github.com/autodl-community/autodl-rutorrent.git autodl-irssi
sudo chown -R www-data:www-data autodl-irssi

# Configure the plugin
sudo tee /var/www/rutorrent/plugins/autodl-irssi/conf.php > /dev/null <<'EOF'
<?php
$autodlPort = 12345;
$autodlPassword = "YOUR_AUTODL_PASSWORD";
EOF
```

## Monitoring and Statistics

Implement comprehensive monitoring to track seedbox performance and health.

Install vnStat for bandwidth monitoring.

```bash
# Install vnStat for network statistics
sudo apt install -y vnstat

# Initialize the database for your network interface
sudo vnstat --add -i eth0

# Enable and start vnStat daemon
sudo systemctl enable vnstat
sudo systemctl start vnstat

# View current statistics
vnstat -l  # Live monitoring
vnstat -d  # Daily statistics
vnstat -m  # Monthly statistics
```

Create a monitoring dashboard script.

```bash
# Create seedbox status script
sudo tee /usr/local/bin/seedbox-status.sh > /dev/null <<'EOF'
#!/bin/bash
# Seedbox Status Dashboard

echo "======================================"
echo "       SEEDBOX STATUS DASHBOARD       "
echo "======================================"
echo ""

# System Information
echo "--- System Information ---"
echo "Uptime: $(uptime -p)"
echo "Load Average: $(cat /proc/loadavg | awk '{print $1, $2, $3}')"
echo "Memory: $(free -h | awk '/Mem:/ {print $3 "/" $2 " used"}')"
echo "Disk: $(df -h /home/downloads | awk 'NR==2 {print $3 "/" $2 " used (" $5 ")"}')"
echo ""

# Network Statistics
echo "--- Network Statistics (Today) ---"
vnstat -d 1 --oneline | awk -F';' '{print "RX: " $4 " | TX: " $5 " | Total: " $6}'
echo ""

# Service Status
echo "--- Service Status ---"
for service in qbittorrent-nox deluged deluge-web rtorrent; do
    status=$(systemctl is-active $service 2>/dev/null)
    if [ "$status" = "active" ]; then
        echo "$service: RUNNING"
    else
        echo "$service: STOPPED"
    fi
done
echo ""

# Active Torrents Count (qBittorrent API)
echo "--- Active Torrents ---"
QBIT_COUNT=$(curl -s "http://localhost:8080/api/v2/torrents/info" 2>/dev/null | jq length 2>/dev/null || echo "N/A")
echo "qBittorrent: $QBIT_COUNT torrents"
echo ""

# VPN Status
echo "--- VPN Status ---"
if sudo wg show wg0 &>/dev/null; then
    echo "WireGuard: CONNECTED"
    echo "Public IP: $(curl -s https://api.ipify.org)"
else
    echo "WireGuard: DISCONNECTED"
fi
echo ""
echo "======================================"
EOF

sudo chmod +x /usr/local/bin/seedbox-status.sh
```

Set up log rotation for seedbox services.

```bash
# Create logrotate configuration for seedbox logs
sudo tee /etc/logrotate.d/seedbox > /dev/null <<'EOF'
/var/log/rtorrent/*.log {
    weekly
    rotate 4
    compress
    delaycompress
    missingok
    notifempty
    create 640 rtorrent rtorrent
}

/var/log/seedbox-bw.log {
    weekly
    rotate 4
    compress
    missingok
    notifempty
}
EOF
```

## Security Hardening

Implement security best practices to protect your seedbox.

Configure fail2ban to prevent brute force attacks.

```bash
# Install fail2ban
sudo apt install -y fail2ban

# Create seedbox-specific jail configuration
sudo tee /etc/fail2ban/jail.d/seedbox.conf > /dev/null <<'EOF'
[DEFAULT]
bantime = 1h
findtime = 10m
maxretry = 5
banaction = ufw

[sshd]
enabled = true
port = ssh
filter = sshd
logpath = /var/log/auth.log
maxretry = 3
bantime = 24h

[nginx-http-auth]
enabled = true
filter = nginx-http-auth
port = http,https
logpath = /var/log/nginx/error.log
maxretry = 5
EOF

# Restart fail2ban
sudo systemctl restart fail2ban
sudo systemctl enable fail2ban
```

Set up HTTP basic authentication for web interfaces.

```bash
# Install apache2-utils for htpasswd
sudo apt install -y apache2-utils

# Create password file for Nginx authentication
sudo htpasswd -c /etc/nginx/.htpasswd seedboxadmin

# Update Nginx configuration to require authentication
sudo tee /etc/nginx/sites-available/rutorrent-secure > /dev/null <<'EOF'
server {
    listen 8090;
    server_name _;
    root /var/www/rutorrent;
    index index.html index.php;

    # HTTP Basic Authentication
    auth_basic "Seedbox Login";
    auth_basic_user_file /etc/nginx/.htpasswd;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    location ~ /\.ht { deny all; }
    location ~ /\.svn { deny all; }

    location ~ \.php$ {
        fastcgi_split_path_info ^(.+\.php)(/.+)$;
        fastcgi_pass unix:/var/run/php/php-fpm.sock;
        fastcgi_index index.php;
        include fastcgi_params;
        fastcgi_param SCRIPT_FILENAME $document_root$fastcgi_script_name;
    }

    location /RPC2 {
        include scgi_params;
        scgi_pass unix:/var/run/rtorrent/rpc.socket;
    }
}
EOF

sudo ln -sf /etc/nginx/sites-available/rutorrent-secure /etc/nginx/sites-enabled/rutorrent
sudo nginx -t && sudo systemctl reload nginx
```

Enable automatic security updates.

```bash
# Install unattended-upgrades
sudo apt install -y unattended-upgrades apt-listchanges

# Configure automatic security updates
sudo tee /etc/apt/apt.conf.d/50unattended-upgrades > /dev/null <<'EOF'
Unattended-Upgrade::Allowed-Origins {
    "${distro_id}:${distro_codename}";
    "${distro_id}:${distro_codename}-security";
    "${distro_id}ESMApps:${distro_codename}-apps-security";
    "${distro_id}ESM:${distro_codename}-infra-security";
};

Unattended-Upgrade::AutoFixInterruptedDpkg "true";
Unattended-Upgrade::MinimalSteps "true";
Unattended-Upgrade::Remove-Unused-Kernel-Packages "true";
Unattended-Upgrade::Remove-Unused-Dependencies "true";
Unattended-Upgrade::Automatic-Reboot "false";
EOF

# Enable automatic updates
sudo dpkg-reconfigure -plow unattended-upgrades
```

Harden SSH configuration.

```bash
# Backup and update SSH configuration
sudo cp /etc/ssh/sshd_config /etc/ssh/sshd_config.backup

# Apply security hardening to SSH
sudo tee -a /etc/ssh/sshd_config.d/hardening.conf > /dev/null <<'EOF'
# Disable root login
PermitRootLogin no

# Use SSH key authentication only (disable after setting up keys)
# PasswordAuthentication no

# Limit authentication attempts
MaxAuthTries 3

# Disable empty passwords
PermitEmptyPasswords no

# Disable X11 forwarding
X11Forwarding no

# Set idle timeout (5 minutes)
ClientAliveInterval 300
ClientAliveCountMax 2

# Disable unused authentication methods
ChallengeResponseAuthentication no
KerberosAuthentication no
GSSAPIAuthentication no
EOF

# Test and reload SSH configuration
sudo sshd -t && sudo systemctl reload sshd
```

## Troubleshooting

Common issues and their solutions for seedbox maintenance.

Check service status and logs when issues arise.

```bash
# Check status of all seedbox services
sudo systemctl status qbittorrent-nox deluged deluge-web rtorrent

# View recent logs for specific services
sudo journalctl -u qbittorrent-nox -n 50 --no-pager
sudo journalctl -u rtorrent -n 50 --no-pager

# Check for disk space issues
df -h /home/downloads

# Check for memory issues
free -h
top -bn1 | head -20

# Check open file limits (common issue with many torrents)
cat /proc/sys/fs/file-nr
```

Diagnose network connectivity issues.

```bash
# Test if VPN is working correctly
curl -s https://api.ipify.org && echo ""

# Check if torrent ports are accessible
sudo ss -tlnp | grep -E "50000|50001|50002"

# Test tracker connectivity
curl -I https://tracker.example.com

# Check for DNS issues
nslookup tracker.example.com

# Monitor network traffic in real-time
sudo iftop -i eth0
```

Fix common permission issues.

```bash
# Reset permissions on download directories
sudo chown -R qbittorrent:qbittorrent /home/downloads/qbittorrent
sudo chown -R deluge:deluge /home/downloads/deluge
sudo chown -R rtorrent:rtorrent /home/downloads/rtorrent

# Fix socket permissions for ruTorrent
sudo chown rtorrent:rtorrent /var/run/rtorrent/rpc.socket
sudo chmod 770 /var/run/rtorrent/rpc.socket
sudo usermod -aG rtorrent www-data
```

Handle stuck or unresponsive torrents.

```bash
# Restart rTorrent gracefully
sudo systemctl restart rtorrent

# Clear session data if rTorrent will not start (last resort)
# WARNING: This removes torrent state - they will need to be re-added
sudo systemctl stop rtorrent
sudo rm -rf /home/downloads/rtorrent/session/*.lock
sudo systemctl start rtorrent

# Check rTorrent configuration for errors
rtorrent -n -o check_hash=no -o try_import=/home/rtorrent/.rtorrent.rc
```

Create a health check script for automated monitoring.

```bash
# Create health check script
sudo tee /usr/local/bin/seedbox-healthcheck.sh > /dev/null <<'EOF'
#!/bin/bash
# Seedbox Health Check Script
# Returns non-zero exit code if any service is unhealthy

HEALTHY=0

# Check critical services
for service in qbittorrent-nox rtorrent; do
    if ! systemctl is-active --quiet $service; then
        echo "ERROR: $service is not running"
        HEALTHY=1
        # Attempt automatic restart
        sudo systemctl restart $service
    fi
done

# Check disk space (alert if less than 10% free)
DISK_FREE=$(df /home/downloads | awk 'NR==2 {gsub(/%/,""); print 100-$5}')
if [ "$DISK_FREE" -lt 10 ]; then
    echo "WARNING: Only ${DISK_FREE}% disk space remaining"
    HEALTHY=1
fi

# Check VPN connectivity
if ! sudo wg show wg0 &>/dev/null; then
    echo "ERROR: VPN is disconnected"
    HEALTHY=1
    sudo wg-quick up wg0
fi

exit $HEALTHY
EOF

sudo chmod +x /usr/local/bin/seedbox-healthcheck.sh

# Add to crontab for regular checks
(crontab -l 2>/dev/null; echo "*/5 * * * * /usr/local/bin/seedbox-healthcheck.sh >> /var/log/seedbox-health.log 2>&1") | crontab -
```

---

Running a seedbox involves managing multiple services, network configurations, and storage systems. Regular monitoring is essential to catch issues before they affect your seed ratios or cause data loss.

For comprehensive seedbox monitoring, consider using [OneUptime](https://oneuptime.com). OneUptime provides real-time service health checks, disk usage alerts, and bandwidth monitoring dashboards. Set up synthetic monitors to verify your web interfaces are accessible, and configure alerts to notify you immediately when services go down or disk space runs low. With OneUptime's incident management features, you can track issues and ensure your seedbox maintains maximum uptime.
