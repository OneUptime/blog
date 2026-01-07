# How to Harden SSH on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Linux, SSH, Security, fail2ban

Description: Harden SSH on Ubuntu with key-only authentication, fail2ban intrusion prevention, port knocking, and additional security measures.

---

SSH (Secure Shell) is the primary method for remotely accessing Linux servers. While SSH is secure by design, its default configuration leaves room for improvement. This comprehensive guide walks you through hardening SSH on Ubuntu, implementing multiple layers of security including key-based authentication, fail2ban, port knocking, and two-factor authentication.

## Why SSH Hardening Matters

Every internet-facing SSH server is constantly probed by automated bots attempting to gain unauthorized access. A poorly configured SSH server can be compromised through:

- **Brute force attacks**: Automated attempts to guess passwords
- **Credential stuffing**: Using leaked password databases
- **Exploitation of weak configurations**: Default settings that prioritize convenience over security

By implementing the techniques in this guide, you will significantly reduce your attack surface and protect your Ubuntu server from common threats.

## Prerequisites

Before you begin, ensure you have:

- Ubuntu 20.04 LTS or later (this guide also works on 22.04 and 24.04)
- Root or sudo access to the server
- A backup of your current SSH configuration
- Console access (in case you get locked out)

## 1. SSH Key Generation and Setup

Key-based authentication is more secure than passwords because it uses cryptographic key pairs. The private key stays on your local machine, while the public key is placed on the server.

### Generate an SSH Key Pair on Your Local Machine

Generate a strong Ed25519 key with a passphrase for additional security:

```bash
# Generate an Ed25519 SSH key pair (recommended for modern systems)
# The -C flag adds a comment to identify the key
ssh-keygen -t ed25519 -C "your_email@example.com"
```

If you need compatibility with older systems, use RSA with a 4096-bit key:

```bash
# Generate an RSA key with 4096 bits for legacy system compatibility
ssh-keygen -t rsa -b 4096 -C "your_email@example.com"
```

You will be prompted for a file location and passphrase:

```
Enter file in which to save the key (/home/user/.ssh/id_ed25519):
Enter passphrase (empty for no passphrase):
Enter same passphrase again:
```

Always use a strong passphrase - this protects your private key if it is ever stolen.

### Copy Your Public Key to the Server

Use ssh-copy-id to securely transfer your public key:

```bash
# Copy your public key to the remote server
# Replace 'username' and 'server_ip' with your actual values
ssh-copy-id -i ~/.ssh/id_ed25519.pub username@server_ip
```

Alternatively, manually add the key to the server:

```bash
# First, display your public key
cat ~/.ssh/id_ed25519.pub

# On the server, add the key to authorized_keys
mkdir -p ~/.ssh
chmod 700 ~/.ssh
echo "your_public_key_content" >> ~/.ssh/authorized_keys
chmod 600 ~/.ssh/authorized_keys
```

### Test Key-Based Authentication

Before disabling password authentication, verify your key works:

```bash
# Test SSH connection using your key
ssh -i ~/.ssh/id_ed25519 username@server_ip
```

If successful, you will log in without being prompted for a password (though you may be asked for your key passphrase).

## 2. Backup the Original SSH Configuration

Always create a backup before modifying SSH settings:

```bash
# Create a timestamped backup of the SSH configuration
sudo cp /etc/ssh/sshd_config /etc/ssh/sshd_config.backup.$(date +%Y%m%d)

# Verify the backup was created
ls -la /etc/ssh/sshd_config*
```

## 3. Disable Password Authentication

With key-based authentication working, disable password logins to prevent brute force attacks:

```bash
# Edit the SSH daemon configuration
sudo nano /etc/ssh/sshd_config
```

Find and modify these lines (or add them if they do not exist):

```bash
# Disable password authentication - only allow key-based auth
PasswordAuthentication no

# Disable empty passwords
PermitEmptyPasswords no

# Disable challenge-response authentication
ChallengeResponseAuthentication no

# Ensure public key authentication is enabled
PubkeyAuthentication yes
```

