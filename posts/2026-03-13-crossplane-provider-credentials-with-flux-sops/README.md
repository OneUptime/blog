# How to Configure Crossplane Provider Credentials with Flux SOPS

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, Crossplane, SOPS, Secrets Management, GitOps, Kubernetes, Security

Description: Store Crossplane provider credentials as SOPS-encrypted secrets in Git and manage them securely with Flux CD.

---

## Introduction

Storing cloud provider credentials in Git is a common challenge in GitOps workflows. Committing raw credentials is clearly wrong, but not committing them means secrets live outside your Git repository and must be managed separately, undermining the "everything in Git" principle of GitOps.

SOPS (Secrets OPerationS) solves this by encrypting secrets before they reach Git. Combined with Flux's native SOPS support, you can commit encrypted credential files to your repository, and Flux decrypts them at apply time using keys stored in the cluster. Crossplane provider credentials never touch the cluster in plaintext outside of Kubernetes Secrets.

This guide walks through configuring SOPS with age keys, encrypting Crossplane provider credentials, and configuring Flux to decrypt them automatically.

## Prerequisites

- Flux CD bootstrapped on the cluster
- Crossplane installed with at least one provider
- `age` and `sops` CLIs installed locally
- `kubectl` CLI configured

## Step 1: Install the Required Tools

```bash
# Install age (modern encryption tool used with SOPS)
# macOS
brew install age

# Linux
curl -Lo /usr/local/bin/age https://github.com/FiloSottile/age/releases/latest/download/age-linux-amd64
chmod +x /usr/local/bin/age

# Install SOPS
# macOS
brew install sops

# Linux
curl -Lo /usr/local/bin/sops https://github.com/getsops/sops/releases/latest/download/sops-linux.amd64
chmod +x /usr/local/bin/sops
```

## Step 2: Generate an age Key Pair

```bash
# Generate a new age key pair
age-keygen -o age.agekey

# The output contains the private key (keep this secure) and public key
# Example output:
# # created: 2026-03-13T10:00:00Z
# # public key: age1xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
# AGE-SECRET-KEY-1XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX

# Extract the public key for use in .sops.yaml
age-keygen -y age.agekey
```

## Step 3: Store the Private Key in the Cluster

```bash
# Create a secret containing the age private key
# Flux will use this to decrypt SOPS-encrypted secrets
kubectl create secret generic sops-age \
  --namespace=flux-system \
  --from-file=age.agekey=./age.agekey

# Delete the local key file (the cluster now holds the only copy)
# Store a backup in your organization's secrets manager (e.g., AWS Secrets Manager)
rm ./age.agekey
```

## Step 4: Configure SOPS in the Repository

Create a `.sops.yaml` file at the root of your repository to tell SOPS which keys to use and which files to encrypt.

```yaml
# .sops.yaml
creation_rules:
  # Encrypt all files matching *-credentials.yaml under infrastructure/crossplane
  - path_regex: infrastructure/crossplane/.*-credentials\.yaml$
    age: age1xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
  # Encrypt all secrets under the secrets/ directory
  - path_regex: secrets/.*\.yaml$
    age: age1xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

## Step 5: Create and Encrypt Provider Credentials

```bash
# Create the AWS credentials file (unencrypted first)
cat > /tmp/aws-provider-secret.yaml <<EOF
apiVersion: v1
kind: Secret
metadata:
  name: aws-provider-credentials
  namespace: crossplane-system
type: Opaque
stringData:
  credentials: |
    [default]
    aws_access_key_id = AKIAIOSFODNN7EXAMPLE
    aws_secret_access_key = wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY
EOF

# Encrypt the file with SOPS using the age public key
sops --encrypt \
  --age age1xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx \
  /tmp/aws-provider-secret.yaml \
  > infrastructure/crossplane/providers/aws/aws-provider-credentials.yaml

# Remove the plaintext file
rm /tmp/aws-provider-secret.yaml

# Verify the file is encrypted (check that stringData values are ciphertext)
cat infrastructure/crossplane/providers/aws/aws-provider-credentials.yaml
```

## Step 6: Configure Flux to Decrypt SOPS Secrets

Update the Flux Kustomization to enable SOPS decryption.

```yaml
# clusters/my-cluster/infrastructure/crossplane-providers-aws.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: crossplane-providers-aws
  namespace: flux-system
spec:
  interval: 10m
  path: ./infrastructure/crossplane/providers/aws
  prune: true
  sourceRef:
    kind: GitRepository
    name: flux-system
  dependsOn:
    - name: crossplane
  # Enable SOPS decryption for this Kustomization
  decryption:
    provider: sops
    secretRef:
      name: sops-age  # The secret holding the age private key
```

## Step 7: Commit the Encrypted Secret

```bash
# Add the encrypted credentials file to Git
git add infrastructure/crossplane/providers/aws/aws-provider-credentials.yaml
git add .sops.yaml

git commit -m "feat: add SOPS-encrypted AWS provider credentials"
git push origin main

# Flux will now decrypt and apply the secret automatically
flux reconcile kustomization crossplane-providers-aws --with-source

# Verify the secret was created
kubectl get secret aws-provider-credentials -n crossplane-system
```

## Step 8: Edit Encrypted Files

```bash
# To update credentials, use sops to edit the encrypted file in-place
sops infrastructure/crossplane/providers/aws/aws-provider-credentials.yaml

# SOPS opens the decrypted file in your editor ($EDITOR)
# After saving, SOPS re-encrypts automatically
# Commit the updated encrypted file
git add infrastructure/crossplane/providers/aws/aws-provider-credentials.yaml
git commit -m "chore: rotate AWS provider credentials"
```

## Best Practices

- Use a separate age key per environment (dev, staging, production) so compromising one environment's key does not expose other environments.
- Store the age private key backup in a secrets manager (AWS Secrets Manager, HashiCorp Vault, or Azure Key Vault). The cluster's `sops-age` secret is the runtime key, but you need the backup for cluster recreation.
- Rotate provider credentials on a schedule (every 90 days for access keys). Update the SOPS-encrypted secret and commit the result.
- Use `.sops.yaml` path regexes to enforce which files are encrypted. Accidentally committing unencrypted secrets is a common mistake.
- Consider using AWS KMS or GCP KMS instead of age for cloud-managed key rotation without maintaining the age private key backup yourself.

## Conclusion

Crossplane provider credentials are now stored encrypted in Git and automatically decrypted by Flux at apply time. This approach maintains the GitOps principle of having everything in Git while keeping sensitive credentials secure. No plaintext credentials exist outside of Kubernetes Secrets in the cluster, and the encryption key is managed by your cluster rather than by individual engineers.
