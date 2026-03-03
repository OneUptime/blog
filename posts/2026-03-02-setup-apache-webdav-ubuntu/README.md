# How to Set Up Apache with WebDAV on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Apache, WebDAV, File Sharing, Web Server

Description: Configure Apache WebDAV on Ubuntu to create an HTTP-based file sharing server that can be mounted as a network drive on Linux, macOS, and Windows.

---

WebDAV (Web Distributed Authoring and Versioning) extends HTTP with methods for creating, moving, copying, and locking files on a remote server. It's supported natively by Windows, macOS, and Linux file managers, making it a practical way to share files without installing additional client software.

## What WebDAV Adds to HTTP

Standard HTTP allows reading (GET) and writing (PUT). WebDAV adds:

- `PROPFIND` - list directory contents
- `MKCOL` - create a collection (directory)
- `COPY` / `MOVE` - copy and move files
- `DELETE` - delete files
- `LOCK` / `UNLOCK` - locking for concurrent editing

This makes it suitable for collaborative editing tools (LibreOffice, Microsoft Office) and remote file management.

## Prerequisites

```bash
# Update packages
sudo apt update

# Install Apache if not already installed
sudo apt install apache2

# Verify Apache is running
sudo systemctl status apache2
```

## Enabling Required Modules

WebDAV support in Apache requires three modules:

```bash
# Enable WebDAV modules
sudo a2enmod dav
sudo a2enmod dav_fs    # Stores DAV properties on the filesystem
sudo a2enmod dav_lock  # Locking support

# Also enable auth modules for access control
sudo a2enmod auth_basic
sudo a2enmod authn_file

# Reload Apache
sudo systemctl reload apache2

# Verify modules are loaded
sudo apache2ctl -M | grep dav
```

## Creating the WebDAV Directory

```bash
# Create the directory that WebDAV will serve
sudo mkdir -p /var/www/webdav

# Set ownership to Apache's user
sudo chown www-data:www-data /var/www/webdav

# Set permissions
sudo chmod 755 /var/www/webdav

# Create the DAV lock database directory
sudo mkdir -p /var/lib/dav
sudo chown www-data:www-data /var/lib/dav
```

## Configuring a VirtualHost for WebDAV

### Basic HTTP WebDAV (for testing or internal use only)

```bash
sudo nano /etc/apache2/sites-available/webdav.conf
```

```apache
<VirtualHost *:80>
    ServerName webdav.example.com
    DocumentRoot /var/www/webdav

    # Enable DAV
    Alias /webdav /var/www/webdav

    <Directory /var/www/webdav>
        # Enable WebDAV methods
        Dav On

        # Authentication
        AuthType Basic
        AuthName "WebDAV Storage"
        AuthUserFile /etc/apache2/webdav.htpasswd

        # Require authentication for all access
        Require valid-user

        # Allow all HTTP methods (GET, PUT, DELETE, etc.)
        # This is needed for WebDAV to work fully
        <LimitExcept OPTIONS>
            Require valid-user
        </LimitExcept>
    </Directory>

    # DAV lock database
    DavLockDB /var/lib/dav/lockdb

    ErrorLog ${APACHE_LOG_DIR}/webdav-error.log
    CustomLog ${APACHE_LOG_DIR}/webdav-access.log combined
</VirtualHost>
```

### HTTPS WebDAV (Recommended for Production)

```bash
sudo nano /etc/apache2/sites-available/webdav-ssl.conf
```

```apache
<VirtualHost *:443>
    ServerName webdav.example.com
    DocumentRoot /var/www/html

    # SSL Configuration
    SSLEngine on
    SSLCertificateFile /etc/letsencrypt/live/webdav.example.com/fullchain.pem
    SSLCertificateKeyFile /etc/letsencrypt/live/webdav.example.com/privkey.pem

    # WebDAV location
    Alias /files /var/www/webdav

    <Location /files>
        Dav On

        # Authentication
        AuthType Basic
        AuthName "WebDAV File Storage"
        AuthUserFile /etc/apache2/webdav.htpasswd
        Require valid-user

        # Security: restrict some potentially dangerous methods if needed
        # DAV needs all these methods, so only restrict if you have a reason
        <LimitExcept GET POST OPTIONS>
            Require valid-user
        </LimitExcept>
    </Location>

    # DAV lock database location
    DavLockDB /var/lib/dav/lockdb

    ErrorLog ${APACHE_LOG_DIR}/webdav-ssl-error.log
    CustomLog ${APACHE_LOG_DIR}/webdav-ssl-access.log combined

    # Headers for better client compatibility
    Header always set MS-Author-Via "DAV"
</VirtualHost>

# Redirect HTTP to HTTPS
<VirtualHost *:80>
    ServerName webdav.example.com
    Redirect permanent / https://webdav.example.com/
</VirtualHost>
```

## Setting Up User Authentication

```bash
# Create the password file and add first user
sudo htpasswd -c /etc/apache2/webdav.htpasswd alice
# Enter password when prompted

# Add more users
sudo htpasswd /etc/apache2/webdav.htpasswd bob

# Secure the password file
sudo chmod 640 /etc/apache2/webdav.htpasswd
sudo chown root:www-data /etc/apache2/webdav.htpasswd

# List users
sudo cut -d: -f1 /etc/apache2/webdav.htpasswd
```

