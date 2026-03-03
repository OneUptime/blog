# How to Set Up SFTP-Only User Access on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, SFTP, SSH, Security, File Transfer

Description: Create SFTP-only user accounts on Ubuntu that can transfer files securely but cannot get a shell session, using OpenSSH's built-in ChrootDirectory and ForceCommand directives.

---

SFTP (SSH File Transfer Protocol) is a subsystem of SSH that provides secure file transfer without requiring a separate FTP server. OpenSSH includes SFTP support out of the box. The common requirement is to create users who can connect via SFTP to upload and download files, but who cannot SSH in and get an interactive shell. This is straightforward with OpenSSH's `ChrootDirectory` and `ForceCommand` directives.

## How SFTP-Only Access Works

OpenSSH's SFTP subsystem handles file transfers. To restrict users to SFTP only:

1. Set the user's shell to a non-interactive shell (like `/usr/sbin/nologin`)
2. Use `ForceCommand internal-sftp` to override any other command the user tries to run
3. Optionally use `ChrootDirectory` to restrict the user to a specific directory

The `internal-sftp` command is a built-in SFTP implementation in OpenSSH that does not require a separate `sftp-server` binary.

## Creating SFTP-Only Users

### Simple SFTP User (No Chroot)

```bash
# Create a user with no interactive shell
sudo useradd -m -s /usr/sbin/nologin sftpuser1

# Set the user's password
sudo passwd sftpuser1

# Verify the shell is set correctly
grep sftpuser1 /etc/passwd
# sftpuser1:x:1001:1001::/home/sftpuser1:/usr/sbin/nologin
```

### Testing Without SSH Config Changes

At this point, the user can connect via SFTP but not SSH:

```bash
# SFTP should work
sftp sftpuser1@localhost

# SSH should fail with "This account is currently not available"
ssh sftpuser1@localhost
```

## Configuring OpenSSH for SFTP-Only Access

For proper isolation and to ensure the user cannot bypass the shell restriction through SSH tricks, configure it explicitly in `/etc/ssh/sshd_config`.

### Restricting a Specific User

```bash
sudo nano /etc/ssh/sshd_config
```

Add at the end of the file:

```text
# SFTP-only access for sftpuser1
Match User sftpuser1
    ForceCommand internal-sftp
    PasswordAuthentication yes
    ChrootDirectory /home/sftpuser1
    PermitTunnel no
    AllowAgentForwarding no
    AllowTcpForwarding no
    X11Forwarding no
```

### Restricting a Group of Users

Create a dedicated group for SFTP users:

```bash
# Create the sftponly group
sudo groupadd sftponly

# Add users to the group
sudo usermod -aG sftponly sftpuser1
sudo usermod -aG sftponly sftpuser2
```

In `/etc/ssh/sshd_config`:

```text
# SFTP-only access for all users in the sftponly group
Match Group sftponly
    ForceCommand internal-sftp
    PasswordAuthentication yes
    ChrootDirectory /home/%u
    PermitTunnel no
    AllowAgentForwarding no
    AllowTcpForwarding no
    X11Forwarding no
```

The `%u` token expands to the username, so each user is chrooted to their own home directory.

## Setting Up ChrootDirectory Permissions

The `ChrootDirectory` must be owned by root and not writable by any other user. This is an OpenSSH security requirement. If the chroot directory is writable by the user, the SFTP connection will be refused with a "bad ownership" error.

```bash
# The chroot directory must be owned by root
sudo chown root:root /home/sftpuser1

# Must not be group or world writable
sudo chmod 755 /home/sftpuser1

# Create a subdirectory the user can actually write to
sudo mkdir -p /home/sftpuser1/uploads
sudo chown sftpuser1:sftpuser1 /home/sftpuser1/uploads
sudo chmod 755 /home/sftpuser1/uploads
```

After chrooting, the user sees `/uploads` as their writable directory (since their root is `/home/sftpuser1`).

## Applying the Configuration

```bash
# Test the sshd configuration for syntax errors
sudo sshd -t

# Reload SSH without dropping existing connections
sudo systemctl reload sshd

# Or restart completely
sudo systemctl restart sshd
```

## Testing SFTP-Only Access

```bash
# Test SFTP connection (should work)
sftp sftpuser1@localhost

# Commands inside SFTP:
sftp> ls
sftp> cd uploads
sftp> put /etc/hostname testfile.txt
sftp> ls -la
sftp> get testfile.txt /tmp/downloaded-testfile.txt
sftp> bye

# Test SSH login (should be denied)
ssh sftpuser1@localhost
# Expected: "This service allows sftp connections only."
```

