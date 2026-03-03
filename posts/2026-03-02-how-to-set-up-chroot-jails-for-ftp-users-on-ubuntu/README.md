# How to Set Up Chroot Jails for FTP Users on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, FTP, Security, vsftpd, ProFTPD

Description: Restrict FTP users to specific directories using chroot jails on Ubuntu with vsftpd and ProFTPD, preventing directory traversal and unauthorized file system access.

---

A chroot jail restricts an FTP user to a specific directory by making that directory appear to be the filesystem root from the user's perspective. Without a chroot, an FTP user who logs into `/home/alice` could navigate to `/etc`, `/var/log`, or any other directory they have read permission on - which is a significant security risk. Chroot jails prevent this entirely.

## How Chroot Jails Work

The `chroot()` system call changes a process's root directory to a specified path. After calling `chroot(/home/alice)`, the process sees `/home/alice` as `/`. It cannot access `/home/alice/../etc` because from inside the jail, `..` from the root just returns to the root. The rest of the filesystem is invisible.

For FTP servers, this means a jailed user connecting to `/home/alice` cannot navigate outside that directory tree, cannot read server configuration files, and cannot see other users' home directories.

## Setting Up Chroot Jails in vsftpd

vsftpd has built-in chroot support through the `chroot_local_user` directive.

### Understanding vsftpd's Chroot Security Requirement

vsftpd has a security restriction: the chroot directory itself must not be writable by the FTP user. This prevents users from replacing binaries inside the jail that could escape it. If you want the user to be able to upload files, you need a writable subdirectory inside the jail, not a writable jail root.

```bash
sudo nano /etc/vsftpd.conf
```

```ini
# Chroot all local users to their home directories
chroot_local_user=YES

# IMPORTANT: Do NOT set allow_writeable_chroot=YES if you want proper security.
# Instead, make the chroot dir owned by root and create a writable subdirectory.
```

### Creating the Chroot Structure

```bash
# Create user with a proper chroot setup
sudo useradd -m -s /usr/sbin/nologin ftpuser1

# The home directory becomes the chroot jail root
# It must be owned by root and not writable by the user
sudo chown root:root /home/ftpuser1
sudo chmod 755 /home/ftpuser1

# Create writable subdirectory for uploads
sudo mkdir -p /home/ftpuser1/uploads
sudo chown ftpuser1:ftpuser1 /home/ftpuser1/uploads
sudo chmod 755 /home/ftpuser1/uploads

# Optional: create a read-only area for downloads
sudo mkdir -p /home/ftpuser1/downloads
sudo chown root:root /home/ftpuser1/downloads
sudo chmod 755 /home/ftpuser1/downloads

# Set the password
sudo passwd ftpuser1
```

From the FTP client's perspective:
- Connecting shows `/` which is actually `/home/ftpuser1`
- `cd /uploads` works (the user can write here)
- `cd /etc` fails (there is no `/etc` inside the jail)

### Chrooting to a Different Directory

Instead of the home directory, you can chroot to a completely different path:

```ini
# In vsftpd.conf
chroot_local_user=YES

# Chroot to the local_root path instead of the home directory
local_root=/srv/ftp/%n  # %n = username
```

```bash
# Create per-user FTP directories
for user in alice bob charlie; do
    sudo mkdir -p /srv/ftp/$user/files
    sudo chown root:root /srv/ftp/$user
    sudo chmod 755 /srv/ftp/$user
    sudo chown $user:$user /srv/ftp/$user/files
    sudo chmod 755 /srv/ftp/$user/files
done
```

### Selectively Applying Chroot

Not all users may need chroot. Use `chroot_list_enable` to control this selectively:

```ini
# Chroot all users EXCEPT those in the chroot_list_file
chroot_local_user=YES
chroot_list_enable=YES
chroot_list_file=/etc/vsftpd.chroot_list
```

Users listed in `/etc/vsftpd.chroot_list` are **excluded** from chrooting. Add admin users who need full filesystem access:

```bash
sudo nano /etc/vsftpd.chroot_list
```

```text
adminuser
backupuser
```

Or invert the logic - chroot ONLY users in the list:

```ini
# Chroot only users listed in chroot_list_file
chroot_local_user=NO
chroot_list_enable=YES
chroot_list_file=/etc/vsftpd.chroot_list
```

## Setting Up Chroot Jails in ProFTPD

ProFTPD chroot is configured with `DefaultRoot`:

```bash
sudo nano /etc/proftpd/proftpd.conf
```

