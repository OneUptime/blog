# How to Inspect SSL Certificates with openssl s_client on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, SSL/TLS, OpenSSL, Security

Description: Learn how to use openssl s_client to inspect SSL/TLS certificates on Ubuntu, including checking expiry dates, viewing certificate chains, testing protocols, and debugging TLS connections.

---

`openssl s_client` is the Swiss Army knife of SSL/TLS debugging. It connects to a server, performs the TLS handshake, and shows you everything: the certificate, the chain, the cipher suite negotiated, the TLS version, and more. Every system with OpenSSL installed - which is virtually every Ubuntu system - has this tool available.

## Basic Connection and Certificate Inspection

```bash
# Connect to a server and show the TLS handshake details
openssl s_client -connect example.com:443

# Add -servername for SNI (required for virtual hosting)
openssl s_client -connect example.com:443 -servername example.com

# Redirect /dev/null to stdin to prevent the command from waiting for input
openssl s_client -connect example.com:443 -servername example.com </dev/null
```

The output contains a lot of information. Understanding the sections:

```
CONNECTED(00000003)            # TCP connection established
depth=2 ...                    # Chain depth 2: root CA
verify return:1                # Verification passed
depth=1 ...                    # Chain depth 1: intermediate CA
verify return:1
depth=0 ...                    # Chain depth 0: server cert
verify return:1
---
Certificate chain              # List of certs presented
...
---
Server certificate             # The server's certificate in PEM format
...
---
SSL handshake has read ...     # Handshake statistics
---
SSL-Session:
    Protocol : TLSv1.3         # TLS version negotiated
    Cipher   : TLS_AES_256_GCM_SHA384  # Cipher suite
    ...
```

## Extracting Certificate Information

```bash
# View just the certificate details (no interactivity)
openssl s_client -connect example.com:443 -servername example.com </dev/null 2>/dev/null | \
    openssl x509 -noout -text

# View only the key fields
openssl s_client -connect example.com:443 -servername example.com </dev/null 2>/dev/null | \
    openssl x509 -noout -subject -issuer -dates -fingerprint

# Example output:
# subject=CN = example.com
# issuer=C = US, O = DigiCert Inc, CN = DigiCert TLS RSA SHA256 2020 CA1
# notBefore=Jan 13 00:00:00 2025 GMT
# notAfter=Feb 11 23:59:59 2026 GMT
# SHA1 Fingerprint=AB:CD:EF:...
```

## Checking Certificate Expiry

```bash
# Check when a certificate expires
openssl s_client -connect example.com:443 -servername example.com </dev/null 2>/dev/null | \
    openssl x509 -noout -enddate
# Output: notAfter=Feb 11 23:59:59 2026 GMT

# Calculate days until expiry
EXPIRY=$(openssl s_client -connect example.com:443 -servername example.com \
    </dev/null 2>/dev/null | openssl x509 -noout -enddate | cut -d= -f2)
EXPIRY_EPOCH=$(date -d "$EXPIRY" +%s)
NOW_EPOCH=$(date +%s)
DAYS=$(( (EXPIRY_EPOCH - NOW_EPOCH) / 86400 ))
echo "Certificate expires in $DAYS days"

# Check if certificate is expired (-checkend checks if it expires within N seconds)
openssl s_client -connect example.com:443 -servername example.com </dev/null 2>/dev/null | \
    openssl x509 -checkend 0
# Returns 0 (success) if not expired, 1 (failure) if expired

# Check if cert expires within 30 days (2592000 seconds)
openssl s_client -connect example.com:443 -servername example.com </dev/null 2>/dev/null | \
    openssl x509 -checkend 2592000
```

## Viewing Subject Alternative Names

Modern certificates use SANs to list all covered domains:

```bash
# View the SANs
openssl s_client -connect example.com:443 -servername example.com </dev/null 2>/dev/null | \
    openssl x509 -noout -text | grep -A 5 "Subject Alternative Name"

# Output:
# X509v3 Subject Alternative Name:
#     DNS:example.com, DNS:www.example.com
```

## Viewing the Full Certificate Chain

```bash
# Show all certificates in the chain presented by the server
openssl s_client -connect example.com:443 -servername example.com \
    -showcerts </dev/null

# Count the certificates in the chain
openssl s_client -connect example.com:443 -servername example.com \
    -showcerts </dev/null 2>/dev/null | grep -c "BEGIN CERTIFICATE"

# Show the subject of each cert in the chain
openssl s_client -connect example.com:443 -servername example.com \
    -showcerts </dev/null 2>/dev/null | \
    openssl x509 -noout -subject 2>/dev/null
# Note: This only shows the first cert. For all certs, see below.
```

To parse each certificate in the chain:

```bash
# Extract and analyze each certificate from the chain output
openssl s_client -connect example.com:443 -servername example.com \
    -showcerts </dev/null 2>/dev/null | \
    awk '/-----BEGIN CERTIFICATE-----/,/-----END CERTIFICATE-----/{
        if (/-----BEGIN CERTIFICATE-----/) cert="";
        cert = cert"\n"$0;
        if (/-----END CERTIFICATE-----/) print cert"\n---NEXT---";
    }' | \
    while IFS= read -r line; do
        if echo "$line" | grep -q "BEGIN CERTIFICATE"; then
            cert="$line"
        elif echo "$line" | grep -q "---NEXT---"; then
            echo "$cert" | openssl x509 -noout -subject -issuer -dates
            echo "---"
        else
            cert="$cert
$line"
        fi
    done
```

## Testing TLS Protocol Versions

