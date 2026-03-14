# How to Set Up vsftpd with Virtual Users on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Vsftpd, FTP, Virtual Users, PAM, Security, Linux

Description: Configure vsftpd on RHEL with virtual users stored in a Berkeley DB file, keeping FTP accounts separate from system users for better security.

---

Virtual users in vsftpd exist only for FTP purposes, separate from system user accounts. This improves security because FTP credentials do not correspond to system login accounts.

## Install Prerequisites

```bash
# Install vsftpd and the Berkeley DB utilities
sudo dnf install -y vsftpd libdb-utils
```

## Create Virtual User Database

```bash
# Create a plain-text file with username/password pairs
# Format: odd lines = username, even lines = password
sudo tee /etc/vsftpd/virtual_users.txt << 'USERS'
webadmin
SecurePass123
uploaduser
UploadPass456
readonly
ReadOnlyPass789
USERS

# Generate the Berkeley DB file from the text file
sudo db_load -T -t hash -f /etc/vsftpd/virtual_users.txt /etc/vsftpd/virtual_users.db

# Secure the files
sudo chmod 600 /etc/vsftpd/virtual_users.txt /etc/vsftpd/virtual_users.db
```

## Create a PAM Configuration

```bash
# Create a PAM service for vsftpd virtual users
sudo tee /etc/pam.d/vsftpd-virtual << 'PAM'
auth    required    pam_userdb.so   db=/etc/vsftpd/virtual_users
account required    pam_userdb.so   db=/etc/vsftpd/virtual_users
PAM
```

## Create a System User for Virtual Users

```bash
# All virtual users will map to this single system user
sudo useradd -m -d /var/ftp/virtual -s /sbin/nologin vsftpd_virtual
sudo chmod 755 /var/ftp/virtual
```

## Create Virtual User Home Directories

```bash
# Create individual directories for each virtual user
sudo mkdir -p /var/ftp/virtual/webadmin/uploads
sudo mkdir -p /var/ftp/virtual/uploaduser/uploads
sudo mkdir -p /var/ftp/virtual/readonly

# Set ownership
sudo chown -R vsftpd_virtual:vsftpd_virtual /var/ftp/virtual
```

## Configure vsftpd

```bash
sudo tee /etc/vsftpd/vsftpd.conf << 'CONF'
# Disable anonymous access
anonymous_enable=NO

# Allow local users (needed for virtual user mapping)
local_enable=YES
write_enable=YES

# Use the virtual user PAM service
pam_service_name=vsftpd-virtual

# Enable virtual users
guest_enable=YES
guest_username=vsftpd_virtual

# Map virtual users to their home directories
user_sub_token=$USER
local_root=/var/ftp/virtual/$USER

# Chroot virtual users to their directories
chroot_local_user=YES
allow_writeable_chroot=YES

# Virtual users get local user privileges
virtual_use_local_privs=YES

# Per-user configuration directory
user_config_dir=/etc/vsftpd/user_conf

# Passive mode
pasv_enable=YES
pasv_min_port=30000
pasv_max_port=30100

# Logging
xferlog_enable=YES
xferlog_file=/var/log/vsftpd.log

# Security
local_umask=022
listen=YES
listen_ipv6=NO

ftpd_banner=Welcome to FTP Server
CONF
```

## Create Per-User Configurations

```bash
# Create the per-user configuration directory
sudo mkdir -p /etc/vsftpd/user_conf

# Configuration for webadmin - full access
sudo tee /etc/vsftpd/user_conf/webadmin << 'USERCONF'
write_enable=YES
local_root=/var/ftp/virtual/webadmin
USERCONF

# Configuration for uploaduser - upload only
sudo tee /etc/vsftpd/user_conf/uploaduser << 'USERCONF'
write_enable=YES
local_root=/var/ftp/virtual/uploaduser
USERCONF

# Configuration for readonly - read only
sudo tee /etc/vsftpd/user_conf/readonly << 'USERCONF'
write_enable=NO
local_root=/var/ftp/virtual/readonly
USERCONF
```

## Start vsftpd

```bash
sudo systemctl enable --now vsftpd
```

## Configure Firewall and SELinux

```bash
# Firewall
sudo firewall-cmd --permanent --add-service=ftp
sudo firewall-cmd --permanent --add-port=30000-30100/tcp
sudo firewall-cmd --reload

# SELinux
sudo setsebool -P ftpd_full_access 1
sudo chcon -R -t public_content_rw_t /var/ftp/virtual
```

## Test Virtual Users

```bash
# Test webadmin (should have full access)
curl -u webadmin:SecurePass123 ftp://localhost/
curl -T testfile.txt -u webadmin:SecurePass123 ftp://localhost/uploads/

# Test readonly (should not be able to upload)
curl -u readonly:ReadOnlyPass789 ftp://localhost/
curl -T testfile.txt -u readonly:ReadOnlyPass789 ftp://localhost/
# Upload should fail

# Test with an invalid user
curl -u fakeuser:fakepass ftp://localhost/
# Should fail with authentication error
```

## Add New Virtual Users

```bash
# Edit the text file and regenerate the database
echo -e "newuser\nNewPass123" | sudo tee -a /etc/vsftpd/virtual_users.txt
sudo db_load -T -t hash -f /etc/vsftpd/virtual_users.txt /etc/vsftpd/virtual_users.db

# Create the user directory
sudo mkdir -p /var/ftp/virtual/newuser/uploads
sudo chown -R vsftpd_virtual:vsftpd_virtual /var/ftp/virtual/newuser

# No restart needed - PAM reads the DB on each authentication
```

Virtual users keep your FTP accounts completely isolated from system accounts, reducing the attack surface of your RHEL server.
