# How to Configure ProFTPD on Ubuntu Server

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, FTP, ProFTPD, Networking, File Transfer

Description: Install and configure ProFTPD on Ubuntu Server with virtual hosts, user authentication, TLS support, and access controls for a flexible FTP service.

---

ProFTPD is an alternative to vsftpd that offers more flexibility through its Apache-style configuration format. Its modular architecture and expressive configuration syntax make it a good choice when you need advanced features like virtual FTP users, per-directory access controls, or complex authentication scenarios.

## Installing ProFTPD

```bash
# Update package lists
sudo apt update

# Install ProFTPD in standalone mode
# The installer will ask whether to run standalone or via inetd - choose standalone
sudo apt install proftpd -y

# Verify the installation
proftpd --version

# Check service status
sudo systemctl status proftpd
```

## Configuration File Structure

ProFTPD's main configuration file is `/etc/proftpd/proftpd.conf`. Additional configuration files can be included from `/etc/proftpd/conf.d/`. The configuration uses a hierarchical block structure similar to Apache:

```bash
# Back up the original configuration
sudo cp /etc/proftpd/proftpd.conf /etc/proftpd/proftpd.conf.bak

sudo nano /etc/proftpd/proftpd.conf
```

## Basic Configuration

A clean, working basic configuration:

```apache
# Server identity
ServerName                      "Ubuntu FTP Server"
ServerType                      standalone
DefaultServer                   on

# Network settings
Port                            21
UseIPv6                         off

# User/group for the server process
User                            proftpd
Group                           nogroup

# Passive mode port range
PassivePorts                    40000 50000

# MaxInstances controls the max number of simultaneous connections
MaxInstances                    30

# Timeout settings
TimeoutNoTransfer               600
TimeoutStalled                  600
TimeoutIdle                     1200

# Log files
SystemLog                       /var/log/proftpd/proftpd.log
TransferLog                     /var/log/proftpd/xferlog

# PID file
PidFile                         /run/proftpd/proftpd.pid

# Default umask (022 = 755 for directories, 644 for files)
Umask                           022

# Allow symlinks within the chroot
AllowSymlinks                   on

# Authentication type
AuthOrder                       mod_auth_pam.c mod_auth_unix.c

# Default root directory (chroot)
DefaultRoot                     ~

# Main access block
<Global>
    AllowOverwrite               on
</Global>

# Default directory permissions
<Directory />
    AllowOverwrite               on
</Directory>
```

## Setting Up User Access Controls

ProFTPD uses `<Limit>` blocks to control what operations are allowed:

```apache
# Allow all authenticated users access but limit anonymous
<Limit LOGIN>
    DenyAll
    # Override with AllowUser or AllowGroup
</Limit>

# Or restrict to specific users
<Limit LOGIN>
    AllowUser ftpuser1
    AllowUser ftpuser2
    AllowGroup ftpusers
    DenyAll
</Limit>
```

## Configuring Directory Access

Use `<Directory>` blocks to apply settings to specific paths:

```apache
# Global settings for all directories
<Directory />
    Options None
    AllowOverwrite on
</Directory>

# Upload directory - allow writes
<Directory /srv/ftp/uploads>
    <Limit WRITE STOR STOU MKD CWD>
        AllowAll
    </Limit>
</Directory>

# Archive directory - read-only
<Directory /srv/ftp/archive>
    <Limit WRITE STOR STOU DELE MKD RMD>
        DenyAll
    </Limit>
    <Limit READ RETR CWD LIST>
        AllowAll
    </Limit>
</Directory>
```

## Adding TLS Encryption

ProFTPD supports FTPS through the `mod_tls` module:

```bash
# Enable the TLS module
sudo nano /etc/proftpd/proftpd.conf
```

Add the TLS module load at the top:

```apache
LoadModule mod_tls.c
```

Generate a certificate or use an existing one:

```bash
# Generate a self-signed certificate
sudo openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
    -keyout /etc/ssl/proftpd/proftpd.key \
    -out /etc/ssl/proftpd/proftpd.crt \
    -subj "/CN=ftp.example.com"

sudo mkdir -p /etc/ssl/proftpd
sudo chmod 600 /etc/ssl/proftpd/proftpd.key
```

Add TLS configuration:

```apache
<IfModule mod_tls.c>
    TLSEngine                   on
    TLSLog                      /var/log/proftpd/tls.log

    # Certificate and key
    TLSRSACertificateFile       /etc/ssl/proftpd/proftpd.crt
    TLSRSACertificateKeyFile    /etc/ssl/proftpd/proftpd.key

    # Require TLS for authentication and data transfers
    TLSRequired                 on

    # Supported TLS protocols
    TLSProtocol                 TLSv1.2 TLSv1.3

    # Cipher list
    TLSCipherSuite              HIGH:!aNULL:!MD5:!RC4

    # Verify client certificates (optional)
    TLSVerifyClient             off

    # Log options
    TLSOptions                  NoCertRequest EnableDiags

    # Allow session reuse (disable if clients have issues)
    TLSRequired                 on
</IfModule>
```

## Setting Up Virtual Users with SQL Authentication

ProFTPD can authenticate users against a database instead of system users:

