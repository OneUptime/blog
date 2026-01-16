# How to Install and Configure Squid Proxy Server on Ubuntu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ubuntu, Squid, Proxy, Caching, Network, Tutorial

Description: Complete guide to setting up Squid as a forward proxy, caching server, or access control gateway on Ubuntu.

---

Squid is a powerful caching proxy server that can accelerate web browsing, control internet access, and reduce bandwidth usage. This guide covers installation, configuration for various use cases, and security hardening.

## What Squid Does

- **Forward Proxy**: Routes client requests through the server
- **Caching**: Stores frequently accessed content locally
- **Access Control**: Restricts access to websites or by user
- **Bandwidth Management**: Limits and prioritizes traffic
- **Content Filtering**: Blocks unwanted content

## Prerequisites

- Ubuntu 20.04, 22.04, or 24.04
- Root or sudo access
- Static IP address (recommended)
- Adequate disk space for cache

## Installing Squid

```bash
# Update package lists
sudo apt update

# Install Squid proxy server
sudo apt install squid -y

# Verify installation
squid -v

# Check service status
sudo systemctl status squid
```

## Understanding Squid Configuration

Main configuration file: `/etc/squid/squid.conf`

```bash
# Backup original configuration
sudo cp /etc/squid/squid.conf /etc/squid/squid.conf.backup

# View current configuration (without comments)
grep -v "^#" /etc/squid/squid.conf | grep -v "^$"
```

## Basic Configuration

### Edit Main Configuration

```bash
sudo nano /etc/squid/squid.conf
```

### Minimal Working Configuration

```squid
# Squid listening port
http_port 3128

# Define local network (adjust to your network)
acl localnet src 192.168.1.0/24
acl localnet src 10.0.0.0/8

# Define safe ports
acl SSL_ports port 443
acl Safe_ports port 80          # http
acl Safe_ports port 21          # ftp
acl Safe_ports port 443         # https
acl Safe_ports port 70          # gopher
acl Safe_ports port 210         # wais
acl Safe_ports port 1025-65535  # unregistered ports
acl Safe_ports port 280         # http-mgmt
acl Safe_ports port 488         # gss-http
acl Safe_ports port 591         # filemaker
acl Safe_ports port 777         # multiling http

# Method definitions
acl CONNECT method CONNECT

# Access rules
http_access deny !Safe_ports
http_access deny CONNECT !SSL_ports
http_access allow localhost manager
http_access deny manager
http_access allow localnet
http_access allow localhost
http_access deny all

# Cache directory (adjust size as needed)
cache_dir ufs /var/spool/squid 10000 16 256

# Cache memory
cache_mem 256 MB

# Log files
access_log /var/log/squid/access.log squid
cache_log /var/log/squid/cache.log

# Hostname
visible_hostname proxy.local
```

### Apply Configuration

```bash
# Test configuration syntax
sudo squid -k parse

# Restart Squid
sudo systemctl restart squid

# Check status
sudo systemctl status squid
```

## Access Control Lists (ACLs)

ACLs define what traffic to allow or deny.

### Define Networks

```squid
# Single IP
acl admin_pc src 192.168.1.100

# Network range
acl office src 192.168.1.0/24

# Multiple networks
acl branch_offices src 10.1.0.0/16 10.2.0.0/16

# All internal networks
acl internal src 192.168.0.0/16 10.0.0.0/8 172.16.0.0/12
```

### Define Domains

```squid
# Block specific domains
acl blocked_sites dstdomain .facebook.com .twitter.com .tiktok.com

# Block from file
acl blocked_sites dstdomain "/etc/squid/blocked_sites.txt"

# Allow specific domains
acl allowed_sites dstdomain .company.com .work-related.com
```

### Define Time-Based Rules

```squid
# Business hours (Monday-Friday 9AM-5PM)
acl business_hours time MTWHF 09:00-17:00

# Lunch break
acl lunch_break time MTWHF 12:00-13:00
```

### Define URL Patterns

```squid
# Block URLs containing keywords
acl blocked_urls url_regex -i gambling porn torrent

# Block file types
acl blocked_files urlpath_regex -i \.(exe|mp3|mp4|avi|mkv)$
```

### Apply ACLs

