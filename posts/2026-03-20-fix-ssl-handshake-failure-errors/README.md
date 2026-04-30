# How to Fix SSL Handshake Failure Errors

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: SSL, TLS, Handshake Failure, Troubleshooting, OpenSSL, HTTPS

Description: Learn how to diagnose and fix SSL/TLS handshake failure errors caused by protocol version mismatches, cipher suite incompatibilities, and certificate issues.

## What Causes SSL Handshake Failures?

The SSL/TLS handshake is the negotiation phase where client and server agree on a protocol version, cipher suite, and exchange certificates. Failures occur when:

1. No common protocol version (e.g., server only accepts TLS 1.3, client only supports TLS 1.2)
2. No common cipher suite
3. Server certificate is invalid, expired, or has chain errors
4. Client certificate required but not provided (mTLS)
5. SNI mismatch
6. Certificate/key mismatch on the server

## Step 1: Capture the Exact Error

```bash
# Get verbose handshake output

openssl s_client -connect example.com:443 -debug 2>&1 | head -50

# Test with specific protocol version
openssl s_client -connect example.com:443 -tls1_3 2>&1 | grep -Ei "handshake|error|alert"
openssl s_client -connect example.com:443 -tls1_2 2>&1 | grep -Ei "handshake|error|alert"
openssl s_client -connect example.com:443 -tls1_1 2>&1 | grep -Ei "handshake|error|alert"

# Check what the server supports
nmap --script ssl-enum-ciphers -p 443 example.com
```

## Step 2: Fix Protocol Version Mismatch

If the client only supports old TLS versions and server only accepts TLS 1.3:

```bash
# For Nginx - accept both TLS 1.2 and 1.3 for broader compatibility
ssl_protocols TLSv1.2 TLSv1.3;

# For Apache
SSLProtocol all -SSLv3 -TLSv1 -TLSv1.1

# For curl (as a client) - force TLS 1.2 exactly
curl --tlsv1.2 --tls-max 1.2 https://example.com
```

## Step 3: Fix Cipher Suite Mismatch

If no common cipher suite exists:

```bash
# If the handshake succeeds, check which cipher suite was negotiated
openssl s_client -connect example.com:443 2>&1 | grep -i "Cipher *:"

# Test a specific TLS 1.2 cipher suite
openssl s_client -connect example.com:443 -tls1_2 -cipher 'ECDHE-RSA-AES128-GCM-SHA256'

# Test a specific TLS 1.3 cipher suite
openssl s_client -connect example.com:443 -tls1_3 -ciphersuites TLS_AES_128_GCM_SHA256

# Add more cipher suites to Nginx for TLS 1.2 and below (legacy client compatibility)
ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384:DHE-RSA-AES128-GCM-SHA256:DHE-RSA-AES256-GCM-SHA384:ECDHE-RSA-AES128-SHA256;

# If your Nginx build supports ssl_conf_command, configure TLS 1.3 cipher suites separately
ssl_conf_command Ciphersuites TLS_AES_128_GCM_SHA256:TLS_AES_256_GCM_SHA384:TLS_CHACHA20_POLY1305_SHA256;
```

## Step 4: Fix Certificate/Key Mismatch

A very common cause of handshake failure is a mismatch between the certificate and its private key:

```bash
# Compare the public keys from the cert and key - they must match
openssl x509 -in example.com.crt -pubkey -noout | openssl pkey -pubin -outform DER | openssl dgst -sha256
openssl pkey -in example.com.key -pubout -outform DER | openssl dgst -sha256

# If the SHA-256 digests differ, the key doesn't match the certificate
# You need to either get the correct key or regenerate the certificate

# Check the private key itself is structurally valid
openssl pkey -in example.com.key -check -noout
```

## Step 5: Fix SNI Mismatch

If the client connects to an IP directly but the certificate is for a hostname:

```bash
# Test with explicit SNI
openssl s_client -connect 203.0.113.10:443 -servername example.com

# Without -servername, the default certificate (may be wrong) is served
# Make sure your reverse proxy/load balancer is passing the correct SNI
```

In Nginx, ensure `server_name` matches the certificate:

```nginx
server {
    listen 443 ssl;
    server_name example.com www.example.com;  # Must match a hostname listed in the certificate SAN
    ssl_certificate /etc/ssl/certs/example.com.crt;
}
```

## Step 6: Handle Java Client Handshake Failures

Java clients without TLS 1.3 support may fail if the server only accepts TLS 1.3:

```bash
# Force Java to use TLS 1.2
java -Djdk.tls.client.protocols="TLSv1.2" -jar your-application.jar

# Or add TLS 1.2 back to your Nginx config alongside TLS 1.3
ssl_protocols TLSv1.2 TLSv1.3;
```

## Step 7: Enable TLS Debugging

For Node.js:

```bash
node --trace-tls app.js 2>&1 | grep -Ei "tls|ssl|error"
```

For Java:

```bash
java -Djavax.net.debug=ssl:handshake -jar your-application.jar
```

For Python:

```python
import ssl

ctx = ssl.create_default_context()
ctx.keylog_filename = "/tmp/sslkeys.log"  # Python 3.8+: use this context for Wireshark-compatible TLS key logging
```

## Common Error Codes Reference

| Error | Common Cause | Fix |
|---|---|---|
| `ssl_error_rx_record_too_long` | HTTPS sent to a non-TLS listener or wrong port | Use the correct TLS-enabled port and verify the server is speaking TLS |
| `certificate_unknown` | Certificate rejected for a reason other than unknown CA | Check SAN/hostname, EKU, validity, and chain details |
| `handshake_failure` | No common protocol/cipher or client auth requirement not met | Expand TLS versions/ciphers or provide the required client certificate |
| `unknown_ca` | Self-signed, private CA, or missing intermediate | Add the correct CA or intermediate to the trust store |
| `bad_certificate` | Corrupt or otherwise unacceptable certificate | Validate the certificate, chain, and key pairing |

## Conclusion

SSL handshake failures require systematic diagnosis: start with `openssl s_client` to see the exact error, verify certificate/key pairing by comparing the public key derived from the certificate and private key, check for protocol and cipher suite compatibility, and ensure SNI is configured correctly. Most handshake failures fall into one of these categories and can be fixed within minutes once the root cause is identified.
