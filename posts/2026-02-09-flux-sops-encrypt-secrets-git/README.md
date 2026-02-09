# How to Use Flux SOPS Integration for Encrypting Secrets in Git Repositories

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Flux, SOPS, Secrets Management, GitOps, Kubernetes Security

Description: Learn how to securely store encrypted Kubernetes secrets in Git using Flux and SOPS with support for AWS KMS, Azure Key Vault, and GCP KMS.

---

GitOps means storing everything in Git, but what about secrets? Committing plaintext passwords, API keys, and certificates to Git repositories is a security disaster. SOPS (Secrets OPerationS) solves this by encrypting secret values while keeping keys readable. Combined with Flux, you get secure secrets management directly in your GitOps workflow.

This guide shows you how to integrate SOPS with Flux for encrypted secrets in Git.

## Why SOPS for GitOps

SOPS encrypts only the values in YAML and JSON files, leaving keys and structure readable. This gives you:

- Secrets safely stored in Git
- Readable diffs showing which secrets changed
- Integration with cloud KMS services
- Audit trails via Git history
- No separate secret management system needed

Flux has native SOPS support, automatically decrypting secrets during reconciliation.

## Installing SOPS

Install the SOPS CLI:

```bash
# macOS
brew install sops

# Linux
curl -LO https://github.com/mozilla/sops/releases/download/v3.8.1/sops-v3.8.1.linux.amd64
chmod +x sops-v3.8.1.linux.amd64
sudo mv sops-v3.8.1.linux.amd64 /usr/local/bin/sops

# Verify installation
sops --version
```

## Setting Up Encryption Keys

SOPS supports multiple key management systems. Choose based on your infrastructure.

### Option 1: Age (Simple, No Cloud Dependencies)

Generate an Age key pair:

```bash
# Install age
brew install age  # macOS
# or download from https://github.com/FiloSottile/age

# Generate key pair
age-keygen -o age.key

# View public key
cat age.key | grep "public key:"
```

You'll see output like:

```
# public key: age1ql3z7hjy54pw3hyww5ayyfg7zqgvc7w3j2elw8zmrj2kg5sfn9aqmcac8p
```

Store the private key securely. You'll need it for Flux.

### Option 2: AWS KMS

Create a KMS key in AWS:

```bash
# Create KMS key
aws kms create-key --description "SOPS encryption key for Flux"

# Note the KeyId from output, then create alias
aws kms create-alias \
  --alias-name alias/sops-flux \
  --target-key-id <KeyId>

# Get the ARN for SOPS configuration
aws kms describe-key --key-id alias/sops-flux
```

Configure AWS credentials for SOPS:

```bash
export AWS_PROFILE=your-profile
# or
export AWS_ACCESS_KEY_ID=xxx
export AWS_SECRET_ACCESS_KEY=xxx
```

### Option 3: GCP KMS

Create a keyring and key:

```bash
# Create keyring
gcloud kms keyrings create sops \
  --location global

# Create key
gcloud kms keys create flux-secrets \
  --location global \
  --keyring sops \
  --purpose encryption

# Get the key resource name
gcloud kms keys list --location global --keyring sops
```

## Creating SOPS Configuration

Create `.sops.yaml` in your repository root to configure encryption rules:

```yaml
# .sops.yaml - Using Age
creation_rules:
  - path_regex: .*.yaml
    encrypted_regex: ^(data|stringData)$
    age: age1ql3z7hjy54pw3hyww5ayyfg7zqgvc7w3j2elw8zmrj2kg5sfn9aqmcac8p
```

Or for AWS KMS:

```yaml
# .sops.yaml - Using AWS KMS
creation_rules:
  - path_regex: clusters/production/.*\.yaml
    encrypted_regex: ^(data|stringData)$
    kms: arn:aws:kms:us-east-1:123456789012:key/12345678-1234-1234-1234-123456789012
  - path_regex: clusters/staging/.*\.yaml
    encrypted_regex: ^(data|stringData)$
    kms: arn:aws:kms:us-east-1:123456789012:key/87654321-4321-4321-4321-210987654321
```

The `encrypted_regex` ensures SOPS only encrypts secret values, not metadata.

## Encrypting Secrets

Create a regular Kubernetes secret:

```yaml
# secret.yaml
apiVersion: v1
kind: Secret
metadata:
  name: database-credentials
  namespace: production
type: Opaque
stringData:
  username: admin
  password: super-secret-password
  database-url: postgresql://admin:super-secret-password@db.example.com/app
```

Encrypt it with SOPS:

```bash
sops --encrypt --in-place secret.yaml
```

The file now looks like:

```yaml
apiVersion: v1
kind: Secret
metadata:
    name: database-credentials
    namespace: production
type: Opaque
stringData:
    username: ENC[AES256_GCM,data:8F9h2==,iv:...,tag:...,type:str]
    password: ENC[AES256_GCM,data:K9mP3x==,iv:...,tag:...,type:str]
    database-url: ENC[AES256_GCM,data:L3nQ7y==,iv:...,tag:...,type:str]
sops:
    kms: []
    gcp_kms: []
    azure_kv: []
    age:
        - recipient: age1ql3z7hjy54pw3hyww5ayyfg7zqgvc7w3j2elw8zmrj2kg5sfn9aqmcac8p
          enc: |
            -----BEGIN AGE ENCRYPTED FILE-----
            YWdlLWVuY3J5cHRpb24ub3JnL3YxCi0+IFgyNTUxOSBFM...
            -----END AGE ENCRYPTED FILE-----
    encrypted_regex: ^(data|stringData)$
    version: 3.8.1
```

