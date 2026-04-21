# How to Configure Squid URL Filtering for IPv4 Clients

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Squid, URL Filtering, IPv4, ACL, Security, Proxy, Content Policy

Description: Learn how to configure Squid URL filtering using ACLs and deny lists to block or allow specific websites and URL patterns for IPv4 clients.

---

Squid's ACL system enables granular URL filtering: block specific domains, allow only approved sites, or block URL patterns using regular expressions. Combined with IPv4 source ACLs, you can apply different policies to different client groups.

## Blocking Specific Domains (Denylist)

```squid
# /etc/squid/squid.conf

# --- Define denied domain list ---

# This ACL matches requests to any domain in the file
acl blocked_sites dstdomain "/etc/squid/blocked_domains.txt"

# --- Apply the block before allowing anything ---
http_access deny blocked_sites

# --- Allow internal IPv4 clients ---
acl localnet src 192.168.0.0/16
http_access allow localnet
http_access deny all
```

```text
# /etc/squid/blocked_domains.txt
# One domain per line; a leading dot matches all subdomains
.facebook.com
.tiktok.com
.instagram.com
gambling.example.com
```

## Allowing Only Approved Sites (Allowlist / Whitelist)

```squid
# --- Approved domains only ---
acl allowed_sites dstdomain "/etc/squid/allowed_domains.txt"

# Deny access to anything NOT in the allowlist
http_access deny !allowed_sites

acl localnet src 192.168.0.0/16
http_access allow localnet
http_access deny all
```

```text
# /etc/squid/allowed_domains.txt
.google.com
.github.com
.npmjs.com
.pypi.org
```

## Blocking URL Patterns with Regular Expressions

```squid
# ACL matching visible URLs containing specific patterns (case insensitive)
# Without SSL bump, HTTPS CONNECT requests expose the host:port, not the URL path.
acl blocked_patterns url_regex -i "/etc/squid/blocked_patterns.txt"
http_access deny blocked_patterns
```

```text
# /etc/squid/blocked_patterns.txt
# Block video streaming
.*\.youtube\.com/watch.*
.*netflix\.com.*
# Block executable downloads
.*\.(exe|msi|bat|cmd)$
```

## Time-Based URL Filtering

Apply different policies during business hours vs. after hours.

```squid
# Allow social media only outside business hours (before 9am and after 5pm)
acl localnet src 192.168.0.0/16
acl business_hours time MTWHF 09:00-17:00
acl social_media dstdomain .twitter.com .linkedin.com .reddit.com

http_access deny localnet social_media business_hours
http_access allow localnet
http_access deny all
```

## Per-Group URL Policies

Different IPv4 subnets can have different URL policies.

```squid
acl developers src 10.1.0.0/24
acl employees  src 10.2.0.0/24
acl blocked_sites dstdomain "/etc/squid/blocked_domains.txt"

# Developers can access everything
http_access allow developers

# Employees are subject to the block list
http_access deny employees blocked_sites
http_access allow employees

http_access deny all
```

## Reloading and Testing

```bash
# Test syntax
squid -k parse

# Reload to apply new lists without restart
squid -k reconfigure

# Test a blocked site from an IPv4 client that matches localnet
# Replace 192.168.1.10 with your Squid proxy's IPv4 address
curl -x http://192.168.1.10:3128 http://facebook.com
# Should return: 403 Forbidden or Squid denial page

# Test an allowed site
curl -x http://192.168.1.10:3128 http://github.com
```

## Key Takeaways

- Use `dstdomain` ACLs with an external file for easy maintenance of large domain lists.
- A leading dot (`.example.com`) in a dstdomain file matches the domain and all subdomains.
- `url_regex` ACLs support powerful pattern matching but are slower than `dstdomain`.
- Place `http_access deny` rules before `http_access allow` rules for the deny to take effect.
