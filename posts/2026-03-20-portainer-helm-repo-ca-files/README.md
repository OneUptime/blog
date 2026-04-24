# How to Configure CA Files for Helm Repositories in Portainer

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Kubernetes, Helm, Security, TLS

Description: Learn how to configure CA certificate files for private Helm repositories with self-signed TLS certificates in Portainer to enable secure chart fetching.

## Introduction

When hosting a private Helm repository with a self-signed or internal CA-signed TLS certificate, Portainer Business Edition can use a CA certificate file to verify the repository's identity. Without it, Portainer will fail to fetch the chart index with a TLS verification error. This guide covers how to configure CA files for Helm repositories in Portainer.

## Prerequisites

- Portainer Business Edition with a Kubernetes environment
- A private Helm repository with TLS enabled
- The CA certificate (PEM format) that signed the repository's TLS certificate
- Admin access to Portainer

## When Is a CA File Required?

You need a CA file when your Helm repository uses:

- A self-signed TLS certificate
- A certificate signed by an internal/private CA
- A certificate from a CA not included in the default trust store

You do NOT need a CA file for repositories using certificates from public CAs (Let's Encrypt, DigiCert, etc.) since those are trusted by default.

## Step 1: Obtain Your CA Certificate

Get your CA certificate in PEM format. The safest option is to obtain the issuing CA certificate directly from your internal PKI or repository administrator. If the server presents the certificate chain, you can inspect it first:

```bash
# Save the certificate chain presented by the server
openssl s_client -connect helm.internal.company.com:443 \
  -servername helm.internal.company.com -showcerts </dev/null 2>/dev/null | \
  awk '/-----BEGIN CERTIFICATE-----/,/-----END CERTIFICATE-----/ { print }' > chain.pem

# Inspect the presented certificates and identify the issuing CA certificate you need
openssl crl2pkcs7 -nocrl -certfile chain.pem | \
  openssl pkcs7 -print_certs -text -noout

# Verify the CA certificate
openssl x509 -in internal-ca.pem -text -noout | grep -E "(Issuer:|Subject:|Not Before|Not After)"

# Convert DER format to PEM if needed
openssl x509 -inform DER -in ca.der -out ca.pem
```

## Step 2: Configure CA File in Portainer UI

In current Portainer releases, the Helm CA file is configured in **Settings** and applies to both the global Helm repository and Helm repositories you add for your user.

1. Log into Portainer as an admin.
2. Go to **Settings**.
3. Scroll to **Certificate Authority file for Kubernetes Helm repositories**.
4. Upload the CA certificate file in PEM format.
5. Click **Apply Changes**.
6. If the repository URL is not already configured, go to **My account** > **Helm repositories**, enter the repository URL (for example, `https://helm.internal.company.com`), and click **Save Helm repository**.

## Step 3: Add the Helm Repository via the Portainer API

```bash
# Use an API access token created under My account > Access tokens
API_KEY="your_api_key_here"

# Get the current user's ID
USER_ID=$(curl -s -H "X-API-Key: ${API_KEY}" \
  "https://portainer.example.com/api/users/me" | jq -r '.Id')

# Add the Helm repository URL for that user
curl -s -X POST \
  -H "X-API-Key: ${API_KEY}" \
  -H "Content-Type: application/json" \
  "https://portainer.example.com/api/users/${USER_ID}/helm/repositories" \
  -d '{"url":"https://helm.internal.company.com"}'
```

The Helm CA file itself is configured separately in **Settings** under **Certificate Authority file for Kubernetes Helm repositories**.

## Step 4: Deploy ChartMuseum with TLS

If you are running ChartMuseum as your private Helm repository, here is a Docker Compose example with TLS:

```yaml
# docker-compose.yml - ChartMuseum with TLS
services:
  chartmuseum:
    image: ghcr.io/helm/chartmuseum:v0.16.5
    container_name: chartmuseum
    ports:
      - "443:8080"
    volumes:
      - ./charts:/charts                    # Chart storage directory
      - ./certs/server.crt:/certs/tls.crt  # Server certificate
      - ./certs/server.key:/certs/tls.key  # Server private key
    environment:
      STORAGE: local
      STORAGE_LOCAL_ROOTDIR: /charts
      TLS_CERT: /certs/tls.crt
      TLS_KEY: /certs/tls.key
      DEBUG: "true"
    restart: unless-stopped
```

## Step 5: Generate a Self-Signed CA and Certificate

For testing or internal use, generate your own CA and sign a certificate:

```bash
# Step 1: Generate CA key and certificate
openssl genrsa -out ca.key 4096
openssl req -new -x509 -days 3650 -key ca.key -out ca.crt \
  -subj "/CN=Internal Helm CA/O=My Company" \
  -addext "basicConstraints=critical,CA:TRUE" \
  -addext "keyUsage=critical,keyCertSign,cRLSign"

# Step 2: Generate server key and CSR
openssl genrsa -out server.key 2048
openssl req -new -key server.key -out server.csr \
  -subj "/CN=helm.internal.company.com"

# Step 3: Sign the server certificate with your CA
cat > server-ext.cnf << EOF
basicConstraints = CA:FALSE
keyUsage = critical, digitalSignature, keyEncipherment
extendedKeyUsage = serverAuth
subjectAltName = DNS:helm.internal.company.com
EOF

openssl x509 -req -days 365 -in server.csr \
  -CA ca.crt -CAkey ca.key -CAcreateserial \
  -out server.crt -extfile server-ext.cnf

# ca.crt is what you upload to Portainer as the CA file
# server.crt and server.key go on your ChartMuseum server
```

## Step 6: Verify TLS Connectivity

Before configuring Portainer, verify TLS works:

```bash
# Test with curl using your CA cert
curl --cacert internal-ca.pem https://helm.internal.company.com/index.yaml

# Add the Helm repo manually to verify it works
helm repo add internal-repo https://helm.internal.company.com \
  --ca-file internal-ca.pem

helm repo update
helm search repo internal-repo
```

## Troubleshooting TLS Issues

```bash
# Common error: certificate signed by unknown authority
# Solution: Upload your CA cert to Portainer

# Common error: certificate has expired
openssl x509 -in server.crt -noout -dates

# Check certificate chain
openssl s_client -connect helm.internal.company.com:443 \
  -servername helm.internal.company.com \
  -CAfile ca.pem \
  -verify_hostname helm.internal.company.com

# Verify hostname matches CN or SAN
openssl x509 -in server.crt -text -noout | grep -A 3 "Subject Alternative"
```

## Conclusion

Configuring CA files for Helm repositories in Portainer is essential when working with private or self-signed TLS certificates. Upload your CA certificate in Portainer Settings, then add the repository through the UI or API to establish trusted connections to internal chart repositories. This approach maintains full TLS verification while supporting internal PKI infrastructure - always prefer proper CA configuration over disabling TLS verification.
