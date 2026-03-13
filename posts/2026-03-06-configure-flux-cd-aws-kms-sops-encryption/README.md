# How to Configure Flux CD with AWS KMS for SOPS Encryption

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, AWS, KMS, SOPS, Encryption, Secrets, Kubernetes, GitOps, Security

Description: Learn how to configure Flux CD with Mozilla SOPS and AWS KMS to encrypt secrets in Git and decrypt them automatically during deployment.

---

Storing secrets in Git is a security risk unless they are encrypted. Mozilla SOPS (Secrets OPerationS) combined with AWS KMS provides a robust solution for encrypting secret values in your Git repository while allowing Flux CD to decrypt them transparently during reconciliation. This guide covers the complete end-to-end setup.

## How SOPS with AWS KMS Works

The workflow is straightforward:

1. You create a KMS key in AWS.
2. You configure SOPS to use that KMS key for encryption.
3. You encrypt your Kubernetes Secret manifests with SOPS before committing to Git.
4. Flux CD kustomize-controller decrypts the secrets at reconciliation time using IRSA to access the KMS key.

## Step 1: Create an AWS KMS Key

```bash
# Create a symmetric KMS key for SOPS encryption
aws kms create-key \
  --description "Flux CD SOPS encryption key" \
  --key-usage ENCRYPT_DECRYPT \
  --key-spec SYMMETRIC_DEFAULT \
  --region us-east-1

# Note the KeyId from the output, e.g., "arn:aws:kms:us-east-1:123456789012:key/abcd1234-5678-90ab-cdef-1234567890ab"

# Create an alias for easier reference
aws kms create-alias \
  --alias-name alias/flux-sops \
  --target-key-id abcd1234-5678-90ab-cdef-1234567890ab \
  --region us-east-1
```

Verify the key:

```bash
# List KMS keys to confirm
aws kms describe-key \
  --key-id alias/flux-sops \
  --region us-east-1 \
  --query 'KeyMetadata.{KeyId:KeyId,Arn:Arn,State:KeyState}'
```

## Step 2: Create IAM Policy for KMS Access

```bash
# Create a policy that allows encrypt and decrypt operations
cat > /tmp/flux-kms-sops-policy.json << 'EOF'
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "FluxSOPSDecrypt",
      "Effect": "Allow",
      "Action": [
        "kms:Decrypt",
        "kms:DescribeKey"
      ],
      "Resource": "arn:aws:kms:us-east-1:123456789012:key/abcd1234-5678-90ab-cdef-1234567890ab"
    }
  ]
}
EOF

aws iam create-policy \
  --policy-name FluxSOPSDecrypt \
  --policy-document file:///tmp/flux-kms-sops-policy.json
```

Note: The Flux controller only needs `Decrypt` permission. Developers who encrypt secrets will need `Encrypt` permission separately.

## Step 3: Configure IRSA for the Kustomize Controller

```bash
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
OIDC_ID=$(aws eks describe-cluster \
  --name my-cluster \
  --query "cluster.identity.oidc.issuer" \
  --output text | cut -d'/' -f5)

# Create trust policy for kustomize-controller
cat > /tmp/kustomize-sops-trust.json << EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Federated": "arn:aws:iam::${ACCOUNT_ID}:oidc-provider/oidc.eks.us-east-1.amazonaws.com/id/${OIDC_ID}"
      },
      "Action": "sts:AssumeRoleWithWebIdentity",
      "Condition": {
        "StringEquals": {
          "oidc.eks.us-east-1.amazonaws.com/id/${OIDC_ID}:sub": "system:serviceaccount:flux-system:kustomize-controller",
          "oidc.eks.us-east-1.amazonaws.com/id/${OIDC_ID}:aud": "sts.amazonaws.com"
        }
      }
    }
  ]
}
EOF

aws iam create-role \
  --role-name flux-kustomize-sops \
  --assume-role-policy-document file:///tmp/kustomize-sops-trust.json

aws iam attach-role-policy \
  --role-name flux-kustomize-sops \
  --policy-arn arn:aws:iam::${ACCOUNT_ID}:policy/FluxSOPSDecrypt
```

## Step 4: Annotate the Kustomize Controller Service Account

```yaml
# clusters/production/flux-system/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - gotk-components.yaml
  - gotk-sync.yaml
patches:
  # Add IRSA annotation to kustomize-controller
  - target:
      kind: ServiceAccount
      name: kustomize-controller
    patch: |
      apiVersion: v1
      kind: ServiceAccount
      metadata:
        name: kustomize-controller
        annotations:
          eks.amazonaws.com/role-arn: arn:aws:iam::123456789012:role/flux-kustomize-sops
```

## Step 5: Install and Configure SOPS Locally

```bash
# Install SOPS (macOS)
brew install sops

# Install SOPS (Linux)
curl -LO https://github.com/getsops/sops/releases/download/v3.9.4/sops-v3.9.4.linux.amd64
chmod +x sops-v3.9.4.linux.amd64
sudo mv sops-v3.9.4.linux.amd64 /usr/local/bin/sops

# Verify installation
sops --version
```

## Step 6: Create the SOPS Configuration File

Create a `.sops.yaml` file at the root of your Git repository to define encryption rules:

```yaml
# .sops.yaml
creation_rules:
  # Encrypt all files matching **/secrets/*.yaml with the KMS key
  - path_regex: .*/secrets/.*\.yaml$
    kms: "arn:aws:kms:us-east-1:123456789012:key/abcd1234-5678-90ab-cdef-1234567890ab"
    encrypted_regex: "^(data|stringData)$"

  # Encrypt files in specific cluster paths
  - path_regex: clusters/production/.*secret.*\.yaml$
    kms: "arn:aws:kms:us-east-1:123456789012:key/abcd1234-5678-90ab-cdef-1234567890ab"
    encrypted_regex: "^(data|stringData)$"

  # Use a different key for staging
  - path_regex: clusters/staging/.*secret.*\.yaml$
    kms: "arn:aws:kms:us-east-1:123456789012:key/staging-key-id-here"
    encrypted_regex: "^(data|stringData)$"
```

