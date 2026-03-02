# How to Install a Root CA Certificate in the Ubuntu Trust Store

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, SSL/TLS, PKI, Security

Description: Learn how to install custom root CA certificates into the Ubuntu system trust store, enabling system-wide trust for internal PKI certificates and private Certificate Authorities.

---

Ubuntu ships with a set of trusted root Certificate Authorities maintained by Mozilla. When you run an internal PKI or use a custom CA for development or corporate infrastructure, you need to add your CA's certificate to the system trust store. Without it, any certificate signed by your internal CA will produce "certificate not trusted" errors in browsers, curl, and other tools.

## Understanding the Trust Store

Ubuntu stores trusted CA certificates in `/etc/ssl/certs/`. The system trust bundle (used by OpenSSL and most applications) is compiled from:

- `/etc/ssl/certs/ca-certificates.crt` - the combined bundle
- `/usr/share/ca-certificates/` - certificates managed by the `ca-certificates` package
- `/usr/local/share/ca-certificates/` - locally added certificates (what you put here)

The `update-ca-certificates` command rebuilds the bundle and symlinks in `/etc/ssl/certs/` from these directories.

## Getting Your CA Certificate

Your CA certificate file should be in PEM format - a base64-encoded certificate that looks like:

```
-----BEGIN CERTIFICATE-----
MIIFazCCA1OgAwIBAgIRAIIQz7DSQONZRGPgu2OCiwAwDQYJKoZIhvcNAQELBQAw
...
-----END CERTIFICATE-----
```

If you have it in DER format (binary), convert it first:

```bash
# Convert DER to PEM
openssl x509 -inform DER -in ca-cert.der -out ca-cert.crt

# Verify the converted certificate
openssl x509 -in ca-cert.crt -noout -text | head -20
```

If you're using an internal service like Vault or step-ca, export the root certificate from there:

```bash
# Example: get the root CA from a Vault PKI secrets engine
vault read -field=certificate pki/cert/ca > internal-ca.crt

# Verify it looks correct
openssl x509 -in internal-ca.crt -noout -subject -issuer -dates
```

## Installing the Certificate System-Wide

Ubuntu's method for adding CA certificates uses the `/usr/local/share/ca-certificates/` directory:

```bash
# The certificate file MUST have a .crt extension
# Copy the CA certificate to the local certificates directory
sudo cp internal-ca.crt /usr/local/share/ca-certificates/internal-ca.crt

# Update the certificate store
sudo update-ca-certificates
```

Expected output:

```
Updating certificates in /etc/ssl/certs...
1 added, 0 removed; done.
Running hooks in /etc/ssl/certs...
done.
```

The `update-ca-certificates` command:
1. Creates a symlink in `/etc/ssl/certs/` pointing to your certificate
2. Rebuilds `/etc/ssl/certs/ca-certificates.crt` to include your CA
3. Runs any scripts in `/etc/ca-certificates/update.d/`

## Verifying the Installation

```bash
# Verify the certificate was added to the system trust store
ls /etc/ssl/certs/ | grep -i internal

# Check the certificate appears in the combined bundle
grep "Your CA Name" /etc/ssl/certs/ca-certificates.crt

# Test SSL connection to a server using your internal CA
# This should work without errors if the CA is trusted
curl https://internal-service.example.com

# Verify a certificate signed by your CA
openssl verify -CAfile /etc/ssl/certs/ca-certificates.crt /path/to/server-cert.pem
# Expected output: /path/to/server-cert.pem: OK

# Connect to a service and verify the chain
openssl s_client -connect internal-service.example.com:443 -CApath /etc/ssl/certs/ -brief
```

## Handling Multiple CA Certificates

For organizations with complex PKI (root CA and intermediate CAs):

```bash
# Add multiple certificates - each as a separate .crt file
sudo cp root-ca.crt /usr/local/share/ca-certificates/company-root-ca.crt
sudo cp intermediate-ca.crt /usr/local/share/ca-certificates/company-intermediate-ca.crt

# Update the store
sudo update-ca-certificates

# Verify both were added
sudo update-ca-certificates --verbose 2>&1 | grep -i "added\|company"
```

## Removing a CA Certificate

```bash
# Remove the certificate file
sudo rm /usr/local/share/ca-certificates/internal-ca.crt

# Rebuild the trust store
sudo update-ca-certificates --fresh

# The --fresh flag forces a full rebuild of the certificate store
# Expected output: 0 added, 1 removed
```

