# How to Install and Configure Cockpit for Ubuntu Server Management

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ubuntu, Cockpit, Server Management, Web UI, Administration, Tutorial

Description: Set up Cockpit web-based interface for easy Ubuntu server management, monitoring, and administration through your browser.

---

Cockpit is a web-based server management tool that provides a graphical interface for system administration tasks. It allows you to monitor performance, manage services, view logs, configure networking, and more-all from your web browser.

## Prerequisites

- Ubuntu 20.04, 22.04, or 24.04
- Root or sudo access
- Web browser for accessing the interface

## Installation

```bash
# Update package lists
sudo apt update

# Install Cockpit
sudo apt install cockpit -y

# Start and enable Cockpit
sudo systemctl start cockpit
sudo systemctl enable cockpit

# Check status
sudo systemctl status cockpit
```

## Access Cockpit

### Open Firewall

```bash
# Allow Cockpit port (9090)
sudo ufw allow 9090/tcp

# Check firewall status
sudo ufw status
```

### Access Web Interface

Open your browser and navigate to:
```
https://your_server_ip:9090
```

Accept the self-signed certificate warning and log in with your Ubuntu credentials.

## Main Features

### System Overview

The main dashboard shows:
- CPU usage
- Memory usage
- Disk I/O
- Network traffic
- System logs

### Services Management

Navigate to **Services** to:
- View all systemd services
- Start, stop, restart services
- Enable/disable services
- View service logs

### Log Viewer

Access **Logs** to:
- View system journal
- Filter by priority, service, or time
- Search log entries
- Export logs

### Networking

**Networking** section allows:
- View network interfaces
- Configure IP addresses
- Manage bonds and bridges
- View firewall rules

### Storage

**Storage** panel provides:
- Disk usage overview
- Partition management
- NFS mount configuration
- RAID management

### Accounts

Manage users in **Accounts**:
- Create new users
- Modify user properties
- Set passwords
- Manage SSH keys

## Install Additional Modules

### Package Manager

```bash
# Install package management module
sudo apt install cockpit-packagekit -y
```

Allows you to update packages through the web interface.

### Podman/Docker Containers

```bash
# Install container management
sudo apt install cockpit-podman -y
```

Manage containers, images, and pods.

### Virtual Machines

```bash
# Install VM management (requires KVM)
sudo apt install cockpit-machines virt-manager -y
```

Create and manage virtual machines.

### Network File Sharing

```bash
# Install file sharing module
sudo apt install cockpit-file-sharing -y
```

Configure Samba and NFS shares.

### Storage Management

```bash
# Install storage management
sudo apt install cockpit-storaged -y
```

Advanced storage configuration including LVM.

### All Common Modules

```bash
# Install all common modules
sudo apt install cockpit-packagekit cockpit-podman cockpit-storaged cockpit-networkmanager cockpit-sosreport -y
```

## Configuration

### Main Configuration File

```bash
# View Cockpit configuration
cat /etc/cockpit/cockpit.conf

# Create custom configuration
sudo nano /etc/cockpit/cockpit.conf
```

Example configuration:

```ini
[WebService]
# Listen on specific address (default: all)
# Origins = https://server.example.com

# Idle timeout in minutes
IdleTimeout = 15

# Allow unencrypted HTTP (not recommended)
# AllowUnencrypted = false

[Session]
# Idle session timeout
IdleTimeout = 15

[Log]
# Fatal log level
Fatal = criticals warnings
```

### Change Port

```bash
# Create socket override
sudo mkdir -p /etc/systemd/system/cockpit.socket.d/
sudo nano /etc/systemd/system/cockpit.socket.d/listen.conf
```

```ini
[Socket]
ListenStream=
ListenStream=443
```

```bash
# Reload and restart
sudo systemctl daemon-reload
sudo systemctl restart cockpit.socket

# Update firewall
sudo ufw allow 443/tcp
sudo ufw delete allow 9090/tcp
```

### SSL Certificate

Use Let's Encrypt certificate:

```bash
# Copy certificates
sudo cp /etc/letsencrypt/live/server.example.com/fullchain.pem /etc/cockpit/ws-certs.d/
sudo cp /etc/letsencrypt/live/server.example.com/privkey.pem /etc/cockpit/ws-certs.d/

# Combine into single file
sudo cat /etc/letsencrypt/live/server.example.com/fullchain.pem /etc/letsencrypt/live/server.example.com/privkey.pem > /etc/cockpit/ws-certs.d/server.cert

# Set permissions
sudo chmod 600 /etc/cockpit/ws-certs.d/server.cert

# Restart Cockpit
sudo systemctl restart cockpit
```

