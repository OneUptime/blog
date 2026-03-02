# How to Set Up Squid with HTTPS Interception on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Squid, Proxy, Security, Networking

Description: Configure Squid proxy to intercept and inspect HTTPS traffic on Ubuntu using SSL bumping, including certificate generation and client configuration.

---

Squid's SSL bumping feature allows the proxy to decrypt, inspect, and re-encrypt HTTPS traffic. This is used in enterprise environments to enforce content filtering policies on encrypted traffic, scan for malware, or log HTTPS requests for compliance purposes.

This requires deploying a custom CA certificate on client machines, as each intercepted connection will present a certificate signed by Squid's CA rather than the original server's CA.

## Prerequisites and Considerations

Before proceeding, understand that HTTPS interception is a form of man-in-the-middle inspection. It requires:

- A CA certificate installed and trusted on all client machines
- Squid compiled with SSL support
- Proper legal authorization if this is a corporate environment

Install Squid with SSL support:

```bash
sudo apt update
# The standard Ubuntu package may not include SSL bumping support
# Check if it does
squid -v | grep ssl

# If not included, install from a PPA or compile with SSL
sudo apt install squid-openssl -y
```

## Generating the CA Certificate

Squid needs its own CA to sign the fake certificates it generates for each intercepted domain:

```bash
# Create a directory for Squid SSL files
sudo mkdir -p /etc/squid/ssl_cert
cd /etc/squid/ssl_cert

# Generate a private key (4096-bit RSA)
sudo openssl genrsa -out squid-ca-key.pem 4096

# Generate the self-signed CA certificate (valid for 5 years)
sudo openssl req -new -x509 -days 1826 -key squid-ca-key.pem \
    -out squid-ca-cert.pem \
    -subj "/C=US/ST=State/L=City/O=Your Organization/CN=Squid Proxy CA"

# Create a combined PEM file (Squid requires both in one file)
sudo cat squid-ca-cert.pem squid-ca-key.pem | sudo tee squid-ca.pem

# Set proper permissions
sudo chmod 600 /etc/squid/ssl_cert/squid-ca.pem
sudo chown proxy:proxy /etc/squid/ssl_cert/squid-ca.pem
```

## Initialize the SSL Database

Squid stores generated certificates in a database:

```bash
# Create the SSL certificate cache database
sudo /usr/lib/squid/security_file_certgen -c -s /var/spool/squid/ssl_db -M 4MB

# Set ownership
sudo chown -R proxy:proxy /var/spool/squid/ssl_db
```

## Configuring Squid for SSL Interception

Edit the Squid configuration:

```bash
sudo nano /etc/squid/squid.conf
```

Add this SSL bumping configuration:

```squid
# /etc/squid/squid.conf

# Port for transparent HTTPS interception
# mode=intercept means traffic is redirected by iptables
http_port 3128 ssl-bump \
    cert=/etc/squid/ssl_cert/squid-ca.pem \
    generate-host-certificates=on \
    dynamic_cert_mem_cache_size=4MB

# Port for explicit proxy (clients configured to use this proxy)
https_port 3129 intercept ssl-bump \
    cert=/etc/squid/ssl_cert/squid-ca.pem \
    generate-host-certificates=on \
    dynamic_cert_mem_cache_size=4MB

# SSL certificate generator helper
sslcrtd_program /usr/lib/squid/security_file_certgen \
    -s /var/spool/squid/ssl_db \
    -M 4MB

# Number of certificate generator processes
sslcrtd_children 8 startup=1 idle=1

# SSL bump rules
# Step 1: Peek at the SNI (Server Name Indication) to get the hostname
acl step1 at_step SslBump1

# Bump (intercept) all HTTPS connections
ssl_bump peek step1
ssl_bump bump all

# Do not verify server certificates (needed for sites with bad certs)
# Remove this in production if you want to enforce cert validity
sslproxy_cert_error allow all

# Access control
acl localnet src 192.168.0.0/16
acl localnet src 10.0.0.0/8

http_access allow localnet
http_access deny all
```

## More Granular Bump Control

You likely do not want to intercept all HTTPS traffic - banking sites, for instance, should be excluded:

```squid
# Define a list of sites to NOT intercept (SSL splice instead of bump)
acl no_intercept dstdomain .bankofamerica.com
acl no_intercept dstdomain .chase.com
acl no_intercept dstdomain .wellsfargo.com
acl no_intercept dstdomain /etc/squid/no_intercept_domains.txt

# Peek at all connections first
ssl_bump peek step1

# Splice (pass through without decryption) excluded domains
ssl_bump splice no_intercept

# Bump (intercept) everything else
ssl_bump bump all
```

Create the domain list file:

```bash
sudo nano /etc/squid/no_intercept_domains.txt
# Add one domain per line:
# .bankofamerica.com
# .paypal.com
# .google.com
```

## Distributing the CA Certificate to Clients

Clients must trust Squid's CA certificate, otherwise they will see browser security warnings:

```bash
# Export the certificate for distribution
sudo cp /etc/squid/ssl_cert/squid-ca-cert.pem /var/www/html/squid-ca.crt
```

**On Ubuntu/Debian clients:**

```bash
# Copy certificate to trust store
sudo cp squid-ca-cert.pem /usr/local/share/ca-certificates/squid-proxy-ca.crt
sudo update-ca-certificates
```

**On Windows clients** via Group Policy:
- Deploy the `.cer` file through Computer Configuration > Policies > Windows Settings > Security Settings > Public Key Policies > Trusted Root Certification Authorities

**For Firefox** (which uses its own certificate store):
- Firefox requires separate import under Settings > Privacy & Security > Certificates > Import

## Setting Up Traffic Redirection with iptables

For transparent interception, redirect traffic to Squid:

```bash
# Redirect HTTP (port 80) to Squid port 3128
sudo iptables -t nat -A PREROUTING -i eth0 -p tcp --dport 80 \
    -j REDIRECT --to-port 3128

# Redirect HTTPS (port 443) to Squid SSL bumping port 3129
sudo iptables -t nat -A PREROUTING -i eth0 -p tcp --dport 443 \
    -j REDIRECT --to-port 3129

# Save iptables rules
sudo apt install iptables-persistent -y
sudo netfilter-persistent save
```

## Starting and Testing Squid

```bash
# Check configuration syntax
sudo squid -k parse

# Start Squid
sudo systemctl start squid
sudo systemctl enable squid

# Check it is running
sudo systemctl status squid

# Monitor the access log
sudo tail -f /var/log/squid/access.log
```

Test with curl on a client machine configured to use the proxy:

```bash
# Test HTTP
curl -x http://proxy-server:3128 http://example.com

# Test HTTPS interception
curl -x http://proxy-server:3128 https://example.com

# If the CA cert is not trusted yet, bypass with -k for testing
curl -k -x http://proxy-server:3128 https://example.com
```

Check what certificate Squid presents:

```bash
# Connect and inspect the certificate chain
openssl s_client -proxy proxy-server:3128 -connect example.com:443 2>/dev/null | \
    openssl x509 -noout -subject -issuer
```

The issuer should show your Squid CA, not the original certificate issuer.

## Logging and Monitoring

```bash
# Access log shows both HTTP and HTTPS requests
sudo tail -f /var/log/squid/access.log

# Filter for HTTPS connections
sudo grep "CONNECT" /var/log/squid/access.log | tail -50

# Check SSL bump activity
sudo grep "SSL_bump" /var/log/squid/cache.log
```

HTTPS interception is powerful but carries responsibility. Ensure you have proper authorization and that employees are informed, as required by law in many jurisdictions.
