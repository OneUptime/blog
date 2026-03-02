# How to Configure OCSP Stapling on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, SSL/TLS, Nginx, Apache

Description: Learn how to configure OCSP stapling on Ubuntu with Nginx and Apache to improve TLS performance and certificate revocation checking without client-to-CA round trips.

---

When a browser connects to an HTTPS site, it needs to verify the server's certificate has not been revoked. The traditional approach is Online Certificate Status Protocol (OCSP) - the client contacts the CA's OCSP responder to check revocation status. This adds latency and creates a privacy issue (the CA learns which sites you're visiting). OCSP Stapling solves both problems: the server periodically fetches the OCSP response and "staples" it to the TLS handshake, so clients get revocation status without making a separate request.

## How OCSP Stapling Works

Without stapling:
1. Client connects to your server
2. Client separately contacts the CA's OCSP responder
3. CA confirms certificate is valid
4. Handshake completes

With stapling:
1. Your server periodically fetches the OCSP response from the CA
2. Client connects to your server
3. Server includes the pre-fetched OCSP response in the handshake
4. Handshake completes - no client-to-CA round trip needed

Benefits:
- Faster TLS handshake (one fewer round trip)
- Better privacy (CA doesn't see client connections)
- More reliable (client doesn't fail if CA's OCSP is slow)

## Configuring OCSP Stapling in Nginx

### Finding the OCSP Responder URL

Your certificate contains the URL of the CA's OCSP responder:

```bash
# Extract the OCSP URL from your certificate
openssl x509 -in /etc/letsencrypt/live/yourdomain.com/cert.pem -noout -text | \
    grep -A 3 "Authority Information Access"

# Output example:
# Authority Information Access:
#     OCSP - URI:http://r3.o.lencr.org
#     CA Issuers - URI:http://r3.i.letsencrypt.org/r3.der
```

### Nginx Configuration

```bash
sudo nano /etc/nginx/sites-available/yourdomain.com
```

```nginx
# OCSP Stapling configuration
# Add these lines to your server block or the http{} block

server {
    listen 443 ssl;
    server_name yourdomain.com;

    ssl_certificate     /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;

    # Enable OCSP Stapling
    ssl_stapling on;

    # Verify the OCSP response signature
    ssl_stapling_verify on;

    # Nginx needs the CA chain to verify the OCSP response
    # fullchain.pem includes the intermediate, so it can be used here
    ssl_trusted_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;

    # DNS resolver for Nginx to use when fetching OCSP responses
    # Use reliable resolvers; the server must be able to reach the OCSP URL
    resolver 8.8.8.8 8.8.4.4 valid=300s;
    resolver_timeout 5s;

    # Other TLS settings
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_prefer_server_ciphers off;

    # ... rest of server block
}
```

### Testing Nginx OCSP Stapling

```bash
# Test the configuration
sudo nginx -t

# Reload Nginx
sudo systemctl reload nginx

# Test OCSP stapling
# The first request may not include the stapled response (Nginx fetches it in the background)
# Wait a moment and test again
openssl s_client -connect yourdomain.com:443 -servername yourdomain.com \
    -status </dev/null 2>/dev/null | grep -A 10 "OCSP Response"

# Success output shows:
# OCSP Response Status: successful (0x0)
# This Update: Mar  2 10:00:00 2026 GMT
# Next Update: Mar  9 10:00:00 2026 GMT
# Response Verify OK

# If OCSP stapling is not yet cached:
# OCSP Response: no response sent
```

## Configuring OCSP Stapling in Apache

### Enabling Required Modules

```bash
# mod_ssl includes OCSP stapling support (Apache 2.3.3+)
sudo a2enmod ssl

# Verify mod_ssl is loaded
apache2ctl -M | grep ssl
```

### Apache Configuration

```bash
sudo nano /etc/apache2/sites-available/yourdomain.com.conf
```

```apache
# Enable OCSP Stapling at the server level (or in the VirtualHost)
# Note: SSLUseStapling must be set at global or virtual host level,
# not inside a <Location> block

# Set the OCSP stapling cache - required for stapling to work
SSLStaplingCache shmcb:/var/run/apache2/stapling_cache(128000)

<VirtualHost *:443>
    ServerName yourdomain.com

    SSLEngine on
    SSLCertificateFile    /etc/letsencrypt/live/yourdomain.com/fullchain.pem
    SSLCertificateKeyFile /etc/letsencrypt/live/yourdomain.com/privkey.pem

    # Enable OCSP Stapling
    SSLUseStapling on

    # How long to cache the OCSP response (seconds)
    # Default is 300; set based on the "Next Update" time in OCSP responses
    SSLStaplingStandardCacheTimeout 3600

    # How long to cache OCSP errors before retrying
    SSLStaplingErrorCacheTimeout 600

    # Timeout for fetching OCSP responses
    SSLStaplingResponderTimeout 5

    # If fetching OCSP fails, don't fail the handshake (recommended)
    SSLStaplingReturnResponderErrors off

    # ... rest of virtual host config
</VirtualHost>
```

```bash
# Test the Apache configuration
sudo apache2ctl configtest

# Reload Apache
sudo systemctl reload apache2

# Test OCSP stapling
openssl s_client -connect yourdomain.com:443 -servername yourdomain.com \
    -status </dev/null 2>/dev/null | grep -A 10 "OCSP"
```

## Manual OCSP Verification

You can manually query OCSP to understand what the server sees:

```bash
# Extract OCSP URL from the certificate
OCSP_URL=$(openssl x509 -in /etc/letsencrypt/live/yourdomain.com/cert.pem \
    -noout -text | grep -A 1 "OCSP" | grep "URI" | awk '{print $NF}')
echo "OCSP URL: $OCSP_URL"

# Query the OCSP responder manually
openssl ocsp \
    -issuer /etc/letsencrypt/live/yourdomain.com/chain.pem \
    -cert /etc/letsencrypt/live/yourdomain.com/cert.pem \
    -url "$OCSP_URL" \
    -resp_text

# Simplified: just show the status
openssl ocsp \
    -issuer /etc/letsencrypt/live/yourdomain.com/chain.pem \
    -cert /etc/letsencrypt/live/yourdomain.com/cert.pem \
    -url "$OCSP_URL" \
    -no_nonce 2>/dev/null | head -5

# Expected output:
# /etc/letsencrypt/live/yourdomain.com/cert.pem: good
# This Update: Mar  2 10:00:00 2026 GMT
# Next Update: Mar  9 10:00:00 2026 GMT
```

## Troubleshooting OCSP Stapling Issues

### "OCSP Response: no response sent"

Nginx fetches OCSP responses in the background. The first connection after startup or reload may not have a stapled response:

```bash
# Wait a few seconds after reloading, then test again
sudo systemctl reload nginx
sleep 5
openssl s_client -connect yourdomain.com:443 -servername yourdomain.com \
    -status </dev/null 2>/dev/null | grep "OCSP"
```

### Nginx Cannot Reach the OCSP Responder

Check if Nginx can resolve and reach the OCSP URL:

```bash
# Test DNS resolution for the OCSP host
nslookup r3.o.lencr.org 8.8.8.8

# Test HTTP connectivity to the OCSP endpoint
curl -v http://r3.o.lencr.org 2>&1 | head -20

# If behind a firewall, allow outbound HTTP (port 80) to the OCSP hosts
sudo ufw allow out 80/tcp
```

### "OCSP Response Verify Failure"

The `ssl_trusted_certificate` (Nginx) or CA chain must include the intermediate CA that signed the OCSP response:

```bash
# For Let's Encrypt, use chain.pem (just the intermediate) or fullchain.pem
# Don't use cert.pem alone - it doesn't include the intermediate

# Nginx: use the full chain for ssl_trusted_certificate
ssl_trusted_certificate /etc/letsencrypt/live/yourdomain.com/chain.pem;
```

### Apache OCSP Stapling Not Working

Apache logs OCSP-related messages in the error log:

```bash
# Check Apache error log for OCSP messages
sudo grep -i "ocsp\|stapling" /var/log/apache2/error.log | tail -20

# Common messages:
# "AH01941: stapling_cb: OCSP response not available for certificate"
# This means Apache couldn't fetch the OCSP response - check network connectivity
```

## Verifying Stapling is Working for End Users

Test from an external perspective to confirm clients see the stapled response:

```bash
# Use the -status flag with a connection (not just inspect the cert)
echo | openssl s_client \
    -connect yourdomain.com:443 \
    -servername yourdomain.com \
    -status 2>/dev/null | \
    grep -E "OCSP Response Status|Response Verify|This Update|Next Update"

# All four lines should appear with valid values for stapling to be working
```

Use an external checker for a third-party perspective:

```bash
# SSL Labs shows OCSP stapling status in the analysis report
# https://www.ssllabs.com/ssltest/analyze.html?d=yourdomain.com
# Look for "OCSP Stapling: Yes" in the results
```

## Summary

OCSP Stapling improves TLS performance and privacy by having your server pre-fetch and serve certificate revocation status. Configure it in Nginx with `ssl_stapling on`, `ssl_stapling_verify on`, `ssl_trusted_certificate`, and a `resolver`. In Apache, set `SSLUseStapling on` and `SSLStaplingCache`. The first connection after a reload may not have a stapled response while the server fetches it; subsequent connections will include it. Verify with `openssl s_client -status` and look for `OCSP Response Status: successful`. Ensure your server has outbound HTTP access to the CA's OCSP responder URL.
