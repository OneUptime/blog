# How to Set Up FTP Chroot Jails with vsftpd on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Vsftpd, FTP, Chroot, Security, Linux

Description: Configure vsftpd chroot jails on RHEL to restrict FTP users to specific directories, preventing them from browsing the entire filesystem.

---

Chroot jails confine FTP users to a specific directory tree. When a user logs in, they see their designated directory as the root filesystem and cannot navigate outside of it. This is essential for secure multi-user FTP servers.

## Install vsftpd

```bash
sudo dnf install -y vsftpd ftp
```

## Configure Global Chroot

The simplest approach is to chroot all local users to their home directories:

```bash
sudo tee /etc/vsftpd/vsftpd.conf << 'CONF'
# Basic settings
anonymous_enable=NO
local_enable=YES
write_enable=YES
local_umask=022

# Chroot ALL local users to their home directory
chroot_local_user=YES

# Allow writing in chroot directory
# vsftpd refuses writable chroot by default for security
allow_writeable_chroot=YES

# Or use a more secure approach: make home non-writable
# and use a writable subdirectory
# allow_writeable_chroot=NO
# (then set home dirs to 555 and create writable subdirs)

# Passive mode
pasv_enable=YES
pasv_min_port=30000
pasv_max_port=30100

# Logging
xferlog_enable=YES
xferlog_file=/var/log/vsftpd.log

# User list
userlist_enable=YES
userlist_deny=NO
userlist_file=/etc/vsftpd/user_list

# PAM
pam_service_name=vsftpd

listen=YES
listen_ipv6=NO
CONF
```

## Selective Chroot with Exception List

To chroot most users but allow some to roam freely:

```bash
# In vsftpd.conf, add:
# chroot_local_user=YES
# chroot_list_enable=YES
# chroot_list_file=/etc/vsftpd/chroot_list

# Users listed in chroot_list are NOT chrooted (they are exceptions)
sudo tee /etc/vsftpd/chroot_list << 'LIST'
adminuser
LIST
```

To do the opposite (chroot only specific users):

```bash
# In vsftpd.conf:
# chroot_local_user=NO
# chroot_list_enable=YES
# chroot_list_file=/etc/vsftpd/chroot_list

# Users listed in chroot_list ARE chrooted
sudo tee /etc/vsftpd/chroot_list << 'LIST'
restricteduser1
restricteduser2
LIST
```

## Secure Chroot Setup (Non-Writable Root)

The most secure approach makes the chroot directory non-writable and uses subdirectories for uploads:

```bash
# Create users with non-writable home directories
sudo useradd -m -s /sbin/nologin ftpuser1
sudo passwd ftpuser1

# Make the home directory non-writable (owned by root)
sudo chown root:root /home/ftpuser1
sudo chmod 755 /home/ftpuser1

# Create writable subdirectories
sudo mkdir -p /home/ftpuser1/uploads /home/ftpuser1/downloads
sudo chown ftpuser1:ftpuser1 /home/ftpuser1/uploads
sudo chown ftpuser1:ftpuser1 /home/ftpuser1/downloads

# Add to vsftpd.conf:
# allow_writeable_chroot=NO
# (This is the default and more secure setting)
```

Add the user to the allowed list:

```bash
echo "ftpuser1" | sudo tee -a /etc/vsftpd/user_list
echo "/sbin/nologin" | sudo tee -a /etc/shells
```

## Custom Chroot Directories

To chroot users to a directory other than their home:

```bash
# Create a shared FTP directory structure
sudo mkdir -p /srv/ftp/user1/uploads
sudo mkdir -p /srv/ftp/user2/uploads

# Set ownership
sudo chown root:root /srv/ftp/user1 /srv/ftp/user2
sudo chmod 755 /srv/ftp/user1 /srv/ftp/user2
sudo chown ftpuser1:ftpuser1 /srv/ftp/user1/uploads
sudo chown ftpuser2:ftpuser2 /srv/ftp/user2/uploads

# In vsftpd.conf, add:
# user_sub_token=$USER
# local_root=/srv/ftp/$USER
```

## SELinux Configuration

```bash
# Allow vsftpd to access custom directories
sudo setsebool -P ftp_home_dir 1

# If using non-standard directories
sudo semanage fcontext -a -t public_content_rw_t "/srv/ftp(/.*)?"
sudo restorecon -Rv /srv/ftp
```

## Test the Chroot Jail

```bash
# Start vsftpd
sudo systemctl restart vsftpd

# Connect and try to escape the chroot
ftp localhost
# Login as ftpuser1
# Try: cd /
# Try: cd /etc
# Both should keep you within the chroot directory

# Verify with curl
curl -u ftpuser1:password ftp://localhost/
# Should only show contents of the chroot directory
```

## Verify the Jail is Working

```bash
# Connect and attempt to list the real root
ftp -n localhost << 'FTP'
user ftpuser1 password
pwd
cd /
pwd
ls
quit
FTP

# The 'pwd' output should show '/' but you should only see
# the contents of the chroot directory, not the real root
```

## Firewall

```bash
sudo firewall-cmd --permanent --add-service=ftp
sudo firewall-cmd --permanent --add-port=30000-30100/tcp
sudo firewall-cmd --reload
```

Chroot jails are a fundamental security measure for any FTP server handling multiple users. Combined with TLS encryption, they provide a solid foundation for secure file transfers on RHEL.
