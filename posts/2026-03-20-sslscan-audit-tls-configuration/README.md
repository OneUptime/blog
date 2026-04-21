# How to Use sslscan to Audit TLS Configuration on a Server

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: TLS, SSL, Sslscan, Security, Certificate, Cipher Suites, Vulnerability Assessment

Description: Learn how to use sslscan to audit TLS/SSL configuration on a server, identify weak cipher suites, deprecated protocol versions, and certificate issues.

---

`sslscan` is a command-line tool that queries a server's TLS configuration and reports supported protocols, cipher suites, and certificate details.

## Installing sslscan

```bash
# Debian/Ubuntu

apt install sslscan -y

# RHEL/CentOS (with EPEL enabled)
dnf install sslscan -y

# macOS
brew install sslscan

# Verify version
sslscan --version
```

## Basic Scan

```bash
# Scan a web server
sslscan example.com

# Scan with explicit port
sslscan example.com:8443

# Scan an IP address
sslscan 192.168.1.10:443
```

## Interpreting the Output

```text
Version: 2.x
OpenSSL 3.x.x

Testing SSL server example.com on port 443 using SNI name example.com

  SSL/TLS Protocols:
SSLv2     disabled
SSLv3     disabled
TLSv1.0   disabled
TLSv1.1   disabled
TLSv1.2   enabled
TLSv1.3   enabled

  TLS Fallback SCSV:
Server supports TLS Fallback SCSV

  TLS renegotiation:
Secure session renegotiation supported

  TLS Compression:
Compression disabled

  Heartbleed:
TLSv1.2 not vulnerable to heartbleed

  Supported Server Cipher(s):
Preferred TLSv1.3  256 bits  TLS_AES_256_GCM_SHA384        Curve P-384 DHE 384
Accepted  TLSv1.3  128 bits  TLS_AES_128_GCM_SHA256        Curve P-384 DHE 384
Preferred TLSv1.2  256 bits  ECDHE-RSA-AES256-GCM-SHA384   Curve P-384 DHE 384
...
```

## Scanning for Specific Issues

```bash
# Filter for enabled, weak, or export findings
sslscan --no-colour example.com | grep -i "enabled\|weak\|export"

# Check for TLSv1.0/1.1 (deprecated)
sslscan example.com | grep -E "TLSv1\.[01]"

# Check certificate expiry
sslscan --show-certificate example.com | grep -E "Not valid after|Subject:"

# XML output for automation
sslscan --xml=/tmp/results.xml example.com
```

## Checking Certificate Details

```bash
sslscan --show-certificate example.com
# Output includes:
#   Subject, Issuer, Altnames/SANs, Not valid before/after, RSA key strength
```

## Automating with a Script

```bash
#!/bin/bash
# Audit multiple servers
SERVERS=("web1.example.com" "web2.example.com:8443" "api.example.com")

for srv in "${SERVERS[@]}"; do
  echo "=== Scanning $srv ==="
  sslscan --no-colour "$srv" | grep -E "TLSv|SSLv|Cipher|Expired|Heartbleed"
  echo ""
done
```

## What to Look For

| Finding | Risk | Remediation |
|---------|------|-------------|
| TLSv1.0/1.1 enabled | Medium | Disable in server config |
| SSLv2/SSLv3 enabled | Critical | Disable immediately |
| RC4 or DES ciphers | High | Remove from cipher list |
| Certificate expiry < 30 days | Medium | Renew certificate |
| Heartbleed vulnerable | Critical | Patch OpenSSL |
| Weak certificate signature or short RSA key | Medium | Reissue with SHA-256+ and RSA 2048-bit+ |

## Key Takeaways

- `sslscan` quickly reveals deprecated protocols (TLSv1.0/1.1), weak ciphers, and certificate issues.
- Use `--xml` output for integration with CI/CD pipelines and compliance reports.
- Run scans after every certificate renewal or server configuration change.
- Aim for TLSv1.2 and TLSv1.3 only, with forward-secret key exchange and AEAD ciphers such as AES-GCM or ChaCha20-Poly1305.