For Ubuntu 22.04 and later, also check the configuration drop-in directory:

```bash
# Check for any override configurations
sudo ls -la /etc/ssh/sshd_config.d/

# If 50-cloud-init.conf exists, modify it as well
sudo nano /etc/ssh/sshd_config.d/50-cloud-init.conf
```

Validate the configuration before restarting:

```bash
# Test the SSH configuration for syntax errors
sudo sshd -t

# If no errors, restart the SSH service
sudo systemctl restart sshd
```

## 4. Disable Root Login

Disabling direct root login forces attackers to compromise a regular user account first:

```bash
# Edit the SSH configuration
sudo nano /etc/ssh/sshd_config
```

Add or modify this line:

```bash
# Disable root login via SSH
# Options: yes, no, prohibit-password, forced-commands-only
PermitRootLogin no
```

If you need root access for specific automation tasks, consider:

```bash
# Allow root only with key authentication (no password)
PermitRootLogin prohibit-password
```

## 5. Change the Default SSH Port

Changing the default port (22) reduces automated scanning attacks:

```bash
# Edit the SSH configuration
sudo nano /etc/ssh/sshd_config
```

Change the port to a non-standard value:

```bash
# Change SSH to a non-standard port (choose between 1024-65535)
# Avoid commonly used ports like 2222
Port 2849
```

Update your firewall to allow the new port:

```bash
# Allow the new SSH port through UFW
sudo ufw allow 2849/tcp comment 'SSH on custom port'

# Remove the old SSH rule if it exists
sudo ufw delete allow 22/tcp

# Verify the firewall rules
sudo ufw status numbered
```

For systems using iptables directly:

```bash
# Add rule for new SSH port
sudo iptables -A INPUT -p tcp --dport 2849 -m state --state NEW -j ACCEPT

# Save iptables rules (Debian/Ubuntu)
sudo netfilter-persistent save
```

Restart SSH and test connectivity:

```bash
# Restart SSH service
sudo systemctl restart sshd

# Test connection on new port (from your local machine)
ssh -p 2849 username@server_ip
```

## 6. Configure fail2ban for Intrusion Prevention

fail2ban monitors log files and bans IPs that show malicious behavior.

### Install fail2ban

```bash
# Update package lists and install fail2ban
sudo apt update
sudo apt install fail2ban -y

# Enable fail2ban to start on boot
sudo systemctl enable fail2ban
```

### Create a Local Configuration

Never edit the main configuration directly - create a local override:

```bash
# Create a local jail configuration that persists across updates
sudo nano /etc/fail2ban/jail.local
```

Add the following comprehensive configuration:

```ini
# fail2ban local configuration for SSH protection
[DEFAULT]
# Ban duration in seconds (1 hour)
bantime = 3600

# Time window for counting failures (10 minutes)
findtime = 600

# Number of failures before banning
maxretry = 3

# Email notifications (optional - requires mail server)
# destemail = admin@example.com
# sendername = Fail2Ban
# mta = sendmail

# Action to take when banning
# %(action_)s - ban only
# %(action_mw)s - ban and send email with whois report
# %(action_mwl)s - ban and send email with whois report and logs
action = %(action_)s

# Ignore local and trusted IPs (add your IP if needed)
ignoreip = 127.0.0.1/8 ::1

[sshd]
# Enable SSH jail
enabled = true

# Use the aggressive filter that catches more attack patterns
mode = aggressive

# SSH port (update if you changed it)
port = 2849

# Log file to monitor
logpath = %(sshd_log)s

# Backend for log monitoring
backend = systemd

# Override default settings for SSH (stricter)
maxretry = 3
findtime = 300
bantime = 86400

# Ban for 24 hours after repeated offenses
bantime.increment = true
bantime.factor = 2
bantime.maxtime = 604800
```

### Create a Custom Filter for Additional Protection

