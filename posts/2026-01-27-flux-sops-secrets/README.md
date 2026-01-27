# How to Handle Flux Secrets with SOPS

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Flux, SOPS, GitOps, Secrets Management, Age, GPG, Encryption, Security

Description: A comprehensive guide to managing Kubernetes secrets securely in GitOps workflows using Flux and Mozilla SOPS, covering Age and GPG encryption, automatic decryption, secret rotation, and best practices.

---

> "The best secret is one that never leaves your control, even when it travels through Git." - Security Proverb

GitOps is powerful, but it has a secret problem: you cannot commit plaintext secrets to Git. Mozilla SOPS (Secrets OPerationS) solves this by encrypting secrets with keys that only your cluster can decrypt. This guide shows you how to integrate SOPS with Flux for secure, auditable secret management.

## Why SOPS for GitOps?

```mermaid
flowchart LR
    subgraph Developer
        D[Developer] --> E[Encrypt with SOPS]
    end

    subgraph Git Repository
        E --> G[Encrypted Secret in Git]
    end

    subgraph Kubernetes Cluster
        G --> F[Flux Controller]
        F --> K[Kustomize Controller]
        K --> S[Decrypted Secret]
        S --> P[Pod]
    end

    subgraph Key Management
        AGE[Age Private Key] --> K
    end
```

SOPS advantages over alternatives:
- **Git-friendly**: Encrypted secrets can be diffed and reviewed
- **Multi-key support**: Encrypt for multiple recipients (teams, environments)
- **Partial encryption**: Only values are encrypted, keys remain readable
- **Format preservation**: YAML/JSON structure stays intact
- **Cloud KMS integration**: Works with AWS KMS, GCP KMS, Azure Key Vault

## Prerequisites

Install the required tools:

```bash
# Install SOPS
# macOS
brew install sops

# Linux
curl -LO https://github.com/getsops/sops/releases/download/v3.8.1/sops-v3.8.1.linux.amd64
chmod +x sops-v3.8.1.linux.amd64
sudo mv sops-v3.8.1.linux.amd64 /usr/local/bin/sops

# Install Age (modern encryption tool, recommended over GPG)
# macOS
brew install age

# Linux
curl -LO https://github.com/FiloSottile/age/releases/download/v1.1.1/age-v1.1.1-linux-amd64.tar.gz
tar xf age-v1.1.1-linux-amd64.tar.gz
sudo mv age/age /usr/local/bin/
sudo mv age/age-keygen /usr/local/bin/
```

Verify Flux is installed:

```bash
# Check Flux installation
flux check

# If not installed, bootstrap Flux
flux bootstrap github \
  --owner=your-org \
  --repository=fleet-infra \
  --branch=main \
  --path=clusters/production \
  --personal
```

## Setting Up Age Encryption

Age is the recommended encryption method for SOPS. It is simpler and more secure than GPG.

### Generate Age Keys

```bash
# Generate a new age key pair
age-keygen -o age.agekey

# Output looks like:
# Public key: age1helqcqsh9464r8chnwc2fzj8uv7vr5ntnsft0tn45v2xtz0hpfwq98cmsg

# View the generated key
cat age.agekey
# AGE-SECRET-KEY-1QFZK7AKGR8NH2SKVS0FPK5VQQRQCFWQVS8VQMH6KQVQ8QQKQVQQQQ
```

### Create SOPS Configuration

Create a `.sops.yaml` configuration file in your repository root:

```yaml
# .sops.yaml
# This file tells SOPS which keys to use for encryption

creation_rules:
  # Production secrets - encrypted with production key
  - path_regex: clusters/production/.*\.yaml$
    encrypted_regex: ^(data|stringData)$
    age: age1helqcqsh9464r8chnwc2fzj8uv7vr5ntnsft0tn45v2xtz0hpfwq98cmsg

  # Staging secrets - encrypted with staging key
  - path_regex: clusters/staging/.*\.yaml$
    encrypted_regex: ^(data|stringData)$
    age: age1ql3z7hjy54pw3hyww5ayyfg7zqgvc7w3j2elw8zmrj2kg5sfn9aqmcac8p

  # Development secrets - can use multiple keys
  - path_regex: clusters/development/.*\.yaml$
    encrypted_regex: ^(data|stringData)$
    age: >-
      age1helqcqsh9464r8chnwc2fzj8uv7vr5ntnsft0tn45v2xtz0hpfwq98cmsg,
      age1ql3z7hjy54pw3hyww5ayyfg7zqgvc7w3j2elw8zmrj2kg5sfn9aqmcac8p
```

