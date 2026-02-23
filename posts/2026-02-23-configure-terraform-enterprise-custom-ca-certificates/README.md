# How to Configure Terraform Enterprise with Custom CA Certificates

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Terraform Enterprise, CA Certificates, TLS, Security, PKI

Description: Learn how to configure Terraform Enterprise to trust custom CA certificates for connecting to internal services like private VCS servers, LDAP, and internal registries.

---

Enterprise networks typically use their own Certificate Authority to issue TLS certificates for internal services - VCS servers, container registries, databases, LDAP servers, and more. These certificates are not signed by publicly trusted CAs, so Terraform Enterprise does not trust them by default. When TFE tries to connect to one of these services, it fails with certificate validation errors.

Configuring TFE to trust your custom CA certificates is one of the first things you should do after installation. This guide covers the process for different deployment types and troubleshooting common certificate trust issues.

## Understanding the Problem

When TFE sees a certificate signed by an unknown CA, you get errors like:

```
x509: certificate signed by unknown authority
tls: failed to verify certificate: x509: certificate signed by unknown authority
SSL certificate problem: unable to get local issuer certificate
```

These errors appear when TFE tries to:

- Clone repositories from an internal Git server
- Connect to an LDAP server for authentication
- Pull images from a private container registry
- Connect to Vault using a private CA certificate
- Connect to an SMTP server with an internal certificate
- Reach object storage endpoints using private link certificates

The fix is always the same: add your CA certificate to TFE's trust store.

## Identifying Your CA Certificates

First, figure out which CA certificates you need:

```bash
# Download the CA certificate from a service
# Replace the host and port with your internal service
openssl s_client -connect gitlab.internal.example.com:443 -showcerts < /dev/null 2>/dev/null | \
  awk '/BEGIN CERTIFICATE/,/END CERTIFICATE/{print}' > internal-certs.pem

# See how many certificates are in the chain
grep -c "BEGIN CERTIFICATE" internal-certs.pem

# View each certificate's details
openssl crl2pkcs7 -nocrl -certfile internal-certs.pem | \
  openssl pkcs7 -print_certs -noout

# Extract just the CA certificate (usually the last one in the chain)
# Or get it from your PKI team
```

If your organization has multiple CAs (root CA, intermediate CAs, different CAs for different services), combine them all into a single bundle:

```bash
# Combine all CA certificates into one file
cat root-ca.crt intermediate-ca.crt other-ca.crt > custom-ca-bundle.crt

# Verify the bundle is valid PEM
openssl x509 -in custom-ca-bundle.crt -noout -text | head -5
```

## Configuring TFE with Custom CA Certificates

### Environment Variable Method

The primary way to add custom CA certificates is through the `TFE_TLS_CA_BUNDLE_FILE` environment variable:

```bash
# Set the CA bundle file path
TFE_TLS_CA_BUNDLE_FILE=/etc/tfe/tls/custom-ca-bundle.crt
```

This file should contain your custom CA certificates. TFE will trust these CAs in addition to the standard system CAs.

### Creating a Complete CA Bundle

For maximum compatibility, combine your custom CAs with the system CA bundle:

```bash
# On Debian/Ubuntu systems
cat /etc/ssl/certs/ca-certificates.crt /path/to/custom-ca-bundle.crt > /opt/tfe/certs/combined-ca-bundle.crt

# On RHEL/CentOS systems
cat /etc/pki/tls/certs/ca-bundle.crt /path/to/custom-ca-bundle.crt > /opt/tfe/certs/combined-ca-bundle.crt

# Set TFE to use the combined bundle
TFE_TLS_CA_BUNDLE_FILE=/opt/tfe/certs/combined-ca-bundle.crt
```

### Docker Compose Configuration

