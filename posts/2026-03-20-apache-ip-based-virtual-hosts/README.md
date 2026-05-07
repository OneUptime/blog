# How to Configure Apache IP-Based Virtual Hosts on IPv4 Addresses

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Apache, Virtual Hosts, IPv4, HTTP, Web Server, Configuration

Description: Set up Apache IP-based virtual hosts that serve different websites based on the destination IPv4 address, useful for multi-homed servers and IP isolation.

## Introduction

Apache supports two types of virtual hosting: name-based (uses the HTTP `Host` header) and IP-based (uses the destination IP address). IP-based virtual hosts are useful when you need strict isolation between sites, for legacy HTTP/1.0 clients, or to present different SSL certificates without relying on SNI.

## When to Use IP-Based vs Name-Based Virtual Hosts

| Feature | IP-Based | Name-Based |
|---|---|---|
| Different IPs per site | Yes | No |
| Multiple sites per IP | Only with different ports | Yes |
| Different SSL certs per site | Yes, without SNI | Yes, with SNI on a shared IP:port |
| Routing without HTTP Host header | Yes | No |

## Prerequisites

The server must have multiple IPv4 addresses assigned:

```bash
# Add a second IPv4 address to your interface

sudo ip addr add 203.0.113.11/24 dev eth0

# Make it persistent (Ubuntu/Debian - /etc/netplan/01-netcfg.yaml)
# addresses: [203.0.113.10/24, 203.0.113.11/24]

# Verify both IPs are active
ip addr show eth0 | grep 'inet '
```

## Configure Apache Listen Directives

```apache
# /etc/apache2/ports.conf

# Replace any overlapping wildcard Listen directives instead of leaving them enabled.

# Listen on both IPv4 addresses for HTTP
Listen 203.0.113.10:80
Listen 203.0.113.11:80

<IfModule ssl_module>
    # If you are using the SSL virtual hosts below, listen on both IPv4 addresses for HTTPS
    Listen 203.0.113.10:443
    Listen 203.0.113.11:443
</IfModule>
```

## IP-Based Virtual Host Configuration

Each virtual host is bound to a specific IP:port combination:

```apache
# /etc/apache2/sites-available/site-a.conf

# Site A: served when client connects to 203.0.113.10
<VirtualHost 203.0.113.10:80>
    ServerName site-a.example.com
    DocumentRoot /var/www/site-a

    <Directory /var/www/site-a>
        Options -Indexes
        AllowOverride All
        Require all granted
    </Directory>

    ErrorLog  /var/log/apache2/site-a-error.log
    CustomLog /var/log/apache2/site-a-access.log combined
</VirtualHost>
```

```apache
# /etc/apache2/sites-available/site-b.conf

# Site B: served when client connects to 203.0.113.11
<VirtualHost 203.0.113.11:80>
    ServerName site-b.example.com
    DocumentRoot /var/www/site-b

    <Directory /var/www/site-b>
        Options -Indexes
        AllowOverride All
        Require all granted
    </Directory>

    ErrorLog  /var/log/apache2/site-b-error.log
    CustomLog /var/log/apache2/site-b-access.log combined
</VirtualHost>
```

## Enable Sites and Restart

```bash
# Enable both HTTP site configurations
sudo a2ensite site-a.conf
sudo a2ensite site-b.conf

# Test configuration
sudo apache2ctl configtest

# Restart Apache after changing Listen directives
sudo systemctl restart apache2
```

## Verifying IP-Based Routing

```bash
# Test Site A via its specific IP
curl http://203.0.113.10/

# Test Site B via its specific IP
curl http://203.0.113.11/

# If the application expects the hostname, you can send it explicitly:
# curl -H "Host: site-a.example.com" http://203.0.113.10/
# curl -H "Host: site-b.example.com" http://203.0.113.11/

# Verify Apache's virtual host mapping
sudo apache2ctl -S
# Should show each VirtualHost with its IP:port

# Check socket binding
sudo ss -tlnp | grep apache2
```

## IP-Based SSL Virtual Hosts

IP-based virtual hosts are especially useful for SSL without SNI:

```apache
# /etc/apache2/sites-available/ssl-site-a.conf
<VirtualHost 203.0.113.10:443>
    ServerName site-a.example.com
    SSLEngine on
    SSLCertificateFile    /etc/ssl/certs/site-a.crt
    SSLCertificateKeyFile /etc/ssl/private/site-a.key
    DocumentRoot /var/www/site-a
</VirtualHost>
```

```apache
# /etc/apache2/sites-available/ssl-site-b.conf
<VirtualHost 203.0.113.11:443>
    ServerName site-b.example.com
    SSLEngine on
    SSLCertificateFile    /etc/ssl/certs/site-b.crt
    SSLCertificateKeyFile /etc/ssl/private/site-b.key
    DocumentRoot /var/www/site-b
</VirtualHost>
```

After creating these HTTPS virtual host files, enable SSL support and the sites:

```bash
sudo a2enmod ssl
sudo a2ensite ssl-site-a.conf
sudo a2ensite ssl-site-b.conf

sudo apache2ctl configtest
sudo systemctl restart apache2
```

## Conclusion

IP-based virtual hosting in Apache binds each site to a unique IPv4 address, providing hard isolation without relying on the HTTP Host header. Configure `Listen` directives for each IP, match them in VirtualHost definitions, and validate with `apache2ctl -S`. For modern setups, name-based virtual hosts with SNI for SSL are more scalable, but IP-based hosting remains useful for legacy compatibility and strict isolation requirements.
