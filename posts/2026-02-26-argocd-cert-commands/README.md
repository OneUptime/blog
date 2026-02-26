# How to Use argocd cert Commands for Certificate Management

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: ArgoCD, GitOps, Kubernetes, CLI, TLS Security

Description: Learn how to use argocd cert commands to manage TLS certificates and SSH known hosts for secure Git repository and cluster connections in ArgoCD.

---

ArgoCD connects to Git repositories, Helm registries, and Kubernetes clusters over the network, and all these connections need to be secure. The `argocd cert` command family manages the TLS certificates and SSH known hosts that ArgoCD uses to verify the identity of remote servers. Getting certificate management right is critical for both security and avoiding connection errors.

## Understanding Certificate Types in ArgoCD

ArgoCD manages two types of certificates:

1. **TLS certificates** - Used to verify HTTPS connections to Git servers, Helm registries, and Kubernetes API servers
2. **SSH known host keys** - Used to verify SSH connections to Git servers

Both are stored in ConfigMaps/Secrets in the ArgoCD namespace and can be managed via the CLI.

## Listing Certificates

### List All Certificates

```bash
# List all certificates (both TLS and SSH)
argocd cert list
```

### List TLS Certificates

```bash
# List only TLS certificates
argocd cert list --cert-type https

# Output:
# HOSTNAME              TYPE   SUBTYPE  FINGERPRINT/INFO
# github.com            https  rsa      SHA256:xxxxxxxx...
# gitlab.com            https  rsa      SHA256:yyyyyyyy...
# git.mycompany.com     https  rsa      SHA256:zzzzzzzz...
```

### List SSH Known Hosts

```bash
# List only SSH known hosts
argocd cert list --cert-type ssh

# Output:
# HOSTNAME     TYPE  SUBTYPE        FINGERPRINT/INFO
# github.com   ssh   ssh-ed25519    SHA256:xxxxxxxx...
# github.com   ssh   ecdsa-sha2...  SHA256:yyyyyyyy...
# github.com   ssh   ssh-rsa        SHA256:zzzzzzzz...
# gitlab.com   ssh   ssh-ed25519    SHA256:aaaaaaaa...
```

## Managing TLS Certificates

### Adding a TLS Certificate

When ArgoCD needs to connect to a Git server or registry that uses a certificate signed by a custom CA (like a corporate CA), you need to add that CA certificate:

```bash
# Add a TLS certificate from a PEM file
argocd cert add-tls git.mycompany.com --from /path/to/ca-cert.pem

# Add a TLS certificate from a bundle (intermediate + root)
argocd cert add-tls git.mycompany.com --from /path/to/ca-bundle.pem
```

### Fetching and Adding from a Server

If you do not have the certificate file, you can fetch it from the server:

```bash
# Fetch the certificate and add it
argocd cert add-tls git.mycompany.com --from <(
  openssl s_client -connect git.mycompany.com:443 -showcerts 2>/dev/null | \
  openssl x509
)

# Or for more complex chains
argocd cert add-tls git.mycompany.com --from <(
  openssl s_client -connect git.mycompany.com:443 -showcerts 2>/dev/null | \
  sed -n '/BEGIN CERTIFICATE/,/END CERTIFICATE/p'
)
```

### Adding Certificates for Common Services

```bash
# Self-hosted GitLab
argocd cert add-tls gitlab.mycompany.com --from /path/to/gitlab-ca.pem

# Self-hosted Gitea
argocd cert add-tls gitea.mycompany.com --from /path/to/gitea-ca.pem

# Harbor registry
argocd cert add-tls harbor.mycompany.com --from /path/to/harbor-ca.pem

# Private Helm repository
argocd cert add-tls charts.mycompany.com --from /path/to/charts-ca.pem
```

### Removing TLS Certificates

```bash
# Remove a TLS certificate
argocd cert rm --cert-type https git.mycompany.com
```

## Managing SSH Known Hosts

### Adding SSH Known Hosts

The most common way to add SSH keys is using `ssh-keyscan`:

```bash
# Add SSH known hosts for GitHub
ssh-keyscan github.com | argocd cert add-ssh --batch

# Add for GitLab
ssh-keyscan gitlab.com | argocd cert add-ssh --batch

# Add for Bitbucket
ssh-keyscan bitbucket.org | argocd cert add-ssh --batch

# Add for a custom Git server
ssh-keyscan git.mycompany.com | argocd cert add-ssh --batch

# Add for a server on a custom port
ssh-keyscan -p 2222 git.mycompany.com | argocd cert add-ssh --batch
```

### Adding SSH Keys from a File

If you have the known hosts in a file:

```bash
# Add from a known_hosts file
argocd cert add-ssh --batch --from /path/to/known_hosts
```

### Adding Specific Key Types

```bash
# Only add ed25519 keys (recommended)
ssh-keyscan -t ed25519 github.com | argocd cert add-ssh --batch

# Only add ecdsa keys
ssh-keyscan -t ecdsa github.com | argocd cert add-ssh --batch
```

### Removing SSH Known Hosts

```bash
# Remove SSH known host
argocd cert rm --cert-type ssh github.com
```

## Bulk Certificate Setup

```bash
#!/bin/bash
# setup-certs.sh - Set up all necessary certificates for ArgoCD

echo "=== Setting up ArgoCD Certificates ==="

# SSH known hosts for common Git providers
echo "Adding SSH known hosts..."
HOSTS=(
  "github.com"
  "gitlab.com"
  "bitbucket.org"
  "ssh.dev.azure.com"
)

for host in "${HOSTS[@]}"; do
  echo "  Adding: $host"
  ssh-keyscan -t ed25519,ecdsa,rsa "$host" 2>/dev/null | argocd cert add-ssh --batch
done

# Add custom Git servers
if [ -n "$CUSTOM_GIT_HOSTS" ]; then
  for host in $CUSTOM_GIT_HOSTS; do
    echo "  Adding custom: $host"
    ssh-keyscan "$host" 2>/dev/null | argocd cert add-ssh --batch
  done
fi

# TLS certificates for internal services
echo ""
echo "Adding TLS certificates..."

CERT_DIR="/path/to/corporate-certs"
if [ -d "$CERT_DIR" ]; then
  for cert in "$CERT_DIR"/*.pem; do
    HOSTNAME=$(basename "$cert" .pem)
    echo "  Adding TLS cert for: $HOSTNAME"
    argocd cert add-tls "$HOSTNAME" --from "$cert"
  done
fi

echo ""
echo "=== Certificate Setup Complete ==="
argocd cert list
```

## Troubleshooting Certificate Issues

### "x509: certificate signed by unknown authority"

This is the most common certificate error. It means ArgoCD does not trust the CA that signed the server's certificate:

```bash
# Find out what CA signed the certificate
openssl s_client -connect git.mycompany.com:443 -showcerts 2>/dev/null | \
  openssl x509 -noout -issuer

# Get the full certificate chain
openssl s_client -connect git.mycompany.com:443 -showcerts 2>/dev/null

# Add the CA certificate
argocd cert add-tls git.mycompany.com --from /path/to/ca-cert.pem

# Verify it was added
argocd cert list --cert-type https
```

### "ssh: handshake failed: knownhosts: key is unknown"

This means the SSH host key is not in ArgoCD's known hosts:

```bash
# Check what keys ArgoCD knows about
argocd cert list --cert-type ssh

# Scan and add the host
ssh-keyscan github.com | argocd cert add-ssh --batch

# Verify
argocd cert list --cert-type ssh
```

### "certificate has expired"

When a TLS certificate expires:

```bash
# Check the expiration
openssl s_client -connect git.mycompany.com:443 2>/dev/null | \
  openssl x509 -noout -dates

# If the CA cert needs updating
argocd cert rm --cert-type https git.mycompany.com
argocd cert add-tls git.mycompany.com --from /path/to/new-ca-cert.pem
```

### SSH Host Key Changed