Create an enhanced filter to catch more attack patterns:

```bash
# Create a custom filter configuration
sudo nano /etc/fail2ban/filter.d/sshd-aggressive.local
```

Add these additional patterns:

```ini
# Additional patterns for aggressive SSH protection
[Definition]

# Include the base sshd filter
# Add patterns for common attack behaviors
failregex = ^%(__prefix_line)sReceived disconnect from <HOST>.*: .*Bye Bye \[preauth\]$
            ^%(__prefix_line)sConnection closed by <HOST>.*\[preauth\]$
            ^%(__prefix_line)sConnection reset by <HOST>.*\[preauth\]$

ignoreregex =
```

### Start and Verify fail2ban

```bash
# Start fail2ban service
sudo systemctl start fail2ban

# Check the status
sudo systemctl status fail2ban

# View currently banned IPs for SSH
sudo fail2ban-client status sshd

# View fail2ban logs
sudo tail -f /var/log/fail2ban.log
```

### Useful fail2ban Commands

```bash
# Unban a specific IP address
sudo fail2ban-client set sshd unbanip 192.168.1.100

# Ban an IP manually
sudo fail2ban-client set sshd banip 192.168.1.100

# Check all jails status
sudo fail2ban-client status

# Reload configuration after changes
sudo fail2ban-client reload
```

## 7. Implement Port Knocking with knockd

Port knocking adds an additional security layer by hiding the SSH port until a specific sequence of connection attempts is made.

### Install knockd

```bash
# Install the knock daemon
sudo apt update
sudo apt install knockd -y
```

### Configure knockd

```bash
# Edit the knockd configuration
sudo nano /etc/knockd.conf
```

Replace the contents with this secure configuration:

```ini
# knockd configuration for SSH port knocking
[options]
    # Log knock attempts
    UseSyslog

    # Network interface to monitor
    Interface = eth0

[openSSH]
    # Knock sequence to open SSH (use your own random ports)
    sequence    = 7000,8000,9000

    # Time window for completing the sequence (seconds)
    seq_timeout = 10

    # Command to execute when sequence is correct
    # Opens SSH port for the knocking IP only, for 30 seconds
    command     = /sbin/iptables -I INPUT -s %IP% -p tcp --dport 2849 -j ACCEPT

    # TCP flags to recognize
    tcpflags    = syn

[closeSSH]
    # Knock sequence to close SSH (reverse or different sequence)
    sequence    = 9000,8000,7000
    seq_timeout = 10

    # Remove the firewall rule for this IP
    command     = /sbin/iptables -D INPUT -s %IP% -p tcp --dport 2849 -j ACCEPT
    tcpflags    = syn
```

For a more secure auto-closing configuration:

```ini
[openSSH]
    sequence      = 7000,8000,9000
    seq_timeout   = 10
    tcpflags      = syn

    # Open port and automatically close after 30 seconds
    start_command = /sbin/iptables -I INPUT -s %IP% -p tcp --dport 2849 -j ACCEPT
    cmd_timeout   = 30
    stop_command  = /sbin/iptables -D INPUT -s %IP% -p tcp --dport 2849 -j ACCEPT
```

### Enable knockd Service

```bash
# Edit the knockd defaults file
sudo nano /etc/default/knockd
```

Modify these settings:

```bash
# Enable knockd to start automatically
START_KNOCKD=1

# Specify the network interface (adjust as needed)
KNOCKD_OPTS="-i eth0"
```

### Configure Firewall for Port Knocking

Set up iptables to deny SSH by default:

```bash
# Block SSH port by default (it will only open after knocking)
sudo iptables -A INPUT -p tcp --dport 2849 -j DROP

# Make sure the knock ports are accessible
sudo iptables -A INPUT -p tcp --dport 7000 -j DROP
sudo iptables -A INPUT -p tcp --dport 8000 -j DROP
sudo iptables -A INPUT -p tcp --dport 9000 -j DROP

# Save iptables rules
sudo netfilter-persistent save
```

