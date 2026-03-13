# How to Configure Flux CD with Google Cloud KMS for SOPS Encryption

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, Google Cloud, KMS, SOPS, Encryption, Secrets, GitOps, Kubernetes, Workload Identity, Security

Description: A hands-on guide to encrypting Kubernetes secrets with SOPS and Google Cloud KMS, and decrypting them automatically with Flux CD using Workload Identity.

---

## Introduction

Storing secrets in Git repositories is a fundamental challenge in GitOps workflows. SOPS (Secrets OPerationS) solves this by encrypting secret values while leaving keys and metadata in plaintext, making encrypted files easy to review in pull requests. When combined with Google Cloud KMS, SOPS provides a robust encryption solution where the encryption keys are managed by Google Cloud's hardware security modules.

This guide walks you through setting up SOPS with Google Cloud KMS for encrypting Kubernetes secrets, and configuring Flux CD to automatically decrypt them during reconciliation using Workload Identity.

## Prerequisites

- A GKE cluster with Flux CD installed and Workload Identity enabled
- gcloud CLI installed and configured
- SOPS CLI installed (v3.7 or later)
- kubectl and Flux CLI installed

## Step 1: Create a Google Cloud KMS Key

Create a KMS keyring and key for SOPS encryption.

```bash
# Set environment variables
export PROJECT_ID=$(gcloud config get-value project)
export REGION="us-central1"
export KEYRING_NAME="flux-sops-keyring"
export KEY_NAME="flux-sops-key"

# Enable the Cloud KMS API
gcloud services enable cloudkms.googleapis.com

# Create a KMS keyring
gcloud kms keyrings create $KEYRING_NAME \
  --location $REGION

# Create a symmetric encryption key for SOPS
gcloud kms keys create $KEY_NAME \
  --keyring $KEYRING_NAME \
  --location $REGION \
  --purpose encryption \
  --rotation-period 90d \
  --next-rotation-time $(date -u -d "+90 days" +%Y-%m-%dT%H:%M:%SZ 2>/dev/null || date -u -v+90d +%Y-%m-%dT%H:%M:%SZ)

# Get the full key resource name
export KMS_KEY="projects/${PROJECT_ID}/locations/${REGION}/keyRings/${KEYRING_NAME}/cryptoKeys/${KEY_NAME}"
echo "KMS Key: $KMS_KEY"

# Verify the key was created
gcloud kms keys list \
  --keyring $KEYRING_NAME \
  --location $REGION
```

## Step 2: Configure Workload Identity for KMS Access

Set up Workload Identity so the Flux kustomize-controller can decrypt secrets using the KMS key.

```bash
# Create a Google Service Account for Flux decryption
gcloud iam service-accounts create flux-sops-decrypter \
  --display-name "Flux SOPS Decrypter"

# Grant Cloud KMS Decrypter role to the service account
# This allows decryption but not encryption (principle of least privilege)
gcloud kms keys add-iam-policy-binding $KEY_NAME \
  --keyring $KEYRING_NAME \
  --location $REGION \
  --member="serviceAccount:flux-sops-decrypter@${PROJECT_ID}.iam.gserviceaccount.com" \
  --role="roles/cloudkms.cryptoKeyDecrypter"

# Bind the Flux kustomize-controller KSA to the GSA
gcloud iam service-accounts add-iam-policy-binding \
  flux-sops-decrypter@${PROJECT_ID}.iam.gserviceaccount.com \
  --member="serviceAccount:${PROJECT_ID}.svc.id.goog[flux-system/kustomize-controller]" \
  --role="roles/iam.workloadIdentityUser"

# Annotate the kustomize-controller service account
kubectl annotate serviceaccount kustomize-controller \
  --namespace flux-system \
  --overwrite \
  iam.gke.io/gcp-service-account=flux-sops-decrypter@${PROJECT_ID}.iam.gserviceaccount.com

# Restart kustomize-controller to pick up the identity
kubectl rollout restart deployment/kustomize-controller -n flux-system
```

## Step 3: Configure SOPS

Create a SOPS configuration file that specifies the KMS key to use.

```yaml
# .sops.yaml
# Place this file in the root of your Git repository
# It tells SOPS which KMS key to use for encryption
creation_rules:
  # Encrypt all files matching the pattern **/secrets/*.yaml
  - path_regex: .*/secrets/.*\.yaml$
    gcp_kms: projects/PROJECT_ID/locations/us-central1/keyRings/flux-sops-keyring/cryptoKeys/flux-sops-key
    # Only encrypt the data and stringData fields in Kubernetes secrets
    encrypted_regex: "^(data|stringData)$"

  # Encrypt all files ending with .enc.yaml
  - path_regex: .*\.enc\.yaml$
    gcp_kms: projects/PROJECT_ID/locations/us-central1/keyRings/flux-sops-keyring/cryptoKeys/flux-sops-key
    encrypted_regex: "^(data|stringData)$"
```

