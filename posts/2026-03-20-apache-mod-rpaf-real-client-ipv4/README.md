# How to Configure Apache mod_rpaf to Pass Real Client IPv4 Addresses

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Apache, Mod_rpaf, Reverse Proxy, IPv4, X-Forwarded-For, Security

Description: Install and configure Apache mod_rpaf to rewrite the client IP seen by Apache applications to the real client IPv4 from X-Forwarded-For headers when behind a reverse proxy.

## Introduction

When Apache sits behind a reverse proxy (like Nginx, an AWS ALB, or Cloudflare), `REMOTE_ADDR` shows the proxy's IP rather than the client's real IP. `mod_rpaf` (Reverse Proxy Add Forward) rewrites `REMOTE_ADDR` to the real client IP extracted from `X-Forwarded-For` headers - enabling accurate logging, rate limiting, and access control.

## Installing mod_rpaf

On Debian/Ubuntu:

```bash
# Install mod_rpaf from apt

sudo apt-get install libapache2-mod-rpaf

# Enable the module
sudo a2enmod rpaf
sudo systemctl restart apache2
```

On CentOS/RHEL (compile from source or use the available package):

```bash
# Install dependencies
sudo yum install httpd-devel gcc make git

# Clone and compile
git clone https://github.com/gnif/mod_rpaf.git
cd mod_rpaf
make && sudo make install

# Load the module
echo "LoadModule rpaf_module $(apxs -q LIBEXECDIR)/mod_rpaf.so" | \
  sudo tee /etc/httpd/conf.modules.d/00-rpaf.conf
sudo systemctl restart httpd
```

## Configuring mod_rpaf

Edit the module configuration or add these directives to your virtual host:

```apache
# /etc/apache2/mods-available/rpaf.conf

<IfModule mod_rpaf.c>
    # Enable mod_rpaf
    RPAFenable On

    # Trust only your actual reverse proxy IPs
    RPAFproxy_ips 127.0.0.1 10.0.0.10 10.0.0.11

    # The header containing the real client IP; mod_rpaf takes the
    # last IP from X-Forwarded-For
    RPAFheader X-Forwarded-For

    # Optional: update the hostname from X-Forwarded-Host/X-Host
    RPAFsethostname Off
</IfModule>
```

Reload Apache:

```bash
sudo systemctl reload apache2
```

## Verifying the Configuration

If `mod_status` is enabled, add a temporary status handler:

```apache
# In a VirtualHost
<Location /test-ip>
    SetHandler server-status
    Require local
</Location>
```

Or use a PHP test file:

```php
<?php
// test-ip.php
echo "REMOTE_ADDR: " . $_SERVER['REMOTE_ADDR'] . "\n";
echo "X-Forwarded-For: " . $_SERVER['HTTP_X_FORWARDED_FOR'] . "\n";
```

```bash
# Test from behind the proxy
curl http://your-server.example.com/test-ip.php
# Should show the real client IP in REMOTE_ADDR, not the proxy IP
```

## Access Control with Real IPs

Once `mod_rpaf` is active, Apache's `Require ip` directive works with real client IPs:

```apache
<Location /admin>
    AuthType Basic
    AuthName "Admin Area"
    AuthBasicProvider file
    AuthUserFile "/etc/apache2/.htpasswd"

    <RequireAll>
        Require ip 203.0.113.0/24   # Office CIDR - now uses real client IP
        Require valid-user
    </RequireAll>
</Location>
```

## Security Considerations

- **Only trust your own proxies**: An attacker can forge `X-Forwarded-For` headers. `RPAFproxy_ips` must list only your actual proxy addresses
- **Log the real IP**: Configure Apache's log format to use `%a` (remote IP after mod_rpaf) instead of `%h`

```apache
# Custom log format with real client IP
LogFormat "%a %l %u %t \"%r\" %>s %b \"%{Referer}i\" \"%{User-agent}i\"" combined_rpaf
CustomLog /var/log/apache2/access.log combined_rpaf
```

## Alternative: mod_remoteip

Apache 2.4+ ships with `mod_remoteip`, which provides similar functionality:

```apache
LoadModule remoteip_module modules/mod_remoteip.so

RemoteIPHeader X-Forwarded-For
RemoteIPTrustedProxy 10.0.0.10 10.0.0.11
```

`mod_remoteip` is the modern, built-in alternative to `mod_rpaf`.

## Conclusion

`mod_rpaf` (or the built-in `mod_remoteip`) is essential when Apache runs behind a reverse proxy. It ensures accurate client IP logging, correct access control decisions, and proper rate limiting based on real client addresses.
