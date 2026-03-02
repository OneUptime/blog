# How to Manage Certificates with certigo on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, TLS, Certificate, Security, PKI

Description: Learn how to use certigo, a command-line certificate utility for Ubuntu, to inspect, verify, and troubleshoot TLS certificates across hosts and files.

---

Certigo is a command-line utility for working with TLS certificates. It fills the gap between `openssl x509` (powerful but verbose) and `curl -v` (tells you little about the cert), providing a clean, human-readable interface for inspecting certificates from files, remote hosts, or certificate stores. When you're troubleshooting certificate chain issues, checking expiry dates across multiple hosts, or just need to quickly inspect what a server is presenting, certigo is the right tool.

## Installing Certigo

Certigo is written in Go and distributed as a single binary:

```bash
# Download the latest release
VERSION="1.16.0"
curl -Lo /tmp/certigo.tar.gz \
    https://github.com/square/certigo/releases/download/v${VERSION}/certigo_linux_amd64.tar.gz

# Extract and install
tar xzf /tmp/certigo.tar.gz -C /tmp/
sudo mv /tmp/certigo /usr/local/bin/
sudo chmod +x /usr/local/bin/certigo

# Verify installation
certigo version
```

## Inspecting Certificates from Files

The most basic use case is reading certificate information from a file:

```bash
# Inspect a PEM certificate
certigo dump --pem /etc/ssl/certs/ssl-cert-snakeoil.pem

# Inspect a certificate in different formats
certigo dump /path/to/certificate.crt
certigo dump /path/to/certificate.der

# Inspect a PKCS#12 bundle (pfx/p12)
certigo dump --p12 /path/to/cert.p12
# You'll be prompted for the password

# Inspect all certs in a chain/bundle file
certigo dump /path/to/ca-chain.crt
```

The output shows the certificate in a structured, readable format:

```
Subject:
    Common Name:  example.com
    Organization: Example Corp
    Country:      US

Issuer:
    Common Name:  Example Corp Intermediate CA

SHA-256 Fingerprint:
    AB:CD:EF:12:34:56:78:90:...

Serial: 12345678

Not Before: 2026-01-01 00:00:00 +0000 UTC
Not After:  2027-01-01 00:00:00 +0000 UTC (expires in 305 days)

Signature Algorithm: SHA256WithRSA
Public Key Algorithm: RSA (2048 bits)

DNS Names:
    example.com
    www.example.com
    *.example.com

Extended Key Usages:
    TLS Web Server Authentication
```

## Inspecting Remote Certificates

Connect directly to a host and inspect what it presents:

```bash
# Inspect the certificate chain from a remote host
certigo connect example.com

# Specify a custom port
certigo connect example.com:8443

# Connect with a custom SNI name (useful when IP and hostname differ)
certigo connect 10.0.0.1 --name api.internal.example.com

# Connect to a service with STARTTLS (like SMTP or LDAP)
certigo connect mail.example.com:25 --start-tls smtp
certigo connect ldap.example.com:389 --start-tls ldap
```

The connect command shows the full certificate chain presented by the server, which makes it easy to diagnose chain-of-trust issues where intermediate certificates are missing.

## Verifying Certificate Chains

Certigo can verify that a certificate correctly chains to a given CA:

```bash
# Verify a certificate against the system trust store
certigo verify /path/to/server.crt

# Verify against a specific CA bundle
certigo verify --ca /path/to/ca-chain.crt /path/to/server.crt

# Verify a remote host's certificate
certigo verify example.com

# Verify with expected hostname
certigo verify --name api.example.com 10.0.0.5
```

## Checking Certificate Expiry

One of the most common operations is checking when certificates expire, especially for monitoring purposes:

```bash
# Check expiry for a local file
certigo dump /etc/ssl/private/server.crt | grep "Not After"

# Check expiry for a remote host
certigo connect example.com 2>/dev/null | grep "Not After"

# Script to check multiple hosts
#!/bin/bash
HOSTS=(
    "example.com"
    "api.example.com:8443"
    "mail.example.com:587"
    "ldap.example.com:636"
)

WARNING_DAYS=30

for host in "${HOSTS[@]}"; do
    echo "Checking $host..."
    expiry=$(certigo connect "$host" 2>/dev/null | grep "Not After" | head -1)
    echo "  $expiry"
done
```