Or create symlinks:

```bash
# Create symlinks to Let's Encrypt certs
sudo ln -sf /etc/letsencrypt/live/server.example.com/fullchain.pem /etc/cockpit/ws-certs.d/0-self-signed.cert
sudo ln -sf /etc/letsencrypt/live/server.example.com/privkey.pem /etc/cockpit/ws-certs.d/0-self-signed.key

sudo systemctl restart cockpit
```

## Multi-Server Management

### Add Remote Servers

1. On each remote server, install Cockpit
2. From main Cockpit interface, click your username
3. Select "Add new host"
4. Enter hostname/IP and credentials

### Dashboard Configuration

```bash
# Install dashboard for multi-server view
sudo apt install cockpit-dashboard -y
```

## Terminal Access

Cockpit includes a web-based terminal:
1. Navigate to **Terminal**
2. Full shell access in browser
3. Supports copy/paste

## Performance Monitoring

### Real-Time Metrics

The dashboard shows:
- CPU usage graphs
- Memory utilization
- Disk I/O rates
- Network throughput

### PCP Integration

For advanced metrics:

```bash
# Install Performance Co-Pilot
sudo apt install cockpit-pcp -y

# Start PCP services
sudo systemctl start pmcd
sudo systemctl enable pmcd
sudo systemctl start pmlogger
sudo systemctl enable pmlogger
```

## Access Control

### Limit SSH Access

Cockpit uses SSH for remote access. Configure in SSH:

```bash
sudo nano /etc/ssh/sshd_config
```

```bash
# Allow only specific users
AllowUsers admin cockpit-user
```

### PAM Configuration

```bash
# View Cockpit PAM configuration
cat /etc/pam.d/cockpit
```

### Restrict to Specific Groups

```bash
# Create Cockpit admin group
sudo groupadd cockpit-admin

# Add users to group
sudo usermod -aG cockpit-admin admin

# Configure PAM to require group membership
sudo nano /etc/pam.d/cockpit
```

Add:
```
auth required pam_succeed_if.so user ingroup cockpit-admin
```

## Branding Customization

```bash
# Create branding directory
sudo mkdir -p /etc/cockpit/

# Create custom branding
sudo nano /etc/cockpit/cockpit.conf
```

```ini
[WebService]
LoginTitle = My Server Manager

[Session]
Banner = /etc/cockpit/banner.txt
```

Create banner:

```bash
echo "Welcome to My Server. Authorized users only." | sudo tee /etc/cockpit/banner.txt
```

## Troubleshooting

### Cannot Access Interface

```bash
# Check Cockpit is running
sudo systemctl status cockpit

# Check socket
sudo systemctl status cockpit.socket

# Verify port is listening
ss -tlnp | grep 9090

# Check firewall
sudo ufw status
```

### Certificate Errors

```bash
# View certificate info
openssl x509 -in /etc/cockpit/ws-certs.d/0-self-signed.cert -noout -text

# Generate new self-signed certificate
sudo /usr/share/cockpit/ws/cockpit-certificate-ensure --for-host=$(hostname)
```

### Login Issues

```bash
# Check PAM configuration
cat /etc/pam.d/cockpit

# Check authentication logs
sudo journalctl -u cockpit -n 50

# Verify user can SSH
ssh localhost
```

### Service Won't Start

```bash
# Check for configuration errors
sudo journalctl -u cockpit -b

# Verify socket is enabled
sudo systemctl enable --now cockpit.socket
```

## Security Best Practices

1. **Use HTTPS**: Always access via HTTPS
2. **Valid certificates**: Use Let's Encrypt for production
3. **Firewall rules**: Limit access to trusted IPs
4. **Strong passwords**: Enforce password policies
5. **Idle timeout**: Configure session timeouts
6. **Access logging**: Monitor authentication logs

### Restrict by IP

```bash
# Using UFW
sudo ufw allow from 192.168.1.0/24 to any port 9090

# Or using iptables
sudo iptables -A INPUT -p tcp --dport 9090 -s 192.168.1.0/24 -j ACCEPT
sudo iptables -A INPUT -p tcp --dport 9090 -j DROP
```

## Disable Cockpit

If no longer needed:

```bash
# Stop and disable
sudo systemctl stop cockpit
sudo systemctl disable cockpit.socket

# Optionally remove
sudo apt remove cockpit -y

# Remove firewall rule
sudo ufw delete allow 9090/tcp
```

---

Cockpit transforms server management with its intuitive web interface, making it ideal for administrators who prefer graphical tools or need to manage servers remotely without SSH expertise. Its modular design lets you add only the features you need.