```apache
# Chroot all users to their home directory
DefaultRoot ~

# Or chroot to a specific directory
DefaultRoot /srv/ftp/%u

# Chroot with group-based exception:
# Chroot everyone except members of the 'admin' group
DefaultRoot ~ !admin
```

### ProFTPD Per-User Chroot

Using `<Directory>` blocks for per-user access control:

```apache
# Global chroot
DefaultRoot ~

# Restrict specific user to a specific path
<IfUser ftpuser1>
    DefaultRoot /srv/ftp/ftpuser1
</IfUser>

# Group-based chroot path
<IfGroup ftpusers>
    DefaultRoot /srv/ftp/%u
</IfGroup>
```

## Creating Shared Directories Accessible from Multiple Jails

Sometimes FTP users need access to a shared area alongside their private jail. Use bind mounts to expose a shared directory inside each user's jail:

```bash
# Create the shared directory
sudo mkdir -p /srv/ftp/shared
sudo chown root:ftpgroup /srv/ftp/shared
sudo chmod 775 /srv/ftp/shared

# Create mount points inside each user's jail
sudo mkdir -p /home/alice/shared
sudo mkdir -p /home/bob/shared

# Bind mount the shared directory
sudo mount --bind /srv/ftp/shared /home/alice/shared
sudo mount --bind /srv/ftp/shared /home/bob/shared

# Make bind mounts persistent
sudo nano /etc/fstab
```

```text
/srv/ftp/shared  /home/alice/shared  none  bind  0  0
/srv/ftp/shared  /home/bob/shared    none  bind  0  0
```

```bash
sudo mount -a
```

Now alice and bob each see a `/shared` directory inside their jail that points to the same underlying location.

## Adding System Files Inside the Jail

Some applications that run inside chroot jails need access to basic system files like `/etc/passwd`, `/etc/group`, or DNS resolution files. FTP jails generally do not need these, but if you are running a more complex chroot environment:

```bash
# Create the necessary directory structure inside the jail
JAILDIR="/home/ftpuser1"

sudo mkdir -p $JAILDIR/{etc,lib,lib64,usr/bin}

# Copy essential files (read-only for FTP purposes)
sudo cp /etc/passwd $JAILDIR/etc/passwd
sudo cp /etc/group $JAILDIR/etc/group
sudo cp /etc/nsswitch.conf $JAILDIR/etc/nsswitch.conf
```

For pure FTP usage, you typically do not need this - the FTP daemon handles all the operations and the user's shell is never invoked.

## Verifying Chroot is Working

Test from a client:

```bash
# Connect as the FTP user
lftp -u ftpuser1 localhost

# Try to navigate above the jail root
lftp> ls /
# Should only show contents of /home/ftpuser1

# Try to access /etc
lftp> ls /etc
# Should fail or show empty directory

# The .. trick should not work either
lftp> cd ../../
lftp> pwd
# Should still show /
```

### Confirming from the Server Side

```bash
# Check what directory the FTP process is chrooted to
# Find the vsftpd process for the connected user
sudo ps aux | grep vsftpd

# On Linux, check the process's root directory
sudo ls -la /proc/$(pgrep -n vsftpd)/root
# Should point to /home/ftpuser1, not /
```

## Common Chroot Errors

### "500 OOPS: vsftpd: refusing to run with writable root inside chroot"

```bash
# Fix: make the chroot root owned by root and not writable by user
sudo chown root:root /home/ftpuser1
sudo chmod 755 /home/ftpuser1
sudo systemctl restart vsftpd
```

### "Login failed: 530 Login incorrect"

```bash
# Check vsftpd logs
sudo tail -30 /var/log/vsftpd.log
sudo tail -30 /var/log/auth.log

# Verify the user exists and can authenticate
id ftpuser1
sudo grep ftpuser1 /etc/passwd
```

### ProFTPD: "Unable to chroot"

```bash
# Check the DefaultRoot path exists
ls -la /srv/ftp/ftpuser1

# Check ProFTPD error log
sudo tail -30 /var/log/proftpd/proftpd.log

# Test ProFTPD config
sudo proftpd --configtest
```

## Security Considerations for Chroot Jails

Chroot is a containment mechanism, not an absolute security boundary. A process running as root inside a chroot can break out of it. Ensure:

1. FTP users are not root and cannot become root inside the jail
2. No setuid binaries exist inside the jail
3. The jail directory and its contents are appropriately owned

```bash
# Search for setuid binaries inside the jail
sudo find /home/ftpuser1 -perm -4000 -type f

# They should not exist; remove any found
```

Chroot jails combined with minimal write permissions and a non-interactive shell (like `/usr/sbin/nologin`) provide solid isolation for FTP users. The user can transfer files to their designated directories and nothing else.
