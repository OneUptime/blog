# How to Configure Squid Access Control Lists (ACLs) on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Squid, Proxy, Networking, Security

Description: Learn how to configure Squid proxy ACLs on Ubuntu to control who can access what, including IP-based, time-based, and domain-based filtering rules.

---

Squid's ACL system is what makes it genuinely useful as an enterprise proxy. Without ACLs, Squid either allows everything or blocks everything. With a well-structured ACL configuration, you can allow specific users to reach specific sites during specific hours while blocking everything else.

## How ACLs Work in Squid

Squid ACLs have two parts:
1. **ACL definitions** - describe what to match (source IP, destination domain, time, etc.)
2. **Access rules** - use those definitions to allow or deny traffic

The evaluation order matters. Squid evaluates `http_access` rules in order and applies the first match. If no rule matches, the default is to deny.

## Basic ACL Types

The configuration file is `/etc/squid/squid.conf`. Here are the most commonly used ACL types:

```squid
# Match by source IP address or network
acl internal_users src 192.168.1.0/24
acl management src 192.168.1.100/32

# Match by destination domain
acl social_media dstdomain .facebook.com .twitter.com .instagram.com .tiktok.com

# Match by destination domain using a file (easier for long lists)
acl blocked_sites dstdomain "/etc/squid/blocked_domains.txt"
acl allowed_sites dstdomain "/etc/squid/allowed_domains.txt"

# Match by URL regex pattern
acl video_streaming url_regex -i youtube\.com netflix\.com hulu\.com

# Match by port number
acl SSL_ports port 443
acl Safe_ports port 80    # HTTP
acl Safe_ports port 443   # HTTPS
acl Safe_ports port 21    # FTP
acl Safe_ports port 8080  # HTTP alternate

# Match the CONNECT method (used for HTTPS tunneling)
acl CONNECT method CONNECT

# Time-based ACL
# Syntax: time [day_abbrevs] [hh:mm-hh:mm]
# Days: M=Monday T=Tuesday W=Wednesday H=Thursday F=Friday A=Saturday S=Sunday
acl business_hours time MTWHF 08:00-18:00
acl lunch_break time MTWHF 12:00-13:00
acl weekends time AS
```

## Building the Access Control Rules

With ACL definitions in place, write the access rules:

```squid
# Deny requests to non-standard ports (security best practice)
http_access deny !Safe_ports

# Deny CONNECT to non-SSL ports
http_access deny CONNECT !SSL_ports

# Allow management team unrestricted access
http_access allow management

# Block social media during business hours for regular users
http_access deny social_media internal_users business_hours

# Allow social media during lunch break
http_access allow social_media internal_users lunch_break

# Block video streaming sites
http_access deny video_streaming

# Allow internal network access
http_access allow internal_users

# Deny everything else
http_access deny all
```

## Creating Domain Blocklist Files

For large lists of domains, using external files is much more maintainable:

```bash
sudo nano /etc/squid/blocked_domains.txt
```

```
# Format: one domain per line
# The leading dot matches the domain and all subdomains
.facebook.com
.twitter.com
.instagram.com
.reddit.com
.youtube.com
# Comments are supported
.gambling-site.com
```

Reference the file in squid.conf:

```squid
acl blocked_sites dstdomain "/etc/squid/blocked_domains.txt"
http_access deny blocked_sites
```

After editing the file, reload Squid without restarting:

```bash
sudo squid -k reconfigure
```

## User Authentication with ACLs

Combine authentication with ACLs for per-user control. First set up basic auth:

```bash
# Install htpasswd utility
sudo apt install apache2-utils -y

# Create the password file
sudo touch /etc/squid/passwd
sudo chown proxy:proxy /etc/squid/passwd

# Add users
sudo htpasswd /etc/squid/passwd john
sudo htpasswd /etc/squid/passwd jane
sudo htpasswd /etc/squid/passwd admin
```

Configure authentication in squid.conf:

```squid
# Set up basic authentication
auth_param basic program /usr/lib/squid/basic_ncsa_auth /etc/squid/passwd
auth_param basic realm "Squid Proxy"
auth_param basic credentialsttl 2 hours

# ACL that requires authentication
acl authenticated_users proxy_auth REQUIRED

# ACL for specific users
acl admin_users proxy_auth admin
acl power_users proxy_auth john jane

# Rules using authentication
# Admins get unrestricted access
http_access allow admin_users

# Power users can access most things
http_access deny social_media power_users business_hours
http_access allow power_users

# Require authentication for everyone else
http_access deny !authenticated_users
http_access allow authenticated_users

# Deny unauthenticated access
http_access deny all
```

## Rate Limiting with ACLs

Squid can use ACLs to apply bandwidth limits using delay pools:

```squid
# Enable delay pools
delay_pools 2

# Pool 1: Aggregate limit for the entire network
delay_class 1 1
# 500KB/s overall, burst up to 1MB
delay_parameters 1 1000000/500000

# Pool 2: Per-IP limits
delay_class 2 2
# No aggregate limit (-1/-1)
# Per-IP: 100KB/s, burst up to 200KB
delay_parameters 2 -1/-1 200000/100000

# Apply pool 1 to internal network (excluding management)
delay_access 1 allow internal_users
delay_access 1 deny all

# Apply pool 2 to everyone
delay_access 2 allow internal_users
delay_access 2 deny all
```

## Category-Based Filtering with SquidGuard

For more sophisticated URL filtering by category (gambling, adult content, malware), combine Squid with SquidGuard:

```bash
sudo apt install squidguard -y
```

```squid
# In squid.conf, redirect requests through SquidGuard
url_rewrite_program /usr/bin/squidGuard -c /etc/squid/squidGuard.conf
url_rewrite_children 5
```

```squid
# /etc/squid/squidGuard.conf
dbhome /var/lib/squidguard/db
logdir /var/log/squid

# Define blocked categories
dest adult {
    domainlist adult/domains
    urllist adult/urls
}

dest gambling {
    domainlist gambling/domains
}

# Rules
acl {
    default {
        pass !adult !gambling all
        redirect http://proxy.example.com/blocked.html
    }
}
```

## Testing and Debugging ACLs

Enable debug logging for ACL evaluation:

```squid
# In squid.conf - add to debug_options
# Section 28 is ACL processing
debug_options ALL,1 28,5
```

Test your configuration:

```bash
# Check syntax before reloading
sudo squid -k parse

# Reload configuration
sudo squid -k reconfigure

# Test access from the command line
# This simulates a request from a specific source IP
curl -x http://proxy-server:3128 http://facebook.com

# Check what Squid decided
sudo tail -f /var/log/squid/access.log
```

The access log format shows the result of ACL evaluation:

```bash
# Fields: timestamp  duration  client_ip  result/status  bytes  method  url
# TCP_DENIED = blocked by ACL
# TCP_MISS = allowed, fetched from internet
# TCP_HIT = allowed, served from cache
sudo grep "TCP_DENIED" /var/log/squid/access.log | tail -20
```

## Viewing Current ACL Configuration

```bash
# Display all configured ACLs
sudo grep "^acl" /etc/squid/squid.conf

# Display all access rules
sudo grep "^http_access" /etc/squid/squid.conf

# Check how many domains are in your blocklist
wc -l /etc/squid/blocked_domains.txt
```

Well-structured ACLs are the foundation of a useful Squid proxy. Start with a clear deny-by-default policy and explicitly allow only what is needed, rather than trying to block individual bad sites as they appear.