The `encrypted_regex` field ensures that only `data` and `stringData` fields are encrypted, leaving metadata and other fields readable.

## Step 7: Encrypt a Kubernetes Secret

Create a plain-text secret:

```yaml
# clusters/production/apps/my-app/secrets/db-credentials.yaml
apiVersion: v1
kind: Secret
metadata:
  name: db-credentials
  namespace: default
type: Opaque
stringData:
  DB_HOST: "mydb.cluster-abc123.us-east-1.rds.amazonaws.com"
  DB_USER: "admin"
  DB_PASSWORD: "super-secret-password-123"
  DB_NAME: "myapp_production"
```

Encrypt it with SOPS:

```bash
# Encrypt the secret file in place
sops --encrypt --in-place \
  clusters/production/apps/my-app/secrets/db-credentials.yaml
```

The encrypted file will look like this:

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: db-credentials
  namespace: default
type: Opaque
stringData:
  DB_HOST: ENC[AES256_GCM,data:abc123...,iv:...,tag:...,type:str]
  DB_USER: ENC[AES256_GCM,data:def456...,iv:...,tag:...,type:str]
  DB_PASSWORD: ENC[AES256_GCM,data:ghi789...,iv:...,tag:...,type:str]
  DB_NAME: ENC[AES256_GCM,data:jkl012...,iv:...,tag:...,type:str]
sops:
  kms:
    - arn: arn:aws:kms:us-east-1:123456789012:key/abcd1234-5678-90ab-cdef-1234567890ab
      created_at: "2026-03-06T10:00:00Z"
      enc: AQICAHh...
      aws_profile: ""
  encrypted_regex: ^(data|stringData)$
  version: 3.9.4
```

## Step 8: Configure Flux Kustomization for Decryption

Enable SOPS decryption in your Flux Kustomization resource:

```yaml
# clusters/production/apps/my-app/kustomization-flux.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: my-app
  namespace: flux-system
spec:
  interval: 10m
  sourceRef:
    kind: GitRepository
    name: fleet-infra
  path: ./clusters/production/apps/my-app
  prune: true
  # Enable SOPS decryption
  decryption:
    provider: sops
```

The `decryption.provider: sops` tells the kustomize-controller to decrypt SOPS-encrypted files before applying them. With IRSA configured, it will automatically use the AWS KMS key.

## Step 9: Working with Encrypted Secrets

### Editing an encrypted secret

```bash
# SOPS opens the decrypted file in your editor and re-encrypts on save
sops clusters/production/apps/my-app/secrets/db-credentials.yaml
```

### Decrypting for inspection (do not commit the decrypted version)

```bash
# Decrypt to stdout
sops --decrypt clusters/production/apps/my-app/secrets/db-credentials.yaml

# Decrypt a specific key
sops --decrypt --extract '["stringData"]["DB_PASSWORD"]' \
  clusters/production/apps/my-app/secrets/db-credentials.yaml
```

### Adding a new encrypted secret

```bash
# Create the file
cat > clusters/production/apps/my-app/secrets/api-key.yaml << 'EOF'
apiVersion: v1
kind: Secret
metadata:
  name: api-key
  namespace: default
type: Opaque
stringData:
  API_KEY: "my-api-key-value"
EOF

# Encrypt it
sops --encrypt --in-place \
  clusters/production/apps/my-app/secrets/api-key.yaml

# Commit and push
git add clusters/production/apps/my-app/secrets/api-key.yaml
git commit -m "Add encrypted API key secret"
git push
```

## Step 10: Rotating KMS Keys

When you need to rotate the KMS key:

```bash
# Create a new KMS key
aws kms create-key \
  --description "Flux CD SOPS encryption key v2" \
  --region us-east-1

# Update .sops.yaml with the new key ARN
# Then re-encrypt all files with the new key
find . -name "*.yaml" -path "*/secrets/*" -exec sops updatekeys {} \;
```

## Troubleshooting SOPS Decryption

```bash
# Check kustomize-controller logs for decryption errors
kubectl logs -n flux-system deployment/kustomize-controller --tail=50 \
  | grep -i "sops\|decrypt\|kms"

# Verify IRSA is working on the kustomize-controller
kubectl exec -n flux-system deployment/kustomize-controller -- env | grep AWS

# Check the Kustomization status
kubectl describe kustomization my-app -n flux-system

# Test KMS access manually from the controller pod
kubectl exec -n flux-system deployment/kustomize-controller -- \
  aws kms describe-key --key-id alias/flux-sops --region us-east-1
```

### Common error: "failed to decrypt"

```bash
# Verify the KMS key ARN in the encrypted file matches your key
sops --decrypt clusters/production/apps/my-app/secrets/db-credentials.yaml 2>&1

# Check if the IAM role has decrypt permission
aws iam get-role-policy --role-name flux-kustomize-sops --policy-name FluxSOPSDecrypt 2>/dev/null \
  || aws iam list-attached-role-policies --role-name flux-kustomize-sops
```

## Summary

SOPS with AWS KMS provides a secure, GitOps-native way to manage secrets in Flux CD. The KMS key handles encryption and decryption, IRSA provides secure access from the kustomize-controller without static credentials, and the `.sops.yaml` configuration file ensures consistent encryption rules across your team. Always use `encrypted_regex` to encrypt only the data fields, keeping metadata readable for code reviews and auditing.
