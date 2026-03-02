# How to Enable and Configure OpenSSH Server on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, SSH, OpenSSH, Security, Sysadmin

Description: Install, enable, and securely configure OpenSSH server on Ubuntu with key-based authentication, hardened settings, and port customization for secure remote access.

---

SSH (Secure Shell) is the standard remote administration protocol for Linux servers. OpenSSH is the reference implementation included with Ubuntu. Getting SSH configured properly from the start - with key-based authentication, a hardened sshd_config, and appropriate firewall rules - sets up a secure foundation for server management.

## Installing and Starting OpenSSH

Most Ubuntu server installations include OpenSSH by default. Check:

```bash
# Check if openssh-server is installed
dpkg -l openssh-server

# Install if not present
sudo apt update
sudo apt install -y openssh-server

# Start and enable the service
sudo systemctl start ssh
sudo systemctl enable ssh

# Check the service is running
sudo systemctl status ssh
```

The SSH service on Ubuntu is named `ssh` (not `sshd` like on some other distributions).

## Setting Up Key-Based Authentication

Key-based authentication is significantly more secure than password authentication. Generate a key pair on your client machine (not the server):

```bash
# On your LOCAL machine (laptop/desktop)
# Generate an ED25519 key (recommended) with a passphrase
ssh-keygen -t ed25519 -C "your-email@example.com" -f ~/.ssh/id_ed25519

# Or RSA 4096 for compatibility with older systems
ssh-keygen -t rsa -b 4096 -C "your-email@example.com" -f ~/.ssh/id_rsa
```

The `-C` comment is just a label for identifying the key - it doesn't affect security. Use a strong passphrase when prompted.

### Copying Your Public Key to the Server

```bash
# The easiest method - copies the public key to authorized_keys
ssh-copy-id -i ~/.ssh/id_ed25519.pub user@server-ip

# If the server is on a non-standard port
ssh-copy-id -i ~/.ssh/id_ed25519.pub -p 2222 user@server-ip

# Manual method if ssh-copy-id isn't available
# First, display your public key
cat ~/.ssh/id_ed25519.pub

# Then append it to authorized_keys on the server
# (Requires password authentication to still be enabled)
ssh user@server-ip "mkdir -p ~/.ssh && cat >> ~/.ssh/authorized_keys" < ~/.ssh/id_ed25519.pub
```

### Setting Correct Permissions on the Server

SSH is strict about file permissions. If they're wrong, key auth won't work:

```bash
# On the server, fix permissions
chmod 700 ~/.ssh
chmod 600 ~/.ssh/authorized_keys
chown -R $USER:$USER ~/.ssh
```

### Testing Key Authentication

Before disabling password auth, verify key auth works:

```bash
# Test from your local machine
ssh -i ~/.ssh/id_ed25519 user@server-ip

# Verify which authentication method was used
ssh -v user@server-ip 2>&1 | grep "Authentication succeeded"
```

If it connects without asking for a password (or asks for your key passphrase, not a server password), key auth is working.

## Hardening sshd_config

The main configuration file is `/etc/ssh/sshd_config`. Always test syntax before restarting:

```bash
sudo nano /etc/ssh/sshd_config
```

Key security settings:

```
# Change the default port (optional but reduces automated attack noise)
# Port 2222

# Protocol version - OpenSSH only supports 2, but worth documenting
# Protocol 2

# Listen on specific interface (if server has multiple interfaces)
# ListenAddress 192.168.1.10

# Authentication methods
# Disable root login
PermitRootLogin no

# Enable public key authentication
PubkeyAuthentication yes

# Disable password authentication (ONLY after verifying key auth works)
PasswordAuthentication no

# Disable empty passwords
PermitEmptyPasswords no

# Disable challenge-response (keyboard-interactive) auth
ChallengeResponseAuthentication no

# Disable PAM for password auth (when using key auth only)
# UsePAM yes  # Keep this enabled for other PAM functions

# Authorized keys file location
AuthorizedKeysFile .ssh/authorized_keys

# Set login grace time (time to complete authentication)
LoginGraceTime 30

# Limit connection attempts per connection
MaxAuthTries 3

# Limit concurrent unauthenticated connections
MaxStartups 3:50:10

# Session limits
# Maximum number of open sessions per connection
MaxSessions 3

# Idle timeout (in seconds)
# Disconnect if no activity for 15 minutes
ClientAliveInterval 300
ClientAliveCountMax 3

# Disable X11 forwarding (unless needed)
X11Forwarding no

# Disable TCP forwarding (unless needed for tunnels)
# AllowTcpForwarding no

# Disable agent forwarding (unless needed)
AllowAgentForwarding no

# Disable printing of /etc/motd after login
# PrintMotd no

# Disable forwarding of the locale from the client
AcceptEnv LANG LC_*

# SFTP subsystem
Subsystem sftp /usr/lib/openssh/sftp-server

# Restrict which users can log in via SSH
# AllowUsers admin deploy
# AllowGroups sshusers sudo

# Banner (show legal notice before authentication)
# Banner /etc/ssh/banner.txt
```

### Testing the Configuration

Before restarting, always test the configuration:

```bash
# Syntax check
sudo sshd -t

# No output means no errors

# If there are errors, they'll be shown:
# /etc/ssh/sshd_config: line 42: Bad configuration option: SomeTypo
```

Apply the new configuration:

```bash
# Reload (graceful - doesn't disconnect existing sessions)
sudo systemctl reload ssh

# Or restart (drops connections)
sudo systemctl restart ssh

# Check service started successfully
sudo systemctl status ssh
```

## Changing the SSH Port

Running SSH on a non-standard port reduces log noise from automated scanners:

```bash
sudo nano /etc/ssh/sshd_config
```

```
Port 2222
```

Update the firewall before restarting SSH (or you'll lose access):

```bash
# With UFW - add new port rule
sudo ufw allow 2222/tcp

# Test connecting on the new port BEFORE removing the old rule
ssh -p 2222 user@server-ip

# Only after confirming the new port works, remove the old rule
sudo ufw delete allow 22/tcp
```

Reload SSH:

```bash
sudo systemctl reload ssh
```

Connect with the new port:

```bash
# Specify the port in the command
ssh -p 2222 user@server-ip

# Or add to ~/.ssh/config on your client for convenience
```

## SSH Client Configuration

On your local machine, an SSH config file saves typing:

```bash
nano ~/.ssh/config
```

```
# Default settings for all hosts
Host *
    ServerAliveInterval 60
    ServerAliveCountMax 3
    AddKeysToAgent yes

# Specific host configurations
Host my-server
    HostName 192.168.1.10
    Port 2222
    User admin
    IdentityFile ~/.ssh/id_ed25519

Host bastion
    HostName bastion.example.com
    Port 22
    User admin
    IdentityFile ~/.ssh/id_ed25519

# Connecting through a bastion host
Host internal-server
    HostName 10.0.1.50
    User admin
    ProxyJump bastion
```

With this config, connecting is as simple as:

```bash
ssh my-server
ssh internal-server  # Automatically proxies through bastion
```

## Restricting Which Users Can SSH

Rather than allowing all system users to SSH:

```bash
sudo nano /etc/ssh/sshd_config
```

```
# Only allow specific users
AllowUsers admin deploy webmaster

# Or allow a group
AllowGroups sshusers sudo
```

Create a dedicated SSH users group:

```bash
# Create the group
sudo groupadd sshusers

# Add users to the group
sudo usermod -aG sshusers admin
sudo usermod -aG sshusers deploy

# Add to sshd_config
# AllowGroups sshusers

sudo systemctl reload ssh
```

## Setting Up SSH Jump Hosts (ProxyJump)

For accessing servers in private networks through a bastion:

On the bastion server, ensure `AllowTcpForwarding yes` is in sshd_config (or at least not explicitly set to no).

On your local machine:

```bash
# Direct connection with ProxyJump
ssh -J bastion.example.com user@internal-server

# Or in ~/.ssh/config
Host internal-*
    ProxyJump bastion.example.com
    IdentityFile ~/.ssh/id_ed25519
```

## Monitoring SSH Login Activity

Track who's logging in:

```bash
# View recent SSH logins
last -n 20

# View failed login attempts
sudo lastb -n 20

# Real-time monitoring of auth.log
sudo tail -f /var/log/auth.log | grep -E "Accepted|Failed|Invalid"

# Count failed logins by IP
sudo grep "Failed password" /var/log/auth.log \
    | awk '{print $(NF-3)}' \
    | sort | uniq -c | sort -rn \
    | head -20
```

## Two-Factor Authentication

For additional security, add TOTP-based two-factor authentication:

```bash
# Install Google Authenticator PAM module
sudo apt install -y libpam-google-authenticator

# Set up for a user
google-authenticator
# Answer yes to all prompts and scan the QR code with your TOTP app
```

Configure PAM:

```bash
sudo nano /etc/pam.d/sshd
```

Add at the top:

```
auth required pam_google_authenticator.so
```

Update sshd_config:

```
ChallengeResponseAuthentication yes
AuthenticationMethods publickey,keyboard-interactive
```

Reload SSH:

```bash
sudo systemctl reload ssh
```

With this configuration, users must present their SSH key AND a TOTP code to connect.

## Keeping OpenSSH Updated

OpenSSH security updates are important:

```bash
# Check current version
ssh -V

# Keep it updated
sudo apt update
sudo apt upgrade openssh-server

# Check for security announcements
# Subscribe to the Ubuntu Security Notices mailing list
# https://lists.ubuntu.com/mailman/listinfo/ubuntu-security-announce
```

## Troubleshooting SSH Issues

If you get locked out:

```bash
# From console (KVM, cloud provider console):
# Verify sshd is running
systemctl status ssh

# Check for configuration errors
sshd -t

# Temporarily enable password auth (as a recovery method)
echo "PasswordAuthentication yes" >> /etc/ssh/sshd_config.d/emergency.conf
systemctl reload ssh
```

Common issues:

```bash
# Permission denied (publickey)
# - Check authorized_keys permissions (must be 600)
# - Check ~/.ssh directory permissions (must be 700)
# - Check the right public key is in authorized_keys
ls -la ~/.ssh/
cat ~/.ssh/authorized_keys

# Host key verification failed
# - Server's host key changed (might indicate MITM, or server was rebuilt)
# - Remove the old key from known_hosts
ssh-keygen -R server-ip
```

OpenSSH properly configured - with key authentication, root login disabled, and appropriate idle timeouts - provides a solid foundation for server administration. The time investment in getting this right upfront pays off in reduced attack surface and cleaner audit logs over the server's lifetime.
