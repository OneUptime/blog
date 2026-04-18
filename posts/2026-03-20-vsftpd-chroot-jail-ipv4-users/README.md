# How to Set Up vsftpd Chroot Jail for IPv4 Users

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: vsftpd, FTP, IPv4, Chroot, Security, Linux, Configuration

Description: Learn how to configure vsftpd to confine FTP users to their home directories using a chroot jail, preventing access to the broader filesystem.

---

A chroot jail restricts FTP users to their home directory by changing the root directory to that path. This prevents users from browsing other parts of the filesystem, improving security on shared FTP servers.

## Installing vsftpd

```bash
apt install vsftpd -y       # Debian/Ubuntu
dnf install vsftpd -y       # RHEL/Rocky
systemctl enable --now vsftpd
```

## Basic vsftpd Configuration with Chroot

```ini
# /etc/vsftpd.conf

# --- Network: IPv4 only ---

listen=YES                  # Listen on IPv4
listen_ipv6=NO              # Disable IPv6 listener

# Bind to a specific IPv4 address (optional)
# listen_address=192.168.1.10

# --- Authentication ---
local_enable=YES            # Allow local system users to log in
anonymous_enable=NO         # Disable anonymous access

# --- Write permissions ---
write_enable=YES            # Allow upload/download
local_umask=022             # Permissions for new files

# --- Chroot jail ---
chroot_local_user=YES       # Restrict all users to their home directory

# Required when chroot is enabled: home dir must NOT be writable by the user
# Use a separate upload subdirectory instead
allow_writeable_chroot=NO   # Safer; see "writable home" note below

# --- Passive mode (for NAT/firewall traversal) ---
pasv_enable=YES
pasv_min_port=40000
pasv_max_port=50000
# pasv_address=203.0.113.10  # Public IPv4 if behind NAT

# --- Logging ---
xferlog_enable=YES
xferlog_file=/var/log/vsftpd.log
```

## Handling the Writable Home Directory Issue

When `chroot_local_user=YES`, vsftpd requires the chroot root (home directory) to not be writable by the user. Solve this by creating a writable subdirectory.

```bash
# Set up a chroot-safe home directory for ftpuser
useradd -m -s /usr/sbin/nologin ftpuser
chown root:root /home/ftpuser   # Home owned by root so ftpuser can't write to it
chmod 755 /home/ftpuser         # Not writable by ftpuser
mkdir /home/ftpuser/uploads
chown ftpuser:ftpuser /home/ftpuser/uploads
chmod 755 /home/ftpuser/uploads
```

## Allowing Specific Users to Break Out of Chroot

```ini
# /etc/vsftpd.conf

# Only chroot users NOT in this list (inverted logic)
chroot_list_enable=YES
chroot_list_file=/etc/vsftpd.chroot_list
```

```bash
# /etc/vsftpd.chroot_list
# Users listed here are EXCLUDED from chroot (can access full filesystem)
admin_user
backup_agent
```

## Alternatively: Chroot Only Listed Users

```ini
# chroot_local_user=NO  (don't chroot everyone)
chroot_list_enable=YES
chroot_list_file=/etc/vsftpd.chroot_list
# Users in the list ARE chrooted
```

## Testing the Chroot

```bash
# Restart vsftpd
systemctl restart vsftpd

# Connect as the restricted user
ftp 192.168.1.10
# Login: ftpuser

# After login, try to navigate above the home directory
# This should fail with: 550 Failed to change directory
cd /etc
```

## Key Takeaways

- `chroot_local_user=YES` restricts all local users to their home directories.
- The home directory must not be writable by the user when chroot is enabled; create a writable subdirectory (`uploads/`) instead.
- `allow_writeable_chroot=YES` bypasses this restriction but introduces security risks.
- Use `chroot_list_file` to exempt trusted users (admins) from the chroot restriction.
