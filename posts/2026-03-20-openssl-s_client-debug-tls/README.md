# How to Use openssl s_client to Debug TLS Connections

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenSSL, TLS, Debugging, SSL, Security, Network Troubleshooting

Description: Learn how to use the openssl s_client command to inspect TLS certificates, test protocol versions, debug handshakes, and troubleshoot HTTPS connection issues.

## What Is openssl s_client?

`openssl s_client` is a diagnostic tool that acts as a TLS client and connects to a server, showing the complete details of the TLS handshake, certificate chain, and session parameters. It's the go-to tool for TLS debugging.

## Basic Connection Test

```bash
# Basic connection to a server

openssl s_client -connect example.com:443

# If successful, you'll see the certificate chain, session details,
# and an interactive prompt where you can type HTTP commands
```

After connecting, press Enter twice to see a response, or type:
```text
GET / HTTP/1.0
Host: example.com

```

## Step 1: Inspect the Certificate Chain

```bash
# Show only certificate details (suppress verbose session info)
openssl s_client -connect example.com:443 2>/dev/null | openssl x509 -noout -text

# Show all certificates in the chain
openssl s_client -connect example.com:443 -showcerts 2>/dev/null | \
  grep -E "BEGIN|END|subject|issuer"

# Extract just the server certificate
openssl s_client -connect example.com:443 2>/dev/null | \
  openssl x509 -noout -dates -subject -issuer
```

## Step 2: Test Specific TLS Versions

```bash
# Test if TLS 1.3 is supported
openssl s_client -connect example.com:443 -tls1_3 2>&1 | \
  grep -E "Protocol|Cipher|error"

# Test TLS 1.2
openssl s_client -connect example.com:443 -tls1_2 2>&1 | \
  grep -E "Protocol|Cipher|error"

# Test TLS 1.1 (should fail on modern servers)
openssl s_client -connect example.com:443 -tls1_1 2>&1 | \
  grep -E "Protocol|error|alert"

# Test TLS 1.0 (should definitely fail)
openssl s_client -connect example.com:443 -tls1 2>&1 | \
  grep -E "Protocol|error"
```

## Step 3: Test with SNI (Server Name Indication)

Always use `-servername` when testing virtual hosting with multiple certs:

```bash
# Test with correct SNI - ensures the right certificate is returned
openssl s_client -connect 203.0.113.10:443 -servername example.com

# Compare what you get without SNI (default certificate)
openssl s_client -connect 203.0.113.10:443

# If the certificates differ, the server uses SNI correctly
```

## Step 4: Verify Certificate Expiry

```bash
# Check certificate validity dates
openssl s_client -connect example.com:443 2>/dev/null | \
  openssl x509 -noout -dates

# Output:
# notBefore=Jan  1 00:00:00 2026 GMT
# notAfter=Apr  1 00:00:00 2026 GMT

# Check if cert is expired (exit code 0 = valid, non-zero = expired)
openssl s_client -connect example.com:443 2>/dev/null | \
  openssl x509 -noout -checkend 0
echo "Exit code: $?"  # 0 = valid, 1 = expired or expires within specified seconds

# Check if cert expires within 30 days (2592000 seconds)
openssl s_client -connect example.com:443 2>/dev/null | \
  openssl x509 -noout -checkend 2592000
```

## Step 5: Test Cipher Suites

```bash
# See which cipher was negotiated
openssl s_client -connect example.com:443 2>/dev/null | \
  grep -E "^New|Cipher|Protocol"

# Output example:
# New, TLSv1.3, Cipher is TLS_AES_256_GCM_SHA384

# Test connection with a specific cipher suite
openssl s_client -connect example.com:443 \
  -cipher ECDHE-RSA-AES256-GCM-SHA384 2>&1 | grep Cipher
```

## Step 6: Test OCSP Stapling

```bash
# Check if OCSP stapling is working
openssl s_client -connect example.com:443 -status 2>/dev/null | \
  grep -A 5 "OCSP response"

# Output with stapling:
# OCSP response:
# ======================================
# OCSP Response Data:
#     OCSP Response Status: successful (0x0)
#     ...
#     Cert Status: good

# Output without stapling:
# OCSP response: no response sent
```

## Step 7: Test with Client Certificate (mTLS)

```bash
# Connect with a client certificate
openssl s_client -connect api.example.com:443 \
  -cert client.crt \
  -key client.key \
  -CAfile ca.crt 2>&1 | grep -E "Verify|Protocol|Cipher"
```

## Step 8: Debug SMTP over TLS (STARTTLS)

```bash
# Connect to SMTP and upgrade to TLS
openssl s_client -connect mail.example.com:587 -starttls smtp

# IMAP with STARTTLS
openssl s_client -connect mail.example.com:143 -starttls imap
```

## Step 9: Create a One-Liner Certificate Inspector

```bash
#!/bin/bash
# cert-check.sh - Quick certificate inspection
HOST="${1:-example.com}"
PORT="${2:-443}"

echo "=== Certificate Info for ${HOST}:${PORT} ==="
openssl s_client -connect "${HOST}:${PORT}" -servername "${HOST}" 2>/dev/null | \
  openssl x509 -noout -subject -issuer -dates -fingerprint

echo ""
echo "=== TLS Protocol Negotiated ==="
openssl s_client -connect "${HOST}:${PORT}" -servername "${HOST}" 2>/dev/null | \
  grep "Protocol  :"

echo ""
echo "=== Cipher Negotiated ==="
openssl s_client -connect "${HOST}:${PORT}" -servername "${HOST}" 2>/dev/null | \
  grep "Cipher    :"
```

## Conclusion

`openssl s_client` is an indispensable tool for TLS debugging. Use it to verify certificate chains, test protocol version support, check cipher suite negotiation, verify OCSP stapling, and test mTLS configurations. The combination of `-showcerts`, `-tls1_3`, `-status`, and `-servername` flags covers the vast majority of TLS troubleshooting scenarios.