```bash
# Test which TLS versions a server accepts

# TLS 1.3
openssl s_client -tls1_3 -connect example.com:443 -servername example.com </dev/null 2>&1 | \
    grep -E "Protocol|Cipher|error"

# TLS 1.2
openssl s_client -tls1_2 -connect example.com:443 -servername example.com </dev/null 2>&1 | \
    grep -E "Protocol|Cipher|error"

# TLS 1.1 (should fail on modern servers)
openssl s_client -tls1_1 -connect example.com:443 -servername example.com </dev/null 2>&1 | \
    grep -E "Protocol|error|handshake"

# TLS 1.0 (should fail on modern servers)
openssl s_client -tls1 -connect example.com:443 -servername example.com </dev/null 2>&1 | \
    grep -E "Protocol|error|handshake"
```

## Testing Specific Cipher Suites

```bash
# Test if a specific cipher suite is accepted
openssl s_client -cipher "ECDHE-RSA-AES256-GCM-SHA384" \
    -connect example.com:443 -servername example.com </dev/null 2>&1 | \
    grep -E "Cipher|error"

# List cipher suites the server prefers
openssl s_client -connect example.com:443 -servername example.com </dev/null 2>/dev/null | \
    grep "Cipher"
```

## Connecting to Non-HTTPS Services

`s_client` works with any TLS service:

```bash
# SMTP with STARTTLS
openssl s_client -connect mail.example.com:587 -starttls smtp

# IMAP with STARTTLS
openssl s_client -connect mail.example.com:143 -starttls imap

# LDAP with STARTTLS
openssl s_client -connect ldap.example.com:389 -starttls ldap

# MySQL TLS
openssl s_client -connect db.example.com:3306

# PostgreSQL TLS
openssl s_client -connect db.example.com:5432

# Redis TLS (port 6380 typically)
openssl s_client -connect redis.example.com:6380
```

## Testing Certificate Validation

```bash
# Verify certificate against system trust store
openssl s_client -connect example.com:443 -servername example.com \
    -CApath /etc/ssl/certs/ </dev/null 2>&1 | grep "Verify return code"

# Expected for a valid cert:
# Verify return code: 0 (ok)

# Common error codes:
# 2 - unable to get issuer certificate
# 10 - certificate has expired
# 18 - self-signed certificate
# 19 - self-signed certificate in chain
# 20 - unable to get local issuer certificate (missing intermediate)
# 21 - unable to verify first certificate

# Verify against a specific CA file
openssl s_client -connect internal-service.example.com:443 \
    -servername internal-service.example.com \
    -CAfile /etc/ssl/certs/internal-ca.crt </dev/null 2>&1 | \
    grep "Verify return code"
```

## Checking OCSP Stapling

```bash
# Check if OCSP stapling is configured on the server
openssl s_client -connect example.com:443 -servername example.com \
    -status </dev/null 2>/dev/null | grep -A 10 "OCSP response"

# If OCSP stapling is working, you'll see:
# OCSP Response Status: successful (0x0)
# Response Verify OK

# If not configured, you'll see:
# OCSP Response: no response sent
```

## Batch Certificate Inspection Script

```bash
#!/bin/bash
# check-certs.sh - Inspect SSL certificates for multiple domains

DOMAINS=(
    "example.com"
    "api.example.com"
    "internal-service.example.com"
)

ALERT_DAYS=30

echo "Certificate Status Report - $(date)"
echo "=================================="

for domain in "${DOMAINS[@]}"; do
    # Get certificate info
    CERT_INFO=$(openssl s_client -connect "${domain}:443" -servername "${domain}" \
        </dev/null 2>/dev/null | openssl x509 -noout -dates -subject 2>/dev/null)

    if [[ -z "$CERT_INFO" ]]; then
        echo "FAIL: $domain - Could not connect or no valid certificate"
        continue
    fi

    # Extract expiry date
    EXPIRY=$(echo "$CERT_INFO" | grep "notAfter" | cut -d= -f2)
    EXPIRY_EPOCH=$(date -d "$EXPIRY" +%s 2>/dev/null)
    NOW_EPOCH=$(date +%s)
    DAYS_LEFT=$(( (EXPIRY_EPOCH - NOW_EPOCH) / 86400 ))

    if [[ $DAYS_LEFT -lt 0 ]]; then
        echo "EXPIRED: $domain - Expired $((DAYS_LEFT * -1)) days ago"
    elif [[ $DAYS_LEFT -lt $ALERT_DAYS ]]; then
        echo "WARNING: $domain - Expires in $DAYS_LEFT days ($EXPIRY)"
    else
        echo "OK: $domain - Expires in $DAYS_LEFT days"
    fi
done
```

## Connecting Through a Proxy

```bash
# Connect through an HTTP proxy
openssl s_client -connect example.com:443 -proxy proxy.example.com:3128

# With proxy authentication
openssl s_client -connect example.com:443 \
    -proxy proxy.example.com:3128 \
    -proxy_user proxyuser -proxy_pass proxypass
```

## Summary

`openssl s_client` provides complete visibility into TLS connections - certificate details, chain integrity, protocol versions, cipher suites, and OCSP stapling status. The key pattern is `openssl s_client -connect host:port -servername host </dev/null 2>/dev/null | openssl x509 -noout -[option]` for extracting specific certificate fields. Use `-showcerts` to see the full chain, `-checkend` for expiry checks in scripts, and specific protocol flags like `-tls1_2` to test protocol support. These commands work for any TLS-enabled service, not just HTTPS.
