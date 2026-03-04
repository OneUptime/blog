# How to Use openssl for Cryptographic Operations on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Security, OpenSSL, Cryptography, Certificates

Description: Learn how to use the openssl command-line tool on Ubuntu for encryption, decryption, certificate management, key generation, and TLS inspection.

---

OpenSSL is one of the most widely deployed cryptographic libraries in the world, and its command-line tool is available on virtually every Linux system. Beyond its use in TLS/HTTPS, the `openssl` command provides a comprehensive toolkit for symmetric encryption, asymmetric key operations, certificate management, and cryptographic testing.

## Verifying Your OpenSSL Installation

```bash
# Check OpenSSL version
openssl version

# Show full version details including compile options
openssl version -a

# List available ciphers
openssl ciphers -v | head -20

# List available commands
openssl help

# List available digest algorithms
openssl dgst -list
```

## Symmetric Encryption and Decryption

OpenSSL supports dozens of symmetric ciphers. AES-256-CBC and AES-256-GCM are the recommended choices.

### Encrypting Files

```bash
# Encrypt a file with AES-256-CBC (password-based)
openssl enc -aes-256-cbc -salt -pbkdf2 \
    -in plaintext.txt \
    -out encrypted.bin

# Prompts for a passphrase interactively

# Encrypt with a specific password (for scripting)
openssl enc -aes-256-cbc -salt -pbkdf2 \
    -in plaintext.txt \
    -out encrypted.bin \
    -pass pass:yourpassword

# Encrypt using a password stored in a file (more secure)
echo "yourpassword" > /tmp/passfile && chmod 600 /tmp/passfile
openssl enc -aes-256-cbc -salt -pbkdf2 \
    -in plaintext.txt \
    -out encrypted.bin \
    -pass file:/tmp/passfile

# Use AES-256-GCM (authenticated encryption - preferred over CBC)
openssl enc -aes-256-gcm -salt -pbkdf2 \
    -in plaintext.txt \
    -out encrypted.gcm
```

The `-pbkdf2` flag enables Password-Based Key Derivation Function 2, which is important for security - without it, a simple hash is used for key derivation, which is vulnerable to brute force.

### Decrypting Files

```bash
# Decrypt AES-256-CBC file
openssl enc -aes-256-cbc -d -pbkdf2 \
    -in encrypted.bin \
    -out decrypted.txt

# Decrypt with explicit password
openssl enc -aes-256-cbc -d -pbkdf2 \
    -in encrypted.bin \
    -out decrypted.txt \
    -pass pass:yourpassword

# Decrypt and output to stdout (useful in pipelines)
openssl enc -aes-256-cbc -d -pbkdf2 \
    -in encrypted.bin \
    -pass pass:yourpassword | cat
```

## Generating Keys and Certificates

### RSA Key Generation

```bash
# Generate a 4096-bit RSA private key
openssl genrsa -out private-key.pem 4096

# Generate an RSA key protected by a passphrase
openssl genrsa -aes256 -out private-key-protected.pem 4096

# Extract the public key from the private key
openssl rsa -in private-key.pem -pubout -out public-key.pem

# View the key details
openssl rsa -in private-key.pem -text -noout

# Check the modulus (fingerprint for matching keys and certificates)
openssl rsa -in private-key.pem -modulus -noout | openssl md5
```

### Elliptic Curve Keys (Faster and Smaller)

```bash
# List available elliptic curves
openssl ecparam -list_curves

# Generate an EC private key using P-256 curve (NIST recommended)
openssl ecparam -name prime256v1 -genkey -noout -out ec-private-key.pem

# Generate EC key using P-384 (more secure, slightly slower)
openssl ecparam -name secp384r1 -genkey -noout -out ec-private-384.pem

# Extract the EC public key
openssl ec -in ec-private-key.pem -pubout -out ec-public-key.pem

# View EC key details
openssl ec -in ec-private-key.pem -text -noout
```

