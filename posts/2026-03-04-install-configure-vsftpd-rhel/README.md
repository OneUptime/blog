# How to Install and Configure vsftpd on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Vsftpd, FTP, File Transfer, Linux

Description: Install and configure vsftpd (Very Secure FTP Daemon) on RHEL to set up a secure FTP server for file transfers with proper user access controls.

---

vsftpd is the default FTP server on RHEL, designed with security in mind. This guide covers a basic installation and configuration for serving files to authenticated users.

## Install vsftpd

```bash
# Install vsftpd and FTP client for testing
sudo dnf install -y vsftpd ftp
```

## Configure vsftpd

```bash
# Back up the default configuration
sudo cp /etc/vsftpd/vsftpd.conf /etc/vsftpd/vsftpd.conf.bak

# Create the configuration
sudo tee /etc/vsftpd/vsftpd.conf << 'CONF'
# Disable anonymous access
anonymous_enable=NO

# Allow local users to log in
local_enable=YES

# Allow file uploads
write_enable=YES

# Set the default umask for uploaded files
local_umask=022

# Enable logging
xferlog_enable=YES
xferlog_std_format=YES
xferlog_file=/var/log/vsftpd.log

# Display a banner on connection
ftpd_banner=Welcome to the RHEL FTP Server

# Restrict users to their home directories
chroot_local_user=YES
allow_writeable_chroot=YES

# Use local time instead of GMT
use_localtime=YES

# Listen on IPv4
listen=YES
listen_ipv6=NO

# PAM authentication
pam_service_name=vsftpd

# User list configuration
userlist_enable=YES
userlist_deny=NO
userlist_file=/etc/vsftpd/user_list

# Passive mode configuration (important for firewalls)
pasv_enable=YES
pasv_min_port=30000
pasv_max_port=30100
pasv_address=YOUR_SERVER_IP

# Connection settings
max_clients=50
max_per_ip=5
idle_session_timeout=300
data_connection_timeout=120
CONF
```

## Create FTP Users

```bash
# Create a dedicated FTP user
sudo useradd -m -s /sbin/nologin ftpuser
sudo passwd ftpuser

# Add the user to the allowed user list
echo "ftpuser" | sudo tee /etc/vsftpd/user_list

# Allow the nologin shell for FTP access
echo "/sbin/nologin" | sudo tee -a /etc/shells

# Create an upload directory
sudo mkdir -p /home/ftpuser/uploads
sudo chown ftpuser:ftpuser /home/ftpuser/uploads
```

## Start vsftpd

```bash
sudo systemctl enable --now vsftpd

# Verify it is running
sudo systemctl status vsftpd
```

## Configure the Firewall

```bash
# Allow FTP and passive mode ports
sudo firewall-cmd --permanent --add-service=ftp
sudo firewall-cmd --permanent --add-port=30000-30100/tcp
sudo firewall-cmd --reload
```

## Configure SELinux

```bash
# Allow FTP to access home directories
sudo setsebool -P ftp_home_dir 1

# Allow FTP to read/write files
sudo setsebool -P ftpd_full_access 1

# If using non-standard directories
# sudo semanage fcontext -a -t public_content_rw_t "/data/ftp(/.*)?"
# sudo restorecon -Rv /data/ftp
```

## Test the FTP Server

```bash
# Connect from the local machine
ftp localhost
# Enter username and password

# Or use curl
curl -u ftpuser:password ftp://localhost/

# Upload a file
curl -T testfile.txt -u ftpuser:password ftp://localhost/uploads/

# Download a file
curl -u ftpuser:password ftp://localhost/uploads/testfile.txt -o downloaded.txt
```

## Monitor FTP Activity

```bash
# Watch the transfer log
sudo tail -f /var/log/vsftpd.log

# Check active connections
ss -tnp | grep vsftpd
```

## Restrict Users to Specific Directories

```bash
# To restrict specific users to a directory other than home:
# Add to vsftpd.conf:
# user_sub_token=$USER
# local_root=/data/ftp/$USER

# Create the directories
sudo mkdir -p /data/ftp/ftpuser/uploads
sudo chown ftpuser:ftpuser /data/ftp/ftpuser/uploads
```

vsftpd provides a reliable and secure FTP service on RHEL. For production use, always enable TLS encryption to protect credentials and data in transit.