```bash
# Install ProFTPD with MySQL support
sudo apt install proftpd-mod-mysql mysql-server -y

# Create the database and tables
sudo mysql -u root -p << 'SQL'
CREATE DATABASE proftpd;
USE proftpd;

CREATE TABLE users (
    userid VARCHAR(32) NOT NULL,
    passwd VARCHAR(128) NOT NULL,
    uid INT NOT NULL,
    gid INT NOT NULL,
    homedir VARCHAR(255) NOT NULL,
    shell VARCHAR(255) NOT NULL DEFAULT '/sbin/nologin',
    PRIMARY KEY (userid)
);

CREATE TABLE groups (
    groupname VARCHAR(32) NOT NULL,
    gid INT NOT NULL,
    members VARCHAR(4096),
    PRIMARY KEY (groupname, gid)
);

CREATE USER 'proftpd'@'localhost' IDENTIFIED BY 'db_password_here';
GRANT SELECT ON proftpd.* TO 'proftpd'@'localhost';
FLUSH PRIVILEGES;
SQL
```

Add a virtual user (password stored as SHA1 or MD5 hash):

```bash
# Generate a SHA1 password hash
echo -n "userpassword" | sha1sum

# Insert the user
sudo mysql -u root -p proftpd << 'SQL'
INSERT INTO users (userid, passwd, uid, gid, homedir, shell)
VALUES ('ftpvuser1', SHA1('userpassword'), 2001, 2001, '/srv/ftp/ftpvuser1', '/sbin/nologin');

INSERT INTO groups (groupname, gid, members)
VALUES ('ftpusers', 2001, 'ftpvuser1');
SQL
```

Create the SQL configuration file:

```bash
sudo nano /etc/proftpd/sql.conf
```

```apache
LoadModule mod_sql.c
LoadModule mod_sql_mysql.c

# Database connection settings
SQLBackend              mysql
SQLConnectInfo          proftpd@localhost proftpd db_password_here
SQLAuthTypes            SHA1 Crypt
SQLAuthenticate         users groups

# SQL queries for user lookup
SQLUserInfo             users userid passwd uid gid homedir shell
SQLGroupInfo            groups groupname gid members

# Minimum UID/GID to prevent privilege escalation
SQLMinUserUID           2000
SQLMinUserGID           2000

# Log SQL queries (useful for debugging)
# SQLLog                PASS SELECT * WHERE userid = "%u"
```

Include this file from the main config:

```bash
sudo nano /etc/proftpd/proftpd.conf
```

Add at the bottom:

```apache
Include /etc/proftpd/sql.conf
```

## Configuring Anonymous Access

```apache
# Anonymous FTP (read-only)
<Anonymous /srv/ftp/anonymous>
    User                        ftp
    Group                       nogroup
    UserAlias                   anonymous ftp
    MaxClients                  10

    <Limit LOGIN>
        AllowAll
    </Limit>

    # Deny all write operations for anonymous
    <Limit WRITE>
        DenyAll
    </Limit>

    # Allow listing and downloading
    <Limit READ>
        AllowAll
    </Limit>
</Anonymous>
```

## Testing the Configuration

```bash
# Test configuration syntax
sudo proftpd --configtest

# Or use:
sudo proftpd -t -d5

# If syntax is valid, restart
sudo systemctl restart proftpd

# Check for errors
sudo systemctl status proftpd
sudo tail -f /var/log/proftpd/proftpd.log
```

## Firewall Setup

```bash
# Allow FTP control port
sudo ufw allow 21/tcp

# Allow passive data ports
sudo ufw allow 40000:50000/tcp

sudo ufw status
```

## Connection Limiting

ProFTPD has per-host connection limiting:

```apache
# Limit connections per client
MaxClientsPerHost               3 "Too many connections from %h"

# Limit total connections
MaxClients                      50 "Server at capacity"

# Limit clients per user account
MaxClientsPerUser               2 "Too many sessions for this user"
```

## Logging and Monitoring

```bash
# Monitor the transfer log
sudo tail -f /var/log/proftpd/xferlog

# Monitor the system log
sudo tail -f /var/log/proftpd/proftpd.log

# Enable detailed logging in the config:
# DebugLevel 5
# Trace DEFAULT:10

# Check connected clients
ftpwho

# Kill a specific connection
sudo kill -HUP $(cat /run/proftpd/proftpd.pid)
```

## Hardening ProFTPD

Add these security settings to `/etc/proftpd/proftpd.conf`:

```apache
# Prevent version disclosure
ServerIdent                     off

# Do not display the server type in welcome messages
DisplayLogin                    /etc/proftpd/welcome.txt

# Disable deprecated AUTH methods
AuthPAM                         on

# Prevent directory traversal
DefaultRoot                     ~

# Set max login attempts before lockout
MaxLoginAttempts                3

# Block RFC-1918 addresses for PORT command (prevents FTP bounce attacks)
AllowForeignAddress             off
```

ProFTPD's Apache-style configuration makes complex setups more manageable than with vsftpd's flat configuration format. For simple FTP deployments, vsftpd is easier, but when you need SQL-based virtual users, complex per-directory access controls, or the flexibility of modular configuration, ProFTPD is worth the additional setup time.
