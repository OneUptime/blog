# How to Configure TLS Certificates for Podman Registries

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, DevOps, Registry, TLS, Certificate, Security

Description: Learn how to configure TLS certificates for secure communication between Podman and container registries, including custom CAs and mutual TLS.

---

> Proper TLS configuration ensures encrypted and authenticated communication between Podman and your container registries.

Container registries often use TLS certificates issued by internal certificate authorities or self-signed certificates, especially in enterprise environments. Podman supports custom CA certificates, client certificates for mutual TLS, and per-registry certificate directories. This guide covers all aspects of TLS certificate configuration.

---

## Understanding Podman's Certificate Directory

Podman looks for TLS certificates in a specific directory structure.

```bash
# System-wide certificate directory

ls -la /etc/containers/certs.d/

# Each registry gets its own subdirectory
# The directory name must match the registry host[:port] as used in image references
# /etc/containers/certs.d/<registry-hostname>[:<port>]/

# User-level certificate directory (rootless Podman)
ls -la ~/.config/containers/certs.d/ 2>/dev/null
```

## Adding a Custom CA Certificate

When a registry uses a certificate signed by an internal CA.

```bash
# Create the directory for the registry
sudo mkdir -p /etc/containers/certs.d/myregistry.example.com

# Copy the CA certificate to the directory
sudo cp /path/to/corporate-ca.crt \
  /etc/containers/certs.d/myregistry.example.com/ca.crt

# Set proper permissions
sudo chmod 644 /etc/containers/certs.d/myregistry.example.com/ca.crt

# Verify the certificate
openssl x509 -in /etc/containers/certs.d/myregistry.example.com/ca.crt \
  -text -noout | head -15
```

## Adding a Self-Signed Certificate

For registries with self-signed certificates.

```bash
# Download the self-signed certificate from the registry
openssl s_client -connect myregistry.example.com:443 -showcerts \
  </dev/null 2>/dev/null | \
  openssl x509 -outform PEM > /tmp/registry-cert.pem

# Create the certificate directory
sudo mkdir -p /etc/containers/certs.d/myregistry.example.com

# Install the certificate
sudo cp /tmp/registry-cert.pem \
  /etc/containers/certs.d/myregistry.example.com/ca.crt

# Test the connection
podman pull myregistry.example.com/testimage:latest
```

## Configuring Mutual TLS (Client Certificates)

Some registries require client certificates for authentication.

```bash
# Create the certificate directory
sudo mkdir -p /etc/containers/certs.d/secure-registry.example.com

# Install the CA certificate
sudo cp /path/to/ca.crt \
  /etc/containers/certs.d/secure-registry.example.com/ca.crt

# Install the client certificate and key
sudo cp /path/to/client.cert \
  /etc/containers/certs.d/secure-registry.example.com/client.cert
sudo cp /path/to/client.key \
  /etc/containers/certs.d/secure-registry.example.com/client.key

# Set secure permissions on the private key
sudo chmod 600 /etc/containers/certs.d/secure-registry.example.com/client.key
sudo chmod 644 /etc/containers/certs.d/secure-registry.example.com/client.cert
sudo chmod 644 /etc/containers/certs.d/secure-registry.example.com/ca.crt
```

## Certificate Directory Structure

The expected file naming convention within each registry directory.

```bash
# List the expected files in a certificate directory
# /etc/containers/certs.d/<registry>/
#   *.crt         - CA certificates (PEM format)
#   client.cert   - Client certificate (PEM format, for mTLS)
#   client.key    - Matching client private key (PEM format, for mTLS)

# View the structure
tree /etc/containers/certs.d/ 2>/dev/null || \
  find /etc/containers/certs.d/ -type f
```

## Registry with Non-Standard Port

For registries running on a non-standard port, include the port in the directory name.

```bash
# Registry on port 5000
sudo mkdir -p /etc/containers/certs.d/myregistry.example.com:5000

# Copy the CA certificate
sudo cp /path/to/ca.crt \
  /etc/containers/certs.d/myregistry.example.com:5000/ca.crt

# Test pulling from the registry
podman pull myregistry.example.com:5000/myimage:latest
```

## Using the --cert-dir Flag

Override the certificate directory on a per-command basis.

```bash
# Pull using a custom certificate directory
podman pull --cert-dir=/path/to/my/certs myregistry.example.com/myimage:latest

# Push using a custom certificate directory
podman push --cert-dir=/path/to/my/certs myregistry.example.com/myimage:latest

# Login using a custom certificate directory
podman login --cert-dir=/path/to/my/certs myregistry.example.com
```

## Configuring for Rootless Users

Rootless users can configure certificates without root access.

```bash
# Create user-level certificate directory
mkdir -p ~/.config/containers/certs.d/myregistry.example.com

# Copy the CA certificate
cp /path/to/ca.crt ~/.config/containers/certs.d/myregistry.example.com/ca.crt

# For mTLS, add client certificate and key
cp /path/to/client.cert ~/.config/containers/certs.d/myregistry.example.com/client.cert
cp /path/to/client.key ~/.config/containers/certs.d/myregistry.example.com/client.key
chmod 600 ~/.config/containers/certs.d/myregistry.example.com/client.key
```

## Adding CA to System Trust Store

Alternatively, add the CA certificate to the system trust store.

```bash
# On Fedora/RHEL/CentOS
sudo cp /path/to/corporate-ca.crt /etc/pki/ca-trust/source/anchors/
sudo update-ca-trust

# On Ubuntu/Debian
sudo cp /path/to/corporate-ca.crt /usr/local/share/ca-certificates/
sudo update-ca-certificates

# Verify the CA is trusted
openssl verify -CApath /etc/ssl/certs /path/to/corporate-ca.crt
```

## Debugging TLS Issues

Troubleshoot certificate problems when connecting to registries.

```bash
# Test TLS connection to the registry
openssl s_client -connect myregistry.example.com:443 \
  -CAfile /etc/containers/certs.d/myregistry.example.com/ca.crt

# Check certificate expiration
openssl x509 -in /etc/containers/certs.d/myregistry.example.com/ca.crt \
  -enddate -noout

# Use Podman debug logging to see TLS handshake details
podman --log-level=debug pull myregistry.example.com/myimage:latest 2>&1 | \
  grep -i "tls\|cert\|x509"

# Verify the certificate chain
openssl verify \
  -CAfile /etc/containers/certs.d/myregistry.example.com/ca.crt \
  /etc/containers/certs.d/myregistry.example.com/client.cert
```

## Summary

Podman uses a per-registry certificate directory structure under `/etc/containers/certs.d/` to manage TLS certificates. You can add custom CA certificates for registries with internal CAs, configure client certificates for mutual TLS, and use the `--cert-dir` flag for per-command overrides. Rootless users can configure certificates in `~/.config/containers/certs.d/`. Always verify certificate validity and use debug logging to troubleshoot TLS connection issues.