When a server's SSH host key changes (after server migration or key rotation):

```bash
# Remove the old key
argocd cert rm --cert-type ssh git.mycompany.com

# Add the new key
ssh-keyscan git.mycompany.com | argocd cert add-ssh --batch
```

**Security Note**: Before accepting a new host key, verify it through an out-of-band channel to prevent man-in-the-middle attacks.

## Certificate Audit Script

```bash
#!/bin/bash
# audit-certs.sh - Audit ArgoCD certificates

echo "=== Certificate Audit Report ==="
echo ""

echo "--- TLS Certificates ---"
argocd cert list --cert-type https
echo ""

echo "--- SSH Known Hosts ---"
argocd cert list --cert-type ssh
echo ""

# Check for common missing certificates
echo "--- Missing Certificate Check ---"

COMMON_HOSTS=("github.com" "gitlab.com" "bitbucket.org")

for host in "${COMMON_HOSTS[@]}"; do
  SSH_EXISTS=$(argocd cert list --cert-type ssh 2>/dev/null | grep -c "$host")
  if [ "$SSH_EXISTS" -eq 0 ]; then
    echo "  WARNING: No SSH known host for $host"
  else
    echo "  OK: SSH known host present for $host"
  fi
done
```

## Certificate Rotation Procedure

When certificates expire or need rotation:

```bash
#!/bin/bash
# rotate-cert.sh - Rotate a TLS certificate

HOSTNAME="${1:?Usage: rotate-cert.sh <hostname> <new-cert-path>}"
CERT_PATH="${2:?Usage: rotate-cert.sh <hostname> <new-cert-path>}"

echo "Rotating TLS certificate for: $HOSTNAME"

# Verify the new certificate
echo "Verifying new certificate..."
openssl x509 -in "$CERT_PATH" -noout -text | head -20

# Remove old certificate
echo "Removing old certificate..."
argocd cert rm --cert-type https "$HOSTNAME"

# Add new certificate
echo "Adding new certificate..."
argocd cert add-tls "$HOSTNAME" --from "$CERT_PATH"

# Verify
echo ""
echo "Updated certificates:"
argocd cert list --cert-type https | grep "$HOSTNAME"
```

## ConfigMap-Based Certificate Management

Under the hood, ArgoCD stores certificates in ConfigMaps. You can also manage them declaratively:

```yaml
# TLS certificates - stored in argocd-tls-certs-cm
apiVersion: v1
kind: ConfigMap
metadata:
  name: argocd-tls-certs-cm
  namespace: argocd
data:
  git.mycompany.com: |
    -----BEGIN CERTIFICATE-----
    MIIxxxxx...
    -----END CERTIFICATE-----
---
# SSH known hosts - stored in argocd-ssh-known-hosts-cm
apiVersion: v1
kind: ConfigMap
metadata:
  name: argocd-ssh-known-hosts-cm
  namespace: argocd
data:
  ssh_known_hosts: |
    github.com ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIOMqqnkVzrm0SdG6UOoqKLsabgH5C9okWi0dh2l9GKJl
    github.com ecdsa-sha2-nistp256 AAAAE2VjZHNhLXNoYTItbmlzdHAyNTYAAAAIbmlzdHAyNTYAAABBBEmKSENjQEezOmxkZMy7opKgwFB9nkt5YRrYMjNuG5N87uRgg6CLrbo5wAdT/y6v0mKV0U2w0WZ2YB/++Tpockg=
    gitlab.com ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIAfuCHKVTjquxvt6CM6tdG4SLp1Btn/nOeHHE5UOzRdf
```

Managing certificates declaratively in Git is the GitOps way, but be careful not to store private keys in Git.

## Summary

The `argocd cert` command family is essential for maintaining secure connections between ArgoCD and your Git servers, registries, and clusters. Add TLS certificates for services using custom CAs, maintain SSH known hosts for Git repositories, and implement regular certificate audits. When you encounter the dreaded "certificate signed by unknown authority" or "key is unknown" errors, these commands are your first line of resolution.