```yaml
# docker-compose.yml with custom CA certificates
version: "3.9"
services:
  tfe:
    image: images.releases.hashicorp.com/hashicorp/terraform-enterprise:latest
    environment:
      TFE_HOSTNAME: tfe.example.com
      TFE_TLS_CERT_FILE: /etc/tfe/tls/tfe.crt
      TFE_TLS_KEY_FILE: /etc/tfe/tls/tfe.key
      # This is where custom CAs go
      TFE_TLS_CA_BUNDLE_FILE: /etc/tfe/tls/custom-ca-bundle.crt
      # Other TFE configuration...
    volumes:
      # Mount the certificates directory
      - ./certs/tfe.crt:/etc/tfe/tls/tfe.crt:ro
      - ./certs/tfe.key:/etc/tfe/tls/tfe.key:ro
      - ./certs/custom-ca-bundle.crt:/etc/tfe/tls/custom-ca-bundle.crt:ro
    ports:
      - "443:443"
```

### Kubernetes Configuration

```yaml
# ConfigMap for the CA bundle
apiVersion: v1
kind: ConfigMap
metadata:
  name: tfe-ca-certificates
  namespace: tfe
data:
  custom-ca-bundle.crt: |
    -----BEGIN CERTIFICATE-----
    MIIDxTCCAq2gAwIBAgIQAqxcJmoLQJuPC3nyrkYldzANBgkqhkiG9w0BAQsFADBs
    ... your root CA certificate ...
    -----END CERTIFICATE-----
    -----BEGIN CERTIFICATE-----
    MIIDxTCCAq2gAwIBAgIQAqxcJmoLQJuPC3nyrkYldzANBgkqhkiG9w0BAQsFADBs
    ... your intermediate CA certificate ...
    -----END CERTIFICATE-----
---
# Mount in the TFE deployment
apiVersion: apps/v1
kind: Deployment
metadata:
  name: tfe
  namespace: tfe
spec:
  template:
    spec:
      containers:
        - name: tfe
          env:
            - name: TFE_TLS_CA_BUNDLE_FILE
              value: /etc/tfe/tls/custom-ca-bundle.crt
          volumeMounts:
            - name: ca-certificates
              mountPath: /etc/tfe/tls/custom-ca-bundle.crt
              subPath: custom-ca-bundle.crt
              readOnly: true
      volumes:
        - name: ca-certificates
          configMap:
            name: tfe-ca-certificates
```

## Configuring CA Trust for TFE Agents

If you use custom agents, they also need to trust your internal CAs:

```bash
# Pass the CA certificate to the agent via environment variable
docker run -d \
  --name tfe-agent \
  -e TFC_ADDRESS=https://tfe.example.com \
  -e TFC_AGENT_TOKEN="${AGENT_TOKEN}" \
  -e TFC_AGENT_CUSTOM_CA_CERT_FILE=/etc/ssl/custom/ca.crt \
  -v /path/to/custom-ca-bundle.crt:/etc/ssl/custom/ca.crt:ro \
  hashicorp/tfc-agent:latest
```

### Custom Agent Image with CA Certificates

```dockerfile
# Dockerfile for agent with baked-in CA certificates
FROM hashicorp/tfc-agent:latest

USER root

# Copy the custom CA certificate
COPY custom-ca-bundle.crt /usr/local/share/ca-certificates/custom-ca.crt

# Update the system CA trust store
RUN update-ca-certificates

USER tfc-agent

ENV TFC_AGENT_CUSTOM_CA_CERT_FILE=/usr/local/share/ca-certificates/custom-ca.crt
```

## Terraform Provider CA Trust

Terraform providers running inside TFE also need to trust your CAs. Some providers have their own CA configuration:

```hcl
# AWS provider - usually works with system CAs
provider "aws" {
  region = "us-east-1"
  # No special CA config needed if system CAs are updated
}

# Vault provider with custom CA
provider "vault" {
  address  = "https://vault.internal.example.com"
  ca_cert_file = "/etc/tfe/tls/custom-ca-bundle.crt"
}

# Kubernetes provider with custom CA
provider "kubernetes" {
  host                   = "https://k8s.internal.example.com"
  cluster_ca_certificate = file("/etc/tfe/tls/k8s-ca.crt")
}
```

## Verifying CA Trust

After configuring the CA bundle, verify that TFE trusts the certificates:

```bash
# Check TFE's health endpoint first
curl -s https://tfe.example.com/_health_check | jq .

# Test connectivity to internal services from the TFE container
# Enter the TFE container
docker exec -it tfe bash

# Test VCS server certificate trust
openssl s_client -connect gitlab.internal.example.com:443 \
  -CAfile /etc/tfe/tls/custom-ca-bundle.crt < /dev/null

# Test with curl
curl -v --cacert /etc/tfe/tls/custom-ca-bundle.crt \
  https://gitlab.internal.example.com/api/v4/version
```

## Troubleshooting Certificate Trust Issues

### Certificate Chain Problems

```bash
# Verify the full chain is valid
openssl verify -CAfile custom-ca-bundle.crt server-cert.crt

# If it fails, check if intermediate CAs are missing
openssl verify -CAfile root-ca.crt -untrusted intermediate-ca.crt server-cert.crt

# Common fix: add the missing intermediate CA to your bundle
cat intermediate-ca.crt >> custom-ca-bundle.crt
```

### File Format Issues

```bash
# TFE expects PEM format. Check if the file is PEM:
head -1 custom-ca-bundle.crt
# Should show: -----BEGIN CERTIFICATE-----

# If it is DER format, convert it:
openssl x509 -inform DER -in ca-cert.der -out ca-cert.pem -outform PEM

# If it is PKCS7 format, convert it:
openssl pkcs7 -inform PEM -in ca-cert.p7b -print_certs -out ca-cert.pem

# If it is PFX/PKCS12 format, extract the CA certs:
openssl pkcs12 -in ca-bundle.pfx -cacerts -nokeys -out ca-certs.pem
```

### Windows Line Ending Issues

```bash
# Check for Windows line endings (carriage returns)
file custom-ca-bundle.crt
# If it says "with CRLF line terminators", fix it:
dos2unix custom-ca-bundle.crt

# Or use sed
sed -i 's/\r$//' custom-ca-bundle.crt
```

### Certificate Expired

```bash
# Check if any CA certificates in the bundle are expired
while openssl x509 -noout -enddate 2>/dev/null; do
  :
done < custom-ca-bundle.crt

# More detailed check
awk '/BEGIN CERTIFICATE/,/END CERTIFICATE/{print}' custom-ca-bundle.crt | \
  while IFS= read -r line; do
    if [[ "${line}" == "-----BEGIN CERTIFICATE-----" ]]; then
      cert=""
    fi
    cert="${cert}${line}\n"
    if [[ "${line}" == "-----END CERTIFICATE-----" ]]; then
      echo -e "${cert}" | openssl x509 -noout -subject -enddate
    fi
  done
```

## Automating CA Certificate Updates

When your CA certificates are rotated, automate the update across TFE:

```bash
#!/bin/bash
# update-tfe-ca-certs.sh
# Update the CA bundle and restart TFE

CA_BUNDLE_PATH="/opt/tfe/certs/custom-ca-bundle.crt"

# Download the latest CA bundle from your PKI endpoint
curl -s -o "${CA_BUNDLE_PATH}.new" https://pki.internal.example.com/ca-bundle.pem

# Verify the new bundle is valid
if openssl x509 -in "${CA_BUNDLE_PATH}.new" -noout -text > /dev/null 2>&1; then
  mv "${CA_BUNDLE_PATH}.new" "${CA_BUNDLE_PATH}"
  echo "CA bundle updated. Restarting TFE..."
  cd /opt/tfe && docker compose restart tfe
else
  echo "ERROR: New CA bundle is invalid. Keeping the existing one."
  rm -f "${CA_BUNDLE_PATH}.new"
  exit 1
fi
```

## Summary

Custom CA certificates are a foundational configuration for Terraform Enterprise in any enterprise environment. Without them, TFE cannot connect to your internal VCS servers, LDAP directories, container registries, or other services that use internally-signed certificates. The configuration is straightforward - collect all your CA certificates into a PEM bundle, mount it in the TFE container, and point `TFE_TLS_CA_BUNDLE_FILE` at it. Apply the same approach to TFE agents. When in doubt, combine your custom CAs with the system CA bundle so TFE trusts both internal and external certificates.