```squid
# Block social media
http_access deny blocked_sites

# Allow during business hours only
http_access allow office business_hours
http_access deny office

# Block large file downloads
http_access deny blocked_files
```

## Authentication Configuration

### Basic Authentication (htpasswd)

```bash
# Install Apache utilities for htpasswd
sudo apt install apache2-utils -y

# Create password file
sudo touch /etc/squid/passwords
sudo chmod 640 /etc/squid/passwords
sudo chown proxy:proxy /etc/squid/passwords

# Add users
sudo htpasswd /etc/squid/passwords user1
# Enter password when prompted

# Add more users
sudo htpasswd /etc/squid/passwords user2
```

Configure Squid for authentication:

```squid
# Basic authentication configuration
auth_param basic program /usr/lib/squid/basic_ncsa_auth /etc/squid/passwords
auth_param basic realm Proxy Authentication Required
auth_param basic credentialsttl 2 hours
auth_param basic casesensitive on

# Require authentication
acl authenticated proxy_auth REQUIRED

# Apply authentication requirement
http_access allow authenticated
http_access deny all
```

### LDAP Authentication

```squid
# LDAP authentication (adjust server details)
auth_param basic program /usr/lib/squid/basic_ldap_auth -b "dc=company,dc=com" -D "cn=squid,dc=company,dc=com" -w "password" -f "uid=%s" ldap.company.com
auth_param basic realm Company Proxy
auth_param basic children 5
```

## Caching Configuration

### Cache Directory Setup

```squid
# UFS cache: path, size(MB), L1dirs, L2dirs
cache_dir ufs /var/spool/squid 10000 16 256

# Memory caching
cache_mem 512 MB

# Maximum object size in memory
maximum_object_size_in_memory 1 MB

# Maximum object size on disk
maximum_object_size 100 MB

# Minimum object size (don't cache tiny files)
minimum_object_size 0 KB
```

### Cache Policies

```squid
# Refresh patterns (type, min, percent, max)
refresh_pattern ^ftp:           1440    20%     10080
refresh_pattern ^gopher:        1440    0%      1440
refresh_pattern -i (/cgi-bin/|\?) 0     0%      0
refresh_pattern .               0       20%     4320

# Cache static content longer
refresh_pattern -i \.(gif|png|jpg|jpeg|ico)$ 10080 90% 43200
refresh_pattern -i \.(css|js)$ 10080 90% 43200
```

### Initialize Cache

```bash
# Stop Squid
sudo systemctl stop squid

# Create cache directories
sudo squid -z

# Start Squid
sudo systemctl start squid
```

## Bandwidth Control

### Delay Pools (Traffic Shaping)

```squid
# Define delay pools
delay_pools 2

# Pool 1: Unlimited for admins
delay_class 1 1
delay_parameters 1 -1/-1
delay_access 1 allow admin_pc
delay_access 1 deny all

# Pool 2: Limited bandwidth for regular users (256KB/s per user)
delay_class 2 2
delay_parameters 2 524288/524288 262144/262144
delay_access 2 allow localnet
delay_access 2 deny all
```

Pool classes:
- Class 1: Single bucket (aggregate)
- Class 2: Aggregate + individual
- Class 3: Network + aggregate + individual

## Transparent Proxy

Intercept traffic without client configuration (requires routing setup):

```squid
# Transparent proxy port
http_port 3128 intercept
https_port 3129 intercept ssl-bump cert=/etc/squid/ssl/squid.pem

# For older Squid versions use 'transparent' instead of 'intercept'
```

Configure iptables to redirect traffic:

```bash
# Redirect HTTP traffic to Squid
sudo iptables -t nat -A PREROUTING -i eth0 -p tcp --dport 80 -j REDIRECT --to-port 3128

# Redirect HTTPS traffic (requires SSL bumping)
sudo iptables -t nat -A PREROUTING -i eth0 -p tcp --dport 443 -j REDIRECT --to-port 3129
```

## SSL/HTTPS Interception (SSL Bump)

**Warning**: SSL interception has privacy implications. Only use in appropriate contexts.

### Generate Certificate

