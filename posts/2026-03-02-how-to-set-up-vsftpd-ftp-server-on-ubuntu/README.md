# How to Set Up vsftpd FTP Server on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, FTP, vsftpd, Networking, File Transfer

Description: Install and configure vsftpd as a secure FTP server on Ubuntu with user authentication, chroot jails, passive mode settings, and firewall configuration.

---

vsftpd (Very Secure FTP Daemon) is the standard FTP server on Ubuntu. It is lightweight, well-maintained, and designed with security as a priority. Despite FTP being an older protocol, vsftpd is still commonly deployed for legacy application support, automated file transfers, and environments where simpler alternatives are required.

## Installing vsftpd

```bash
# Update package lists and install vsftpd
sudo apt update
sudo apt install vsftpd -y

# Check the installed version
vsftpd -v 2>&1 | head -1

# Verify it is running
sudo systemctl status vsftpd
```

## Backing Up the Default Configuration

```bash
# Always back up the original configuration before modifying
sudo cp /etc/vsftpd.conf /etc/vsftpd.conf.bak
```

## Basic Configuration

Edit the main configuration file:

```bash
sudo nano /etc/vsftpd.conf
```

A typical secure configuration for local user access:

```ini
# Standalone server mode
listen=YES
listen_ipv6=NO

# Disable anonymous access
anonymous_enable=NO

# Allow local Linux users to log in
local_enable=YES

# Allow users to upload files
write_enable=YES

# Default umask for uploaded files (022 = 755 permissions)
local_umask=022

# Show the server's real hostname in greeting messages
ftpd_banner=Welcome to FTP Server

# Chroot users to their home directories (prevents directory traversal)
chroot_local_user=YES

# Required when chroot_local_user=YES to avoid security error
# when the chroot directory is writable
allow_writeable_chroot=YES

# Use local time for directory listings
use_localtime=YES

# Log file location
xferlog_enable=YES
xferlog_file=/var/log/vsftpd.log
xferlog_std_format=YES

# Session logging
syslog_enable=YES
log_ftp_protocol=YES

# Connection limits
max_clients=50
max_per_ip=5

# Idle session timeout (10 minutes)
idle_session_timeout=600

# Data connection timeout (2 minutes)
data_connection_timeout=120
```

## Configuring Passive Mode

FTP has two transfer modes: active and passive. Active mode requires the server to initiate a connection back to the client, which breaks through NAT and most firewalls. Passive mode has the client initiate all connections and is almost always the right choice.

```ini
# Enable passive mode
pasv_enable=YES

# Passive mode port range (these ports must be open in the firewall)
pasv_min_port=40000
pasv_max_port=50000

# If the server is behind NAT, set the public IP address
# pasv_address=203.0.113.10
```

Add this to `/etc/vsftpd.conf`.

## Setting Up the Firewall

```bash
# Allow FTP control port
sudo ufw allow 21/tcp

# Allow passive mode ports
sudo ufw allow 40000:50000/tcp

# Check the status
sudo ufw status
```

## Creating FTP Users

For each user who needs FTP access, create a system user and set up their home directory:

```bash
# Create a new FTP user
sudo useradd -m -s /bin/bash ftpuser1

# Set the password
sudo passwd ftpuser1

# Create an upload subdirectory (since home dir must not be writable
# when chroot is active without allow_writeable_chroot)
sudo mkdir -p /home/ftpuser1/uploads
sudo chown ftpuser1:ftpuser1 /home/ftpuser1/uploads
```

If you set `allow_writeable_chroot=NO` (safer), the chroot directory (home dir) must not be writable by the user:

```bash
# Make the home directory owned by root (not writable by user)
sudo chown root:root /home/ftpuser1
sudo chmod 755 /home/ftpuser1

# The user can still write to subdirectories
sudo mkdir -p /home/ftpuser1/uploads
sudo chown ftpuser1:ftpuser1 /home/ftpuser1/uploads
sudo chmod 755 /home/ftpuser1/uploads
```

Then change `allow_writeable_chroot=NO` in vsftpd.conf.

## Restricting Users with a Userlist

Control which users can log in with the userlist feature:

```bash
sudo nano /etc/vsftpd.conf
```

```ini
# Enable the user list feature
userlist_enable=YES
userlist_file=/etc/vsftpd.userlist

# When YES: userlist is a deny list (listed users cannot log in)
# When NO: userlist is an allow list (only listed users can log in)
userlist_deny=NO
```

