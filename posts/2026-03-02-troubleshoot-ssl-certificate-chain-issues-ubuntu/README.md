# How to Troubleshoot SSL Certificate Chain Issues on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, SSL/TLS, OpenSSL, Troubleshooting

Description: Learn how to diagnose and fix SSL certificate chain issues on Ubuntu, including incomplete chains, wrong order, and missing intermediate certificates causing browser errors.

---

Certificate chain errors are one of the most common SSL issues. A server certificate alone is not enough - the full chain from your certificate up to a trusted root CA must be presented to clients. When intermediates are missing, out of order, or incorrect, you get browser warnings and API failures even though your certificate itself is valid.

## Understanding Certificate Chains

When a CA issues a server certificate, they typically sign it with an intermediate CA rather than the root CA directly. This creates a chain:

```text
Root CA (trusted by browsers/OS)
    |
    Intermediate CA
        |
        Your Server Certificate
```

The client needs to verify each link in the chain. Root CA certificates are built into browsers and operating systems. Intermediate CA certificates are usually not, so they must be served by your web server alongside the server certificate.

## Examining a Server's Certificate Chain

```bash
# Connect and show the full certificate chain presented by the server
openssl s_client -connect yourdomain.com:443 -showcerts

# Cleaner version showing just the chain summary
openssl s_client -connect yourdomain.com:443 -brief 2>/dev/null

# Show only the chain depth and subjects
openssl s_client -connect yourdomain.com:443 </dev/null 2>/dev/null | \
    openssl x509 -noout -text | grep -A 5 "Issuer\|Subject"

# Use -servername for SNI (virtual hosting)
openssl s_client -connect yourdomain.com:443 -servername yourdomain.com -showcerts
```

The output of `-showcerts` lists all certificates from index 0 (the server cert) through the chain. If your chain is incomplete, you'll only see the server certificate (index 0).

## Verifying the Certificate Chain Locally

```bash
# Verify server cert against the CA chain
# All files should be in PEM format
openssl verify -CAfile ca-chain.pem server-certificate.pem

# Verify with system trust store
openssl verify -CApath /etc/ssl/certs/ server-certificate.pem

# Verify including intermediate CA
openssl verify -CAfile root-ca.pem -untrusted intermediate-ca.pem server-certificate.pem
# Expected: server-certificate.pem: OK

# If you get "unable to get local issuer certificate" - you're missing an intermediate
```

## Identifying Chain Problems

### Missing Intermediate Certificate

```bash
# This output from s_client shows only one certificate in the chain
openssl s_client -connect yourdomain.com:443 -showcerts </dev/null 2>/dev/null

# Problem: only depth=0 shown (the server cert), no depth=1 (intermediate)
# ---
# Certificate chain
#  0 s:CN = yourdomain.com
#    i:CN = Intermediate CA, O = SomeCA
# ---

# A complete chain shows all levels:
# ---
# Certificate chain
#  0 s:CN = yourdomain.com
#    i:CN = Intermediate CA, O = SomeCA
#  1 s:CN = Intermediate CA, O = SomeCA
#    i:CN = Root CA, O = SomeCA
# ---
```

### Wrong Certificate Order

Certificates must be ordered from server cert to root CA. If they're reversed or jumbled, some clients will fail:

```bash
# Check the order in a combined PEM file (fullchain.pem)
# The first cert should have the server's domain in the subject
grep -A 1 "BEGIN CERTIFICATE" fullchain.pem | grep -v "BEGIN"

# View subjects of all certs in a chain file
while IFS= read -r line; do
    if [[ "$line" == "-----BEGIN CERTIFICATE-----" ]]; then
        cert_content="$line"
    elif [[ "$line" == "-----END CERTIFICATE-----" ]]; then
        cert_content="$cert_content
$line"
        echo "$cert_content" | openssl x509 -noout -subject -issuer
        echo "---"
        cert_content=""
    else
        cert_content="$cert_content
$line"
    fi
done < fullchain.pem
```

## Finding and Downloading Missing Intermediate Certificates

Certificates contain information about where to find their issuing CA:

```bash
# Find the CA Issuers URL from the server certificate
openssl x509 -in server-cert.pem -noout -text | grep -A 1 "Authority Information Access"

# Output example:
# Authority Information Access:
#     OCSP - URI:http://ocsp.digicert.com
#     CA Issuers - URI:http://cacerts.digicert.com/EncryptionEverywhereDVTLSCA-G2.crt

# Download the intermediate CA certificate
wget http://cacerts.digicert.com/EncryptionEverywhereDVTLSCA-G2.crt -O intermediate.der

# Convert from DER to PEM if needed
openssl x509 -inform DER -in intermediate.der -out intermediate.pem

# Verify the subject
openssl x509 -in intermediate.pem -noout -subject -issuer
```

## Building a Correct fullchain.pem

Once you have all certificates, assemble them in the correct order:

