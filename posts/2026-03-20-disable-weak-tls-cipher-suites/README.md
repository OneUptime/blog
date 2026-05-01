# How to Disable Weak TLS Cipher Suites on a Web Server

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: TLS, Cipher Suites, Security, Nginx, Apache, Hardening

Description: Learn how to identify and disable weak TLS cipher suites on Nginx and Apache web servers, replacing them with modern AEAD ciphers for stronger security.

## Why Cipher Suite Selection Matters

Cipher suites define the algorithms used for a TLS session. Weak ciphers like RC4, DES, 3DES, and EXPORT-grade ciphers have known vulnerabilities that allow traffic decryption or manipulation. Modern servers should only accept AEAD (Authenticated Encryption with Associated Data) cipher suites.

## Cipher Suite Components

A cipher suite like `ECDHE-RSA-AES256-GCM-SHA384` breaks down as:
- `ECDHE` - Key exchange (Elliptic Curve Diffie-Hellman Ephemeral)
- `RSA` - Certificate authentication
- `AES256-GCM` - Encryption algorithm
- `SHA384` - PRF hash in TLS 1.2; GCM provides record integrity

## Step 1: Audit Current Cipher Suites

Check which ciphers your server currently accepts:

```bash
# Using testssl.sh (recommended)

git clone --depth 1 https://github.com/testssl/testssl.sh.git
cd testssl.sh
./testssl.sh example.com

# Using nmap
nmap --script ssl-enum-ciphers -p 443 example.com

# Quick check with openssl (shows negotiated cipher only)
openssl s_client -connect example.com:443 -servername example.com < /dev/null 2>/dev/null | grep Cipher
```

Look for RC4, DES/3DES, EXPORT, MD5, or CBC-based suites if your goal is an AEAD-only configuration.

## Step 2: Configure Strong Cipher Suites in Nginx

```nginx
# /etc/nginx/conf.d/ssl.conf

# TLS protocols (disable TLS 1.0 and 1.1)
ssl_protocols TLSv1.2 TLSv1.3;

# Strong TLS 1.2 cipher suites (TLS 1.3 ciphersuites are configured separately)
# These are ECDHE with AES-GCM or CHACHA20-POLY1305 (AEAD ciphers only)
ssl_ciphers 'ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384:ECDHE-ECDSA-CHACHA20-POLY1305:ECDHE-RSA-CHACHA20-POLY1305';

# Leave TLS 1.2 cipher ordering to the client
ssl_prefer_server_ciphers off;
```

## Step 3: Configure Strong Cipher Suites in Apache

```apache
# /etc/apache2/mods-enabled/ssl.conf or your VirtualHost

SSLProtocol all -SSLv3 -TLSv1 -TLSv1.1

# Strong TLS 1.2 cipher suites; TLS 1.3 ciphersuites are configured separately
SSLCipherSuite ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384:ECDHE-ECDSA-CHACHA20-POLY1305:ECDHE-RSA-CHACHA20-POLY1305

SSLHonorCipherOrder off
```

## Step 4: Ciphers to Explicitly Disable

The following cipher categories should not be enabled on a typical public web server:

```bash
# Ciphers to avoid (using OpenSSL exclusion syntax with !):
# !aNULL   - No authentication (anonymous, allows MITM)
# !eNULL   - No encryption
# !EXPORT  - Export-grade (40/56-bit, crackable)
# !RC4     - RC4 (statistical bias, NOMORE attack)
# !DES     - DES (56-bit, brute-forceable)
# !3DES    - Triple DES (SWEET32 attack, 64-bit blocks)
# !MD5     - MD5-based suites (legacy/insecure)
# !PSK     - Pre-shared key (usually unused)
# !SRP     - Secure Remote Password (usually unused)

# Example TLS 1.2 cipher string for Nginx:
ssl_ciphers 'ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384:ECDHE-ECDSA-CHACHA20-POLY1305:ECDHE-RSA-CHACHA20-POLY1305:!aNULL:!eNULL:!EXPORT:!RC4:!DES:!3DES:!MD5:!PSK:!SRP';
```

## Step 5: Test After Changes

```bash
# Reload web server
sudo nginx -t && sudo systemctl reload nginx
# or
sudo apache2ctl configtest && sudo systemctl reload apache2

# Test with testssl.sh - look for no "WEAK" or "INSECURE" ciphers
./testssl.sh example.com

# Verify legacy TLS 1.2 CBC suites are rejected
openssl s_client -connect example.com:443 -servername example.com -tls1_2 \
  -cipher 'ECDHE-ECDSA-AES128-SHA:ECDHE-RSA-AES128-SHA' < /dev/null 2>&1 | \
  grep -Ei 'alert|handshake failure|Cipher is \(NONE\)|no cipher'
# Should fail because only AEAD TLS 1.2 suites are enabled

# Verify strong ciphers are accepted
openssl s_client -connect example.com:443 -servername example.com -tls1_2 \
  -cipher 'ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384:ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256' \
  < /dev/null 2>&1 | \
  grep "Cipher is"
```

## Step 6: Mozilla SSL Configuration Generator

Use the Mozilla SSL Configuration Generator for pre-built recommended configurations:

```bash
# Access the generator at: https://ssl-config.mozilla.org/
# Choose:
# - Server: Nginx / Apache
# - Mozilla Configuration: Modern (TLS 1.3 only) or Intermediate (TLS 1.2+1.3)
# - OpenSSL Version: (match your installed version)
```

The "Modern" profile supports only TLS 1.3; "Intermediate" supports TLS 1.2 and 1.3 for broader compatibility.

## Conclusion

Disabling weak TLS cipher suites reduces attack surface significantly. Configure Nginx or Apache to use only AEAD cipher suites (AES-GCM and CHACHA20-POLY1305), disable TLS 1.0 and 1.1, and exclude `aNULL`, `eNULL`, `EXPORT`, `RC4`, `DES`, `3DES`, and `MD5` explicitly. Use testssl.sh to audit your configuration and the Mozilla SSL Configuration Generator for ready-to-use hardened configurations.