## Enable and Test the Configuration

```bash
# Enable the site
sudo a2ensite webdav-ssl.conf

# Enable SSL module
sudo a2enmod ssl

# Test configuration
sudo apache2ctl configtest

# Reload Apache
sudo systemctl reload apache2

# Test with curl
curl -u alice:password https://webdav.example.com/files/

# Test PROPFIND (directory listing)
curl -u alice:password -X PROPFIND https://webdav.example.com/files/ \
  -H "Depth: 1" -H "Content-Type: application/xml"
```

## Firewall Rules

```bash
# Allow HTTP and HTTPS
sudo ufw allow 'Apache Full'

# Verify
sudo ufw status
```

## Connecting Clients to WebDAV

### Linux (Nautilus / GNOME Files)

1. Open Files (Nautilus)
2. Press `Ctrl+L` to open the location bar
3. Type: `davs://webdav.example.com/files/` (use `dav://` for HTTP)
4. Enter credentials when prompted

**From the terminal:**

```bash
# Mount WebDAV using davfs2
sudo apt install davfs2

# Create a mount point
sudo mkdir -p /mnt/webdav

# Mount it
sudo mount -t davfs https://webdav.example.com/files/ /mnt/webdav
# Enter username and password when prompted

# List files
ls /mnt/webdav

# Unmount
sudo umount /mnt/webdav
```

**Permanent mount in /etc/fstab:**

```bash
# Add credentials to davfs2 secrets file
sudo nano /etc/davfs2/secrets
# Add: https://webdav.example.com/files/ alice yourpassword

sudo chmod 600 /etc/davfs2/secrets

# Add to /etc/fstab
echo "https://webdav.example.com/files/ /mnt/webdav davfs defaults,user,noauto 0 0" | sudo tee -a /etc/fstab

# Mount using fstab entry
sudo mount /mnt/webdav
```

### macOS

1. Finder > Go > Connect to Server (Cmd+K)
2. Enter: `https://webdav.example.com/files/`
3. Click Connect and enter credentials

**From terminal:**

```bash
# macOS built-in mount
mount_webdav https://webdav.example.com/files/ /mnt/webdav
```

### Windows

1. Open File Explorer
2. Right-click on "This PC" and select "Map network drive"
3. Enter the WebDAV URL: `https://webdav.example.com/files/`
4. Check "Connect using different credentials"
5. Enter username and password

For HTTP WebDAV (not HTTPS), Windows requires a registry change to allow non-HTTPS:

```text
HKEY_LOCAL_MACHINE\SYSTEM\CurrentControlSet\Services\WebClient\Parameters
BasicAuthLevel = 2
```

## Per-User WebDAV Directories

Give each user their own private directory:

```bash
# Create per-user directories
sudo mkdir -p /var/www/webdav/users/alice
sudo mkdir -p /var/www/webdav/users/bob
sudo chown www-data:www-data /var/www/webdav/users/alice
sudo chown www-data:www-data /var/www/webdav/users/bob
```

```apache
<VirtualHost *:443>
    ServerName webdav.example.com

    # Each user only sees their directory
    # Using mod_authn_file with user-specific directory
    Alias /myfiles /var/www/webdav/users

    <Location /myfiles>
        Dav On

        AuthType Basic
        AuthName "Personal Files"
        AuthUserFile /etc/apache2/webdav.htpasswd

        # Map URL to user's directory
        # /myfiles/alice/ -> /var/www/webdav/users/alice/
        Require valid-user
    </Location>
</VirtualHost>
```

For stricter user isolation where each user can only access their own files, use `mod_authnz_ldap` or a custom script with `AuthzSendForbiddenOnFailure`.

## Managing Files via Command Line

```bash
# Upload a file via WebDAV using curl
curl -u alice:password -T /local/file.txt https://webdav.example.com/files/

# Create a directory
curl -u alice:password -X MKCOL https://webdav.example.com/files/documents/

# Download a file
curl -u alice:password https://webdav.example.com/files/file.txt -o file.txt

# Delete a file
curl -u alice:password -X DELETE https://webdav.example.com/files/file.txt

# List directory (PROPFIND)
curl -u alice:password -X PROPFIND https://webdav.example.com/files/ \
  -H "Depth: 1"

# Copy a file
curl -u alice:password -X COPY \
  -H "Destination: https://webdav.example.com/files/backup/file.txt" \
  https://webdav.example.com/files/file.txt
```

## Troubleshooting

### 405 Method Not Allowed

The DAV module isn't loaded or the Dav directive is missing:

```bash
sudo apache2ctl -M | grep dav
# If missing: sudo a2enmod dav dav_fs dav_lock
```

### 403 Forbidden When Uploading

Check directory permissions and ownership:

```bash
ls -la /var/www/webdav/
# Should be owned by www-data
sudo chown -R www-data:www-data /var/www/webdav/
```

### Locking Errors

The lock database directory must be writable by Apache:

```bash
ls -la /var/lib/dav/
sudo chown www-data:www-data /var/lib/dav/

# Check for stale locks
sudo ls -la /var/lib/dav/
# Remove lockdb files if they're corrupted and causing errors
```

WebDAV on Apache is a practical solution for internal file sharing without requiring specialized client software. Using it over HTTPS with authentication covers the majority of use cases, from simple file sharing to collaborative document editing.
