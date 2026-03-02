# How to Configure SFTP Server on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, SFTP, SSH, File Transfer, Security

Description: Set up a secure SFTP server on Ubuntu with chroot jail, user isolation, public key authentication, and proper permission management for safe file transfers.

---

SFTP (SSH File Transfer Protocol) is a secure alternative to FTP that runs over SSH. Ubuntu's OpenSSH server includes SFTP support out of the box - you just need to configure it properly. A good SFTP setup isolates users in their home directories through a chroot jail, restricts them from accessing the rest of the filesystem, and optionally enforces key-based authentication instead of passwords.

## How SFTP Differs from FTP

SFTP is not FTP over SSH - it is a completely different protocol that happens to use the SSH connection. Key differences:

- All data is encrypted in transit (FTP sends credentials in plaintext)
- Uses a single port (22) instead of FTP's multi-port requirement
- Built into OpenSSH - no additional server software needed
- Supports resumable transfers natively
- No need to open extra firewall ports

## Installing OpenSSH Server

Most Ubuntu server installations already have OpenSSH. Verify and install if needed:

```bash
# Check if SSH server is running
sudo systemctl status ssh

# Install if missing
sudo apt update
sudo apt install openssh-server -y

# Enable and start
sudo systemctl enable ssh
sudo systemctl start ssh
```

## Creating a Dedicated SFTP Group and Users

The recommended approach is to create a dedicated group for SFTP-only users:

```bash
# Create a group for SFTP users
sudo groupadd sftpusers

# Create a new user restricted to SFTP (no shell login)
sudo useradd -m -s /sbin/nologin -G sftpusers alice

# Set a password for the user
sudo passwd alice

# Verify the user was created correctly
id alice
getent passwd alice
```

The `-s /sbin/nologin` flag prevents the user from logging in via SSH shell. They can only use SFTP.

## Configuring SSH for Chroot SFTP

The chroot jail confines SFTP users to a specific directory, preventing them from browsing the rest of the filesystem:

```bash
sudo nano /etc/ssh/sshd_config
```

Find the existing `Subsystem sftp` line and replace it. Then add the Match block at the end of the file:

```bash
# Find and replace the existing Subsystem line
# Change this:
# Subsystem sftp /usr/lib/openssh/sftp-server
# To this (uses the internal SFTP handler):
Subsystem sftp internal-sftp
```

At the very end of the file, add the configuration for your SFTP group:

```bash
# Append to the end of /etc/ssh/sshd_config

# Match all users in the sftpusers group
Match Group sftpusers
    # Use the internal SFTP server
    ForceCommand internal-sftp
    # Set the chroot directory (must be owned by root)
    ChrootDirectory /var/sftp/%u
    # Disable X11 and TCP forwarding for security
    X11Forwarding no
    AllowTcpForwarding no
    # Disable SSH tunneling
    PermitTunnel no
```

The `%u` in `ChrootDirectory` expands to the username, giving each user their own isolated directory.

## Setting Up the Chroot Directory Structure

The chroot directory has strict ownership requirements: **the root of the chroot must be owned by root with no write permission for anyone else**. This is an OpenSSH security requirement.

```bash
# Create the per-user chroot root (owned by root, not writable by the user)
sudo mkdir -p /var/sftp/alice

# Root must own the chroot directory with strict permissions
sudo chown root:root /var/sftp/alice
sudo chmod 755 /var/sftp/alice

# Create an upload directory inside the chroot that the user can write to
sudo mkdir -p /var/sftp/alice/files

# Give the user ownership of the inner directory
sudo chown alice:sftpusers /var/sftp/alice/files
sudo chmod 750 /var/sftp/alice/files
```

The user sees `/files` as the writable directory when they connect. The root `/` of their session is the chroot, and they cannot escape it.

## Applying the Configuration

```bash
# Test the SSH configuration for syntax errors
sudo sshd -t

# Restart SSH to apply changes
sudo systemctl restart ssh
```

## Testing the SFTP Connection

```bash
# Test from another machine or localhost
sftp alice@YOUR_SERVER_IP

# Enter the password when prompted
# You should see:
# Connected to YOUR_SERVER_IP.
# sftp>

# List available directories (should only show /files)
sftp> ls

# Navigate to the files directory
sftp> cd files

# Upload a file
sftp> put /local/path/to/file.txt

# Download a file
sftp> get remote_file.txt /local/destination/

# Exit
sftp> quit
```

Verify that the user cannot escape the chroot:

```bash
sftp> cd /
sftp> ls
# Should only show the chroot contents, not the real filesystem root
```

## Setting Up Multiple SFTP Users

Script to add multiple SFTP users efficiently:

```bash
#!/bin/bash
# add_sftp_user.sh - Add a new SFTP user with chroot jail

USERNAME="$1"
if [ -z "$USERNAME" ]; then
    echo "Usage: $0 username"
    exit 1
fi

# Create the user with no shell login
sudo useradd -m -s /sbin/nologin -G sftpusers "$USERNAME"

# Set a random temporary password
TEMP_PASS=$(openssl rand -base64 12)
echo "$USERNAME:$TEMP_PASS" | sudo chpasswd

# Create chroot directory structure
sudo mkdir -p "/var/sftp/${USERNAME}/files"
sudo chown root:root "/var/sftp/${USERNAME}"
sudo chmod 755 "/var/sftp/${USERNAME}"
sudo chown "${USERNAME}:sftpusers" "/var/sftp/${USERNAME}/files"
sudo chmod 750 "/var/sftp/${USERNAME}/files"

echo "User $USERNAME created"
echo "Temporary password: $TEMP_PASS"
echo "Have the user change it on first login"
```

```bash
chmod +x add_sftp_user.sh
sudo ./add_sftp_user.sh bob
```

## Configuring Key-Based Authentication

Password authentication is acceptable for internal networks, but key-based authentication is more secure for internet-facing servers:

```bash
# Create the .ssh directory inside the chroot structure
# Note: This goes inside the chroot but at the home directory
# The actual home is outside the chroot for key auth to work

# For key-based auth with chroot, the authorized_keys must be placed correctly
# Create .ssh in the user's actual home dir (not chroot dir)
sudo mkdir -p /home/alice/.ssh
sudo touch /home/alice/.ssh/authorized_keys
sudo chown -R alice:alice /home/alice/.ssh
sudo chmod 700 /home/alice/.ssh
sudo chmod 600 /home/alice/.ssh/authorized_keys

# Add the user's public key
# (replace with actual public key content)
echo "ssh-rsa AAAAB3NzaC1yc2E... user@client" | sudo tee -a /home/alice/.ssh/authorized_keys
```

Add this to the `sshd_config` Match block to specify the authorized keys path:

```bash
Match Group sftpusers
    ForceCommand internal-sftp
    ChrootDirectory /var/sftp/%u
    X11Forwarding no
    AllowTcpForwarding no
    # Specify authorized keys path outside the chroot
    AuthorizedKeysFile /home/%u/.ssh/authorized_keys
```

## Setting Upload Quotas with du

SFTP does not have built-in quota enforcement, but you can set filesystem quotas:

```bash
# Install quota tools
sudo apt install quota -y

# Enable quotas on the filesystem (edit /etc/fstab)
# Add "usrquota" to mount options for the filesystem containing /var/sftp
sudo nano /etc/fstab
# Example: /dev/sdb1 /var/sftp ext4 defaults,usrquota 0 2

# Remount to apply
sudo mount -o remount /var/sftp

# Initialize quota database
sudo quotacheck -cum /var/sftp

# Set quota for a user (soft and hard limits in KB)
sudo setquota -u alice 1048576 2097152 0 0 /var/sftp
# 1GB soft limit, 2GB hard limit

# Check quota usage
sudo quota -u alice
sudo repquota /var/sftp
```

## Monitoring SFTP Activity

```bash
# Monitor SSH/SFTP connections in real time
sudo journalctl -f -u ssh

# List currently logged-in SFTP users
who | grep sftp

# View SFTP session history
sudo grep "subsystem request for sftp" /var/log/auth.log

# Count connections by user
sudo grep "subsystem request" /var/log/auth.log | \
    awk '{print $9}' | sort | uniq -c | sort -rn
```

## Firewall Configuration

```bash
# Allow SSH/SFTP on port 22
sudo ufw allow 22/tcp

# Or allow only from specific IP ranges
sudo ufw allow from 192.168.1.0/24 to any port 22

sudo ufw reload
```

## Troubleshooting

**"Permission denied" when connecting**: Check that the chroot directory is owned by root with mode 755. Run `ls -la /var/sftp/` to confirm.

**"Write failed: Permission denied" when uploading**: The inner `files` directory must be writable by the user. Check `ls -la /var/sftp/alice/` and confirm `files` is owned by alice.

**User can login via SSH shell despite `nologin`**: Verify the user's shell in `/etc/passwd` is set to `/sbin/nologin` or `/bin/false`.

**Can't find authorized_keys**: The `AuthorizedKeysFile` path in `sshd_config` must point to the actual filesystem path, not the path inside the chroot.

A properly configured SFTP chroot setup provides solid isolation between users and the rest of the system while remaining simple to administer and compatible with all standard SFTP clients.