### Start knockd

```bash
# Start the knockd service
sudo systemctl start knockd

# Enable knockd to start on boot
sudo systemctl enable knockd

# Check the status
sudo systemctl status knockd
```

### Using Port Knocking from Client

Install knock on your client machine:

```bash
# On Ubuntu/Debian client
sudo apt install knockd

# On macOS with Homebrew
brew install knock
```

Use the knock client to open SSH:

```bash
# Knock on the sequence to open SSH
knock -v server_ip 7000 8000 9000

# Wait a moment, then connect
ssh -p 2849 username@server_ip

# After disconnecting, close the port
knock -v server_ip 9000 8000 7000
```

Create a convenience script for connecting:

```bash
#!/bin/bash
# save as ~/bin/secure-ssh.sh

SERVER="your_server_ip"
SSH_PORT="2849"
KNOCK_SEQUENCE="7000 8000 9000"

# Send the knock sequence
knock -v $SERVER $KNOCK_SEQUENCE

# Wait for the port to open
sleep 1

# Connect via SSH
ssh -p $SSH_PORT username@$SERVER
```

## 8. Set Up Two-Factor Authentication (2FA)

Adding 2FA requires both your SSH key and a time-based code from your authenticator app.

### Install Google Authenticator PAM Module

```bash
# Install the Google Authenticator PAM module
sudo apt update
sudo apt install libpam-google-authenticator -y
```

### Configure Google Authenticator for Your User

Run the setup as the user who will use 2FA:

```bash
# Run the Google Authenticator setup
google-authenticator
```

Answer the prompts:

```
Do you want authentication tokens to be time-based (y/n) y

# A QR code will be displayed - scan it with your authenticator app

Do you want me to update your "/home/user/.google_authenticator" file? (y/n) y

Do you want to disallow multiple uses of the same authentication
token? (y/n) y

By default, a new token is generated every 30 seconds by the mobile app.
Do you want to enable rate-limiting? (y/n) y
```

Save the emergency scratch codes in a secure location.

### Configure PAM for SSH

```bash
# Edit the PAM configuration for SSH
sudo nano /etc/pam.d/sshd
```

Add this line at the end of the file:

```bash
# Enable Google Authenticator for SSH
auth required pam_google_authenticator.so nullok
```

The `nullok` option allows users without 2FA configured to still log in. Remove it once all users are set up.

### Configure SSH to Use 2FA

```bash
# Edit the SSH daemon configuration
sudo nano /etc/ssh/sshd_config
```

Modify these settings:

```bash
# Enable challenge-response for 2FA
ChallengeResponseAuthentication yes

# Enable keyboard-interactive authentication
KbdInteractiveAuthentication yes

# Require both public key AND 2FA
AuthenticationMethods publickey,keyboard-interactive
```

Restart SSH:

```bash
# Test configuration
sudo sshd -t

# Restart SSH service
sudo systemctl restart sshd
```

### Test 2FA Login

```bash
# Connect to the server
ssh -p 2849 username@server_ip

# You will be prompted for:
# 1. Key passphrase (if set)
# 2. Verification code from authenticator app
```

## 9. SSH Configuration Best Practices

Apply these additional hardening measures to your SSH configuration:

```bash
# Edit the SSH daemon configuration
sudo nano /etc/ssh/sshd_config
```

Add or modify these security settings:

```bash
# ============================================
# SSH Hardening Configuration
# ============================================

# Protocol and Network Settings
# --------------------------------------------
# Use only SSH protocol version 2
Protocol 2

# Listen on specific addresses only (if applicable)
# ListenAddress 0.0.0.0
# ListenAddress ::

# Custom port (already set)
Port 2849

# ============================================
# Authentication Settings
# ============================================

# Disable password authentication
PasswordAuthentication no

# Disable empty passwords
PermitEmptyPasswords no

# Enable public key authentication
PubkeyAuthentication yes

# Disable root login
PermitRootLogin no

# Require both key and 2FA
AuthenticationMethods publickey,keyboard-interactive

# Maximum authentication attempts per connection
MaxAuthTries 3

# Limit the number of concurrent unauthenticated connections
MaxStartups 10:30:60

# Time allowed for successful authentication (seconds)
LoginGraceTime 30

# ============================================
# Session and Access Control
# ============================================

# Allow only specific users (uncomment and modify as needed)
# AllowUsers alice bob charlie

# Allow only specific groups
# AllowGroups sshusers admins

# Deny specific users
# DenyUsers root guest

# Limit maximum sessions per network connection
MaxSessions 3

# ============================================
# Security Features
# ============================================

# Disable X11 forwarding unless needed
X11Forwarding no

# Disable TCP forwarding unless needed
AllowTcpForwarding no

# Disable agent forwarding unless needed
AllowAgentForwarding no

# Disable gateway ports
GatewayPorts no

# Disable permission tunnel
PermitTunnel no

# Disable user environment
PermitUserEnvironment no

# ============================================
# Cryptography Settings
# ============================================

# Use strong key exchange algorithms only
KexAlgorithms curve25519-sha256,curve25519-sha256@libssh.org,diffie-hellman-group16-sha512,diffie-hellman-group18-sha512

# Use strong ciphers only
Ciphers chacha20-poly1305@openssh.com,aes256-gcm@openssh.com,aes128-gcm@openssh.com,aes256-ctr,aes192-ctr,aes128-ctr

# Use strong MACs only
MACs hmac-sha2-512-etm@openssh.com,hmac-sha2-256-etm@openssh.com,hmac-sha2-512,hmac-sha2-256

# Host key algorithms
HostKeyAlgorithms ssh-ed25519,ssh-ed25519-cert-v01@openssh.com,rsa-sha2-512,rsa-sha2-256

# ============================================
# Logging and Monitoring
# ============================================

# Log level (VERBOSE provides more detail)
LogLevel VERBOSE

# Log SFTP access
Subsystem sftp internal-sftp -l VERBOSE

# ============================================
# Keep-Alive Settings
# ============================================

# Send keep-alive messages to prevent disconnection
ClientAliveInterval 300
ClientAliveCountMax 2

# TCP keep-alive
TCPKeepAlive yes

# ============================================
# SFTP-Only Users (Optional)
# ============================================
# Create a restricted SFTP-only access for specific users
# Match User sftpuser
#     ForceCommand internal-sftp
#     ChrootDirectory /home/sftpuser
#     AllowTcpForwarding no
#     X11Forwarding no
```

### Apply and Verify Configuration

```bash
# Test the configuration syntax
sudo sshd -t

# If no errors, restart SSH
sudo systemctl restart sshd

# Keep your current session open and test in a new terminal
ssh -p 2849 username@server_ip
```

## 10. Additional Security Measures

### Set Up SSH Connection Logging

Create a script to log all SSH connections:

```bash
# Create a custom SSH logging script
sudo nano /etc/ssh/log-ssh-connections.sh
```

Add this content:

```bash
#!/bin/bash
# Log SSH connection details

LOGFILE="/var/log/ssh-connections.log"
DATE=$(date '+%Y-%m-%d %H:%M:%S')
echo "${DATE} - User: ${PAM_USER} from ${PAM_RHOST} - Type: ${PAM_TYPE}" >> ${LOGFILE}
```

Make it executable and configure PAM:

```bash
# Make the script executable
sudo chmod +x /etc/ssh/log-ssh-connections.sh

# Edit PAM sshd configuration
sudo nano /etc/pam.d/sshd

# Add at the end
session optional pam_exec.so /etc/ssh/log-ssh-connections.sh
```

### Configure Automatic Security Updates

```bash
# Install unattended-upgrades
sudo apt install unattended-upgrades -y

# Enable automatic security updates
sudo dpkg-reconfigure -plow unattended-upgrades
```

