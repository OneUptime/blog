# How to Convert Between SSL Certificate Formats (PEM, DER, PFX) on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, SSL/TLS, OpenSSL, Security

Description: Learn how to convert SSL certificates between PEM, DER, PFX/PKCS12, and other formats on Ubuntu using OpenSSL, covering all common conversion scenarios.

---

SSL certificates come in multiple formats, and different systems expect different ones. Linux servers typically use PEM format. Windows and Java applications often use PFX or PKCS12. Older systems may use DER. When deploying certificates across different platforms, knowing how to convert between formats saves significant troubleshooting time.

## Understanding Certificate Formats

**PEM** (Privacy Enhanced Mail) - The most common format on Linux. Base64-encoded DER certificate wrapped in `-----BEGIN CERTIFICATE-----` and `-----END CERTIFICATE-----` headers. Files typically use `.pem`, `.crt`, `.cer`, or `.key` extensions. Can contain multiple certificates or a combined certificate and private key.

**DER** (Distinguished Encoding Rules) - Binary format. The same data as PEM but not base64-encoded. Files typically use `.der` or `.cer`. Cannot contain multiple items.

**PFX/PKCS12** - A container format (`.pfx` or `.p12`) that bundles the certificate, private key, and optionally the entire certificate chain into one file. Usually password-protected. Common in Windows environments, IIS, and Java KeyStores.

**PKCS7** (`.p7b`, `.p7c`) - A format for certificate chains (no private key). Common in Windows for distributing intermediate CA chains.

## Identifying Your Certificate Format

```bash
# PEM files start with text headers
head -1 certificate.pem
# Output: -----BEGIN CERTIFICATE-----

# DER files are binary - the file command identifies them
file certificate.der
# Output: certificate.der: data

# Check a file's actual format regardless of extension
openssl x509 -in certificate.crt -noout -text 2>/dev/null && echo "PEM format"
openssl x509 -in certificate.crt -inform DER -noout -text 2>/dev/null && echo "DER format"

# Check if a file is PKCS12
openssl pkcs12 -info -in bundle.pfx -noout 2>/dev/null && echo "PFX/PKCS12 format"
```

## Converting PEM to DER

```bash
# Convert a PEM certificate to DER format
openssl x509 \
    -in certificate.pem \
    -outform DER \
    -out certificate.der

# Verify the result
openssl x509 -in certificate.der -inform DER -noout -text | head -10
```

## Converting DER to PEM

```bash
# Convert a DER certificate to PEM format
openssl x509 \
    -in certificate.der \
    -inform DER \
    -outform PEM \
    -out certificate.pem

# Verify the result
openssl x509 -in certificate.pem -noout -subject -issuer
```

## Converting PEM to PFX/PKCS12

To create a PFX bundle, you typically need three pieces:
- The server certificate (`.crt` / `.pem`)
- The private key (`.key`)
- The CA chain (intermediate + root certificates)

```bash
# Basic PEM to PFX conversion
# -export: create a PKCS12 file
# -out: output file
# -inkey: private key file
# -in: certificate file
# -certfile: CA chain file (optional but recommended)
# -passout: set password for the PFX file
openssl pkcs12 \
    -export \
    -out bundle.pfx \
    -inkey private.key \
    -in certificate.pem \
    -certfile ca-chain.pem \
    -passout pass:YourPassword

# Verify the resulting PFX
openssl pkcs12 -in bundle.pfx -info -noout -passin pass:YourPassword
```

For a PFX without a password (not recommended, but some systems require it):

```bash
# PFX with empty password
openssl pkcs12 \
    -export \
    -out bundle.pfx \
    -inkey private.key \
    -in certificate.pem \
    -passout pass:
```

## Converting PFX/PKCS12 to PEM

Extracting everything from a PFX into individual PEM files:

```bash
# Extract all components (certificate, key, CA chain) into one PEM file
openssl pkcs12 \
    -in bundle.pfx \
    -out everything.pem \
    -nodes \
    -passin pass:YourPassword
# -nodes: don't encrypt the private key in the output

# Extract only the certificate (no key, no CA chain)
openssl pkcs12 \
    -in bundle.pfx \
    -out certificate.pem \
    -nokeys \
    -passin pass:YourPassword

# Extract only the private key
openssl pkcs12 \
    -in bundle.pfx \
    -out private.key \
    -nocerts \
    -nodes \
    -passin pass:YourPassword

# Extract only the CA chain certificates
openssl pkcs12 \
    -in bundle.pfx \
    -out ca-chain.pem \
    -nokeys \
    -cacerts \
    -passin pass:YourPassword
```

