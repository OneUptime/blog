# How to Set Up WebDAV File Sharing on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, WebDAV, File Sharing, Apache, NGINX

Description: Complete guide to setting up a WebDAV server on Ubuntu using Apache or Nginx, with authentication, SSL, and client configuration for Linux, Windows, and macOS.

---

WebDAV (Web Distributed Authoring and Versioning) is an extension of HTTP that allows clients to read, write, and manage files on a remote server through a standard web connection. It is supported natively by Windows Explorer, macOS Finder, and most Linux file managers, making it a practical choice for self-hosted file sharing without installing additional client software.

## Choosing Between Apache and Nginx

Apache has built-in WebDAV support through the `mod_dav` and `mod_dav_fs` modules. Nginx does not have native WebDAV support - it requires the third-party `nginx-extras` package or a separate DAV server.

This guide covers Apache (recommended for simplicity) and briefly covers the Nginx approach.

## Setting Up WebDAV with Apache

### Install Apache

```bash
# Install Apache and required modules
sudo apt update
sudo apt install apache2 -y

# Enable WebDAV modules
sudo a2enmod dav
sudo a2enmod dav_fs
sudo a2enmod auth_basic
sudo a2enmod authn_file

# Restart Apache
sudo systemctl restart apache2
```

### Create WebDAV Directory

```bash
# Create a directory for WebDAV files
sudo mkdir -p /var/webdav/files

# Set ownership to the Apache user
sudo chown -R www-data:www-data /var/webdav

# Set permissions
sudo chmod 750 /var/webdav/files

# Create a directory for DAV lock files
sudo mkdir -p /var/lib/dav
sudo chown www-data:www-data /var/lib/dav
```

### Create the Apache WebDAV Configuration

```bash
sudo nano /etc/apache2/sites-available/webdav.conf
```

```apache
# WebDAV virtual host configuration
<VirtualHost *:80>
    ServerName webdav.example.com

    # Document root (not used directly for WebDAV)
    DocumentRoot /var/www/html

    # WebDAV location
    Alias /webdav /var/webdav/files
    <Directory /var/webdav/files>
        Options Indexes
        # DAV filesystem module
        DAV On

        # Basic authentication
        AuthType Basic
        AuthName "WebDAV Access"
        AuthUserFile /etc/apache2/webdav.passwd

        # Require valid user for all methods
        Require valid-user
    </Directory>

    # Lock database location (must be outside the WebDAV root)
    DavLockDB /var/lib/dav/lockdb

    ErrorLog ${APACHE_LOG_DIR}/webdav_error.log
    CustomLog ${APACHE_LOG_DIR}/webdav_access.log combined
</VirtualHost>
```

### Create User Authentication

```bash
# Create the password file and add the first user
sudo htpasswd -c /etc/apache2/webdav.passwd alice

# Add additional users (omit -c to append)
sudo htpasswd /etc/apache2/webdav.passwd bob

# Secure the password file
sudo chmod 640 /etc/apache2/webdav.passwd
sudo chown root:www-data /etc/apache2/webdav.passwd
```

### Enable the Site

```bash
# Enable the WebDAV site
sudo a2ensite webdav.conf

# Disable the default site if not needed
sudo a2dissite 000-default.conf

# Test configuration
sudo apache2ctl configtest

# Reload Apache
sudo systemctl reload apache2
```

### Configure the Firewall

```bash
sudo ufw allow 80/tcp
sudo ufw reload
```

## Adding HTTPS with Let's Encrypt

WebDAV over plain HTTP sends credentials in base64 (easily decoded). Always use HTTPS in production:

```bash
# Install Certbot for Apache
sudo apt install certbot python3-certbot-apache -y

# Obtain and install a certificate (replaces your HTTP config)
sudo certbot --apache -d webdav.example.com

# Certbot automatically redirects HTTP to HTTPS and renews certificates
```

Manual SSL configuration if you already have certificates:

```apache
<VirtualHost *:443>
    ServerName webdav.example.com

    SSLEngine on
    SSLCertificateFile /etc/letsencrypt/live/webdav.example.com/fullchain.pem
    SSLCertificateKeyFile /etc/letsencrypt/live/webdav.example.com/privkey.pem

    Alias /webdav /var/webdav/files
    <Directory /var/webdav/files>
        DAV On
        AuthType Basic
        AuthName "WebDAV"
        AuthUserFile /etc/apache2/webdav.passwd
        Require valid-user
    </Directory>

    DavLockDB /var/lib/dav/lockdb
</VirtualHost>
```

## Setting Up Per-User Directories

For multi-user setups where each user has their own space:

```bash
# Create user directories
sudo mkdir -p /var/webdav/users/alice
sudo mkdir -p /var/webdav/users/bob
sudo chown www-data:www-data /var/webdav/users/alice /var/webdav/users/bob
```