Values are encrypted, but structure and metadata remain readable.

## Configuring Flux for SOPS Decryption

Flux needs the decryption key to read encrypted secrets. Create a Kubernetes secret with your Age private key:

```bash
# Create secret from Age private key
cat age.key | kubectl create secret generic sops-age \
  --namespace=flux-system \
  --from-file=age.agekey=/dev/stdin
```

For AWS KMS, configure IRSA (IAM Roles for Service Accounts) instead:

```yaml
# Service account for Flux kustomize-controller
apiVersion: v1
kind: ServiceAccount
metadata:
  name: kustomize-controller
  namespace: flux-system
  annotations:
    eks.amazonaws.com/role-arn: arn:aws:iam::123456789012:role/flux-sops-decrypt
```

The IAM role needs KMS decrypt permission:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "kms:Decrypt",
        "kms:DescribeKey"
      ],
      "Resource": "arn:aws:kms:us-east-1:123456789012:key/12345678-1234-1234-1234-123456789012"
    }
  ]
}
```

## Creating Flux Kustomization with Decryption

Configure Flux to decrypt secrets during reconciliation:

```yaml
# clusters/production/apps.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: production-apps
  namespace: flux-system
spec:
  interval: 10m
  sourceRef:
    kind: GitRepository
    name: flux-system
  path: ./apps/production
  prune: true
  decryption:
    provider: sops
    secretRef:
      name: sops-age  # Reference to secret containing Age key
```

For AWS KMS, omit `secretRef` since IRSA provides credentials:

```yaml
spec:
  decryption:
    provider: sops
```

## Testing Decryption Locally

Decrypt a file to verify it works:

```bash
# Decrypt to stdout
sops --decrypt secret.yaml

# Decrypt to new file
sops --decrypt secret.yaml > secret-plaintext.yaml

# Edit encrypted file (decrypts, opens editor, re-encrypts on save)
sops secret.yaml
```

## Encrypting Multiple Files

Encrypt all secrets in a directory:

```bash
# Find and encrypt all secret files
find ./clusters/production -name '*secret*.yaml' -exec sops --encrypt --in-place {} \;
```

## Rotating Encryption Keys

When you need to rotate keys, re-encrypt with the new key:

```bash
# Using new Age key
sops --rotate --age age1new_public_key --in-place secret.yaml

# Using new KMS key
sops --rotate --kms arn:aws:kms:region:account:key/new-key-id --in-place secret.yaml
```

## Git Diff for Encrypted Files

Configure Git to show decrypted diffs:

```bash
# Add to .gitattributes
*.yaml diff=sopsdiffer

# Configure diff driver in .git/config or ~/.gitconfig
git config diff.sopsdiffer.textconv "sops --decrypt"
```

Now `git diff` shows readable changes even in encrypted files.

## Pre-commit Hooks

Prevent committing plaintext secrets with a pre-commit hook:

```bash
#!/bin/bash
# .git/hooks/pre-commit

# Check for unencrypted secrets
for file in $(git diff --cached --name-only | grep -E 'secret.*\.yaml$'); do
  if ! grep -q "sops:" "$file"; then
    echo "Error: $file appears to be an unencrypted secret"
    exit 1
  fi
done
```

Make it executable:

```bash
chmod +x .git/hooks/pre-commit
```

## Managing Multiple Environments

Use different keys per environment:

```yaml
# .sops.yaml
creation_rules:
  - path_regex: clusters/development/.*\.yaml
    encrypted_regex: ^(data|stringData)$
    age: age1dev_public_key

  - path_regex: clusters/staging/.*\.yaml
    encrypted_regex: ^(data|stringData)$
    age: age1staging_public_key

  - path_regex: clusters/production/.*\.yaml
    encrypted_regex: ^(data|stringData)$
    age: age1prod_public_key
```

This ensures compromising dev keys doesn't expose production secrets.

## Backup and Disaster Recovery

Critical: Back up your encryption keys securely.

```bash
# Backup Age key to password manager or secure vault
cat age.key

# For KMS, ensure you have AWS account access recovery procedures
# For GCP KMS, enable key version management
```

Document key locations and access procedures for disaster recovery.

## Troubleshooting

If Flux fails to decrypt:

```bash
# Check Flux logs
kubectl logs -n flux-system deploy/kustomize-controller

# Verify secret exists
kubectl get secret sops-age -n flux-system

# Test decryption manually
kubectl run -it --rm debug --image=alpine --restart=Never -- sh
apk add age sops
# Copy secret content and test decryption
```

Common issues:

- **Wrong key format**: Age keys must use the exact format from age-keygen
- **Missing permissions**: IAM role lacks KMS decrypt permissions
- **Key mismatch**: File encrypted with different key than Flux has access to

## Best Practices

1. **Never commit plaintext secrets**: Always encrypt before committing
2. **Use separate keys per environment**: Limit blast radius of key compromise
3. **Rotate keys periodically**: Re-encrypt with new keys every 6-12 months
4. **Audit trail**: Git history provides complete secret change audit
5. **Limit key access**: Only CI/CD and Flux need decryption keys
6. **Test in lower environments**: Verify encryption/decryption before production
7. **Document key management**: Team members need clear key recovery procedures

## Conclusion

SOPS integration transforms Flux into a complete GitOps solution that handles secrets securely. Your entire infrastructure configuration, including sensitive data, lives in Git with full version control and audit trails. Encrypted values mean you never sacrifice security for the convenience of GitOps. Start with Age for simplicity, then graduate to cloud KMS as your needs grow.
