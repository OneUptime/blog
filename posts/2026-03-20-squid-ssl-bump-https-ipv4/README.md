# How to Configure Squid SSL Bump for HTTPS Interception on IPv4

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Squid, SSL Bump, HTTPS, IPv4, Interception, Security, TLS

Description: Configure Squid SSL Bump to intercept and inspect HTTPS traffic on IPv4, generating dynamic certificates for transparent TLS decryption.

## Introduction

SSL Bump allows Squid to decrypt HTTPS connections for inspection, filtering, and caching. Squid generates fake certificates signed by a trusted local CA, allowing it to act as a man-in-the-middle between clients and servers.

## Prerequisites

Generate a local CA certificate for Squid to sign bumped connections:

```bash
# Generate CA key and certificate
sudo mkdir -p /etc/squid/ssl

sudo openssl req -new -newkey rsa:4096 -sha256 -days 3650 -noenc -x509 \
  -subj "/C=US/O=Corporate CA/CN=Squid Proxy CA" \
  -addext "basicConstraints=critical,CA:TRUE" \
  -addext "keyUsage=critical,keyCertSign,cRLSign" \
  -keyout /etc/squid/ssl/squid.key \
  -out /etc/squid/ssl/squid.crt

# Combine into PEM bundle
sudo sh -c 'cat /etc/squid/ssl/squid.crt /etc/squid/ssl/squid.key > /etc/squid/ssl/squid.pem'
sudo chmod 600 /etc/squid/ssl/squid.pem

# Create SSL certificate database directory
sudo /usr/lib/squid/security_file_certgen -c -s /var/lib/squid/ssl_db -M 4MB

# Allow Squid's runtime user to write the certificate database
# On some distributions, replace proxy:proxy with squid:squid
sudo chown -R proxy:proxy /var/lib/squid/ssl_db
```

Distribute `squid.crt` to clients as a trusted CA certificate.

## Squid SSL Bump Configuration

```bash
# /etc/squid/squid.conf

# SSL bump port
http_port 0.0.0.0:3128 ssl-bump \
    tls-cert=/etc/squid/ssl/squid.pem \
    generate-host-certificates=on \
    dynamic_cert_mem_cache_size=4MB

# Required for SSL certificate generation
sslcrtd_program /usr/lib/squid/security_file_certgen -s /var/lib/squid/ssl_db -M 4MB
sslcrtd_children 5

# SSL bump ACLs
acl ssl_step1 at_step SslBump1
acl ssl_step2 at_step SslBump2
acl ssl_step3 at_step SslBump3

# Define sites to NOT bump (banking, sensitive sites)
acl no_bump ssl::server_name .bank.com .healthcare.gov .myfinance.com

# SSL bump rules:
# peek: read the TLS ClientHello so SNI is available at Step 2
# bump: perform full MITM interception
# splice: pass through without interception (for no_bump sites)
ssl_bump peek ssl_step1
ssl_bump splice no_bump
ssl_bump bump all

# Access control
acl localnet src 192.168.0.0/16
http_access allow localnet
http_access deny all
```

## Transparent HTTPS Interception with iptables

For transparent mode (no client proxy settings):

```bash
# Redirect HTTPS traffic to Squid SSL bump port
iptables -t nat -A PREROUTING \
  -i eth1 \
  -s 192.168.0.0/24 \
  -p tcp --dport 443 \
  -j REDIRECT --to-ports 3129

# Also need a matching intercepted HTTPS port:
# https_port 3129 intercept ssl-bump tls-cert=/etc/squid/ssl/squid.pem generate-host-certificates=on dynamic_cert_mem_cache_size=4MB
```

## Deploying the CA Certificate to Clients

```bash
# Debian/Ubuntu clients: add to system trust store
sudo cp /etc/squid/ssl/squid.crt /usr/local/share/ca-certificates/squid-ca.crt
sudo update-ca-certificates

# Browser-specific: import squid.crt into Firefox/Chrome certificate stores

# Test that bumping works
curl -x http://proxy-server:3128 https://httpbin.org/ip
# Should succeed and show proxy's outbound IP
```

## Monitoring SSL Bump Activity

```bash
# View explicit HTTPS CONNECT requests in access log
sudo tail -f /var/log/squid/access.log | grep CONNECT

# Check SSL certificate cache usage
sudo du -sh /var/lib/squid/ssl_db

# Check for certificate generation errors
sudo tail -f /var/log/squid/cache.log | grep ssl
```

## Conclusion

Squid SSL Bump enables HTTPS inspection by generating per-site certificates signed by a trusted CA. Deploy the CA certificate to client browsers, configure `ssl_bump peek/splice/bump` rules to control which sites are intercepted, and always create an exclusion list for sensitive financial and healthcare sites. SSL Bump has significant privacy and legal implications-use only on networks where users have given informed consent.