## Step 4: Encrypt Kubernetes Secrets with SOPS

Create and encrypt Kubernetes secrets.

```bash
# Create a plain-text Kubernetes secret file
cat > secrets/database-secret.yaml << 'EOF'
apiVersion: v1
kind: Secret
metadata:
  name: database-credentials
  namespace: production
type: Opaque
stringData:
  # Database connection details
  DB_HOST: "10.0.1.100"
  DB_PORT: "5432"
  DB_NAME: "myapp_production"
  DB_USER: "app_user"
  DB_PASSWORD: "super-secret-password-123"
  DB_SSL_MODE: "require"
EOF

# Encrypt the secret using SOPS
sops --encrypt \
  --gcp-kms "$KMS_KEY" \
  --encrypted-regex '^(data|stringData)$' \
  secrets/database-secret.yaml > secrets/database-secret.enc.yaml

# Verify the encrypted file
cat secrets/database-secret.enc.yaml
# The metadata should be in plaintext, but data/stringData values are encrypted

# Remove the plaintext file (never commit unencrypted secrets)
rm secrets/database-secret.yaml
```

The encrypted file will look like this:

```yaml
# secrets/database-secret.enc.yaml (after encryption)
apiVersion: v1
kind: Secret
metadata:
  name: database-credentials
  namespace: production
type: Opaque
stringData:
  DB_HOST: ENC[AES256_GCM,data:abcdef123456...,iv:...,tag:...,type:str]
  DB_PORT: ENC[AES256_GCM,data:xyz789...,iv:...,tag:...,type:str]
  DB_NAME: ENC[AES256_GCM,data:qwerty...,iv:...,tag:...,type:str]
  DB_USER: ENC[AES256_GCM,data:asdfgh...,iv:...,tag:...,type:str]
  DB_PASSWORD: ENC[AES256_GCM,data:zxcvbn...,iv:...,tag:...,type:str]
  DB_SSL_MODE: ENC[AES256_GCM,data:poiuyt...,iv:...,tag:...,type:str]
sops:
  gcp_kms:
    - resource_id: projects/PROJECT_ID/locations/us-central1/keyRings/flux-sops-keyring/cryptoKeys/flux-sops-key
      created_at: "2026-03-06T00:00:00Z"
      enc: CiQA...
  lastmodified: "2026-03-06T00:00:00Z"
  version: 3.7.3
```

## Step 5: Edit Encrypted Secrets

Use SOPS to edit encrypted secrets in place.

```bash
# Edit an encrypted secret (SOPS decrypts in memory, opens editor, re-encrypts)
sops secrets/database-secret.enc.yaml

# Decrypt a secret to stdout (for verification only, do not pipe to a file)
sops --decrypt secrets/database-secret.enc.yaml

# Rotate the encryption key (re-encrypt with a new key version)
sops --rotate --in-place secrets/database-secret.enc.yaml
```

## Step 6: Configure Flux to Decrypt SOPS Secrets

Configure the Flux Kustomization to enable SOPS decryption.

```yaml
# kustomization-with-sops.yaml
# Flux Kustomization that decrypts SOPS-encrypted secrets
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: app-secrets
  namespace: flux-system
spec:
  interval: 10m
  sourceRef:
    kind: GitRepository
    name: fleet-infra
  path: ./secrets
  prune: true
  # Enable SOPS decryption
  decryption:
    # Use the SOPS provider for decryption
    provider: sops
```

Note that when using Workload Identity, you do not need to specify a `secretRef` in the decryption configuration. The kustomize-controller will use its Workload Identity credentials to access KMS automatically.

## Step 7: Organize Secrets in the Repository

Structure your repository to keep encrypted secrets organized.

```text
fleet-infra/
  clusters/
    gke-cluster/
      flux-system/
        gotk-components.yaml
        gotk-sync.yaml
        kustomization.yaml
      infrastructure.yaml
      apps.yaml
      secrets.yaml          # Kustomization for secrets
  secrets/
    production/
      database-secret.enc.yaml
      api-keys.enc.yaml
      tls-certs.enc.yaml
    staging/
      database-secret.enc.yaml
      api-keys.enc.yaml
  .sops.yaml                # SOPS configuration
```

```yaml
# clusters/gke-cluster/secrets.yaml
# Kustomization for production secrets
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: production-secrets
  namespace: flux-system
spec:
  interval: 10m
  sourceRef:
    kind: GitRepository
    name: fleet-infra
  path: ./secrets/production
  prune: true
  decryption:
    provider: sops
  # Secrets should be deployed before applications
  # Applications can dependsOn this Kustomization
---
# kustomization for staging secrets
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: staging-secrets
  namespace: flux-system
spec:
  interval: 10m
  sourceRef:
    kind: GitRepository
    name: fleet-infra
  path: ./secrets/staging
  prune: true
  decryption:
    provider: sops
```