### Self-Signed Certificates

```bash
# Generate a self-signed certificate (useful for internal services)
# Creates both the key and certificate in one command
openssl req -x509 \
    -newkey rsa:4096 \
    -keyout server.key \
    -out server.crt \
    -days 365 \
    -nodes \
    -subj "/C=US/ST=California/L=San Francisco/O=MyOrg/CN=myserver.example.com"

# For a multi-domain certificate (SAN - Subject Alternative Names)
openssl req -x509 \
    -newkey rsa:4096 \
    -keyout server.key \
    -out server.crt \
    -days 365 \
    -nodes \
    -subj "/CN=myserver.example.com" \
    -addext "subjectAltName=DNS:myserver.example.com,DNS:www.myserver.example.com,IP:192.168.1.100"
```

### Certificate Signing Requests (CSR)

```bash
# Generate a private key and CSR for submission to a CA
openssl req \
    -newkey rsa:2048 \
    -keyout domain.key \
    -out domain.csr \
    -nodes \
    -subj "/C=US/ST=CA/L=SF/O=MyCompany/OU=IT/CN=example.com"

# View the CSR contents
openssl req -in domain.csr -text -noout

# Verify CSR signature
openssl req -in domain.csr -verify

# Sign a CSR with your own CA
openssl x509 -req \
    -in domain.csr \
    -CA ca.crt \
    -CAkey ca.key \
    -CAcreateserial \
    -out domain.crt \
    -days 365 \
    -sha256
```

## RSA Asymmetric Encryption

```bash
# Encrypt a small file with a public key (RSA is limited to small payloads)
# For large files, use hybrid encryption (RSA to encrypt a symmetric key)
openssl rsautl -encrypt \
    -inkey public-key.pem \
    -pubin \
    -in message.txt \
    -out message.enc

# Decrypt with the private key
openssl rsautl -decrypt \
    -inkey private-key.pem \
    -in message.enc \
    -out message-decrypted.txt
```

### Hybrid Encryption (Practical for Large Files)

```bash
#!/bin/bash
# hybrid-encrypt.sh - RSA + AES hybrid encryption

PUBKEY="$1"
PLAINTEXT="$2"
OUTPUT_DIR="${3:-.}"

# Generate a random AES session key
openssl rand -out "$OUTPUT_DIR/session.key" 32  # 256-bit key

# Encrypt the session key with RSA public key
openssl rsautl -encrypt \
    -inkey "$PUBKEY" -pubin \
    -in "$OUTPUT_DIR/session.key" \
    -out "$OUTPUT_DIR/session.key.enc"

# Encrypt the actual file with the symmetric session key
openssl enc -aes-256-cbc -pbkdf2 \
    -in "$PLAINTEXT" \
    -out "$OUTPUT_DIR/data.enc" \
    -pass file:"$OUTPUT_DIR/session.key"

# Clean up the plaintext session key
rm "$OUTPUT_DIR/session.key"

echo "Encrypted. Files: session.key.enc (RSA-encrypted AES key) and data.enc (AES-encrypted data)"
```

```bash
#!/bin/bash
# hybrid-decrypt.sh - Decrypt hybrid-encrypted files

PRIVKEY="$1"
SESSION_KEY_ENC="$2"
DATA_ENC="$3"
OUTPUT="$4"

# Decrypt the session key with RSA private key
openssl rsautl -decrypt \
    -inkey "$PRIVKEY" \
    -in "$SESSION_KEY_ENC" \
    -out /tmp/session.key

# Decrypt the data with the recovered session key
openssl enc -aes-256-cbc -d -pbkdf2 \
    -in "$DATA_ENC" \
    -out "$OUTPUT" \
    -pass file:/tmp/session.key

rm /tmp/session.key
echo "Decrypted to: $OUTPUT"
```

## Hash Functions and Message Digests

