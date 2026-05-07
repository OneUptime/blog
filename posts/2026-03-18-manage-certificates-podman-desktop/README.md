# How to Manage Certificates in Podman Desktop

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, DevOps, Podman Desktop, Certificate, TLS, Security

Description: Learn how to manage TLS certificates in Podman Desktop for secure communication with private registries, custom CAs, and self-signed certificates.

---

> Proper certificate management ensures Podman Desktop can securely communicate with private registries and services that use custom or self-signed TLS certificates.

Enterprise environments often use private certificate authorities (CAs) for internal services, TLS-inspecting proxies, and private container registries. Podman Desktop needs to trust these certificates to pull images and communicate securely. This guide covers adding custom CA certificates, configuring per-registry certificates, and troubleshooting certificate-related errors.

---

## Understanding Certificate Requirements

Podman needs certificates when connecting to:

- Private container registries with custom TLS
- Registries behind TLS-inspecting proxies
- Internal services using self-signed certificates
- Corporate networks with custom root CAs

```bash
# Check if you can pull from a private registry

podman pull registry.company.com/my-image:latest

# If you see "x509: certificate signed by unknown authority"
# you need to add the CA certificate
```

## Adding Custom CA Certificates System-Wide

Install your corporate CA certificate at the system level:

```bash
# On RHEL/CentOS/Fedora
sudo cp corporate-ca.crt /etc/pki/ca-trust/source/anchors/
sudo update-ca-trust

# On Ubuntu/Debian
sudo cp corporate-ca.crt /usr/local/share/ca-certificates/
sudo update-ca-certificates

# On macOS
sudo security add-trusted-cert -d -r trustRoot \
  -k /Library/Keychains/System.keychain corporate-ca.crt

# Verify the certificate was added
# On Linux
trust list | grep "Corporate CA"
# On macOS
security find-certificate -a -c "Corporate CA" /Library/Keychains/System.keychain
```

## Configuring Per-Registry Certificates

Podman supports per-registry certificate configuration:

```bash
# Create the certificate directory for your registry
mkdir -p ~/.config/containers/certs.d/registry.company.com

# Copy the CA certificate
cp corporate-ca.crt \
  ~/.config/containers/certs.d/registry.company.com/ca.crt

# For client certificate authentication (mutual TLS)
cp client.cert \
  ~/.config/containers/certs.d/registry.company.com/client.cert
cp client.key \
  ~/.config/containers/certs.d/registry.company.com/client.key

# Verify the directory structure
ls -la ~/.config/containers/certs.d/registry.company.com/
```

## Configuring Certificates for a Registry with a Custom Port

```bash
# For registries on non-standard ports
mkdir -p ~/.config/containers/certs.d/registry.company.com:5443

# Add the CA certificate
cp corporate-ca.crt \
  ~/.config/containers/certs.d/registry.company.com:5443/ca.crt

# Test pulling from the registry
podman pull registry.company.com:5443/my-image:latest
```

## Setting Up Certificates for the Podman Machine (macOS)

On macOS, certificates also need to be added inside the Podman machine VM:

```bash
# Copy the certificate to the Podman machine
podman machine ssh "sudo mkdir -p /etc/pki/ca-trust/source/anchors"
cat corporate-ca.crt | podman machine ssh "sudo tee /etc/pki/ca-trust/source/anchors/corporate-ca.crt"

# Update the trust store inside the VM
podman machine ssh "sudo update-ca-trust"

# Restart the Podman machine to apply changes
podman machine stop
podman machine start

# Test the connection
podman pull registry.company.com/my-image:latest
```

## Using Self-Signed Certificates for Development

For local development registries with self-signed certificates:

```bash
# Generate a self-signed certificate for a local registry
openssl req -newkey rsa:4096 -nodes -sha256 \
  -keyout registry.key -x509 -days 365 \
  -out registry.crt \
  -subj "/CN=localhost" \
  -addext "subjectAltName=DNS:localhost,IP:127.0.0.1"

# Start a registry with the certificate
podman run -d --name secure-registry \
  -p 5443:443 \
  -v $(pwd)/registry.crt:/certs/domain.crt:ro \
  -v $(pwd)/registry.key:/certs/domain.key:ro \
  -e REGISTRY_HTTP_ADDR=0.0.0.0:443 \
  -e REGISTRY_HTTP_TLS_CERTIFICATE=/certs/domain.crt \
  -e REGISTRY_HTTP_TLS_KEY=/certs/domain.key \
  registry:2

# Trust the self-signed certificate
mkdir -p ~/.config/containers/certs.d/localhost:5443
cp registry.crt ~/.config/containers/certs.d/localhost:5443/ca.crt

# Test pushing and pulling
podman tag alpine localhost:5443/alpine:latest
podman push localhost:5443/alpine:latest
podman pull localhost:5443/alpine:latest
```

## Skipping TLS Verification (Development Only)

For development purposes, you can skip TLS verification:

```bash
# Pull with TLS verification disabled (NOT for production)
podman pull --tls-verify=false registry.dev.local:5000/my-image:latest

# Push with TLS verification disabled
podman push --tls-verify=false localhost:5000/my-image:latest

# Configure a registry as insecure in registries.conf
cat >> ~/.config/containers/registries.conf << 'EOF'

[[registry]]
location = "registry.dev.local:5000"
insecure = true
EOF
```

## Debugging Certificate Issues

Troubleshoot certificate errors with these commands:

```bash
# Check the TLS certificate of a registry
openssl s_client -connect registry.company.com:443 -showcerts </dev/null 2>/dev/null | \
  openssl x509 -noout -subject -issuer -dates

# Verify the certificate chain
openssl s_client -connect registry.company.com:443 -CAfile corporate-ca.crt </dev/null

# Pull with debug logging to see certificate errors
podman pull --log-level=debug registry.company.com/my-image:latest 2>&1 | \
  grep -i "cert\|tls\|x509"

# Check registry configuration Podman is using
podman info --format '{{.Registries}}'

# List configured certificate directories
ls -la ~/.config/containers/certs.d/
```

## Summary

Managing certificates in Podman Desktop is critical for secure communication with private registries and enterprise services. By installing custom CA certificates at the system level and configuring per-registry certificates, you ensure Podman can authenticate with any TLS-secured endpoint. On macOS, certificates must also be added to the Podman machine VM. For development, self-signed certificates and insecure registry options provide flexibility, while proper certificate management keeps production environments secure.
