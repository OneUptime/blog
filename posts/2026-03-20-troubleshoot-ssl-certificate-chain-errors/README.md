# How to Troubleshoot SSL Certificate Chain Errors

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: SSL, TLS, Certificate Chain, Troubleshooting, OpenSSL, HTTPS

Description: Learn how to diagnose and fix SSL certificate chain errors, including missing intermediate certificates, incorrect chain order, and self-signed certificate issues.

## Understanding Certificate Chains

An SSL/TLS certificate chain works like this:

```text
Root CA (trusted by browsers) - self-signed
  └── Intermediate CA (signed by Root CA)
      └── Your Server Certificate (signed by Intermediate CA)
```

Browsers only trust Root CAs directly. When your server presents only its own certificate without the intermediate CA, clients can't build the chain to the trusted root and you get a "certificate chain error."

## Common Chain Error Messages

| Error | Meaning |
|---|---|
| `UNABLE_TO_GET_ISSUER_CERT_LOCALLY` | Intermediate CA missing from server |
| `CERTIFICATE_VERIFY_FAILED` | Can't verify against trusted root |
| `DEPTH_ZERO_SELF_SIGNED_CERT` | Server cert is self-signed, not from a CA |
| `SELF_SIGNED_CERT_IN_CHAIN` | Self-signed cert is in the chain |
| `ERR_CERT_AUTHORITY_INVALID` | Browser doesn't trust the issuing CA |

## Step 1: Inspect the Certificate Chain

Use `openssl s_client` to see exactly what chain the server is presenting:

```bash
# Check the complete chain the server sends

openssl s_client -connect example.com:443 -showcerts 2>/dev/null

# Count the certificates in the chain
openssl s_client -connect example.com:443 -showcerts 2>/dev/null | \
  grep "BEGIN CERTIFICATE" | wc -l

# Verify the chain from server perspective
openssl s_client -connect example.com:443 \
  -CApath /etc/ssl/certs 2>&1 | grep "Verify return code"

# Correct chain output:
# Verify return code: 0 (ok)
# Broken chain output:
# Verify return code: 20 (unable to get local issuer certificate)
```

## Step 2: Identify Missing Intermediates

Check if your server certificate's issuer matches the next cert in the chain:

```bash
# Show the issuer of your server certificate
openssl x509 -in /etc/ssl/certs/example.com.crt -noout -issuer
# issuer=C=US, O=DigiCert Inc, CN=DigiCert TLS RSA SHA256 2020 CA1

# Show the subject of your intermediate certificate
openssl x509 -in /etc/ssl/certs/intermediate.crt -noout -subject
# subject=C=US, O=DigiCert Inc, CN=DigiCert TLS RSA SHA256 2020 CA1

# These must match exactly
```

## Step 3: Build the Correct Certificate Chain

The `fullchain.pem` file should contain certificates in this order:

```bash
# Correct order: server cert first, then intermediates (root optional)
cat server.crt intermediate.crt > fullchain.pem

# Or if you have multiple intermediates:
cat server.crt intermediate2.crt intermediate1.crt > fullchain.pem

# Verify the chain is complete
# Pass intermediates via -untrusted (openssl verify won't use
# other certs in the same input file as intermediates)
openssl verify -CAfile /etc/ssl/certs/ca-certificates.crt \
  -untrusted intermediate.crt server.crt
# server.crt: OK
```

## Step 4: Fix the Chain in Nginx

```nginx
# Use fullchain.pem (includes server cert + intermediates)
ssl_certificate /etc/ssl/certs/fullchain.pem;
ssl_certificate_key /etc/ssl/private/example.com.key;

# NOT this (missing intermediates):
# ssl_certificate /etc/ssl/certs/example.com.crt;
```

## Step 5: Fix the Chain in Apache

```apache
# Specify the chain file separately
SSLCertificateFile /etc/ssl/certs/example.com.crt
SSLCertificateKeyFile /etc/ssl/private/example.com.key

# Chain file includes intermediate CA(s)
SSLCertificateChainFile /etc/ssl/certs/intermediate-chain.crt
```

Or use the combined fullchain:

```apache
SSLCertificateFile /etc/ssl/certs/fullchain.pem
SSLCertificateKeyFile /etc/ssl/private/example.com.key
```

## Step 6: Download Missing Intermediates

If you lost your intermediate certificate, retrieve it from the issuer:

```bash
# Get the issuer's certificate URL from the AIA extension
openssl x509 -in server.crt -noout -text | grep "CA Issuers"
# CA Issuers - URI:http://cacerts.digicert.com/DigiCertTLSRSASHA2562020CA1.crt

# Download the intermediate
curl -o intermediate.crt \
  http://cacerts.digicert.com/DigiCertTLSRSASHA2562020CA1.crt

# Convert from DER to PEM if needed
openssl x509 -inform DER -in intermediate.crt -out intermediate.pem
```

## Step 7: Verify Chain After Fix

```bash
# Reload web server after fixing
sudo nginx -t && sudo systemctl reload nginx

# Verify the fix
openssl s_client -connect example.com:443 2>&1 | grep "Verify return code"
# Verify return code: 0 (ok)

# Check chain depth (should be 2 or 3)
openssl s_client -connect example.com:443 -showcerts 2>/dev/null | \
  grep "Certificate chain" -A 20
```

## Conclusion

SSL certificate chain errors almost always stem from missing intermediate CA certificates. Use `openssl s_client -showcerts` to see what the server is sending, verify the chain with `openssl verify`, and fix by building a `fullchain.pem` that includes the server certificate followed by all intermediate CAs in order. Always download missing intermediates from the issuer's AIA (Authority Information Access) URL found in your server certificate.