### Configure SOPS for Local Development

```bash
# Set the SOPS_AGE_KEY_FILE environment variable
export SOPS_AGE_KEY_FILE=~/.config/sops/age/keys.txt

# Create the directory and copy your key
mkdir -p ~/.config/sops/age
cp age.agekey ~/.config/sops/age/keys.txt

# Verify SOPS can find your key
sops --version
```

## Encrypting Secrets with SOPS

### Create and Encrypt a Secret

```bash
# First, create a plaintext secret (DO NOT commit this file!)
cat > secret.yaml << 'EOF'
apiVersion: v1
kind: Secret
metadata:
  name: database-credentials
  namespace: production
type: Opaque
stringData:
  username: admin
  password: super-secret-password-123
  connection-string: postgresql://admin:super-secret-password-123@db.example.com:5432/myapp
EOF

# Encrypt the secret with SOPS
# SOPS reads .sops.yaml to determine which key to use
sops --encrypt secret.yaml > secret.enc.yaml

# Alternatively, specify the age recipient directly
sops --encrypt --age age1helqcqsh9464r8chnwc2fzj8uv7vr5ntnsft0tn45v2xtz0hpfwq98cmsg \
  secret.yaml > secret.enc.yaml

# Remove the plaintext file
rm secret.yaml
```

### Examine the Encrypted Secret

```yaml
# secret.enc.yaml - Safe to commit to Git
apiVersion: v1
kind: Secret
metadata:
    name: database-credentials
    namespace: production
type: Opaque
stringData:
    username: ENC[AES256_GCM,data:j0PDE...,iv:abc...,tag:xyz...,type:str]
    password: ENC[AES256_GCM,data:kL3mN...,iv:def...,tag:uvw...,type:str]
    connection-string: ENC[AES256_GCM,data:pQrSt...,iv:ghi...,tag:rst...,type:str]
sops:
    kms: []
    gcp_kms: []
    azure_kv: []
    hc_vault: []
    age:
        - recipient: age1helqcqsh9464r8chnwc2fzj8uv7vr5ntnsft0tn45v2xtz0hpfwq98cmsg
          enc: |
            -----BEGIN AGE ENCRYPTED FILE-----
            YWdlLWVuY3J5cHRpb24ub3JnL3YxCi0+IFgyNTUxOSBCTHR...
            -----END AGE ENCRYPTED FILE-----
    lastmodified: "2026-01-27T10:30:00Z"
    mac: ENC[AES256_GCM,data:abc123...,iv:xyz...,tag:123...,type:str]
    version: 3.8.1
```

### Edit Encrypted Secrets In-Place

```bash
# SOPS decrypts, opens your editor, then re-encrypts on save
sops secret.enc.yaml

# Or specify an editor
EDITOR=nano sops secret.enc.yaml

# Decrypt to stdout (for debugging, be careful!)
sops --decrypt secret.enc.yaml
```

## Configuring Flux for SOPS Decryption

### Store the Age Private Key in the Cluster

```bash
# Create a secret containing the age private key
# This secret allows Flux to decrypt SOPS-encrypted secrets

cat age.agekey | kubectl create secret generic sops-age \
  --namespace=flux-system \
  --from-file=age.agekey=/dev/stdin

# Verify the secret was created
kubectl get secret sops-age -n flux-system
```

### Configure Kustomization for SOPS Decryption

```yaml
# clusters/production/infrastructure.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: infrastructure
  namespace: flux-system
spec:
  interval: 10m
  path: ./infrastructure/production
  prune: true
  sourceRef:
    kind: GitRepository
    name: flux-system
  # Enable SOPS decryption
  decryption:
    provider: sops
    secretRef:
      name: sops-age
```

### Decryption Flow in Flux

```mermaid
sequenceDiagram
    participant Git as Git Repository
    participant Flux as Flux Source Controller
    participant Kust as Kustomize Controller
    participant SOPS as SOPS Decryption
    participant K8s as Kubernetes API

    Git->>Flux: Pull encrypted manifests
    Flux->>Kust: Notify of new revision
    Kust->>SOPS: Detect SOPS metadata
    SOPS->>SOPS: Decrypt using age key from secret
    SOPS->>Kust: Return decrypted manifest
    Kust->>K8s: Apply decrypted Secret
    Note over K8s: Secret stored encrypted at rest
```

