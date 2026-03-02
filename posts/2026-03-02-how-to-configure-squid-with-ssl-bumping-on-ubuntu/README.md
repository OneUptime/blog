# How to Configure Squid with SSL Bumping on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Squid, Proxy, SSL, Network Security

Description: Learn how to configure Squid proxy with SSL bumping on Ubuntu to inspect HTTPS traffic, enabling content filtering and monitoring of encrypted connections.

---

Squid is a mature, high-performance caching proxy that handles both HTTP and HTTPS traffic. SSL bumping (also called SSL interception or HTTPS inspection) allows Squid to decrypt, inspect, and re-encrypt HTTPS traffic. This technique is used in corporate environments for content filtering, DLP (data loss prevention), and security monitoring.

This guide covers compiling or installing Squid with SSL support enabled, generating the necessary CA certificate, and configuring SSL bumping with content filtering.

## How SSL Bumping Works

SSL bumping works through a man-in-the-middle approach where your organization controls both ends:

1. Client connects to Squid and initiates a TLS handshake
2. Squid intercepts the handshake and generates a fake certificate for the destination site, signed by your internal CA
3. Clients trust your internal CA (you deploy it to their trust stores)
4. Squid establishes a separate TLS connection to the actual destination
5. Squid can now inspect the decrypted traffic before forwarding it

This is legitimate when deployed in your own organization with proper disclosure to users.

## Prerequisites

- Ubuntu 22.04 or 24.04
- Root access
- Clients that will use this proxy must have your CA certificate installed

## Installing Squid with SSL Support

Ubuntu's default Squid package may not have SSL bumping compiled in. Check first:

```bash
squid -v 2>&1 | grep -o "ssl-bump\|--with-openssl"
```

If SSL bump is not present, install the Squid with SSL package:

```bash
sudo apt update

# On Ubuntu 22.04+, use the version with SSL support
sudo apt install -y squid-openssl

# Verify SSL bump is available
squid -v 2>&1 | grep ssl
```

## Generating the CA Certificate

Squid needs a CA certificate and key to sign the fake certificates it generates for bumped connections:

```bash
# Create a directory for Squid's SSL certificates
sudo mkdir -p /etc/squid/ssl_cert
sudo chown proxy:proxy /etc/squid/ssl_cert
sudo chmod 700 /etc/squid/ssl_cert

# Generate the CA key and self-signed certificate
sudo openssl req -new -newkey rsa:4096 -days 3650 -nodes -x509 \
  -keyout /etc/squid/ssl_cert/squid-ca.key \
  -out /etc/squid/ssl_cert/squid-ca.crt \
  -subj "/C=US/ST=State/L=City/O=YourOrg/CN=Squid CA"

# Set permissions
sudo chown proxy:proxy /etc/squid/ssl_cert/squid-ca.key
sudo chown proxy:proxy /etc/squid/ssl_cert/squid-ca.crt
sudo chmod 600 /etc/squid/ssl_cert/squid-ca.key
```

## Initializing the SSL Certificate Database

Squid uses a disk cache for generated SSL certificates to avoid regenerating them on every connection:

```bash
# Create and initialize the SSL certificate cache database
sudo /usr/lib/squid/security_file_certgen -c -s /var/spool/squid/ssl_db -M 4MB

# Set proper ownership
sudo chown -R proxy:proxy /var/spool/squid/ssl_db
```

## Writing the Squid Configuration

```bash
sudo cp /etc/squid/squid.conf /etc/squid/squid.conf.bak
sudo nano /etc/squid/squid.conf
```

