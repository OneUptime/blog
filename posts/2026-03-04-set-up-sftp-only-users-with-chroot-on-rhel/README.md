# How to Set Up SFTP-Only Users with Chroot on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, SFTP, SSH, Security, Linux

Description: Learn how to create SFTP-only users with chroot jails on RHEL to restrict file transfer access without granting shell login capabilities.

---

Sometimes you need to give users file transfer access to your RHEL server without allowing them to log in via SSH and run commands. Setting up SFTP-only users with chroot jails solves this problem by locking each user into a specific directory.

## Create the SFTP Group and User

First, create a dedicated group for SFTP-only users and add a new user:

```bash
# Create a group for SFTP-only access
sudo groupadd sftpusers

# Create a user with no shell access, assigned to the sftpusers group
sudo useradd -g sftpusers -s /sbin/nologin -m sftpuser1

# Set a password for the user
sudo passwd sftpuser1
```

## Configure the Chroot Directory

The chroot directory must be owned by root for OpenSSH to enforce the jail:

```bash
# Set ownership on the user's home directory to root
sudo chown root:root /home/sftpuser1

# Create an upload directory the user can write to
sudo mkdir /home/sftpuser1/uploads
sudo chown sftpuser1:sftpusers /home/sftpuser1/uploads
sudo chmod 755 /home/sftpuser1/uploads
```

## Modify the SSH Configuration

Edit the SSH daemon configuration to enforce SFTP-only access:

```bash
sudo vi /etc/ssh/sshd_config
```

Comment out the existing Subsystem line and add the following at the end:

```text
# Replace the default sftp subsystem
Subsystem sftp internal-sftp

# Match users in the sftpusers group
Match Group sftpusers
    ChrootDirectory %h
    ForceCommand internal-sftp
    AllowTcpForwarding no
    X11Forwarding no
    PasswordAuthentication yes
```

The `ChrootDirectory %h` directive locks the user into their home directory. The `ForceCommand internal-sftp` ensures only SFTP commands work.

## Apply and Test

```bash
# Validate the SSH configuration
sudo sshd -t

# Restart the SSH daemon
sudo systemctl restart sshd

# Test the SFTP connection
sftp sftpuser1@localhost
```

Once connected, the user will only see the `uploads` directory and cannot escape the chroot jail. Attempting a regular SSH login will fail because the shell is set to `/sbin/nologin`.

## SELinux Considerations

If SELinux is enforcing, you may need to set the correct boolean:

```bash
# Allow SSH to read and write in chroot directories
sudo setsebool -P ssh_chroot_rw_homedirs on
```

This setup provides a secure, minimal-access file transfer solution on RHEL without exposing your server to unnecessary risk.
