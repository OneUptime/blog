# How to Use SSLyze for TLS Configuration Testing on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Security, TLS, SSLyze, Certificates

Description: Learn how to install and use SSLyze on Ubuntu to test TLS/SSL configurations, identify weak ciphers, check certificate validity, and ensure secure HTTPS deployments.

---

SSLyze is a Python tool that analyzes TLS/SSL configurations of servers. Unlike openssl's manual command-line approach, SSLyze runs a comprehensive battery of tests in one command and provides structured output. It checks cipher suites, certificate chains, protocol versions, vulnerabilities like BEAST and ROBOT, and security features like HSTS and certificate pinning.

## Installing SSLyze on Ubuntu

```bash
# Install via pip (recommended - gets the latest version)
sudo apt install python3 python3-pip -y
pip3 install sslyze

# Verify installation
sslyze --version

# Or install as a specific user (avoid sudo pip)
pip3 install --user sslyze
# Add ~/.local/bin to PATH if needed
echo 'export PATH="$HOME/.local/bin:$PATH"' >> ~/.bashrc
source ~/.bashrc
```

## Basic TLS Scan

```bash
# Scan a single HTTPS server
sslyze example.com

# Scan with a specific port
sslyze example.com:8443

# Scan multiple servers at once
sslyze example.com api.example.com mail.example.com

# Scan a server by IP address (tests the default vhost)
sslyze 203.0.113.1
```

A basic scan produces extensive output covering all TLS aspects. The key sections are:

```text
 * SCAN RESULTS FOR EXAMPLE.COM - 203.0.113.1:443

 * SSL 2.0 Cipher Suites:
     Attempted to connect using 7 cipher suites; the server rejected all cipher suites.

 * SSL 3.0 Cipher Suites:
     Attempted to connect using 80 cipher suites; the server rejected all cipher suites.

 * TLS 1.0 Cipher Suites:
     Attempted to connect using 80 cipher suites; the server rejected all cipher suites.

 * TLS 1.2 Cipher Suites:
     Accepted:     TLS_ECDHE_RSA_WITH_AES_256_GCM_SHA384   ECDH-256 bits  256 bits
     Accepted:     TLS_ECDHE_RSA_WITH_AES_128_GCM_SHA256   ECDH-256 bits  128 bits
     Rejected:     TLS_RSA_WITH_3DES_EDE_CBC_SHA

 * TLS 1.3 Cipher Suites:
     Accepted:     TLS_CHACHA20_POLY1305_SHA256              256 bits
     Accepted:     TLS_AES_256_GCM_SHA384                   256 bits
```

## Testing Specific Aspects

SSLyze can target specific tests for faster, focused analysis:

```bash
# Test only certificate information
sslyze --certinfo example.com

# Test cipher suites only
sslyze --tlsv1_3 --tlsv1_2 --tlsv1_1 --tlsv1 --sslv3 --sslv2 example.com

# Test for specific vulnerabilities only
sslyze --robot example.com        # ROBOT attack vulnerability
sslyze --heartbleed example.com   # Heartbleed vulnerability
sslyze --openssl_ccs example.com  # OpenSSL CCS injection (CVE-2014-0224)

# Test HTTP security headers (HSTS, HSTS preloading)
sslyze --http_headers example.com

# Test session resumption
sslyze --resum example.com

# Test for early data (0-RTT, TLS 1.3 feature with security implications)
sslyze --early_data example.com
```

## Certificate Analysis

Understanding certificate output:

```bash
# Detailed certificate examination
sslyze --certinfo example.com 2>&1 | head -80
```

Key certificate fields to check:

```text
 * Certificate Information:
     Content
       SHA1 Fingerprint:         a1b2c3d4e5f6...
       Common Name:              example.com
       Issuer:                   Let's Encrypt Authority X3
       Serial Number:            12345678
       Not Before:               2026-01-01 00:00:00
       Not After:                2026-04-01 23:59:59
       Signature Algorithm:      sha256WithRSAEncryption
       Public Key Algorithm:     RSA
       Key Size:                 2048
       Exponent:                 65537
       DNS Subject Alternative Names: example.com, www.example.com

     Trust
       Hostname Validation:      OK - Certificate matches example.com
       Android CA Store (13.0.0_r9):   OK - Certificate is trusted
       Apple CA Store (iOS 16, MacOS 13):  OK - Certificate is trusted
       Mozilla CA Store (2022-10-24):   OK - Certificate is trusted
```

What to look for:
- **Not After**: Check the expiry date. Alert if < 30 days away.
- **Key Size**: RSA 2048+ or ECDSA 256+ are acceptable
- **Signature Algorithm**: Should be SHA-256 or better, not SHA-1
- **Hostname Validation**: Must be OK
- **Trust**: All stores should show OK

## JSON Output for Automation

SSLyze produces JSON output for integration with other tools:

```bash
# Save results as JSON
sslyze --json_out /tmp/tls-scan.json example.com

# Pretty-print the JSON
sslyze --json_out /tmp/tls-scan.json example.com
python3 -m json.tool /tmp/tls-scan.json | head -100
```

Parse JSON results with Python:

```python
#!/usr/bin/env python3
# parse-sslyze.py - Parse SSLyze JSON output for key findings

import json
import sys
from datetime import datetime

def check_tls_results(json_file):
    with open(json_file) as f:
        data = json.load(f)

    findings = []

    for server_scan in data.get('server_scan_results', []):
        hostname = server_scan['server_location']['hostname']
        port = server_scan['server_location']['port']

        print(f"\n=== Results for {hostname}:{port} ===")

        scan_result = server_scan.get('scan_result', {})

        # Check for deprecated SSL/TLS versions
        for version in ['ssl_2_0_cipher_suites', 'ssl_3_0_cipher_suites', 'tls_1_0_cipher_suites', 'tls_1_1_cipher_suites']:
            result = scan_result.get(version, {})
            if result.get('status') == 'COMPLETED':
                accepted = result.get('result', {}).get('accepted_cipher_suites', [])
                if accepted:
                    findings.append(f"WEAK: {version.replace('_', ' ').upper()} is enabled with {len(accepted)} cipher suites")

        # Check certificate expiry
        certinfo = scan_result.get('certificate_info', {})
        if certinfo.get('status') == 'COMPLETED':
            cert_deployments = certinfo.get('result', {}).get('certificate_deployments', [])
            for deployment in cert_deployments:
                cert_chain = deployment.get('received_certificate_chain', [])
                if cert_chain:
                    leaf_cert = cert_chain[0]
                    not_after_str = leaf_cert.get('not_valid_after', '')
                    if not_after_str:
                        not_after = datetime.fromisoformat(not_after_str.replace('Z', '+00:00'))
                        days_remaining = (not_after - datetime.now().astimezone()).days
                        if days_remaining < 30:
                            findings.append(f"CRITICAL: Certificate expires in {days_remaining} days!")
                        elif days_remaining < 60:
                            findings.append(f"WARNING: Certificate expires in {days_remaining} days")

        # Check for Heartbleed
        heartbleed = scan_result.get('heartbleed', {})
        if heartbleed.get('status') == 'COMPLETED':
            if heartbleed.get('result', {}).get('is_vulnerable_to_heartbleed'):
                findings.append("CRITICAL: Server is VULNERABLE to Heartbleed!")

    if findings:
        print("\nFindings:")
        for finding in findings:
            print(f"  - {finding}")
    else:
        print("\nNo significant issues found.")

if __name__ == '__main__':
    json_file = sys.argv[1] if len(sys.argv) > 1 else '/tmp/tls-scan.json'
    check_tls_results(json_file)
```

## Scanning Multiple Servers in Batch

```bash
# Create a target list
cat << 'EOF' > /tmp/tls-targets.txt
example.com
api.example.com:443
mail.example.com:465
smtp.example.com:587
EOF

# Scan all targets
sslyze --targets_in /tmp/tls-targets.txt \
    --json_out /tmp/batch-tls-scan.json \
    --certinfo

echo "Scan complete. Processing results..."
python3 parse-sslyze.py /tmp/batch-tls-scan.json
```

## Using SSLyze in Python Scripts

SSLyze provides a Python API for direct integration:

```python
#!/usr/bin/env python3
# sslyze-check.py - Programmatic TLS checking with SSLyze

from sslyze import (
    Scanner,
    ServerNetworkLocation,
    ScanCommand,
    ServerScanRequest,
)
from sslyze.errors import ConnectionToServerFailed

def scan_server(hostname, port=443):
    """Scan a server and return key TLS information."""

    # Define what to scan for
    scan_commands = {
        ScanCommand.CERTIFICATE_INFO,
        ScanCommand.SSL_2_0_CIPHER_SUITES,
        ScanCommand.SSL_3_0_CIPHER_SUITES,
        ScanCommand.TLS_1_0_CIPHER_SUITES,
        ScanCommand.TLS_1_1_CIPHER_SUITES,
        ScanCommand.TLS_1_2_CIPHER_SUITES,
        ScanCommand.TLS_1_3_CIPHER_SUITES,
        ScanCommand.HEARTBLEED,
        ScanCommand.ROBOT,
        ScanCommand.HTTP_HEADERS,
    }

    # Set up the scan
    server_location = ServerNetworkLocation(hostname=hostname, port=port)
    scan_request = ServerScanRequest(
        server_location=server_location,
        scan_commands=scan_commands,
    )

    # Run the scan
    scanner = Scanner()
    scanner.queue_scans([scan_request])

    results = {}
    for scan_result in scanner.get_results():
        if isinstance(scan_result, ConnectionToServerFailed):
            print(f"ERROR: Could not connect to {hostname}:{port}")
            return None

        # Extract certificate info
        certinfo_result = scan_result.scan_result.certificate_info
        if certinfo_result.status == "COMPLETED":
            deployments = certinfo_result.result.certificate_deployments
            if deployments:
                cert = deployments[0].received_certificate_chain[0]
                results['cert_subject'] = str(cert.subject)
                results['cert_expiry'] = str(cert.not_valid_after_utc)
                results['cert_issuer'] = str(cert.issuer)

        # Check for Heartbleed
        heartbleed_result = scan_result.scan_result.heartbleed
        if heartbleed_result.status == "COMPLETED":
            results['heartbleed_vulnerable'] = heartbleed_result.result.is_vulnerable_to_heartbleed

    return results

if __name__ == '__main__':
    results = scan_server('example.com')
    if results:
        print("Scan Results:")
        for key, value in results.items():
            print(f"  {key}: {value}")
```

## Building a TLS Monitoring Script

```bash
#!/bin/bash
# tls-monitor.sh - Check certificate expiry for a list of hosts

HOSTS_FILE="/etc/tls-monitor/hosts.txt"
WARN_DAYS=30
ALERT_EMAIL="admin@example.com"

while IFS= read -r host; do
    [ -z "$host" ] && continue
    [ "${host:0:1}" = "#" ] && continue

    # Run SSLyze and extract expiry
    RESULT=$(sslyze --certinfo "$host" 2>/dev/null | grep "Not After")

    if [ -z "$RESULT" ]; then
        echo "WARNING: Could not scan $host"
        continue
    fi

    echo "$host: $RESULT"
done < "$HOSTS_FILE"
```

SSLyze is particularly valuable in CI/CD pipelines to catch TLS misconfigurations before deployment, and in scheduled cron jobs to monitor certificate expiry across your infrastructure.