The "this service allows sftp connections only" message comes from `ForceCommand internal-sftp` - when a regular SSH session is attempted, the SFTP subsystem receives the request and refuses it.

## SFTP with SSH Key Authentication

Password authentication over SFTP is secure (since the password is encrypted), but SSH key authentication is more convenient for automated scripts:

```bash
# Generate an SSH key pair for the user (or have the user do this)
ssh-keygen -t ed25519 -f ~/.ssh/sftpuser1_key -C "sftpuser1 SFTP key"

# The chroot complicates key-based auth setup
# The .ssh directory and authorized_keys must be inside the chroot,
# and OpenSSH looks relative to the chroot root

# Create .ssh inside the chroot
sudo mkdir -p /home/sftpuser1/.ssh
sudo touch /home/sftpuser1/.ssh/authorized_keys
sudo chown -R sftpuser1:sftpuser1 /home/sftpuser1/.ssh
sudo chmod 700 /home/sftpuser1/.ssh
sudo chmod 600 /home/sftpuser1/.ssh/authorized_keys

# Add the public key
sudo sh -c 'cat ~/.ssh/sftpuser1_key.pub >> /home/sftpuser1/.ssh/authorized_keys'
```

Update the sshd_config Match block to use the authorized_keys path relative to the chroot:

```text
Match User sftpuser1
    ForceCommand internal-sftp
    ChrootDirectory /home/sftpuser1
    AuthorizedKeysFile /home/sftpuser1/.ssh/authorized_keys
    PermitTunnel no
    AllowAgentForwarding no
    AllowTcpForwarding no
    X11Forwarding no
```

```bash
# Reload SSH
sudo systemctl reload sshd

# Test key-based authentication
sftp -i ~/.ssh/sftpuser1_key sftpuser1@localhost
```

## Setting Up Multiple SFTP Users with Shared Directories

For multiple users sharing a common upload area:

```bash
# Create a shared group
sudo groupadd ftpteam

# Create users in the group
for user in alice bob charlie; do
    sudo useradd -m -s /usr/sbin/nologin -G ftpteam $user
    sudo passwd $user
    # Set up chroot (root must own home dir)
    sudo chown root:root /home/$user
    sudo chmod 755 /home/$user
    # Create writable area
    sudo mkdir -p /home/$user/files
    sudo chown $user:ftpteam /home/$user/files
    sudo chmod 775 /home/$user/files
done

# Shared incoming directory accessible by all team members
sudo mkdir -p /srv/sftp/shared
sudo chown root:ftpteam /srv/sftp/shared
sudo chmod 1775 /srv/sftp/shared  # sticky bit prevents deletion of others' files
```

For users to access the shared directory, bind mount it inside each user's chroot:

```bash
# Bind mount shared directory into each user's chroot
sudo mkdir -p /home/alice/shared
sudo mount --bind /srv/sftp/shared /home/alice/shared

# Make it persistent
sudo nano /etc/fstab
```

Add:
```text
/srv/sftp/shared  /home/alice/shared  none  bind  0  0
/srv/sftp/shared  /home/bob/shared    none  bind  0  0
/srv/sftp/shared  /home/charlie/shared  none  bind  0  0
```

## Monitoring SFTP Activity

```bash
# Watch SFTP connections and file transfers in real time
sudo journalctl -u ssh -f

# Search for specific user activity
sudo journalctl -u ssh | grep sftpuser1

# Enable verbose SFTP logging by adding to Match block:
# LogLevel VERBOSE

# Example log entries:
# sshd[1234]: Accepted password for sftpuser1 from 192.168.1.100 port 52341 ssh2
# sshd[1234]: subsystem request for sftp by user sftpuser1
```

For more detailed SFTP logging in the Match block:

```text
Match Group sftponly
    ForceCommand internal-sftp -l VERBOSE
    ...
```

This logs every SFTP operation (file opens, reads, writes, directory listings) to syslog.

## Firewall Configuration

SFTP uses the same port as SSH (port 22), so no additional firewall rules are needed if SSH is already allowed:

```bash
# Check if SSH is allowed
sudo ufw status | grep ssh

# If not, allow SSH (which covers SFTP)
sudo ufw allow ssh
```

The SFTP-only approach using OpenSSH is cleaner and more secure than running a separate FTP or FTPS server. You get the same SSH encryption and authentication mechanisms without any additional attack surface from a separate daemon.
