# How to Configure SFTP with SSH Key Authentication on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, SFTP, SSH, Security, Authentication

Description: Set up SFTP access using SSH key-based authentication on RHEL to eliminate password-based logins and improve security for file transfers.

---

Password-based SFTP is convenient but vulnerable to brute-force attacks. Switching to SSH key authentication for SFTP connections on RHEL is more secure and enables passwordless automated transfers.

## Generate an SSH Key Pair on the Client

On the machine that will connect to the SFTP server, generate a key pair:

```bash
# Generate an Ed25519 key pair (recommended for modern systems)
ssh-keygen -t ed25519 -f ~/.ssh/sftp_key -C "sftp-client"
```

This creates `~/.ssh/sftp_key` (private) and `~/.ssh/sftp_key.pub` (public).

## Set Up the Server-Side User

On the RHEL server, create the SFTP user and prepare the SSH directory:

```bash
# Create the SFTP user
sudo useradd -m -s /sbin/nologin sftpuser

# Create the .ssh directory with correct permissions
sudo mkdir -p /home/sftpuser/.ssh
sudo chmod 700 /home/sftpuser/.ssh

# Copy the public key to authorized_keys
sudo vi /home/sftpuser/.ssh/authorized_keys
# Paste the contents of sftp_key.pub

# Set ownership and permissions
sudo chown -R sftpuser:sftpuser /home/sftpuser/.ssh
sudo chmod 600 /home/sftpuser/.ssh/authorized_keys
```

## Configure SSHD for Key-Only SFTP

Edit `/etc/ssh/sshd_config` to enforce key authentication for SFTP users:

```text
Subsystem sftp internal-sftp

Match User sftpuser
    ForceCommand internal-sftp
    PasswordAuthentication no
    PubkeyAuthentication yes
    AllowTcpForwarding no
    X11Forwarding no
```

Restart the SSH daemon:

```bash
# Validate and restart
sudo sshd -t
sudo systemctl restart sshd
```

## Connect Using the Key

From the client machine, connect with the private key:

```bash
# Connect using the specific private key
sftp -i ~/.ssh/sftp_key sftpuser@your-rhel-server

# You can also use it in batch mode for automation
sftp -i ~/.ssh/sftp_key -b /path/to/batch_commands.txt sftpuser@your-rhel-server
```

A sample batch file might look like:

```text
cd /uploads
put localfile.tar.gz
bye
```

## Verify Key-Only Access

Confirm that password login is disabled for this user:

```bash
# This should fail with "Permission denied"
sftp -o PubkeyAuthentication=no sftpuser@your-rhel-server
```

## Firewall Configuration

Make sure the SSH port is open in firewalld:

```bash
# Confirm SSH service is allowed
sudo firewall-cmd --list-services
# If not listed, add it
sudo firewall-cmd --permanent --add-service=ssh
sudo firewall-cmd --reload
```

This configuration gives you secure, automated SFTP access without the risks associated with password authentication.