## Using GPG Instead of Age

While Age is recommended, you might need GPG for existing workflows.

### Generate GPG Keys

```bash
# Generate a GPG key for SOPS
# Use RSA 4096-bit for maximum compatibility
gpg --full-generate-key

# List your keys
gpg --list-secret-keys --keyid-format LONG

# Export the public key fingerprint
gpg --list-keys "your-email@example.com" | grep -E "^\s+[A-F0-9]" | tr -d ' '
# Example: 1234567890ABCDEF1234567890ABCDEF12345678
```

### Configure SOPS for GPG

```yaml
# .sops.yaml for GPG
creation_rules:
  - path_regex: .*\.yaml$
    encrypted_regex: ^(data|stringData)$
    pgp: 1234567890ABCDEF1234567890ABCDEF12345678
```

### Create GPG Secret for Flux

```bash
# Export your GPG private key
gpg --export-secret-keys \
  --armor 1234567890ABCDEF1234567890ABCDEF12345678 > private.asc

# Create the secret in Flux namespace
kubectl create secret generic sops-gpg \
  --namespace=flux-system \
  --from-file=sops.asc=private.asc

# Clean up
rm private.asc
```

### Update Kustomization for GPG

```yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: infrastructure
  namespace: flux-system
spec:
  interval: 10m
  path: ./infrastructure/production
  prune: true
  sourceRef:
    kind: GitRepository
    name: flux-system
  decryption:
    provider: sops
    secretRef:
      name: sops-gpg  # GPG secret instead of age
```

## Secret Rotation Strategy

Regular secret rotation is essential for security. Here is how to automate it.

### Secret Rotation Workflow

```mermaid
flowchart TD
    A[Schedule: Monthly Rotation] --> B[Generate New Credentials]
    B --> C[Update Application Config]
    C --> D[Encrypt with SOPS]
    D --> E[Commit to Git]
    E --> F[Flux Detects Change]
    F --> G[Flux Decrypts and Applies]
    G --> H[Pods Restart with New Secret]
    H --> I[Monitor Application Health]
    I --> J{Healthy?}
    J -->|Yes| K[Rotation Complete]
    J -->|No| L[Rollback via Git Revert]
```

### Automated Rotation Script

```bash
#!/bin/bash
# rotate-secrets.sh
# Rotates database credentials and updates SOPS-encrypted secrets

set -euo pipefail

# Configuration
SECRETS_PATH="clusters/production/secrets"
SECRET_NAME="database-credentials"
NAMESPACE="production"

# Generate new credentials
NEW_PASSWORD=$(openssl rand -base64 32 | tr -d "=+/" | cut -c1-32)

echo "Rotating secret: $SECRET_NAME"

# Create temporary plaintext secret
cat > /tmp/secret.yaml << EOF
apiVersion: v1
kind: Secret
metadata:
  name: $SECRET_NAME
  namespace: $NAMESPACE
  annotations:
    rotated-at: "$(date -u +%Y-%m-%dT%H:%M:%SZ)"
type: Opaque
stringData:
  username: admin
  password: $NEW_PASSWORD
EOF

# Encrypt with SOPS
sops --encrypt /tmp/secret.yaml > "$SECRETS_PATH/$SECRET_NAME.yaml"

# Clean up plaintext
rm /tmp/secret.yaml

# Commit the change
git add "$SECRETS_PATH/$SECRET_NAME.yaml"
git commit -m "chore: rotate $SECRET_NAME credentials

Automated rotation performed at $(date -u +%Y-%m-%dT%H:%M:%SZ)"

echo "Secret rotated successfully. Push to trigger Flux sync."
```

### Trigger Pod Restart on Secret Change

By default, pods do not restart when a Secret changes. Use annotations to force a restart:

```yaml
# deployment.yaml with checksum annotation
apiVersion: apps/v1
kind: Deployment
metadata:
  name: myapp
  namespace: production
spec:
  template:
    metadata:
      annotations:
        # This annotation changes when the secret changes
        # Kustomize can compute this automatically
        checksum/secret: "{{ include (print $.Template.BasePath \"/secret.yaml\") . | sha256sum }}"
    spec:
      containers:
        - name: myapp
          image: myapp:latest
          envFrom:
            - secretRef:
                name: database-credentials
```

