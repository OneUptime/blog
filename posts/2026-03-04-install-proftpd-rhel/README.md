# How to Install ProFTPD on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, ProFTPD, FTP, File Transfer, Linux

Description: Install and configure ProFTPD on RHEL as an alternative to vsftpd, offering Apache-style configuration and flexible module support for FTP services.

---

ProFTPD is a feature-rich FTP server with an Apache-like configuration syntax. It supports virtual hosts, per-directory access controls, and a modular architecture. This guide covers installation on RHEL.

## Install ProFTPD

```bash
# ProFTPD is available from EPEL
sudo dnf install -y epel-release
sudo dnf install -y proftpd proftpd-utils
```

## Configure ProFTPD

```bash
# Back up the default configuration
sudo cp /etc/proftpd.conf /etc/proftpd.conf.bak

# Create the configuration
sudo tee /etc/proftpd.conf << 'CONF'
# ProFTPD Configuration for RHEL

ServerName          "RHEL FTP Server"
ServerType          standalone
DefaultServer       on
Port                21
Umask               022

# Use system authentication
AuthPAMConfig       proftpd
AuthOrder           mod_auth_pam.c* mod_auth_unix.c

# Disable root login
RootLogin           off

# Chroot users to their home directory
DefaultRoot         ~

# Timeout settings
TimeoutIdle         600
TimeoutNoTransfer   300
TimeoutStalled      300
TimeoutLogin        120

# Max clients
MaxInstances        30
MaxClients          20
MaxClientsPerHost   5

# Logging
SystemLog           /var/log/proftpd/proftpd.log
TransferLog         /var/log/proftpd/xferlog

# Passive mode ports
PassivePorts        30000 30100

# Display messages
DisplayLogin        /etc/proftpd/welcome.msg
DisplayChdir        .message true

# Restrict specific system users from FTP
<Limit LOGIN>
    DenyGroup root wheel
</Limit>

# Global settings
<Global>
    # Do not allow overwriting of files by default
    AllowOverwrite  on

    # Allow resuming uploads
    AllowRetrieveRestart on
    AllowStoreRestart    on
</Global>

# Anonymous FTP (disabled)
# <Anonymous /var/ftp>
#     User  ftp
#     Group ftp
#     UserAlias anonymous ftp
#     <Limit WRITE>
#         DenyAll
#     </Limit>
# </Anonymous>
CONF
```

## Create Welcome Message

```bash
sudo mkdir -p /etc/proftpd
sudo tee /etc/proftpd/welcome.msg << 'MSG'
Welcome to the RHEL FTP Server.
Unauthorized access is prohibited.
MSG
```

## Create FTP Users

```bash
# Create a regular FTP user
sudo useradd -m -s /sbin/nologin ftpuser
sudo passwd ftpuser

# Create upload directory
sudo mkdir -p /home/ftpuser/uploads
sudo chown ftpuser:ftpuser /home/ftpuser/uploads

# Allow nologin shell for FTP
echo "/sbin/nologin" | sudo tee -a /etc/shells
```

## Create Log Directory

```bash
sudo mkdir -p /var/log/proftpd
sudo chown proftpd:proftpd /var/log/proftpd
```

## Start ProFTPD

```bash
# Test the configuration
sudo proftpd -t

# Start and enable the service
sudo systemctl enable --now proftpd

# Check status
sudo systemctl status proftpd
```

## Configure Firewall

```bash
sudo firewall-cmd --permanent --add-service=ftp
sudo firewall-cmd --permanent --add-port=30000-30100/tcp
sudo firewall-cmd --reload
```

## Configure SELinux

```bash
# Allow FTP home directory access
sudo setsebool -P ftp_home_dir 1
sudo setsebool -P ftpd_full_access 1
```

## Enable TLS

```bash
# Generate a certificate
sudo openssl req -x509 -nodes -days 3650 -newkey rsa:4096 \
  -keyout /etc/pki/tls/private/proftpd.key \
  -out /etc/pki/tls/certs/proftpd.crt \
  -subj "/CN=ftp.example.com"

# Add TLS configuration to proftpd.conf
sudo tee -a /etc/proftpd.conf << 'TLSCONF'

# TLS Configuration
<IfModule mod_tls.c>
    TLSEngine               on
    TLSLog                  /var/log/proftpd/tls.log
    TLSProtocol             TLSv1.2 TLSv1.3
    TLSCipherSuite          HIGH:!aNULL:!MD5
    TLSRSACertificateFile   /etc/pki/tls/certs/proftpd.crt
    TLSRSACertificateKeyFile /etc/pki/tls/private/proftpd.key
    TLSRequired             on
    TLSVerifyClient         off
</IfModule>
TLSCONF

# Restart to apply TLS
sudo systemctl restart proftpd
```

## Test the Connection

```bash
# Plain FTP test (if TLS is not required)
ftp localhost

# FTPS test with curl
curl --ftp-ssl -k -u ftpuser:password ftp://localhost/

# FTPS test with lftp
lftp -u ftpuser -e "set ftp:ssl-force true; set ssl:verify-certificate no; ls; quit" ftp://localhost
```

## Useful ProFTPD Commands

```bash
# Check connected users
ftpcount

# Show detailed connection info
ftpwho

# Shut down FTP with a message
ftpshut +5 "Server going down for maintenance"

# Cancel a scheduled shutdown
ftpshut -R
```

ProFTPD's Apache-style configuration and module system make it flexible for complex FTP deployments on RHEL.