## Installing for Specific Applications

Some applications maintain their own certificate stores and ignore the system trust store.

### Python / pip

Python's `requests` library and pip use the `certifi` package's bundle by default:

```bash
# Find the certifi bundle location
python3 -c "import certifi; print(certifi.where())"

# Option 1: Set environment variable to use system certs
export REQUESTS_CA_BUNDLE=/etc/ssl/certs/ca-certificates.crt

# Option 2: Append your CA to certifi's bundle (survives pip upgrades less well)
cat /usr/local/share/ca-certificates/internal-ca.crt >> $(python3 -c "import certifi; print(certifi.where())")

# Option 3: Use SSL_CERT_FILE for broader coverage
export SSL_CERT_FILE=/etc/ssl/certs/ca-certificates.crt
```

### Node.js / npm

```bash
# Node.js does not use the system trust store by default
# Set the NODE_EXTRA_CA_CERTS environment variable
export NODE_EXTRA_CA_CERTS=/usr/local/share/ca-certificates/internal-ca.crt

# Add permanently to /etc/environment for system-wide effect
echo "NODE_EXTRA_CA_CERTS=/usr/local/share/ca-certificates/internal-ca.crt" | sudo tee -a /etc/environment
```

### curl

curl uses the system trust store by default on Ubuntu. After running `update-ca-certificates`, curl trusts your CA:

```bash
# This should work without --insecure once the CA is installed
curl https://internal-service.example.com

# If curl is using a non-standard cert bundle, specify it
curl --cacert /etc/ssl/certs/ca-certificates.crt https://internal-service.example.com
```

### Java

Java maintains its own keystore (cacerts):

```bash
# Find the Java cacerts location
find /usr/lib/jvm -name "cacerts" 2>/dev/null | head -5

# Import the CA certificate into Java's trust store
sudo keytool -import \
    -alias internal-ca \
    -keystore /usr/lib/jvm/java-17-openjdk-amd64/lib/security/cacerts \
    -file /usr/local/share/ca-certificates/internal-ca.crt \
    -storepass changeit \
    -noprompt

# Verify the import
sudo keytool -list \
    -alias internal-ca \
    -keystore /usr/lib/jvm/java-17-openjdk-amd64/lib/security/cacerts \
    -storepass changeit
```

### Docker

Docker daemon uses the system trust store. Restart the Docker daemon after updating certs:

```bash
# After update-ca-certificates
sudo systemctl restart docker

# For pulling from registries using a private CA,
# also add the cert to Docker's cert.d directory
sudo mkdir -p /etc/docker/certs.d/registry.internal.example.com/
sudo cp internal-ca.crt /etc/docker/certs.d/registry.internal.example.com/ca.crt
```

## Automating CA Certificate Deployment

For deploying to many systems, automate the process:

```bash
#!/bin/bash
# deploy-internal-ca.sh - Deploy internal CA to Ubuntu systems

CA_CERT_URL="https://pki.internal.example.com/root-ca.crt"
CA_CERT_NAME="company-internal-ca"
INSTALL_DIR="/usr/local/share/ca-certificates"

echo "Downloading CA certificate..."
curl -fsSL "$CA_CERT_URL" -o "/tmp/${CA_CERT_NAME}.crt"

# Verify it's a valid certificate before installing
if ! openssl x509 -in "/tmp/${CA_CERT_NAME}.crt" -noout 2>/dev/null; then
    echo "ERROR: Downloaded file is not a valid certificate" >&2
    exit 1
fi

echo "Installing CA certificate..."
cp "/tmp/${CA_CERT_NAME}.crt" "${INSTALL_DIR}/${CA_CERT_NAME}.crt"
update-ca-certificates

echo "CA certificate installed successfully"
openssl x509 -in "${INSTALL_DIR}/${CA_CERT_NAME}.crt" -noout -subject -dates
```

## Summary

Adding a root CA to Ubuntu's trust store is a two-step process: copy the `.crt` file to `/usr/local/share/ca-certificates/` and run `update-ca-certificates`. This makes the CA trusted system-wide for OpenSSL-based tools including curl, wget, and most Linux utilities. For applications that maintain their own trust stores - Python's certifi, Node.js, Java - apply the CA separately using each tool's own mechanism. Always verify the installation with `openssl verify` before relying on the certificate chain in production.