```bash
# Create SSL directory
sudo mkdir -p /etc/squid/ssl
cd /etc/squid/ssl

# Generate CA certificate
sudo openssl req -new -newkey rsa:2048 -days 365 -nodes -x509 \
  -keyout squid-ca.key -out squid-ca.crt \
  -subj "/C=US/ST=State/L=City/O=Company/CN=Squid Proxy CA"

# Combine key and cert
sudo cat squid-ca.key squid-ca.crt > squid-ca.pem

# Generate DH parameters
sudo openssl dhparam -outform PEM -out dhparam.pem 2048

# Set permissions
sudo chown -R proxy:proxy /etc/squid/ssl
sudo chmod 600 /etc/squid/ssl/*
```

### Configure SSL Bump

```squid
# SSL bump configuration
http_port 3128 ssl-bump cert=/etc/squid/ssl/squid-ca.pem generate-host-certificates=on dynamic_cert_mem_cache_size=4MB

# SSL bump rules
acl step1 at_step SslBump1
ssl_bump peek step1
ssl_bump bump all

# SSL certificate database
sslcrtd_program /usr/lib/squid/security_file_certgen -s /var/lib/squid/ssl_db -M 4MB
```

Initialize SSL database:

```bash
sudo /usr/lib/squid/security_file_certgen -c -s /var/lib/squid/ssl_db -M 4MB
sudo chown -R proxy:proxy /var/lib/squid/ssl_db
```

## Logging and Monitoring

### Log Formats

```squid
# Custom log format
logformat combined %>a %ui %un [%tl] "%rm %ru HTTP/%rv" %Hs %<st "%{Referer}>h" "%{User-Agent}>h" %Ss:%Sh

# Use custom format
access_log /var/log/squid/access.log combined
```

### View Logs

```bash
# Real-time access log
sudo tail -f /var/log/squid/access.log

# Cache effectiveness
sudo tail -f /var/log/squid/cache.log

# Parse logs with squidclient
squidclient -h localhost cache_object://localhost/info
```

### Cache Statistics

```bash
# View cache statistics
squidclient -h localhost cache_object://localhost/counters

# Memory usage
squidclient -h localhost cache_object://localhost/mem

# Active connections
squidclient -h localhost cache_object://localhost/active_requests
```

## Client Configuration

### Linux/macOS

```bash
# Set environment variables
export http_proxy="http://proxy.local:3128"
export https_proxy="http://proxy.local:3128"
export no_proxy="localhost,127.0.0.1,.local"

# For authenticated proxy
export http_proxy="http://username:password@proxy.local:3128"
```

### Browser Configuration

Configure proxy settings:
- HTTP Proxy: proxy.local, Port: 3128
- HTTPS Proxy: proxy.local, Port: 3128
- Exceptions: localhost, 127.0.0.1

### Automatic Configuration (PAC)

Create PAC file:

```javascript
// proxy.pac
function FindProxyForURL(url, host) {
    // Direct connection for local addresses
    if (isPlainHostName(host) ||
        shExpMatch(host, "*.local") ||
        isInNet(host, "192.168.0.0", "255.255.0.0") ||
        isInNet(host, "10.0.0.0", "255.0.0.0")) {
        return "DIRECT";
    }
    // Use proxy for everything else
    return "PROXY proxy.local:3128";
}
```

## Firewall Configuration

```bash
# Allow Squid port
sudo ufw allow 3128/tcp

# If acting as transparent proxy
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Check status
sudo ufw status
```

## Troubleshooting

### Test Configuration

```bash
# Check syntax
sudo squid -k parse

# Debug mode
sudo squid -N -d 1
```

### Connection Issues

```bash
# Check Squid is listening
ss -tlnp | grep squid

# Test from client
curl -x http://proxy.local:3128 http://example.com

# Check logs
sudo tail -f /var/log/squid/access.log /var/log/squid/cache.log
```

### Permission Errors

```bash
# Fix cache directory permissions
sudo chown -R proxy:proxy /var/spool/squid
sudo chmod -R 750 /var/spool/squid

# Reinitialize cache
sudo squid -z
```

### Memory Issues

```bash
# Check memory usage
squidclient -h localhost cache_object://localhost/mem

# Reduce cache_mem if needed in squid.conf
```

---

Squid is highly configurable and can serve as a simple caching proxy or a complex content filtering gateway. Start with basic configuration and gradually add features like authentication, caching, and access controls based on your needs. Always test configuration changes before applying them in production.
