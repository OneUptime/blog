# How to Configure Squid SSL Bump for HTTPS Interception on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Squid, SSL Bump, HTTPS, Proxy, Security, Linux

Description: Configure Squid's SSL Bump feature on RHEL to inspect and cache HTTPS traffic by dynamically generating certificates, with proper CA setup and client trust configuration.

---

Squid SSL Bump allows the proxy to intercept HTTPS connections by dynamically generating certificates. This enables caching, logging, and content filtering of encrypted traffic. Note that this has significant privacy implications and should only be used in environments where users are informed.

## Install Squid with SSL Support

```bash
# Check if Squid was built with SSL support
squid -v | grep -- '--with-openssl'

# If not, you may need to rebuild Squid with SSL support
# On RHEL, the default Squid package typically includes SSL support
sudo dnf install -y squid openssl
```

## Generate a CA Certificate

```bash
# Create a directory for SSL certificates
sudo mkdir -p /etc/squid/ssl
cd /etc/squid/ssl

# Generate a CA private key and certificate
sudo openssl req -new -newkey rsa:4096 -sha256 -days 3650 -nodes \
  -x509 -extensions v3_ca \
  -keyout squid-ca-key.pem \
  -out squid-ca-cert.pem \
  -subj "/C=US/ST=State/L=City/O=Organization/CN=Squid Proxy CA"

# Combine key and cert into one file for Squid
sudo cat squid-ca-cert.pem squid-ca-key.pem | sudo tee squid-ca.pem > /dev/null

# Set permissions
sudo chown squid:squid /etc/squid/ssl/*
sudo chmod 600 /etc/squid/ssl/squid-ca-key.pem
sudo chmod 644 /etc/squid/ssl/squid-ca-cert.pem
```

## Initialize the SSL Certificate Database

```bash
# Create the certificate database directory
sudo /usr/lib64/squid/security_file_certgen -c -s /var/spool/squid/ssl_db -M 64MB

# Set ownership
sudo chown -R squid:squid /var/spool/squid/ssl_db
```

## Configure Squid for SSL Bump

```bash
sudo tee /etc/squid/squid.conf << 'CONF'
# Standard HTTP proxy port
http_port 3128

# HTTPS interception port with SSL bump
https_port 3129 intercept ssl-bump \
  cert=/etc/squid/ssl/squid-ca.pem \
  generate-host-certificates=on \
  dynamic_cert_mem_cache_size=16MB

# SSL bump certificate generation helper
sslcrtd_program /usr/lib64/squid/security_file_certgen \
  -s /var/spool/squid/ssl_db \
  -M 64MB
sslcrtd_children 8

# SSL bump ACLs
acl step1 at_step SslBump1

# Peek at the server name first, then bump the connection
ssl_bump peek step1
ssl_bump bump all

# Or selectively bump - splice (pass through) certain domains
# acl nobump dstdomain .example.com .bank.com
# ssl_bump splice nobump
# ssl_bump bump all

# Standard ACLs
acl localnet src 10.0.0.0/8
acl localnet src 192.168.0.0/16
acl Safe_ports port 80
acl Safe_ports port 443

http_access allow localnet
http_access allow localhost
http_access deny all

# TLS outgoing settings
tls_outgoing_options min-version=1.2

# Cache
cache_dir ufs /var/spool/squid 5000 16 256
cache_mem 256 MB

# Logging
access_log /var/log/squid/access.log squid

visible_hostname proxy.example.com
CONF
```

## Start Squid

```bash
# Verify configuration
sudo squid -k parse

# Initialize cache
sudo squid -z

# Start Squid
sudo systemctl enable --now squid
sudo systemctl status squid
```

## Distribute the CA Certificate to Clients

Clients must trust the Squid CA certificate to avoid SSL warnings:

```bash
# On RHEL/CentOS clients
sudo cp /etc/squid/ssl/squid-ca-cert.pem /etc/pki/ca-trust/source/anchors/squid-ca.pem
sudo update-ca-trust

# On Ubuntu/Debian clients
sudo cp /etc/squid/ssl/squid-ca-cert.pem /usr/local/share/ca-certificates/squid-ca.crt
sudo update-ca-certificates

# For Firefox (uses its own certificate store)
# Import via Preferences > Privacy & Security > Certificates > View Certificates > Import
```

## Test HTTPS Interception

```bash
# From a client configured to use the proxy
export https_proxy=http://proxy.example.com:3128
curl https://www.example.com

# Verify the certificate chain
openssl s_client -connect www.example.com:443 -proxy proxy.example.com:3128 2>/dev/null | \
  openssl x509 -noout -issuer
# Should show your Squid CA as the issuer
```

## Exclude Sensitive Sites

```bash
# Add to squid.conf to skip SSL bump for banking and sensitive sites
acl nobump_domains dstdomain .bank.com .paypal.com .healthcare.gov
ssl_bump splice nobump_domains
```

SSL Bump should be used responsibly and only in environments where users have been notified. Many organizations require written policies before deploying HTTPS interception.