```apache
# Per-user WebDAV directories
Alias /webdav/alice /var/webdav/users/alice
<Directory /var/webdav/users/alice>
    DAV On
    AuthType Basic
    AuthName "Alice's WebDAV"
    AuthUserFile /etc/apache2/webdav.passwd
    Require user alice
</Directory>

Alias /webdav/bob /var/webdav/users/bob
<Directory /var/webdav/users/bob>
    DAV On
    AuthType Basic
    AuthName "Bob's WebDAV"
    AuthUserFile /etc/apache2/webdav.passwd
    Require user bob
</Directory>
```

## Nginx WebDAV with nginx-extras

```bash
# Install nginx with WebDAV support
sudo apt install nginx-extras -y

sudo nano /etc/nginx/sites-available/webdav
```

```nginx
server {
    listen 80;
    server_name webdav.example.com;

    root /var/webdav/files;
    index index.html;

    # WebDAV configuration
    location / {
        # Enable all WebDAV methods
        dav_methods PUT DELETE MKCOL COPY MOVE;

        # Extended methods for full WebDAV compliance
        dav_ext_methods PROPFIND OPTIONS;

        # Allow creating directories automatically
        create_full_put_path on;

        # Set access permissions
        dav_access user:rw group:rw all:r;

        # Authentication
        auth_basic "WebDAV Access";
        auth_basic_user_file /etc/nginx/webdav.passwd;

        # Allow large file uploads (adjust as needed)
        client_max_body_size 1G;
    }
}
```

```bash
# Create password file for Nginx WebDAV
sudo apt install apache2-utils -y
sudo htpasswd -c /etc/nginx/webdav.passwd alice

# Enable site
sudo ln -s /etc/nginx/sites-available/webdav /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

## Connecting Clients to WebDAV

### Ubuntu / Linux (Nautilus)

1. Open the Files (Nautilus) application
2. Press Ctrl+L to open location bar
3. Enter: `dav://webdav.example.com/webdav/` (or `davs://` for HTTPS)
4. Enter credentials when prompted

Command-line mounting:

```bash
# Install davfs2 for command-line WebDAV mounting
sudo apt install davfs2 -y

# Create mount point
sudo mkdir /mnt/webdav

# Mount the WebDAV share
sudo mount -t davfs https://webdav.example.com/webdav/ /mnt/webdav

# Enter username and password when prompted

# Add to /etc/fstab for persistent mounting:
echo "https://webdav.example.com/webdav/ /mnt/webdav davfs user,noauto,uid=1000,gid=1000 0 0" | sudo tee -a /etc/fstab

# Store credentials in davfs secret file
echo "https://webdav.example.com/webdav/ alice password" >> ~/.davfs2/secrets
chmod 600 ~/.davfs2/secrets
```

### Windows

In Windows Explorer, right-click "This PC" > "Map network drive" and enter:

```text
https://webdav.example.com/webdav/
```

Or from Command Prompt:

```cmd
net use Z: https://webdav.example.com/webdav/ /user:alice
```

### macOS

In Finder, press Cmd+K, enter `https://webdav.example.com/webdav/`, and connect.

### Command-Line with cadaver

```bash
# Install cadaver - a command-line WebDAV client
sudo apt install cadaver -y

# Connect to the WebDAV server
cadaver https://webdav.example.com/webdav/

# Inside cadaver:
dav:/webdav/> ls                 # List files
dav:/webdav/> put file.txt       # Upload a file
dav:/webdav/> get remote.txt     # Download a file
dav:/webdav/> mkcol new_folder   # Create a directory
dav:/webdav/> quit
```

## Monitoring and Logging

```bash
# Watch WebDAV access in real time
sudo tail -f /var/log/apache2/webdav_access.log

# Check for errors
sudo tail -f /var/log/apache2/webdav_error.log

# Count requests by user
sudo awk '{print $3}' /var/log/apache2/webdav_access.log | sort | uniq -c | sort -rn
```

## Troubleshooting

**403 Forbidden**: Check directory ownership. The WebDAV directory must be owned by `www-data`. Run `sudo chown -R www-data:www-data /var/webdav/`.

**423 Locked**: A lock file is stale. Remove the lock database: `sudo rm -f /var/lib/dav/lockdb*` and restart Apache.

**Windows cannot map the drive**: Windows requires HTTPS for WebDAV connections to non-localhost addresses. Set up SSL.

**Upload fails silently**: Check the `client_max_body_size` in Apache/Nginx configuration. Default is often too low for large files.

**davfs2 prompts for password on every mount**: Add credentials to `~/.davfs2/secrets` with permissions 600.

WebDAV is an underappreciated protocol for simple file sharing. It requires no special client software on most operating systems and works reliably over standard HTTP/HTTPS infrastructure.