### Using Reloader for Automatic Restarts

```yaml
# Install Reloader - watches for Secret/ConfigMap changes
# and triggers rolling restarts
apiVersion: source.toolkit.fluxcd.io/v1
kind: HelmRepository
metadata:
  name: stakater
  namespace: flux-system
spec:
  interval: 1h
  url: https://stakater.github.io/stakater-charts

---
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata:
  name: reloader
  namespace: flux-system
spec:
  interval: 1h
  chart:
    spec:
      chart: reloader
      sourceRef:
        kind: HelmRepository
        name: stakater
      version: "1.x"
  values:
    reloader:
      watchGlobally: true
```

Then annotate your deployments:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: myapp
  annotations:
    # Reloader watches this deployment
    reloader.stakater.com/auto: "true"
```

## Multi-Environment Setup

### Repository Structure

```
fleet-repo/
├── .sops.yaml                    # SOPS configuration
├── clusters/
│   ├── production/
│   │   ├── flux-system/
│   │   │   └── kustomization.yaml
│   │   └── secrets/
│   │       ├── database.yaml     # SOPS encrypted
│   │       └── api-keys.yaml     # SOPS encrypted
│   ├── staging/
│   │   ├── flux-system/
│   │   │   └── kustomization.yaml
│   │   └── secrets/
│   │       ├── database.yaml     # SOPS encrypted (different key)
│   │       └── api-keys.yaml     # SOPS encrypted
│   └── development/
│       └── ...
└── infrastructure/
    ├── base/
    │   └── ...
    └── overlays/
        ├── production/
        ├── staging/
        └── development/
```

### Environment-Specific SOPS Configuration

```yaml
# .sops.yaml
creation_rules:
  # Production - only production key can decrypt
  - path_regex: clusters/production/secrets/.*\.yaml$
    encrypted_regex: ^(data|stringData)$
    age: age1prod...

  # Staging - staging key and ops team can decrypt
  - path_regex: clusters/staging/secrets/.*\.yaml$
    encrypted_regex: ^(data|stringData)$
    age: >-
      age1staging...,
      age1ops...

  # Development - all developers can decrypt
  - path_regex: clusters/development/secrets/.*\.yaml$
    encrypted_regex: ^(data|stringData)$
    age: >-
      age1dev1...,
      age1dev2...,
      age1dev3...
```

## Key Rotation for SOPS

Rotate your SOPS keys periodically, not just the secrets they protect.

### Age Key Rotation Process

```bash
#!/bin/bash
# rotate-sops-key.sh
# Rotates the SOPS age key

set -euo pipefail

OLD_KEY_FILE="$HOME/.config/sops/age/keys.txt"
NEW_KEY_FILE="$HOME/.config/sops/age/keys-new.txt"

# Generate new key
age-keygen -o "$NEW_KEY_FILE"
NEW_PUBLIC_KEY=$(grep "public key:" "$NEW_KEY_FILE" | awk '{print $NF}')

echo "New public key: $NEW_PUBLIC_KEY"
echo "Update .sops.yaml with this key"

# Re-encrypt all secrets with both old and new keys
# This allows for gradual rollover
find clusters -name "*.yaml" -exec grep -l "sops:" {} \; | while read -r file; do
    echo "Re-encrypting: $file"

    # Decrypt with old key
    sops --decrypt "$file" > /tmp/decrypted.yaml

    # Combine keys temporarily
    cat "$OLD_KEY_FILE" "$NEW_KEY_FILE" > /tmp/combined-keys.txt

    # Re-encrypt with new key
    SOPS_AGE_KEY_FILE=/tmp/combined-keys.txt \
      sops --encrypt --age "$NEW_PUBLIC_KEY" /tmp/decrypted.yaml > "$file"

    rm /tmp/decrypted.yaml
done

rm /tmp/combined-keys.txt

echo "All secrets re-encrypted with new key"
echo "Update Kubernetes secret 'sops-age' with new private key"
```

### Update Cluster Secret

```bash
# After rotating the SOPS key, update the cluster secret
cat keys-new.txt | kubectl create secret generic sops-age \
  --namespace=flux-system \
  --from-file=age.agekey=/dev/stdin \
  --dry-run=client -o yaml | kubectl apply -f -