### Set Up SSH Idle Timeout

Add to your SSH configuration:

```bash
# Edit SSH configuration
sudo nano /etc/ssh/sshd_config
```

```bash
# Disconnect idle sessions after 10 minutes
ClientAliveInterval 300
ClientAliveCountMax 2
```

### Monitor Failed Login Attempts

Create a monitoring script:

```bash
# Create a monitoring script
sudo nano /usr/local/bin/ssh-monitor.sh
```

```bash
#!/bin/bash
# Monitor failed SSH login attempts

echo "=== Failed SSH Login Attempts (Last 24 Hours) ==="
echo ""

# Count by IP address
echo "Top 10 attacking IPs:"
journalctl -u ssh --since "24 hours ago" | \
    grep -E "Failed|Invalid" | \
    grep -oE "[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+" | \
    sort | uniq -c | sort -rn | head -10

echo ""
echo "=== Currently Banned IPs (fail2ban) ==="
sudo fail2ban-client status sshd | grep -A 100 "Banned IP list"

echo ""
echo "=== Recent SSH Connections ==="
last -n 10
```

Make it executable:

```bash
sudo chmod +x /usr/local/bin/ssh-monitor.sh
```

## 11. Verification and Testing Checklist

After implementing all security measures, verify each component:

```bash
# 1. Verify SSH is running on the correct port
sudo ss -tlnp | grep ssh

# 2. Check SSH configuration syntax
sudo sshd -t

# 3. Verify fail2ban is running
sudo systemctl status fail2ban
sudo fail2ban-client status sshd

# 4. Verify knockd is running (if configured)
sudo systemctl status knockd

# 5. Check current SSH sessions
who

# 6. View recent authentication logs
sudo journalctl -u ssh --since "1 hour ago"

# 7. Test firewall rules
sudo iptables -L -n | grep -E "(2849|7000|8000|9000)"

# 8. Verify SSH key permissions
ls -la ~/.ssh/
```

## 12. Emergency Recovery Procedures

If you get locked out, use these recovery methods:

### Method 1: Console Access

Most cloud providers offer console access through their web interface. Use this to:

```bash
# Restore the backup configuration
sudo cp /etc/ssh/sshd_config.backup.* /etc/ssh/sshd_config

# Restart SSH
sudo systemctl restart sshd
```

### Method 2: Recovery Mode

Boot into recovery mode and mount the filesystem:

```bash
# Mount root filesystem
mount -o remount,rw /

# Edit SSH configuration
nano /etc/ssh/sshd_config

# Disable any problematic settings
# Restart SSH
systemctl restart sshd
```

### Method 3: Live USB

Boot from a live USB and mount the system drive to edit configuration files.

## Conclusion

You have now implemented a comprehensive SSH hardening strategy for Ubuntu that includes:

1. **Key-based authentication**: Eliminates password-based attacks
2. **Disabled root login**: Forces privilege escalation through sudo
3. **Non-standard port**: Reduces automated scanning
4. **fail2ban**: Automatically bans attacking IPs
5. **Port knocking**: Hides SSH until a secret sequence is performed
6. **Two-factor authentication**: Requires physical device for access
7. **Hardened configuration**: Uses strong cryptography and secure defaults

Remember to:

- Keep your system and SSH updated regularly
- Monitor authentication logs for suspicious activity
- Rotate SSH keys periodically
- Test your configuration after every change
- Maintain secure backups of your SSH keys and configuration

Security is a continuous process. Regularly review and update your SSH configuration as new threats emerge and best practices evolve.

## Additional Resources

- [OpenSSH Official Documentation](https://www.openssh.com/manual.html)
- [fail2ban Official Documentation](https://www.fail2ban.org/wiki/index.php/Main_Page)
- [Ubuntu Security Guide](https://ubuntu.com/security)
- [CIS Benchmarks for Ubuntu](https://www.cisecurity.org/benchmark/ubuntu_linux)