Create the allow list:

```bash
sudo nano /etc/vsftpd.userlist
```

```text
ftpuser1
ftpuser2
backupuser
```

Only users in this file can log in. This is a good way to explicitly allow FTP access without affecting the main system user database.

## Applying the Configuration

```bash
# Restart vsftpd to apply changes
sudo systemctl restart vsftpd

# Enable vsftpd to start at boot
sudo systemctl enable vsftpd

# Check for configuration errors
sudo systemctl status vsftpd
sudo journalctl -u vsftpd -n 30
```

## Testing the FTP Server

Test from the command line:

```bash
# Install the FTP client
sudo apt install ftp -y

# Connect to the server
ftp localhost

# Or use lftp for better passive mode support
sudo apt install lftp -y
lftp -u ftpuser1 localhost

# Test basic operations
lftp> ls
lftp> put /etc/hostname test-upload.txt
lftp> ls
lftp> get test-upload.txt /tmp/test-download.txt
lftp> quit
```

From a remote machine:

```bash
lftp -u ftpuser1 192.168.1.50

# Use passive mode explicitly (should be default with lftp)
lftp> set ftp:passive-mode true
lftp> ls
```

## Monitoring vsftpd

```bash
# Watch connections in real time
sudo tail -f /var/log/vsftpd.log

# Check active connections
sudo ss -tnp | grep vsftpd

# Count connections
sudo ss -tnp | grep ':21' | wc -l

# View transfer log
sudo cat /var/log/vsftpd.log | tail -50
```

The vsftpd log format:

```text
Fri Mar 01 10:23:45 2026 [pid 12345] CONNECT: Client "192.168.1.100"
Fri Mar 01 10:23:46 2026 [pid 12345] OK LOGIN: Client "192.168.1.100", "ftpuser1"
Fri Mar 01 10:23:50 2026 [pid 12345] OK UPLOAD: Client "192.168.1.100", "/home/ftpuser1/uploads/report.csv"
```

## Limiting Bandwidth

vsftpd can limit upload and download speeds per connection:

```ini
# In /etc/vsftpd.conf

# Limit download speed (bytes per second, 0 = unlimited)
anon_max_rate=0
local_max_rate=1048576  # 1 MB/s per local user connection
```

## Virtual Users with PAM

For environments where you want FTP users that are not system users, configure virtual users with PAM:

```bash
# Install db utilities
sudo apt install db-util -y

# Create virtual user file
sudo nano /tmp/virtual-users.txt
```

```text
ftpvuser1
passwordfor1
ftpvuser2
passwordfor2
```

```bash
# Create the Berkeley DB from the text file
sudo db_load -T -t hash -f /tmp/virtual-users.txt /etc/vsftpd/virtual-users.db
sudo chmod 600 /etc/vsftpd/virtual-users.db
sudo rm /tmp/virtual-users.txt  # remove plaintext passwords

# Create PAM configuration for vsftpd virtual users
sudo nano /etc/pam.d/vsftpd-virtual
```

```text
auth    required  pam_userdb.so db=/etc/vsftpd/virtual-users
account required  pam_userdb.so db=/etc/vsftpd/virtual-users
```

```bash
sudo nano /etc/vsftpd.conf
```

Add or modify:

```ini
# Use virtual users via PAM
pam_service_name=vsftpd-virtual
guest_enable=YES
guest_username=ftpguest  # system user that virtual users map to

# Per-user directory configuration
user_config_dir=/etc/vsftpd/users
```

```bash
# Create the system user virtual FTP users map to
sudo useradd -d /srv/ftp -s /sbin/nologin ftpguest

# Create per-user directories
sudo mkdir -p /etc/vsftpd/users
sudo nano /etc/vsftpd/users/ftpvuser1
```

```ini
# Per-user configuration for ftpvuser1
local_root=/srv/ftp/ftpvuser1
write_enable=YES
```

```bash
sudo mkdir -p /srv/ftp/ftpvuser1
sudo chown ftpguest:ftpguest /srv/ftp/ftpvuser1
sudo systemctl restart vsftpd
```

vsftpd is a solid, production-ready FTP server. For new deployments, consider pairing it with TLS encryption (covered in a separate guide) to avoid transmitting credentials in plaintext over the network.