## Step 8: Encrypt Multiple Secret Types

Encrypt various types of Kubernetes secrets with SOPS.

```bash
# Encrypt a TLS certificate secret
cat > secrets/production/tls-cert.yaml << 'EOF'
apiVersion: v1
kind: Secret
metadata:
  name: app-tls
  namespace: production
type: kubernetes.io/tls
data:
  tls.crt: LS0tLS1CRUdJTi... # base64 encoded certificate
  tls.key: LS0tLS1CRUdJTi... # base64 encoded private key
EOF

sops --encrypt \
  --gcp-kms "$KMS_KEY" \
  --encrypted-regex '^(data|stringData)$' \
  --in-place secrets/production/tls-cert.yaml

# Encrypt a Docker registry credential secret
cat > secrets/production/registry-creds.yaml << 'EOF'
apiVersion: v1
kind: Secret
metadata:
  name: registry-credentials
  namespace: production
type: kubernetes.io/dockerconfigjson
data:
  .dockerconfigjson: eyJhdXRocyI6... # base64 encoded Docker config
EOF

sops --encrypt \
  --gcp-kms "$KMS_KEY" \
  --encrypted-regex '^(data|stringData)$' \
  --in-place secrets/production/registry-creds.yaml
```

## Step 9: Set Up Key Rotation

Configure automatic key rotation for the KMS key and rotate SOPS encrypted files.

```bash
# Update the key rotation period
gcloud kms keys update $KEY_NAME \
  --keyring $KEYRING_NAME \
  --location $REGION \
  --rotation-period 90d

# List key versions
gcloud kms keys versions list \
  --key $KEY_NAME \
  --keyring $KEYRING_NAME \
  --location $REGION

# Re-encrypt all SOPS files with the latest key version
# This script finds and re-encrypts all SOPS-encrypted files
find secrets/ -name "*.enc.yaml" -exec sops --rotate --in-place {} \;

# Commit the rotated files
git add secrets/
git commit -m "Rotate SOPS encryption to latest KMS key version"
git push
```

## Step 10: Alternative Authentication Without Workload Identity

If Workload Identity is not available, use a service account key.

```bash
# Create a service account key for SOPS decryption
gcloud iam service-accounts keys create sops-key.json \
  --iam-account=flux-sops-decrypter@${PROJECT_ID}.iam.gserviceaccount.com

# Create a Kubernetes secret with the service account key
kubectl create secret generic sops-gcp-credentials \
  --namespace flux-system \
  --from-file=sops.gcp-credentials=sops-key.json

# Clean up the key file
rm sops-key.json
```

```yaml
# kustomization-sops-with-secret.yaml
# Uses a service account key secret for SOPS decryption
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: app-secrets
  namespace: flux-system
spec:
  interval: 10m
  sourceRef:
    kind: GitRepository
    name: fleet-infra
  path: ./secrets
  prune: true
  decryption:
    provider: sops
    secretRef:
      # Reference the secret containing the GCP service account key
      name: sops-gcp-credentials
```

## Troubleshooting

### Decryption Failures

```bash
# Check kustomize-controller logs for decryption errors
kubectl logs -n flux-system deploy/kustomize-controller | grep -i "sops\|decrypt\|kms"

# Verify the Workload Identity annotation is set
kubectl get sa kustomize-controller -n flux-system -o yaml | grep gcp-service-account

# Test KMS access from a debug pod
kubectl run kms-test --rm -it \
  --image=google/cloud-sdk:slim \
  --namespace=flux-system \
  --serviceaccount=kustomize-controller \
  -- bash -c "echo 'test' | gcloud kms encrypt \
    --key=$KEY_NAME --keyring=$KEYRING_NAME --location=$REGION \
    --plaintext-file=- --ciphertext-file=- | base64"
```

### SOPS Configuration Issues

```bash
# Validate the .sops.yaml configuration
sops --config .sops.yaml --encrypt --in-place test-secret.yaml

# Check that the path_regex matches your file paths
sops filestatus secrets/production/database-secret.enc.yaml

# Verify the encrypted file is valid
sops --decrypt secrets/production/database-secret.enc.yaml > /dev/null
```

### Kustomization Not Applying Secrets

```bash
# Check the Kustomization status
flux get kustomization app-secrets

# Force a reconciliation
flux reconcile kustomization app-secrets

# Verify the decrypted secret exists in the cluster
kubectl get secret database-credentials -n production
```

## Summary

In this guide, you configured Flux CD to decrypt SOPS-encrypted secrets using Google Cloud KMS. You created a KMS key for encryption, set up Workload Identity for keyless decryption, configured SOPS to encrypt Kubernetes secrets while preserving metadata readability, and set up Flux Kustomizations with SOPS decryption enabled. This approach allows you to safely store encrypted secrets in Git while Flux automatically decrypts them during reconciliation, maintaining the security of your secrets while following GitOps best practices.
