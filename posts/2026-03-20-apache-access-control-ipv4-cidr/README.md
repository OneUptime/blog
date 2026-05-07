# How to Configure Apache Access Control with IPv4 CIDR Notation

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Apache, IPv4, CIDR, Access Control, Security, Mod_authz_host

Description: Use CIDR notation in Apache's Require ip directive to allow or deny access from entire IPv4 network ranges with precise subnet masks.

## Introduction

Apache's `Require ip` directive accepts full CIDR notation, making it easy to grant or deny access to entire network ranges. This is more maintainable than listing individual IPs and essential for controlling access at the subnet level.

## CIDR Notation in Apache

Apache accepts multiple IP-based matching formats, including CIDR notation:

```apache
# Full CIDR notation

Require ip 192.168.1.0/24       # 192.168.1.0 to .255 (/24 = 256 addresses)
Require ip 10.0.0.0/8           # Entire 10.x.x.x range
Require ip 172.16.0.0/12        # 172.16.x.x through 172.31.x.x

# Partial IP form (byte-boundary subnet shorthand)
Require ip 192.168.1            # Equivalent to 192.168.1.0/24
Require ip 10                   # Equivalent to 10.0.0.0/8

# Single IP
Require ip 203.0.113.50

# Network with explicit netmask
Require ip 192.168.1.0/255.255.255.0  # Same as /24
```

## Full CIDR Access Control Example

```apache
# /etc/apache2/sites-available/cidr-control.conf

<VirtualHost *:80>
    ServerName internal.example.com
    DocumentRoot /var/www/internal

    # Allow RFC 1918 private address space
    <Location />
        Require ip 10.0.0.0/8
        Require ip 172.16.0.0/12
        Require ip 192.168.0.0/16
    </Location>
</VirtualHost>
```

## Tiered Access by Network Segment

Different areas of the site accessible from different CIDR ranges:

```apache
<VirtualHost *:80>
    ServerName portal.example.com
    DocumentRoot /var/www/portal

    # Public area: accessible to everyone
    <Location /public>
        Require all granted
    </Location>

    # Employee area: accessible from corporate subnets (/22 = 1024 addresses)
    <Location /employee>
        Require ip 10.10.0.0/22    # 10.10.0.0 – 10.10.3.255
        Require ip 10.20.0.0/22
    </Location>

    # Admin area: only accessible from /28 management subnet (14 hosts)
    <Location /admin>
        Require ip 10.10.4.0/28    # 10.10.4.0 – 10.10.4.15
    </Location>

    # API area: specific trusted partners
    <Location /api/partner>
        Require ip 203.0.113.64/26  # 203.0.113.64 – 203.0.113.127
    </Location>
</VirtualHost>
```

## Blocking Specific Subnets with `Require not`

```apache
<Location />
    <RequireAll>
        Require all granted

        # Block known problematic subnets
        Require not ip 192.0.2.0/24
        Require not ip 198.51.100.0/24

        # Example: block RFC 6598 shared address space
        Require not ip 100.64.0.0/10
    </RequireAll>
</Location>
```

## Using .htaccess for Per-Directory CIDR Control

```apache
# /var/www/html/api/.htaccess

# Require mod_authz_host
<IfModule mod_authz_host.c>
    # Allow corporate network
    Require ip 10.0.0.0/8
    # Allow partner network
    Require ip 203.0.113.0/24
</IfModule>
```

Enable .htaccess in the main config:

```apache
<Directory /var/www/html>
    AllowOverride AuthConfig
</Directory>
```

## Computing CIDR Ranges

```bash
# Use ipcalc to verify CIDR ranges
sudo apt install ipcalc
ipcalc 192.168.1.0/24

# Output:
# Address:   192.168.1.0          11000000.10101000.00000001. 00000000
# Netmask:   255.255.255.0 = 24
# HostMin:   192.168.1.1
# HostMax:   192.168.1.254
# Hosts/Net: 254
```

## Testing CIDR Rules

```bash
# From a client in an allowed subnet, expect a non-403 response
curl -I http://portal.example.com/employee/

# From a client outside the allowed subnets, expect 403
curl -I http://portal.example.com/employee/

# Reload Apache after changes
sudo apache2ctl configtest && sudo systemctl reload apache2
```

## Conclusion

Apache's `Require ip` with CIDR notation provides network-level access control that scales from single hosts to entire /8 supernets. Use hierarchical CIDR ranges to match your network topology, combine with `RequireAll`/`Require not` for exclusion rules, and document your CIDR decisions with comments in the configuration for future maintainability.