```bash
# Correct order: server cert, then intermediate(s), then root CA (optional)
cat server-cert.pem intermediate.pem > fullchain.pem

# Or if you have multiple intermediates:
cat server-cert.pem intermediate2.pem intermediate1.pem > fullchain.pem

# Verify the chain validates
openssl verify -CApath /etc/ssl/certs/ fullchain.pem

# Verify the chain structure
openssl s_client -connect localhost:443 </dev/null 2>/dev/null | grep -A 10 "Certificate chain"
```

## Fixing the Chain in Nginx

In Nginx, `ssl_certificate` should point to a file containing both the server certificate and the full chain:

```nginx
# This is correct - fullchain.pem contains server cert + intermediates
ssl_certificate     /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;
```

If you're using a certificate from a commercial CA and received separate files:

```bash
# Combine server cert and provided chain file
cat yourdomain.crt yourdomain.ca-bundle > fullchain.pem

# Verify the combined file
openssl x509 -in fullchain.pem -noout -subject  # Shows server cert subject
grep "BEGIN CERTIFICATE" fullchain.pem | wc -l  # Should be 2 or more
```

## Fixing the Chain in Apache

Apache uses `SSLCertificateFile` for the fullchain and `SSLCertificateChainFile` for additional intermediates (pre-2.4.8) or handles it in `SSLCertificateFile` directly (2.4.8+):

```apache
# Apache 2.4.8+: put fullchain in SSLCertificateFile
SSLCertificateFile    /etc/ssl/certs/fullchain.pem
SSLCertificateKeyFile /etc/ssl/private/yourdomain.key

# Apache before 2.4.8: use separate chain file
SSLCertificateFile      /etc/ssl/certs/server.pem
SSLCertificateKeyFile   /etc/ssl/private/yourdomain.key
SSLCertificateChainFile /etc/ssl/certs/intermediate.pem
```

## Testing After Fixes

```bash
# Test that the chain is now complete
openssl s_client -connect yourdomain.com:443 -showcerts </dev/null

# Verify the chain validates against system trust store
echo | openssl s_client -connect yourdomain.com:443 2>/dev/null | \
    openssl x509 -noout -verify_hostname yourdomain.com 2>&1

# Use curl for a quick end-to-end test
curl -v https://yourdomain.com 2>&1 | grep -E "SSL|certificate|verify"

# Online verification (external perspective)
# Use: https://www.ssllabs.com/ssltest/
# Or check with a script using the API:
curl -s "https://api.ssllabs.com/api/v3/analyze?host=yourdomain.com" | \
    python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('status', 'pending'))"
```

## Common Error Messages and Their Causes

**"certificate verify failed: unable to get local issuer certificate"**
- Missing intermediate CA certificate
- Fix: Add the intermediate to your server's chain file

**"certificate verify failed: self-signed certificate in certificate chain"**
- Root CA is not trusted
- Fix: Install the root CA in the system trust store or use a publicly trusted certificate

**"certificate verify failed: certificate chain too long"**
- Chain has too many levels or certificates are duplicated
- Fix: Remove duplicate certificates and verify the chain depth

**"hostname mismatch"**
- The certificate's Common Name or SAN does not match the hostname you're connecting to
- Fix: Use a certificate that covers the correct domain, or update your DNS

**"certificate expired"**

```bash
# Check expiry dates of all certs in a chain file
while IFS= read -r line; do
    if [[ "$line" == "-----END CERTIFICATE-----" ]]; then
        echo "$cert_data
$line" | openssl x509 -noout -subject -enddate
        cert_data=""
    else
        cert_data="$cert_data
$line"
    fi
done < fullchain.pem
```

## Automating Chain Validation

For monitoring certificate chain health:

```bash
#!/bin/bash
# check-chain.sh - Validate SSL certificate chain for a domain

DOMAIN="${1:?Usage: $0 hostname}"
PORT="${2:-443}"

# Connect and capture chain info
CHAIN_INFO=$(echo | openssl s_client -connect "${DOMAIN}:${PORT}" -servername "${DOMAIN}" -showcerts 2>/dev/null)

# Count certificates in chain
CERT_COUNT=$(echo "$CHAIN_INFO" | grep -c "BEGIN CERTIFICATE")

echo "Domain: $DOMAIN"
echo "Certificates in chain: $CERT_COUNT"

if [[ $CERT_COUNT -lt 2 ]]; then
    echo "WARNING: Chain appears incomplete (expected at least 2 certificates)"
    exit 1
fi

# Verify the presented certificate
echo "$CHAIN_INFO" | openssl x509 -noout -dates -subject 2>/dev/null

echo "Chain validation: OK"
```

## Summary

Certificate chain issues almost always come down to missing or incorrectly ordered intermediate certificates. Use `openssl s_client -showcerts` to inspect what a server is presenting and count the chain depth. Find missing intermediate certificates using the CA Issuers URL embedded in the certificate itself. Assemble the full chain in PEM format with the server certificate first, then intermediates. Test with `openssl verify` locally and confirm with an external tool like SSL Labs. Chain issues that appear suddenly often indicate a certificate was renewed but the intermediate was not included in the updated configuration.
