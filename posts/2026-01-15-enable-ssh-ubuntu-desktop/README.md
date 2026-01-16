# How to Enable SSH on Ubuntu Desktop

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ubuntu, SSH, Remote Access, Desktop, Security, Tutorial

Description: Quick guide to enabling and securing SSH access on Ubuntu Desktop for remote administration and file transfers.

---

Ubuntu Desktop doesn't come with SSH server enabled by default. This guide shows how to install OpenSSH server, configure it securely, and connect from remote machines.

## Install OpenSSH Server

```bash
# Update package lists
sudo apt update

# Install OpenSSH server
sudo apt install openssh-server -y

# Verify installation
ssh -V
```

## Start and Enable SSH Service

```bash
# Start SSH service
sudo systemctl start ssh

# Enable SSH to start on boot
sudo systemctl enable ssh

# Check service status
sudo systemctl status ssh
```

## Verify SSH is Running

```bash
# Check SSH is listening on port 22
ss -tlnp | grep :22

# Or using netstat
sudo netstat -tlnp | grep :22
```

## Configure Firewall

```bash
# Allow SSH through UFW firewall
sudo ufw allow ssh

# Or specify port explicitly
sudo ufw allow 22/tcp

# Enable firewall if not already
sudo ufw enable

# Check firewall status
sudo ufw status
```

## Test SSH Connection

### Find Your IP Address

```bash
# Get IP address
ip addr show | grep inet
# or
hostname -I
```

### Connect from Another Machine

```bash
# Basic connection
ssh username@ip_address

# Example
ssh john@192.168.1.100

# With verbose output for debugging
ssh -v username@ip_address
```

## Basic SSH Configuration

### Edit SSH Server Configuration

```bash
sudo nano /etc/ssh/sshd_config
```

### Recommended Settings

```bash
# Change default port (optional, adds obscurity)
# Port 2222

# Disable root login (recommended)
PermitRootLogin no

# Allow only specific users
# AllowUsers john jane admin

# Disable password authentication (after setting up keys)
# PasswordAuthentication no

# Enable public key authentication
PubkeyAuthentication yes

# Disable empty passwords
PermitEmptyPasswords no

# Set maximum authentication attempts
MaxAuthTries 3

# Set login grace time
LoginGraceTime 60

# Disable X11 forwarding (if not needed)
X11Forwarding no
```

### Apply Changes

```bash
# Test configuration syntax
sudo sshd -t

# Restart SSH service
sudo systemctl restart ssh
```

## Set Up SSH Key Authentication

### Generate SSH Key Pair (On Client)

```bash
# Generate Ed25519 key (recommended)
ssh-keygen -t ed25519 -C "your_email@example.com"

# Or RSA key for compatibility
ssh-keygen -t rsa -b 4096 -C "your_email@example.com"
```

### Copy Public Key to Server

```bash
# Using ssh-copy-id (easiest)
ssh-copy-id username@server_ip

# Manual method
cat ~/.ssh/id_ed25519.pub | ssh username@server_ip "mkdir -p ~/.ssh && chmod 700 ~/.ssh && cat >> ~/.ssh/authorized_keys && chmod 600 ~/.ssh/authorized_keys"
```

### Test Key Authentication

```bash
# Should connect without password
ssh username@server_ip
```

### Disable Password Authentication

After verifying key authentication works:

```bash
sudo nano /etc/ssh/sshd_config
```

```bash
PasswordAuthentication no
```

```bash
sudo systemctl restart ssh
```

## Change SSH Port

For additional security (obscurity):

```bash
sudo nano /etc/ssh/sshd_config
```

```bash
Port 2222
```

Update firewall:

```bash
# Allow new port
sudo ufw allow 2222/tcp

# Remove old rule (optional, after testing)
sudo ufw delete allow 22/tcp

# Restart SSH
sudo systemctl restart ssh
```

Connect using new port:

```bash
ssh -p 2222 username@server_ip
```

## Enable SSH Access for Specific Users

```bash
sudo nano /etc/ssh/sshd_config
```