# Restart Kustomize controller to pick up new key
kubectl rollout restart deployment/kustomize-controller -n flux-system
```

## Troubleshooting SOPS with Flux

### Common Issues and Solutions

**Issue: Flux cannot decrypt secrets**

```bash
# Check if the sops-age secret exists
kubectl get secret sops-age -n flux-system

# Verify the key format
kubectl get secret sops-age -n flux-system -o jsonpath='{.data.age\.agekey}' | base64 -d

# Check Kustomize controller logs
kubectl logs -n flux-system deployment/kustomize-controller | grep -i sops
```

**Issue: SOPS metadata missing**

```bash
# Verify the file is encrypted
grep -c "sops:" secret.yaml
# Should return 1

# Check the SOPS version
sops --version
```

**Issue: Wrong key used for encryption**

```bash
# Check which key was used
grep -A5 "age:" secret.enc.yaml

# Re-encrypt with correct key
sops --decrypt secret.enc.yaml | \
  sops --encrypt --age age1correct... /dev/stdin > secret.enc.yaml
```

### Validation Script

```bash
#!/bin/bash
# validate-sops-setup.sh
# Validates SOPS and Flux configuration

echo "=== Checking SOPS Installation ==="
sops --version

echo -e "\n=== Checking .sops.yaml ==="
if [ -f .sops.yaml ]; then
    cat .sops.yaml
else
    echo "ERROR: .sops.yaml not found"
fi

echo -e "\n=== Checking Flux SOPS Secret ==="
kubectl get secret sops-age -n flux-system -o yaml | grep -v "last-applied"

echo -e "\n=== Checking Kustomization Decryption Config ==="
kubectl get kustomization -n flux-system -o yaml | grep -A3 "decryption"

echo -e "\n=== Testing Encryption/Decryption ==="
echo "apiVersion: v1
kind: Secret
metadata:
  name: test
stringData:
  key: value" | sops --encrypt /dev/stdin > /tmp/test.enc.yaml

if sops --decrypt /tmp/test.enc.yaml > /dev/null 2>&1; then
    echo "SUCCESS: Encryption/Decryption working"
else
    echo "ERROR: Decryption failed"
fi
rm /tmp/test.enc.yaml
```

## Best Practices

### Security Checklist

- [ ] Never commit plaintext secrets to Git
- [ ] Use Age instead of GPG for new deployments (simpler, safer)
- [ ] Store private keys securely (HashiCorp Vault, AWS Secrets Manager)
- [ ] Use different keys per environment
- [ ] Rotate SOPS keys annually
- [ ] Rotate secrets more frequently (monthly for critical systems)
- [ ] Audit who has access to decryption keys
- [ ] Use `encrypted_regex` to only encrypt sensitive fields
- [ ] Verify encrypted files before committing

### Git Workflow

```bash
# Pre-commit hook to prevent plaintext secrets
# .git/hooks/pre-commit

#!/bin/bash
# Check for unencrypted secrets

for file in $(git diff --cached --name-only | grep -E '\.yaml$'); do
    if grep -q "kind: Secret" "$file"; then
        if ! grep -q "sops:" "$file"; then
            echo "ERROR: Unencrypted Secret detected: $file"
            echo "Encrypt with: sops --encrypt $file > $file.enc"
            exit 1
        fi
    fi
done
```

## Monitoring Secret Operations

Track secret changes and decryption events with [OneUptime](https://oneuptime.com). Set up alerts for:

- Failed decryption attempts in Flux logs
- Secret modification frequency anomalies
- Unauthorized access to Kubernetes Secrets
- SOPS key usage patterns

```yaml
# Example: Export Flux events to monitoring
apiVersion: notification.toolkit.fluxcd.io/v1
kind: Alert
metadata:
  name: secrets-alert
  namespace: flux-system
spec:
  providerRef:
    name: oneuptime-webhook
  eventSeverity: info
  eventSources:
    - kind: Kustomization
      name: '*'
  inclusionList:
    - ".*Secret.*"
```

---

SOPS and Flux together solve the GitOps secrets problem elegantly. Your secrets stay encrypted in Git, travel safely through your CI/CD pipeline, and only become plaintext inside your cluster. Start with Age for simplicity, implement proper key rotation, and sleep better knowing your secrets are secure.
