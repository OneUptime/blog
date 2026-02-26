# How to Use Self-Signed Certificates with ArgoCD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: ArgoCD, GitOps, Kubernetes, TLS, Security

Description: Learn how to generate and configure self-signed TLS certificates for ArgoCD in development and testing environments, and how to handle trust configuration for Git repos and clusters.

---

Self-signed certificates are common in development environments, internal networks, and air-gapped deployments where you cannot use public CAs like Let's Encrypt. ArgoCD needs to trust these certificates to connect to Git repositories, Kubernetes clusters, and its own HTTPS endpoints.

This guide covers generating self-signed certificates, configuring ArgoCD to use them, and handling trust for all the components in the chain.

## When to Use Self-Signed Certificates

Self-signed certificates are appropriate for:

- Local development (Minikube, Kind, Docker Desktop)
- Internal staging environments
- Air-gapped installations
- Testing before switching to production certificates
- Private networks behind a VPN

They are not appropriate for:
- Internet-facing ArgoCD instances
- Production environments accessible by external users
- Environments where browser trust matters

## Generating a Self-Signed Certificate

### Using OpenSSL

Create a certificate authority and server certificate:

```bash
# Step 1: Generate a CA key and certificate
openssl genrsa -out ca.key 4096
openssl req -new -x509 -sha256 -days 3650 -key ca.key -out ca.crt \
  -subj "/C=US/ST=California/O=MyOrg/CN=MyOrg CA"

# Step 2: Generate a server key
openssl genrsa -out server.key 2048

# Step 3: Create a certificate signing request
openssl req -new -key server.key -out server.csr \
  -subj "/C=US/ST=California/O=MyOrg/CN=argocd.local"

# Step 4: Create a config file for SAN (Subject Alternative Names)
cat > server-ext.cnf << 'EOF'
authorityKeyIdentifier=keyid,issuer
basicConstraints=CA:FALSE
subjectAltName = @alt_names

[alt_names]
DNS.1 = argocd.local
DNS.2 = argocd.company.internal
DNS.3 = localhost
IP.1 = 127.0.0.1
EOF

# Step 5: Sign the server certificate with the CA
openssl x509 -req -sha256 -days 365 \
  -in server.csr \
  -CA ca.crt -CAkey ca.key -CAcreateserial \
  -out server.crt \
  -extfile server-ext.cnf
```

The SAN (Subject Alternative Names) field is critical. Modern browsers and HTTP clients reject certificates without SANs, even if the Common Name matches.

### Using mkcert (Simpler)

For local development, mkcert is much simpler:

```bash
# Install mkcert
brew install mkcert  # macOS
# or
sudo apt install mkcert  # Ubuntu

# Install the local CA
mkcert -install

# Generate certificate for ArgoCD
mkcert argocd.local localhost 127.0.0.1

# This creates:
# argocd.local+2.pem (certificate)
# argocd.local+2-key.pem (private key)
```

## Configuring ArgoCD Server with Self-Signed Certificate

### Create the TLS Secret

```bash
# Using OpenSSL-generated certificates
kubectl create secret tls argocd-server-tls \
  --cert=server.crt \
  --key=server.key \
  -n argocd

# Using mkcert-generated certificates
kubectl create secret tls argocd-server-tls \
  --cert=argocd.local+2.pem \
  --key=argocd.local+2-key.pem \
  -n argocd
```

### Restart ArgoCD Server

```bash
kubectl rollout restart deployment argocd-server -n argocd
```

### Access ArgoCD with the Self-Signed Certificate

The ArgoCD CLI will reject self-signed certificates by default:

```bash
# This will fail with certificate error
argocd login argocd.local

# Option 1: Skip TLS verification (development only)
argocd login argocd.local --insecure

# Option 2: Trust the CA certificate
argocd login argocd.local --certificate-authority ca.crt

# Option 3: Set environment variable
export ARGOCD_SERVER_CERTIFICATE_AUTHORITY_DATA=$(cat ca.crt | base64)
argocd login argocd.local
```

## Trusting Self-Signed Certificates for Git Repositories

If your Git server uses a self-signed certificate, ArgoCD needs to trust it. There are several approaches:

### Method 1: Add CA to argocd-tls-certs-cm

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: argocd-tls-certs-cm
  namespace: argocd
data:
  # Key is the server hostname
  git.company.internal: |
    -----BEGIN CERTIFICATE-----
    MIIDxzCCAq+gAwIBAgIJAL...
    -----END CERTIFICATE-----
```

ArgoCD watches this ConfigMap and trusts the certificates for the specified hostnames.

### Method 2: Use the CLI to Add Certificates

```bash
# Add a certificate for a Git server
argocd cert add-tls git.company.internal --from ca.crt
```

This adds the certificate to the `argocd-tls-certs-cm` ConfigMap.

### Method 3: Skip TLS Verification for a Repository

For development, you can disable TLS verification per repository:

```bash
# Add a repo with TLS verification disabled
argocd repo add https://git.company.internal/myorg/myrepo \
  --username admin \
  --password secret \
  --insecure-skip-server-verification