```bash
# Allow only specific users
AllowUsers john jane admin

# Or allow groups
AllowGroups sshusers
```

Create SSH group:

```bash
# Create group
sudo groupadd sshusers

# Add users to group
sudo usermod -aG sshusers john
```

## Useful SSH Features

### Keep Connection Alive

Add to `~/.ssh/config` on client:

```
Host *
    ServerAliveInterval 60
    ServerAliveCountMax 3
```

### Create SSH Alias

```bash
# Edit SSH config on client
nano ~/.ssh/config
```

```
Host mydesktop
    HostName 192.168.1.100
    User john
    Port 22
    IdentityFile ~/.ssh/id_ed25519
```

Connect with:

```bash
ssh mydesktop
```

### Copy Files via SSH

```bash
# Copy file to remote
scp file.txt username@server:/path/to/destination/

# Copy from remote
scp username@server:/path/to/file.txt ./

# Copy directory
scp -r directory/ username@server:/path/to/destination/

# Using rsync (better for large transfers)
rsync -avz directory/ username@server:/path/to/destination/
```

### SSH Tunneling

```bash
# Local port forwarding (access remote service locally)
ssh -L 8080:localhost:80 username@server

# Remote port forwarding (expose local service remotely)
ssh -R 9000:localhost:3000 username@server

# Dynamic port forwarding (SOCKS proxy)
ssh -D 1080 username@server
```

## Enable SSH GUI Access (X11 Forwarding)

Run graphical applications remotely:

```bash
# On server, edit sshd_config
sudo nano /etc/ssh/sshd_config
```

```bash
X11Forwarding yes
X11DisplayOffset 10
```

```bash
sudo systemctl restart ssh
```

Connect with X11 forwarding:

```bash
# On client (requires X server)
ssh -X username@server

# Run GUI app
firefox &
gedit &
```

## Monitor SSH Connections

```bash
# View active SSH sessions
who

# Detailed connection info
w

# SSH-specific connections
ss -o state established '( dport = :ssh or sport = :ssh )'

# View SSH logs
sudo journalctl -u ssh
sudo tail -f /var/log/auth.log
```

## Troubleshooting

### Connection Refused

```bash
# Check SSH service is running
sudo systemctl status ssh

# Check port is listening
ss -tlnp | grep 22

# Check firewall
sudo ufw status
```

### Permission Denied

```bash
# Check user has SSH access
grep AllowUsers /etc/ssh/sshd_config

# Check key permissions (on server)
ls -la ~/.ssh/
chmod 700 ~/.ssh
chmod 600 ~/.ssh/authorized_keys
```

### Host Key Verification Failed

```bash
# Remove old host key (on client)
ssh-keygen -R server_ip

# Or remove from known_hosts manually
nano ~/.ssh/known_hosts
```

### Connection Timeout

```bash
# Check network connectivity
ping server_ip

# Check SSH port is accessible
nc -zv server_ip 22

# Check firewall on server
sudo ufw status
```

## Security Best Practices

1. **Use SSH keys**: Disable password authentication
2. **Change default port**: Makes automated attacks harder
3. **Restrict users**: Use AllowUsers or AllowGroups
4. **Disable root login**: Always use PermitRootLogin no
5. **Keep updated**: Regular security updates
6. **Use fail2ban**: Block brute force attacks

### Install fail2ban

```bash
sudo apt install fail2ban -y

# Configure for SSH
sudo nano /etc/fail2ban/jail.local
```

```ini
[sshd]
enabled = true
port = ssh
filter = sshd
logpath = /var/log/auth.log
maxretry = 3
bantime = 3600
```

```bash
sudo systemctl restart fail2ban
```

## Disable SSH

If you no longer need SSH access:

```bash
# Stop SSH service
sudo systemctl stop ssh

# Disable from starting on boot
sudo systemctl disable ssh

# Optionally remove package
sudo apt remove openssh-server
```

---

SSH provides secure remote access to your Ubuntu Desktop for administration, file transfers, and remote work. Always use key-based authentication and follow security best practices to protect your system from unauthorized access.
