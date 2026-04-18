# How to Enable vsftpd Passive Mode with IPv4 Address Configuration

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: vsftpd, FTP, Passive Mode, IPv4, NAT, Firewall

Description: Enable vsftpd passive mode (PASV) for IPv4 connections, configure the passive address and port range, and open the necessary firewall ports for NAT environments.

## Introduction

FTP operates in two modes: active and passive. Active mode requires the server to initiate a data connection back to the client, which typically fails through NAT and firewalls. Passive mode has the client initiate both connections, making it NAT-friendly and the preferred mode for modern deployments.

## Active vs Passive Mode

```yaml
Active Mode:
  Client --[command port 21]--> Server
  Client <--[data port 20]---- Server  (server initiates: breaks NAT)

Passive Mode:
  Client --[command port 21]--> Server
  Client --[data port PASV]---> Server  (client initiates: NAT-friendly)
```

## Basic Passive Mode Configuration

```bash
# /etc/vsftpd.conf

# IPv4 only

listen=YES
listen_ipv6=NO

# Enable passive mode
pasv_enable=YES

# Port range for passive data connections
pasv_min_port=30000
pasv_max_port=31000

# The public IP clients will connect to for data
# Essential if vsftpd is behind NAT
pasv_address=203.0.113.10

# Disable PORT (active mode) to force passive-only
# Default is YES; set to NO to refuse active-mode data connections
port_enable=NO
```

## Firewall Rules for Passive Mode

```bash
# Open FTP command port
sudo ufw allow 21/tcp

# Open passive data port range
sudo ufw allow 30000:31000/tcp

# Apply rules
sudo ufw reload

# For iptables:
sudo iptables -A INPUT -p tcp --dport 21 -j ACCEPT
sudo iptables -A INPUT -p tcp --dport 30000:31000 -j ACCEPT
```

## NAT/Port Forwarding Setup

If vsftpd runs behind a NAT gateway:

```bash
# The external (public) IP must be set in pasv_address
# /etc/vsftpd.conf
pasv_address=203.0.113.10   # Public IP, not internal

# On NAT gateway (iptables):
# Forward port 21
iptables -t nat -A PREROUTING -d 203.0.113.10 -p tcp --dport 21 \
  -j DNAT --to-destination 10.0.0.5:21

# Forward passive port range
iptables -t nat -A PREROUTING -d 203.0.113.10 -p tcp --dport 30000:31000 \
  -j DNAT --to-destination 10.0.0.5:30000-31000
```

## Using DNS Name Instead of IP

vsftpd supports resolving the passive address from a hostname:

```bash
# /etc/vsftpd.conf

# Resolve hostname for passive address (vsftpd 3.x+)
pasv_addr_resolve=YES
pasv_address=ftp.example.com
```

## Testing Passive Mode

```bash
# Connect with an FTP client in passive mode
ftp -p 203.0.113.10
# Or with lftp:
lftp -e "set ftp:passive-mode yes" 203.0.113.10

# With curl (defaults to passive):
curl -v ftp://203.0.113.10/

# Check what port vsftpd advertises in PASV response:
# 227 Entering Passive Mode (203,0,113,10,117,49)
# Port = 117*256 + 49 = 30001

# Verify passive connections in netstat:
sudo ss -tnp | grep vsftpd
```

## Complete Passive Mode Configuration

```bash
# /etc/vsftpd.conf

# IPv4 standalone
listen=YES
listen_ipv6=NO
listen_address=203.0.113.10

# Authentication
anonymous_enable=NO
local_enable=YES
write_enable=YES
chroot_local_user=YES
allow_writeable_chroot=YES

# Passive mode
pasv_enable=YES
pasv_min_port=30000
pasv_max_port=31000
pasv_address=203.0.113.10

# Security
hide_ids=YES
ssl_enable=NO   # Enable if using FTPS

# Logging
xferlog_enable=YES
log_ftp_protocol=YES
```

```bash
# Restart vsftpd
sudo systemctl restart vsftpd

# Confirm listening
sudo ss -tlnp | grep :21
```

## Conclusion

Passive mode is essential for FTP through NAT and firewalls. Set `pasv_enable=YES`, define `pasv_min_port` and `pasv_max_port` to limit the data port range, and set `pasv_address` to your public IP. Open the passive port range in your firewall and configure NAT port forwarding if vsftpd is behind a router.