```bash
# Compute SHA-256 hash of a file
openssl dgst -sha256 file.txt

# SHA-512 hash
openssl dgst -sha512 file.txt

# MD5 (avoid for security purposes, use for checksums only)
openssl dgst -md5 file.txt

# Hash multiple files at once
openssl dgst -sha256 file1.txt file2.txt file3.txt

# Compute HMAC (Hash-based Message Authentication Code)
openssl dgst -sha256 -hmac "secretkey" file.txt

# Generate a random hex string (useful for tokens and secrets)
openssl rand -hex 32   # 32 bytes = 64 hex chars
openssl rand -base64 32  # 32 bytes in base64 encoding
```

## TLS/SSL Connection Inspection

```bash
# Connect to a server and view its certificate
openssl s_client -connect example.com:443

# Show just the certificate without interactive session
openssl s_client -connect example.com:443 </dev/null

# Extract just the server certificate
openssl s_client -connect example.com:443 </dev/null 2>/dev/null | \
    openssl x509 -text -noout

# Show the full certificate chain
openssl s_client -connect example.com:443 -showcerts </dev/null 2>/dev/null

# Check certificate expiry
openssl s_client -connect example.com:443 </dev/null 2>/dev/null | \
    openssl x509 -noout -dates

# Test specific TLS version
openssl s_client -connect example.com:443 -tls1_3 </dev/null
openssl s_client -connect example.com:443 -tls1_2 </dev/null

# Test specific cipher suite
openssl s_client -connect example.com:443 -cipher ECDHE-RSA-AES256-GCM-SHA384 </dev/null
```

## Certificate Information

```bash
# View certificate details
openssl x509 -in certificate.crt -text -noout

# View just the subject
openssl x509 -in certificate.crt -subject -noout

# View just the issuer
openssl x509 -in certificate.crt -issuer -noout

# View validity dates
openssl x509 -in certificate.crt -dates -noout

# View fingerprint (for verification)
openssl x509 -in certificate.crt -fingerprint -sha256 -noout

# Check if a private key matches a certificate
openssl rsa -in private.key -modulus -noout | openssl md5
openssl x509 -in certificate.crt -modulus -noout | openssl md5
# Both commands should output the same MD5 hash
```

## Converting Certificate Formats

```bash
# PEM to DER
openssl x509 -in certificate.pem -outform DER -out certificate.der

# DER to PEM
openssl x509 -in certificate.der -inform DER -outform PEM -out certificate.pem

# PEM to PKCS#12 (for importing into browsers/Windows)
openssl pkcs12 -export \
    -out certificate.p12 \
    -inkey private.key \
    -in certificate.crt \
    -certfile chain.crt

# PKCS#12 to PEM
openssl pkcs12 -in certificate.p12 -out certificate.pem -nodes
```

## Building a Simple CA

```bash
#!/bin/bash
# setup-ca.sh - Create a simple certificate authority

CA_DIR="/etc/myca"
sudo mkdir -p "$CA_DIR"/{certs,crl,newcerts,private}
sudo chmod 700 "$CA_DIR/private"
echo 01 | sudo tee "$CA_DIR/serial"
sudo touch "$CA_DIR/index.txt"

# Generate CA private key
sudo openssl genrsa -aes256 -out "$CA_DIR/private/ca.key" 4096

# Generate CA self-signed certificate (valid for 10 years)
sudo openssl req -new -x509 \
    -days 3650 \
    -key "$CA_DIR/private/ca.key" \
    -out "$CA_DIR/certs/ca.crt" \
    -subj "/C=US/ST=CA/O=MyCA/CN=My Internal CA"

echo "CA certificate: $CA_DIR/certs/ca.crt"
echo "CA private key: $CA_DIR/private/ca.key"
```

OpenSSL is an indispensable part of the sysadmin's toolkit. Mastering its key operations - from basic encryption to certificate inspection - makes you capable of diagnosing TLS issues, setting up internal PKI, and handling cryptographic tasks that would otherwise require specialized software.
