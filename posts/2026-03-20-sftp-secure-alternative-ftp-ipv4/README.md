# How to Use SFTP as a Secure FTP Alternative on IPv4

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: SFTP, SSH, IPv4, Security, File Transfer, OpenSSH

Description: Set up SFTP over SSH as a secure replacement for FTP, configure chroot jails for SFTP-only users, restrict access by IP, and use SFTP with common clients.

## Introduction

SFTP (SSH File Transfer Protocol) runs over SSH on port 22 by default and provides encrypted file transfers without the complexity of FTP passive mode, NAT traversal, or separate SSL certificates. It uses your existing SSH infrastructure and supports public key authentication.

## SFTP vs FTP Comparison

| Feature | FTP/FTPS | SFTP |
|---|---|---|
| Port | 21 + data ports | 22 by default |
| Encryption | Optional (FTPS) | Always encrypted |
| Firewall complexity | High (passive ports) | Low (single port) |
| NAT traversal | Requires configuration | Transparent |
| Authentication | Password or cert | Password or SSH key |
| Protocol | Application layer FTP | SSH subsystem |

## Basic SFTP Setup (Already Included with OpenSSH)

```bash
# SFTP is built into OpenSSH - no additional install needed

# Verify SFTP subsystem is enabled in sshd_config
grep Subsystem /etc/ssh/sshd_config
# Expected: Subsystem sftp internal-sftp
# Or a distribution-specific sftp-server path such as /usr/lib/openssh/sftp-server

# Test SFTP connection
sftp user@203.0.113.10
```

## Creating SFTP-Only Users with Chroot

```bash
# /etc/ssh/sshd_config

# SSH server binds to specific IPv4
ListenAddress 203.0.113.10

# SFTP subsystem using internal handler (more efficient)
Subsystem sftp internal-sftp

# Match block for SFTP-only group
Match Group sftpusers
    ChrootDirectory /srv/sftp/%u    # Chroot to per-user directory
    ForceCommand    internal-sftp   # Force SFTP, no shell access
    DisableForwarding yes
    PasswordAuthentication yes
```

```bash
# Create group and user
sudo groupadd sftpusers
sudo useradd -g sftpusers -s /usr/sbin/nologin -M sftpuser1

# Set password
sudo passwd sftpuser1

# Create chroot directory (must be root-owned and not writable by group/others)
sudo mkdir -p /srv/sftp/sftpuser1
sudo chown root:root /srv/sftp /srv/sftp/sftpuser1
sudo chmod 755 /srv/sftp /srv/sftp/sftpuser1

# Create upload directory owned by user
sudo mkdir -p /srv/sftp/sftpuser1/uploads
sudo chown sftpuser1:sftpusers /srv/sftp/sftpuser1/uploads
sudo chmod 755 /srv/sftp/sftpuser1/uploads

# Reload SSH
sudo systemctl reload sshd
# On Debian/Ubuntu, the service may be named ssh:
# sudo systemctl reload ssh
```

## Restricting SFTP by IPv4 Address

```bash
# /etc/ssh/sshd_config

# Allow SFTP only from specific IPs
Match Group sftpusers Address 10.0.0.0/8,203.0.113.20
    ChrootDirectory /srv/sftp/%u
    ForceCommand    internal-sftp
    DisableForwarding yes

# Block SFTP users from all other IPs
Match Group sftpusers Address !10.0.0.0/8,!203.0.113.20,*
    DenyUsers *
```

```bash
# TCP Wrappers support was removed from OpenSSH 6.7; use sshd_config or a firewall instead.

# iptables (restrict port 22 to specific sources)
sudo iptables -A INPUT -p tcp --dport 22 -s 10.0.0.0/8 -j ACCEPT
sudo iptables -A INPUT -p tcp --dport 22 -s 203.0.113.20 -j ACCEPT
sudo iptables -A INPUT -p tcp --dport 22 -j DROP
```

## Using SFTP Clients

```bash
# Command-line sftp
sftp sftpuser1@203.0.113.10
sftp> ls
sftp> get remotefile.txt
sftp> put localfile.txt uploads/
sftp> bye

# Batch mode (non-interactive)
sftp -b - sftpuser1@203.0.113.10 << 'EOF'
put localfile.txt uploads/
ls uploads/
bye
EOF

# rsync over SSH (not SFTP; requires shell access, so it will not work with ForceCommand internal-sftp)
rsync -avz -e ssh localdir/ shelluser@203.0.113.10:/path/

# scp (OpenSSH 9.0+ uses SFTP over SSH by default)
scp localfile.txt sftpuser1@203.0.113.10:/uploads/

# With SSH key (preferred over password):
ssh-keygen -t ed25519 -f ~/.ssh/sftp_key
sudo install -d -m 755 -o sftpuser1 -g sftpusers /home/sftpuser1
sudo install -d -m 700 -o sftpuser1 -g sftpusers /home/sftpuser1/.ssh
sudo install -m 600 -o sftpuser1 -g sftpusers ~/.ssh/sftp_key.pub /home/sftpuser1/.ssh/authorized_keys
sftp -i ~/.ssh/sftp_key sftpuser1@203.0.113.10
```

## Conclusion

SFTP is the modern replacement for FTP - it uses SSH on a single port, requires no passive mode configuration, and encrypts all traffic automatically. Set up SFTP-only users with `Match Group` and `ForceCommand internal-sftp` in sshd_config, create chroot directories owned by root and not writable by group or others, and restrict access by source IP using `Address` in Match blocks. Public key authentication lets you avoid password authentication for SFTP users.