```

Or in the repository secret:

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: my-private-repo
  namespace: argocd
  labels:
    argocd.argoproj.io/secret-type: repository
type: Opaque
stringData:
  type: git
  url: https://git.company.internal/myorg/myrepo
  username: admin
  password: secret
  insecure: "true"  # Skip TLS verification
```

## Trusting Self-Signed Certificates for Kubernetes Clusters

When registering a Kubernetes cluster that uses a self-signed certificate:

```bash
# Register with explicit CA data
argocd cluster add my-cluster --kubeconfig /path/to/kubeconfig

# The kubeconfig should include the CA data
# ArgoCD reads it from the kubeconfig automatically
```

If the kubeconfig references an external CA file, make sure the CA data is embedded:

```yaml
# Good: CA data embedded in kubeconfig
clusters:
  - cluster:
      certificate-authority-data: LS0tLS1CRUdJTi...
      server: https://my-cluster:6443
    name: my-cluster

# Problematic: External CA file reference
clusters:
  - cluster:
      certificate-authority: /path/to/ca.crt  # ArgoCD may not have this file
      server: https://my-cluster:6443
    name: my-cluster
```

## Configuring the Repo Server for Self-Signed Certs

The ArgoCD repo server also needs to trust self-signed certificates when cloning from Git repositories:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: argocd-repo-server
  namespace: argocd
spec:
  template:
    spec:
      containers:
        - name: argocd-repo-server
          volumeMounts:
            - name: custom-ca
              mountPath: /etc/ssl/certs/custom-ca.crt
              subPath: ca.crt
      volumes:
        - name: custom-ca
          configMap:
            name: custom-ca-bundle
```

Or use the `argocd-tls-certs-cm` ConfigMap, which is automatically mounted into the repo server.

## Common Self-Signed Certificate Errors

### "x509: certificate signed by unknown authority"

The client does not trust the CA that signed the certificate. Solutions:
- Add the CA to `argocd-tls-certs-cm`
- Use `--insecure-skip-server-verification` for repos
- Mount the CA into the ArgoCD pods

### "x509: certificate is valid for X, not Y"

The hostname in the request does not match the certificate's SAN or CN. Solutions:
- Regenerate the certificate with the correct SAN entries
- Use the correct hostname when accessing ArgoCD

### "x509: certificate has expired or is not yet valid"

The certificate has expired or the system clock is wrong. Solutions:
- Regenerate the certificate with a longer validity period
- Check system time on the cluster nodes

## Development Setup Script

Here is a complete script to set up ArgoCD with self-signed certificates for local development:

```bash
#!/bin/bash
set -e

# Generate CA
openssl genrsa -out /tmp/ca.key 4096
openssl req -new -x509 -sha256 -days 3650 \
  -key /tmp/ca.key -out /tmp/ca.crt \
  -subj "/CN=ArgoCD Dev CA"

# Generate server certificate
openssl genrsa -out /tmp/server.key 2048
openssl req -new -key /tmp/server.key -out /tmp/server.csr \
  -subj "/CN=argocd.local"

cat > /tmp/san.cnf << 'EOF'
basicConstraints=CA:FALSE
subjectAltName=DNS:argocd.local,DNS:localhost,IP:127.0.0.1
EOF

openssl x509 -req -sha256 -days 365 \
  -in /tmp/server.csr \
  -CA /tmp/ca.crt -CAkey /tmp/ca.key -CAcreateserial \
  -out /tmp/server.crt -extfile /tmp/san.cnf

# Create Kubernetes secret
kubectl create secret tls argocd-server-tls \
  --cert=/tmp/server.crt \
  --key=/tmp/server.key \
  -n argocd --dry-run=client -o yaml | kubectl apply -f -

# Restart ArgoCD server
kubectl rollout restart deployment argocd-server -n argocd

echo "ArgoCD configured with self-signed certificate"
echo "CA certificate: /tmp/ca.crt"
echo "Login with: argocd login argocd.local --certificate-authority /tmp/ca.crt"
```

## Migrating from Self-Signed to CA-Signed

When you are ready to move to production certificates:

1. Obtain a certificate from your CA
2. Replace the TLS secret:
```bash
kubectl create secret tls argocd-server-tls \
  --cert=production.crt \
  --key=production.key \
  -n argocd --dry-run=client -o yaml | kubectl apply -f -
```
3. Restart ArgoCD server
4. Update CLI configurations to remove `--insecure` flags
5. Remove any `--certificate-authority` flags pointing to the old CA

## Summary

Self-signed certificates work well for ArgoCD development and internal environments. Generate certificates with proper SANs, store them in Kubernetes TLS secrets, and configure trust through the `argocd-tls-certs-cm` ConfigMap for Git repositories. For the CLI, either trust the CA explicitly or use `--insecure` in development. Plan a migration path to proper CA-signed certificates before going to production.