## Converting PEM to PKCS7 (P7B)

PKCS7 format contains certificates and chains but no private keys:

```bash
# Convert a PEM certificate and chain to PKCS7 format
openssl crl2pkcs7 \
    -nocrl \
    -certfile certificate.pem \
    -certfile ca-chain.pem \
    -out bundle.p7b

# Convert to DER-encoded PKCS7 (binary .p7b used by Windows)
openssl crl2pkcs7 \
    -nocrl \
    -certfile certificate.pem \
    -certfile ca-chain.pem \
    -outform DER \
    -out bundle.p7b
```

## Converting PKCS7 to PEM

```bash
# Extract all certificates from a PKCS7 bundle to PEM
openssl pkcs7 \
    -in bundle.p7b \
    -print_certs \
    -out certificates.pem

# If the P7B is in DER format:
openssl pkcs7 \
    -in bundle.p7b \
    -inform DER \
    -print_certs \
    -out certificates.pem
```

## Converting Private Key Formats

Private keys also have format considerations:

```bash
# Convert PKCS#8 private key to traditional RSA format
openssl rsa -in private_pkcs8.key -out private_rsa.key

# Convert traditional RSA key to PKCS#8 format
openssl pkcs8 -topk8 -inform PEM -outform PEM \
    -in private_rsa.key \
    -out private_pkcs8.key \
    -nocrypt

# Encrypt a private key with a passphrase
openssl rsa -in private.key -aes256 -out private_encrypted.key

# Remove passphrase from an encrypted private key
openssl rsa -in private_encrypted.key -out private.key
```

## Creating a Full Chain PEM File

Some servers require the certificate and chain concatenated in a single file:

```bash
# Concatenate certificate and intermediate CA(s) into a full chain file
# Order: server cert first, then intermediate(s), then root (optional)
cat certificate.pem intermediate.pem root-ca.pem > fullchain.pem

# Verify the chain
openssl verify -CAfile root-ca.pem -untrusted intermediate.pem certificate.pem
# Expected: certificate.pem: OK

# Check how many certificates are in the file
grep -c "BEGIN CERTIFICATE" fullchain.pem
```

## Converting for Java KeyStore

Java applications often need certificates in JKS (Java KeyStore) format:

```bash
# Convert PFX to JKS using keytool
keytool -importkeystore \
    -srckeystore bundle.pfx \
    -srcstoretype PKCS12 \
    -destkeystore keystore.jks \
    -deststoretype JKS \
    -srcstorepass SourcePassword \
    -deststorepass DestPassword

# Or, starting from PEM files: convert to PKCS12 first, then to JKS
# Step 1: PEM to PKCS12
openssl pkcs12 -export -in cert.pem -inkey key.pem -out temp.p12 -passout pass:temppass

# Step 2: PKCS12 to JKS
keytool -importkeystore -srckeystore temp.p12 -srcstoretype PKCS12 \
    -destkeystore keystore.jks -deststoretype JKS \
    -srcstorepass temppass -deststorepass keystorepass

# Verify the JKS
keytool -list -keystore keystore.jks -storepass keystorepass
```

## Batch Converting Multiple Certificates

```bash
#!/bin/bash
# convert-certs.sh - Convert all PEM files in a directory to DER

INPUT_DIR="./pem-certs"
OUTPUT_DIR="./der-certs"

mkdir -p "$OUTPUT_DIR"

for pem_file in "$INPUT_DIR"/*.pem; do
    # Get the filename without extension
    base=$(basename "$pem_file" .pem)
    output_file="$OUTPUT_DIR/${base}.der"

    echo "Converting $pem_file to $output_file..."
    if openssl x509 -in "$pem_file" -outform DER -out "$output_file" 2>/dev/null; then
        echo "  Success"
    else
        echo "  Failed - skipping (may not be a certificate file)"
    fi
done

echo "Conversion complete. DER files in $OUTPUT_DIR"
```

## Summary

OpenSSL handles almost every certificate format conversion you'll encounter. The key patterns are: use `-inform` to specify the input format, `-outform` for the output format, and `pkcs12` subcommand for PFX/P12 operations. PEM is the universal currency of Linux certificate management - when in doubt, convert to PEM first. For Windows and Java environments, PFX/PKCS12 is the standard. Always verify conversions with `openssl x509 -noout -text` to confirm the resulting file is valid before deploying.