```squid
# /etc/squid/squid.conf

# ============================================
# Access Control Lists (ACLs)
# ============================================

# Define the local network that can use this proxy
acl localnet src 192.168.0.0/16
acl localnet src 10.0.0.0/8
acl localnet src 172.16.0.0/12

# Standard ports
acl SSL_ports port 443
acl Safe_ports port 80          # http
acl Safe_ports port 443         # https
acl Safe_ports port 21          # ftp
acl Safe_ports port 70          # gopher
acl Safe_ports port 210         # wais
acl Safe_ports port 1025-65535  # unregistered ports
acl Safe_ports port 280         # http-mgmt
acl Safe_ports port 488         # gss-http
acl Safe_ports port 591         # filemaker
acl Safe_ports port 777         # multiling http

acl CONNECT method CONNECT

# SSL bump step ACLs
acl step1 at_step SslBump1
acl step2 at_step SslBump2
acl step3 at_step SslBump3

# Define domains to never bump (banking, healthcare, etc.)
acl nobump_domains dstdomain .bank.com
acl nobump_domains dstdomain .healthcare.gov
acl nobump_domains dstdomain .paypal.com

# Define blocked categories (add more as needed)
acl blocked_domains dstdomain "/etc/squid/blocked_domains.txt"

# ============================================
# HTTP Access Rules
# ============================================

# Deny requests to unknown ports
http_access deny !Safe_ports

# Deny CONNECT to non-SSL ports
http_access deny CONNECT !SSL_ports

# Allow localhost management
http_access allow localhost manager
http_access deny manager

# Allow local clients
http_access allow localnet

# Deny blocked domains
http_access deny blocked_domains

# Deny everyone else
http_access deny all

# ============================================
# Listening Ports
# ============================================

# Standard HTTP proxy port
http_port 3128

# Transparent interception port for HTTPS
https_port 3129 intercept \
    ssl-bump \
    generate-host-certificates=on \
    dynamic_cert_mem_cache_size=16MB \
    cert=/etc/squid/ssl_cert/squid-ca.crt \
    key=/etc/squid/ssl_cert/squid-ca.key

# ============================================
# SSL Bump Rules
# ============================================

# Peek at the SNI (Server Name Indication) to get the hostname
ssl_bump peek step1

# Don't bump certain domains (splice = transparent passthrough)
ssl_bump splice nobump_domains

# Bump everything else (terminate client SSL and re-encrypt to server)
ssl_bump bump all

# ============================================
# Certificate Generation
# ============================================

# Path to the cert generator helper
sslcrtd_program /usr/lib/squid/security_file_certgen \
    -s /var/spool/squid/ssl_db \
    -M 4MB

# Number of cert generator processes
sslcrtd_children 8 startup=1 idle=1

# ============================================
# Caching Configuration
# ============================================

# Cache directory (100MB in this example)
cache_dir ufs /var/spool/squid 100 16 256

# Memory cache size
cache_mem 256 MB

# Maximum object size to cache (in memory and on disk)
maximum_object_size_in_memory 512 KB
maximum_object_size 50 MB

# ============================================
# Logging
# ============================================

access_log /var/log/squid/access.log squid
cache_log /var/log/squid/cache.log

# Log format that includes SSL bumped domains
logformat squid %ts.%03tu %6tr %>a %Ss/%03>Hs %<st %rm %ru %[un %Sh/%<a %mt

# ============================================
# Performance Settings
# ============================================

# DNS servers
dns_nameservers 8.8.8.8 8.8.4.4

# Connection limits
client_request_buffer_max_size 64 KB
request_header_max_size 64 KB
```

## Creating the Blocked Domains List

```bash
sudo nano /etc/squid/blocked_domains.txt
```

```
# One domain per line, with leading dot for all subdomains
.malware-site.com
.phishing-example.net
# Add your organization's blocked domains here
```

## Distributing the CA Certificate to Clients

For SSL bumping to work transparently, clients must trust your CA:

```bash
# Export the CA certificate for distribution
sudo cp /etc/squid/ssl_cert/squid-ca.crt /var/www/html/squid-ca.crt
```

**On client Ubuntu/Debian machines:**
```bash
sudo cp squid-ca.crt /usr/local/share/ca-certificates/squid-ca.crt
sudo update-ca-certificates
```

**On client Windows machines:**
Double-click the .crt file and install it in the "Trusted Root Certification Authorities" store for the local machine (not just the current user).

**For Firefox:** Firefox uses its own certificate store. Go to Settings > Privacy & Security > View Certificates > Authorities > Import.

## Starting and Testing Squid

```bash
# Initialize the cache directories
sudo squid -z

# Check the configuration for errors
sudo squid -k check

# Start Squid
sudo systemctl enable squid
sudo systemctl start squid
sudo systemctl status squid

# Test HTTP proxying
curl --proxy http://localhost:3128 http://httpbin.org/ip

# Test HTTPS bumping
curl --proxy http://localhost:3128 https://httpbin.org/ip --cacert /etc/squid/ssl_cert/squid-ca.crt
```

## Checking the Logs

```bash
# Watch real-time access log
sudo tail -f /var/log/squid/access.log

# View blocked requests
sudo grep "TCP_DENIED" /var/log/squid/access.log

# Check cache performance
sudo squidclient -h localhost mgr:info
```

## Firewall Rules for Transparent Interception

For transparent interception (where clients don't need to configure a proxy), redirect traffic using iptables:

```bash
# Redirect outbound HTTP to Squid
sudo iptables -t nat -A PREROUTING -i eth0 -p tcp --dport 80 \
  -j REDIRECT --to-port 3128

# Redirect outbound HTTPS to Squid's SSL bump port
sudo iptables -t nat -A PREROUTING -i eth0 -p tcp --dport 443 \
  -j REDIRECT --to-port 3129

# Save rules
sudo apt install -y iptables-persistent
sudo netfilter-persistent save
```

Monitor your Squid proxy's availability and performance with [OneUptime](https://oneuptime.com) to ensure traffic filtering remains active and accessible to your clients.
