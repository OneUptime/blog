# How to Configure Apache Access Control for IPv6 Subnets

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, Apache, Access Control, Mod_authz_host, Security

Description: Learn how to configure Apache access control rules for IPv6 addresses and subnets using Require ip directives, including allowing trusted IPv6 ranges and blocking specific addresses.

## Apache 2.4 Access Control with Require

```apache
# Apache 2.4 uses Require directive for access control

<Directory /var/www/admin>
    # Allow specific IPv6 address
    Require ip 2001:db8::10

    # Allow an IPv6 subnet
    Require ip 2001:db8:1000::/48

    # Allow IPv4 subnet too
    Require ip 192.168.1.0/24
</Directory>
```

## Allow Multiple IPv6 Addresses

```apache
<Directory /var/www/restricted>
    # Multiple Require directives are OR'd together
    <RequireAny>
        Require ip ::1               # IPv6 loopback
        Require ip 2001:db8::/32     # Documentation IPv6 range
        Require ip fd00::/8          # ULA range
        Require ip 10.0.0.0/8        # IPv4 internal
    </RequireAny>
</Directory>
```

## Block Specific IPv6 Addresses

```apache
<Directory /var/www/html>
    # Allow all, except specific blocked addresses
    <RequireAll>
        Require all granted

        # Block specific IPv6 address
        Require not ip 2001:db8::bad:ac70

        # Block entire subnet
        Require not ip 2001:db8:2000::/48
    </RequireAll>
</Directory>
```

## Per-Location Access Control

```apache
<VirtualHost *:80>
    ServerName example.com
    DocumentRoot /var/www/example

    # Public area - open to all
    <Directory /var/www/example/public>
        Require all granted
    </Directory>

    # Admin area - IPv6 management network only
    <Location /admin/>
        <RequireAny>
            Require ip 2001:db8:3000::/64
            Require ip ::1
        </RequireAny>
    </Location>

    # API area - internal IPv6 only
    <Location /api/>
        <RequireAny>
            Require ip 2001:db8:4000::/48
            Require ip 192.168.0.0/16
        </RequireAny>
    </Location>
</VirtualHost>
```

## Environment-Based Access Control

```apache
<VirtualHost *:80>
    # Set environment variable for internal IPv6 clients
    SetEnvIfExpr "-R '2001:db8:4000::/48'" INTERNAL_IPV6

    <Location /internal-api/>
        # Only allow if from internal IPv6 range
        Require env INTERNAL_IPV6
    </Location>
</VirtualHost>
```

## Apache 2.2 Legacy Syntax (Deprecated)

```apache
# Apache 2.2 used Allow/Deny (still works in 2.4 with mod_access_compat)

<Directory /var/www/admin>
    Order deny,allow
    Deny from all
    Allow from 2001:db8::/32
    Allow from 192.168.1.0/24
</Directory>
```

## Test Access Control

```bash
# Test from allowed IPv6 address
curl -6 --interface 2001:db8::10 http://example.com/admin/
# Expected: 200 OK

# Test from blocked address
curl -6 --interface 2001:db8::bad:ac70 http://example.com/admin/
# Expected: 403 Forbidden

# Test from IPv4
curl -4 http://example.com/admin/

# Check Apache error log for 403 denials
tail -f /var/log/apache2/error.log | grep "client denied"
```

## Summary

Configure Apache access control for IPv6 with `Require ip 2001:db8:1000::/48` in `<Directory>` or `<Location>` blocks. Use `<RequireAny>` for OR logic (allow any matching rule), `<RequireAll>` for AND logic (all conditions must match). Block addresses with `Require not ip`. Apache 2.4 uses the `Require` directive, with `mod_authz_host` providing the `ip` authorization provider. Test with `curl -6 --interface <ipv6-addr>` and check for 403 responses.