## Comparing Certificates

When debugging mismatches between certificate files, compare fingerprints:

```bash
# Get fingerprint of a certificate file
certigo dump /etc/ssl/certs/server.crt | grep "SHA-256"

# Get fingerprint from a remote host
certigo connect example.com | grep "SHA-256"

# Compare private key and certificate modulus
# (These should match if the key and cert belong together)
openssl rsa -noout -modulus -in server.key | openssl md5
openssl x509 -noout -modulus -in server.crt | openssl md5
```

## Viewing Subject Alternative Names

SANs are what actually controls which hostnames a certificate is valid for:

```bash
# View SANs for a local certificate
certigo dump /etc/nginx/ssl/server.crt | grep -A 10 "DNS Names"

# View SANs from a remote server
certigo connect api.example.com | grep -A 10 "DNS Names"
```

This is useful when debugging "hostname mismatch" errors - the displayed DNS Names show exactly what hostnames are covered.

## Certificate Format Conversion

Certigo can convert between certificate formats:

```bash
# Note: certigo's primary strength is inspection, not conversion
# For format conversion, combine certigo with openssl:

# PEM to DER
openssl x509 -in cert.pem -outform DER -out cert.der

# DER to PEM
openssl x509 -in cert.der -inform DER -outform PEM -out cert.pem

# Extract cert from PKCS#12 and inspect
openssl pkcs12 -in bundle.p12 -nokeys -out cert.pem
certigo dump cert.pem
```

## Integrating with Monitoring

Use certigo in monitoring scripts to alert on expiring certificates:

```bash
#!/bin/bash
# /usr/local/bin/check-cert-expiry.sh
# Returns exit code 2 if cert expires within $WARNING_DAYS, 1 if already expired

HOSTNAME="$1"
PORT="${2:-443}"
WARNING_DAYS="${3:-30}"
CRITICAL_DAYS="${4:-7}"

# Get days until expiry
expiry_str=$(certigo connect "${HOSTNAME}:${PORT}" 2>/dev/null | \
    grep "Not After" | head -1 | grep -oP '\d+ days')
days_left=$(echo "$expiry_str" | grep -oP '\d+')

if [ -z "$days_left" ]; then
    echo "UNKNOWN: Could not connect to $HOSTNAME:$PORT"
    exit 3
fi

if [ "$days_left" -lt "$CRITICAL_DAYS" ]; then
    echo "CRITICAL: Certificate for $HOSTNAME expires in $days_left days"
    exit 2
elif [ "$days_left" -lt "$WARNING_DAYS" ]; then
    echo "WARNING: Certificate for $HOSTNAME expires in $days_left days"
    exit 1
else
    echo "OK: Certificate for $HOSTNAME expires in $days_left days"
    exit 0
fi
```

This script can be plugged into Nagios, Icinga, or other monitoring systems that support exit-code-based checks.

## Bulk Certificate Inspection

For environments with many certificates to manage:

```bash
#!/bin/bash
# Scan all certificates in a directory and report expiry dates
CERT_DIR="/etc/ssl/certs"

echo "Certificate Expiry Report"
echo "========================="
printf "%-50s %s\n" "Certificate" "Expiry"

for cert_file in "$CERT_DIR"/*.crt "$CERT_DIR"/*.pem; do
    if [ -f "$cert_file" ] && openssl x509 -noout -in "$cert_file" 2>/dev/null; then
        expiry=$(certigo dump "$cert_file" 2>/dev/null | grep "Not After" | head -1 | awk '{print $3, $4, $5}')
        if [ -n "$expiry" ]; then
            printf "%-50s %s\n" "$(basename $cert_file)" "$expiry"
        fi
    fi
done | sort -k2
```

Certigo is one of those tools that you don't miss until you have it, but once you've used it to quickly visualize a certificate chain instead of parsing through `openssl x509 -text` output, you won't want to go back. Keep it installed on any server that handles TLS configuration - it saves significant time during certificate troubleshooting.
