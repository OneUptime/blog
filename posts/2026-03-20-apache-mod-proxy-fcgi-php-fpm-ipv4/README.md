# How to Set Up Apache mod_proxy_fcgi for PHP-FPM Over IPv4

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Apache, Mod_proxy_fcgi, PHP-FPM, IPv4, FastCGI, Performance

Description: Configure Apache mod_proxy_fcgi to communicate with PHP-FPM over an IPv4 TCP socket, enabling efficient PHP processing with connection pooling.

## Introduction

`mod_proxy_fcgi` connects Apache to PHP-FPM (FastCGI Process Manager) using the FastCGI protocol. Using a TCP socket over IPv4 (instead of a Unix socket) allows PHP-FPM to run on a separate server or container, enabling horizontal scaling.

## Enabling Required Modules

```bash
sudo a2enmod proxy
sudo a2enmod proxy_fcgi

# Only needed if you use the Authorization header passthrough below
sudo a2enmod setenvif

sudo systemctl reload apache2

# Verify

apache2ctl -M | grep proxy_fcgi
```

## Configuring PHP-FPM to Listen on IPv4

Edit the PHP-FPM pool configuration to use TCP instead of a Unix socket:

```ini
; /etc/php/8.2/fpm/pool.d/www.conf

[www]
user = www-data
group = www-data

; Listen on IPv4 address and port (not Unix socket)
; Use 0.0.0.0 to accept from any source, or specific IP for security
listen = 127.0.0.1:9000
; For remote FPM server: listen = 0.0.0.0:9000

; Allow connections from Apache server IP
listen.allowed_clients = 127.0.0.1
; For remote Apache: listen.allowed_clients = 192.168.1.10

pm = dynamic
pm.max_children = 50
pm.start_servers = 5
pm.min_spare_servers = 5
pm.max_spare_servers = 35
```

```bash
sudo systemctl restart php8.2-fpm
sudo ss -tlnp | grep 9000
# Expected: a LISTEN entry for 127.0.0.1:9000
```

## Apache Virtual Host with mod_proxy_fcgi

```apache
# /etc/apache2/sites-available/php-app.conf

<VirtualHost *:80>
    ServerName app.example.com
    DocumentRoot /var/www/app

    DirectoryIndex index.php index.html

    <Directory /var/www/app>
        Options -Indexes
        AllowOverride All
        Require all granted
    </Directory>

    # Forward PHP files to PHP-FPM via IPv4
    <FilesMatch "\.php$">
        # Use SetHandler for clean syntax
        SetHandler "proxy:fcgi://127.0.0.1:9000"
    </FilesMatch>

    # Define a matching worker to enable connection reuse
    <Proxy "fcgi://127.0.0.1:9000">
        ProxySet enablereuse=on
    </Proxy>

    # For PHP-FPM on a remote server, see the dedicated example below
    # SetHandler "proxy:fcgi://192.168.1.20:9000"

    ErrorLog  /var/log/apache2/app-error.log
    CustomLog /var/log/apache2/app-access.log combined
</VirtualHost>
```

## Using ProxyPassMatch (Alternative Syntax)

```apache
<VirtualHost *:80>
    ServerName app.example.com
    DocumentRoot /var/www/app

    # Alternative syntax using ProxyPassMatch
    ProxyPassMatch ^/(.*\.php(/.*)?)$ fcgi://127.0.0.1:9000/var/www/app/$1 enablereuse=on

    # Optional: pass Authorization through to PHP apps that need it
    SetEnvIf Authorization "(.*)" HTTP_AUTHORIZATION=$1
</VirtualHost>
```

## PHP-FPM on a Separate Server

For separating PHP processing onto a dedicated server:

```apache
<VirtualHost *:80>
    ServerName app.example.com
    DocumentRoot /var/www/app

    # Forward to PHP-FPM on dedicated processing server
    <FilesMatch "\.php$">
        SetHandler "proxy:fcgi://192.168.1.20:9000"
    </FilesMatch>

    # Define a matching worker and enable connection reuse
    <Proxy "fcgi://192.168.1.20:9000">
        ProxySet enablereuse=on connectiontimeout=5 timeout=60
    </Proxy>
</VirtualHost>
```

With this `SetHandler` approach, the PHP files must exist at the same path (`/var/www/app`) on the PHP-FPM host, because Apache passes the mapped filesystem path to PHP-FPM.

On the PHP-FPM server (192.168.1.20), allow connections from Apache:

```ini
; /etc/php/8.2/fpm/pool.d/www.conf
listen = 0.0.0.0:9000
listen.allowed_clients = 192.168.1.10   # Apache server IP
```

## Testing the Configuration

```bash
# Create test PHP file
echo "<?php phpinfo();" > /var/www/app/info.php

# Test PHP processing
curl http://app.example.com/info.php | grep -i "php version"

# Verify FPM connections
ss -tn dst 127.0.0.1:9000
```

## Conclusion

Apache `mod_proxy_fcgi` over IPv4 connects to PHP-FPM using FastCGI protocol on port 9000. Configure PHP-FPM to listen on `127.0.0.1:9000` for local setups or `0.0.0.0:9000` for remote deployments. The `SetHandler "proxy:fcgi://..."` syntax in `<FilesMatch>` blocks is a clean modern approach. Add a matching `<Proxy>` worker, or use `enablereuse=on` with `ProxyPassMatch`, if you want backend connection reuse.
