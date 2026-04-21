# How to Configure Squid Proxy Domain Blacklists for IPv4 Traffic

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Squid, Proxy, Domain Blacklist, IPv4, Web Filtering, Security

Description: Configure Squid proxy server to block access to specific domains and categories of websites for IPv4 clients using ACL-based domain blacklists.

## Introduction

Squid is a widely-used open-source caching proxy that can enforce web access policies by blocking traffic to specific domains. This is useful for corporate environments, schools, or any network where you want to restrict access to certain websites for connected IPv4 clients.

## Installing Squid

```bash
# Ubuntu/Debian

sudo apt-get install squid

# CentOS/RHEL/Fedora
sudo dnf install squid
```

## Understanding Squid ACLs

Squid uses Access Control Lists (ACLs) to match traffic and `http_access` rules to allow or deny it:

```text
acl LIST_NAME type value
http_access deny LIST_NAME
```

## Basic Domain Blacklist Configuration

Edit `/etc/squid/squid.conf`:

```squid
# Define a blacklist ACL from an inline domain list
acl blocked_domains dstdomain \
    .example-bad.com \
    .malware.example.org \
    .streaming-blocked.net

# Deny access to blacklisted domains
http_access deny blocked_domains

# Allow all other traffic from internal IPv4 clients
acl localnet src 192.168.0.0/16
http_access allow localnet
http_access deny all
```

## Using a Domain Blacklist File

For large lists, maintain a separate file:

```bash
# Create the blacklist file
sudo tee /etc/squid/blocked-domains.txt << 'EOF'
.facebook.com
.instagram.com
.youtube.com
.tiktok.com
EOF
```

Reference it in squid.conf:

```squid
# Reference external blacklist file
acl blocked_domains dstdomain "/etc/squid/blocked-domains.txt"
http_access deny blocked_domains
```

## Blocking by URL Pattern (Regex)

```squid
# Block URLs containing certain patterns
acl porn_pattern url_regex -i pornography adult xxx

# Block specific URL paths visible to Squid, such as plain HTTP requests
acl blocked_paths urlpath_regex \
    /gambling \
    /casino \
    /lottery

http_access deny porn_pattern
http_access deny blocked_paths
```

## Redirecting Blocked Requests to a Custom Page

Instead of returning Squid's default access-denied page, use `deny_info` for the ACL that denied the request:

```squid
# Redirect blocked domain requests to a hosted block page
deny_info http://proxy.example.com/blocked.html blocked_domains
http_access deny blocked_domains
```

Or serve a custom Squid error template:

```squid
# Copy the default error templates to /etc/squid/errors first, then customize them
error_directory /etc/squid/errors
deny_info ERR_ACCESS_DENIED blocked_domains

# Customize /etc/squid/errors/ERR_ACCESS_DENIED
```

## Restricting to Specific IPv4 Clients

Apply the blacklist only to certain client IP ranges:

```squid
# Only apply blacklist to the guest network
acl guest_net src 172.16.100.0/24
acl blocked_domains dstdomain "/etc/squid/blocked-domains.txt"

# Block for guest network only
http_access deny guest_net blocked_domains

# Allow the guest network to access other sites
http_access allow guest_net

# Full access for internal network
acl internal_net src 10.0.0.0/8
http_access allow internal_net
```

## Applying the Configuration

```bash
# Test configuration for syntax errors
sudo squid -k parse

# Reload Squid to apply changes
sudo squid -k reconfigure

# Or restart Squid
sudo systemctl restart squid
```

## Monitoring Blocked Requests

```bash
# Watch Squid access log for denied requests
sudo tail -f /var/log/squid/access.log | grep TCP_DENIED

# Count denials by requested URL
sudo awk '/TCP_DENIED/ {print $7}' /var/log/squid/access.log | sort | uniq -c | sort -rn | head -n 20
```

## Conclusion

Squid's ACL-based blacklisting provides a flexible, auditable way to enforce web access policies for IPv4 clients. For production deployments, consider integrating with commercial or community-maintained blocklists (e.g., UT1 Blacklists, URLhaus) and automate updates via cron.
