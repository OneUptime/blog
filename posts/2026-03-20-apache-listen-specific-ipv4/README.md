# How to Configure Apache to Listen on a Specific IPv4 Address

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Apache, IPv4, Listen Directive, Virtual Hosts, HTTP, Networking

Description: Configure Apache HTTP Server to listen on a specific IPv4 address instead of all interfaces, controlling which network interface serves web traffic.

## Introduction

By default, if Apache is configured with only a port such as `Listen 80`, it listens on that port on all network interfaces. Binding Apache to a specific IPv4 address is useful for multi-homed servers, separating public and private traffic, or running multiple Apache instances on different IPs.

## Understanding the Listen Directive

The `Listen` directive is commonly managed in `/etc/apache2/ports.conf` (Debian/Ubuntu) or `/etc/httpd/conf/httpd.conf` (RHEL/CentOS) and controls which addresses and ports Apache binds to.

## Binding to a Single IPv4 Address

```apache
# /etc/apache2/ports.conf (Ubuntu/Debian)

# or /etc/httpd/conf/httpd.conf (RHEL/CentOS)

# Remove or comment out existing wildcard Listen directives for these ports
# such as:
# Listen 80
# Listen 443

# Bind to specific IPv4 address only
Listen 203.0.113.10:80
Listen 203.0.113.10:443
```

After editing the Listen directives, update or create virtual hosts to match:

```apache
# /etc/apache2/sites-available/example.conf

<VirtualHost 203.0.113.10:80>
    ServerName example.com
    DocumentRoot /var/www/html/example

    <Directory /var/www/html/example>
        Options -Indexes
        AllowOverride All
        Require all granted
    </Directory>

    ErrorLog /var/log/apache2/example-error.log
    CustomLog /var/log/apache2/example-access.log combined
</VirtualHost>
```

## Multiple IPv4 Addresses

On a multi-homed server with several IPv4 addresses:

```apache
# /etc/apache2/ports.conf

# Public-facing address
Listen 203.0.113.10:80
Listen 203.0.113.10:443

# Internal management address
Listen 10.0.0.5:80
```

Configure separate virtual hosts for each address:

```apache
# Public virtual host
<VirtualHost 203.0.113.10:80>
    ServerName example.com
    DocumentRoot /var/www/public
</VirtualHost>

# Internal admin virtual host
<VirtualHost 10.0.0.5:80>
    ServerName admin.internal
    DocumentRoot /var/www/admin

    # Additional IP-based restriction
    <Location />
        Require ip 10.0.0.0/8
    </Location>
</VirtualHost>
```

## Verifying Apache Listens on the Correct Address

```bash
# Check which ports and addresses Apache is bound to
sudo ss -tlnp | grep apache2
# or
sudo ss -tlnp | grep httpd

# Expected output:
# LISTEN 0 511 203.0.113.10:80 0.0.0.0:*  users:(("apache2",...))

# Use apachectl to show virtual host info
sudo apachectl -S

# Test configuration syntax
sudo apachectl configtest
# or on Debian/Ubuntu
sudo apache2ctl configtest
# Expected: Syntax OK
```

## Restarting Apache After Changes

```bash
# Debian/Ubuntu
sudo systemctl restart apache2

# RHEL/CentOS/Fedora
sudo systemctl restart httpd

# If changing Listen directives conflicts with the previous bindings,
# stop and start the service instead of using a graceful reload
# Debian/Ubuntu
sudo systemctl stop apache2
sudo systemctl start apache2

# RHEL/CentOS/Fedora
sudo systemctl stop httpd
sudo systemctl start httpd
```

## Troubleshooting: Port Already in Use

```bash
# Check what's using port 80 on the target IPv4
sudo ss -tlnp | grep '203.0.113.10:80'

# If another service is using it
sudo lsof -i @203.0.113.10:80

# After freeing the port, test config before restarting
sudo apachectl configtest && sudo systemctl restart httpd
# or on Debian/Ubuntu
sudo apache2ctl configtest && sudo systemctl restart apache2
```

## Conclusion

Binding Apache to a specific IPv4 address is usually a small configuration change: replace wildcard `Listen` directives with `Listen <IPv4>:<port>` in the appropriate Apache configuration file. Update your VirtualHost directives to match the same IP:port, and restart Apache so the new bindings take effect. This approach improves security by reducing the attack surface and enables running separate Apache configurations on different network interfaces of the same server.
