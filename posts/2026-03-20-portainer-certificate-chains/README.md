# How to Configure Certificate Chains in Portainer

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, SSL, TLS, Certificate-chain, PKI, Intermediate-ca

Description: A guide to properly configuring certificate chains (including intermediate CAs) in Portainer to avoid trust errors.

## Overview

Enterprise PKI environments commonly use certificate chains: a root CA signs an intermediate CA, which signs server certificates. Browsers and API clients generally expect the server to present the certificate chain needed to build trust. If only the server certificate is provided (without the intermediate), clients that don't already have or fetch the intermediate can fail verification. This guide covers assembling and configuring proper certificate chains in Portainer.

## Prerequisites

- Portainer running with SSL configured
- Certificate files from your CA (server cert, intermediate cert(s), root cert)
- OpenSSL for verification

## Understanding Certificate Chains

```text
Root CA (self-signed, in OS/browser trust store)
  └── Intermediate CA (signed by Root CA)
        └── Server Certificate (signed by Intermediate CA)
```

For TLS, the server must present: **Server Cert + Intermediate Cert(s)**  
Clients are expected to trust the Root CA separately.

## Step 1: Assemble the Certificate Chain

```bash
# You should have these files from your CA:

# - server.crt   (your Portainer server certificate)
# - intermediate.crt  (intermediate CA certificate)
# - root.crt    (root CA - usually not included in chain)

# Assemble the full chain (server cert + intermediate)
cat server.crt intermediate.crt > fullchain.pem

# For multi-level chains
cat server.crt intermediate2.crt intermediate1.crt > fullchain.pem
# Note: Order matters - server cert first, then intermediates from leaf to root
```

## Step 2: Verify the Chain is Correct

```bash
# Verify the chain is valid
openssl verify -CAfile root.crt -untrusted intermediate.crt server.crt
# Expected: server.crt: OK

# Check the chain order
openssl crl2pkcs7 -nocrl -certfile fullchain.pem \
  | openssl pkcs7 -print_certs -noout

# Verify certificate relationships
# Subject of each cert should match Issuer of the next
openssl x509 -in server.crt -noout -subject -issuer
openssl x509 -in intermediate.crt -noout -subject -issuer
openssl x509 -in root.crt -noout -subject -issuer
```

## Step 3: Configure Portainer with the Full Chain

```bash
# Copy fullchain to Portainer data volume
docker run --rm \
  -v portainer_data:/data \
  -v $(pwd):/certs \
  alpine \
  sh -c "mkdir -p /data/certs && \
    cp /certs/fullchain.pem /data/certs/cert.pem && \
    cp /certs/server.key /data/certs/key.pem"

# Deploy Portainer with the chain certificate
docker stop portainer && docker rm portainer

docker run -d \
  -p 9443:9443 \
  -p 8000:8000 \
  --name portainer \
  --restart=always \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v portainer_data:/data \
  portainer/portainer-ce:sts \
  --sslcert /data/certs/cert.pem \
  --sslkey /data/certs/key.pem \
  --http-disabled
```

## Step 4: Verify Chain in Browser and CLI

```bash
# Check the chain Portainer is presenting
echo | openssl s_client -connect portainer.example.com:9443 \
  -servername portainer.example.com -showcerts 2>/dev/null \
  | grep -E '^[[:space:]]*[0-9]+ s:|^[[:space:]]*i:'

# Should show the server cert followed by the intermediate cert(s):
# 0 s:CN = portainer.example.com
#   i:CN = Intermediate CA, O=MyOrg
# 1 s:CN = Intermediate CA, O=MyOrg
#   i:CN = Root CA, O=MyOrg

# Verify no chain errors against your root CA
echo | openssl s_client -connect portainer.example.com:9443 \
  -servername portainer.example.com \
  -verify_hostname portainer.example.com \
  -CAfile root.crt 2>/dev/null \
  | grep -E "Verify return code"
# Expected: Verify return code: 0 (ok)
```

## Common Chain Issues and Fixes

### "unable to verify the first certificate" Error

```bash
# This often means an intermediate cert is missing from the chain
# or the issuing root CA is not trusted by the client
# Fix: Ensure fullchain.pem includes intermediate cert(s)
cat server.crt intermediate.crt > fullchain.pem
```

### Certificate Order Wrong

```bash
# Wrong order causes chain verification failure
# Check order:
openssl crl2pkcs7 -nocrl -certfile fullchain.pem | openssl pkcs7 -print_certs -text -noout | grep "Subject:"

# Correct order: server cert first, then intermediates
```

### Self-Signed Certificate Appearing in Chain

```bash
# This means the chain includes the root CA
# Root CA should NOT be in the chain file - clients trust it separately
# Remove the last cert from your chain file if it's the root CA
openssl x509 -in root.crt -noout -subject -issuer
# If Subject == Issuer, it's self-issued; root CAs are typically self-signed
```

## Using PKCS#12 (PFX) Bundle

```bash
# If your CA provides a .pfx file, extract the components
openssl pkcs12 -in portainer.pfx -nokeys -clcerts -out server.crt
openssl pkcs12 -in portainer.pfx -nokeys -cacerts -out chain.crt
openssl pkcs12 -in portainer.pfx -nocerts -noenc -out server.key

# Assemble chain
# Ensure chain.crt contains only intermediate CA cert(s), not the root CA
cat server.crt chain.crt > fullchain.pem
```

## Conclusion

Proper certificate chain configuration is essential for enterprise PKI environments. The key principle is: the certificate file (`cert.pem`) provided to Portainer must contain the server certificate followed by all intermediate certificates. The root CA is intentionally omitted because clients are expected to trust it separately. Verify your chain with `openssl s_client` against your trusted root before deploying to production to avoid unexpected trust errors.
