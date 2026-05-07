# How to Set Up Apache .htaccess Rules to Block IPv4 Ranges

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Apache, .htaccess, IPv4, Security, Access Control, Mod_authz_host, Firewall

Description: Learn how to use Apache .htaccess files to block or allow specific IPv4 addresses and CIDR ranges from accessing your web application.

---

Apache's `.htaccess` files allow directory-level access control without modifying the main server configuration. Blocking IPv4 ranges is a fast way to stop abusive traffic, scrapers, or known malicious IP ranges directly at the web server layer.

## Enabling .htaccess Override

Before `.htaccess` rules work, the main Apache configuration must permit the directives you want to use.

```apacheconf
# /etc/apache2/sites-available/mysite.conf

<Directory /var/www/mysite>
    # Allow Require-based access control and ErrorDocument in .htaccess
    AllowOverride AuthConfig FileInfo
    Require all granted
</Directory>
```

## Blocking a Single IP Address

```apacheconf
# /var/www/mysite/.htaccess

# Require all access, then deny the specific IP
<RequireAll>
    Require all granted
    Require not ip 198.51.100.1
</RequireAll>
```

## Blocking Multiple IPs and a CIDR Range

```apacheconf
# Block several specific IPs and a /24 subnet
<RequireAll>
    Require all granted
    # Block individual IPs
    Require not ip 198.51.100.5
    Require not ip 203.0.113.42
    # Block the entire 198.51.100.0/24 CIDR range
    Require not ip 198.51.100.0/24
</RequireAll>
```

> Apache's `Require not ip` accepts full IP addresses, partial addresses (which match the network prefix), or full CIDR notation like `198.51.100.0/24`.

## Allowing Only Specific IPs (Allowlist)

To restrict a path to a set of trusted IPs (e.g., an admin panel):

```apacheconf
# Only allow access from your office IP and internal network
<RequireAny>
    Require ip 203.0.113.10
    Require ip 10.0.0.0/8
</RequireAny>
```

## Combining Allow and Deny for an Admin Path

```apacheconf
# /var/www/mysite/admin/.htaccess

# Protect /admin from all IPs except trusted ones
<RequireAny>
    Require ip 203.0.113.10
    Require ip 192.168.1.0/24
</RequireAny>
```

## Legacy Syntax (Apache 2.2)

For older Apache 2.2 servers, the syntax uses `Order`, `Allow`, and `Deny`:

```apacheconf
# Apache 2.2 syntax (not recommended for 2.4+)
Order allow,deny
Allow from all
Deny from 198.51.100.0/24
Deny from 203.0.113.42
```

## Returning a Custom Error Page

```apacheconf
# Return a 403 with a custom page for blocked IPs
<RequireAll>
    Require all granted
    Require not ip 198.51.100.0/24
</RequireAll>
ErrorDocument 403 /errors/blocked.html
```

## Key Takeaways

- Use `Require not ip` (Apache 2.4+) to block individual IPs or CIDR ranges.
- `Require all granted` + `Require not ip` blocks specific IPs while allowing everyone else.
- `RequireAny` creates an allowlist (only listed IPs are permitted).
- Set `AllowOverride AuthConfig` in the main config to allow `.htaccess` access control rules, and add `FileInfo` if you also use `ErrorDocument`.
