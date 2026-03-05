# How to Debug Secret Decryption Issues in Flux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, GitOps, Kubernetes, SOPS, Secret, Debugging, Troubleshooting

Description: Learn how to diagnose and fix common secret decryption failures in Flux CD when using SOPS, age, GPG, or cloud KMS providers.

---

Secret decryption is a critical part of many Flux CD deployments. When you store encrypted secrets in Git using SOPS, Flux's kustomize-controller decrypts them during reconciliation. When decryption fails, your applications cannot access database credentials, API keys, or TLS certificates. This guide covers systematic debugging of secret decryption issues across all supported providers.

## How Flux Decrypts Secrets

Flux supports SOPS for secret decryption. The kustomize-controller detects files with a `sops` metadata block and decrypts them before applying to the cluster. Decryption is configured in the Kustomization resource:

```yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: my-app
  namespace: flux-system
spec:
  interval: 10m
  path: ./apps/my-app
  sourceRef:
    kind: GitRepository
    name: flux-system
  decryption:
    provider: sops
    secretRef:
      name: sops-age
```

The `decryption.provider` must be `sops`, and the `secretRef` points to a Kubernetes Secret containing the decryption key.

## Step 1: Check Kustomization Status

Start by examining the Kustomization status for decryption errors:

```bash
# Get the Kustomization status
flux get kustomizations my-app

# Get detailed conditions
kubectl get kustomization my-app -n flux-system -o yaml | grep -A 20 "status:"
```

Look for messages containing `decryption`, `sops`, `age`, `gpg`, or `kms`. Common error messages include:

- `failed to decrypt data key`: The decryption key does not match the encryption key
- `cannot get sops secret`: The secret referenced in `decryption.secretRef` does not exist
- `error decrypting key`: The key format is wrong or corrupted

## Step 2: Verify the Decryption Secret Exists

Confirm the secret referenced by `decryption.secretRef` exists and contains the expected key:

```bash
# Check if the secret exists
kubectl get secret sops-age -n flux-system

# Verify the secret has the expected key
kubectl get secret sops-age -n flux-system -o jsonpath='{.data}' | jq 'keys'
```

For age keys, the secret must contain a key named `age.agekey` (or the key name you configured):

```bash
# Verify age key content
kubectl get secret sops-age -n flux-system \
  -o jsonpath='{.data.age\.agekey}' | base64 -d | head -2
```

The output should start with `# created:` followed by `AGE-SECRET-KEY-`.

For GPG keys, the secret should contain the private key:

```bash
kubectl get secret sops-gpg -n flux-system \
  -o jsonpath='{.data.sops\.asc}' | base64 -d | head -5
```

## Step 3: Verify Key Matches the Encrypted File

The most common cause of decryption failure is a mismatch between the key used to encrypt the file and the key available to Flux.

```bash
# For age: Extract the public key from the encrypted file
# Clone your repo and check a SOPS-encrypted file
grep -A 5 "age:" my-secret.sops.yaml

# Compare the recipient with your age key's public key
kubectl get secret sops-age -n flux-system \
  -o jsonpath='{.data.age\.agekey}' | base64 -d | \
  grep "public key:" || age-keygen -y <(kubectl get secret sops-age -n flux-system \
  -o jsonpath='{.data.age\.agekey}' | base64 -d)
```

The public key derived from the secret must match the `recipient` in the SOPS metadata of the encrypted file.

## Step 4: Check the kustomize-controller Logs

The kustomize-controller logs contain detailed decryption error information:

```bash
# View recent logs from the kustomize-controller
kubectl logs -n flux-system deployment/kustomize-controller \
  --since=10m | grep -i "decrypt\|sops\|age\|gpg\|kms"

# Follow logs in real time while triggering reconciliation
kubectl logs -n flux-system deployment/kustomize-controller -f &
flux reconcile kustomization my-app --with-source
```

## Step 5: Test Decryption Locally

Verify the file can be decrypted with the same key outside the cluster:

```bash
# For age
export SOPS_AGE_KEY_FILE=./age-key.txt
# Copy the key from the cluster secret
kubectl get secret sops-age -n flux-system \
  -o jsonpath='{.data.age\.agekey}' | base64 -d > ./age-key.txt

# Attempt local decryption
sops --decrypt my-secret.sops.yaml
```

If local decryption works but Flux fails, the issue is in how the secret is mounted or referenced.

## Step 6: Debug Cloud KMS Issues

When using AWS KMS, GCP KMS, or Azure Key Vault for SOPS encryption, the kustomize-controller needs cloud credentials.

### AWS KMS

```bash
# Verify the kustomize-controller has AWS credentials
kubectl get deployment kustomize-controller -n flux-system \
  -o jsonpath='{.spec.template.spec.containers[0].env}' | jq .

# Check for IRSA annotation on the service account
kubectl get sa kustomize-controller -n flux-system -o yaml | grep eks.amazonaws.com

# Test KMS access
kubectl run aws-test --rm -it --image=amazon/aws-cli -- \
  kms decrypt --ciphertext-blob fileb://test --key-id alias/sops-key --region us-east-1
```

### GCP KMS

```bash
# Check for Workload Identity annotation
kubectl get sa kustomize-controller -n flux-system \
  -o jsonpath='{.metadata.annotations}'

# Verify GCP credentials environment variable
kubectl get deployment kustomize-controller -n flux-system \
  -o jsonpath='{.spec.template.spec.containers[0].env}' | \
  grep GOOGLE_APPLICATION_CREDENTIALS
```

### Azure Key Vault

```bash
# Check for Azure Workload Identity labels
kubectl get sa kustomize-controller -n flux-system -o yaml | grep azure

# Verify Azure environment variables
kubectl get deployment kustomize-controller -n flux-system \
  -o jsonpath='{.spec.template.spec.containers[0].env}' | \
  grep -i azure
```

## Step 7: Common Issues and Fixes

### Missing decryption block in Kustomization

If the `decryption` block is missing entirely, SOPS files will be applied as-is with encrypted values:

```yaml
# This is wrong - no decryption configured
spec:
  path: ./apps/my-app
  sourceRef:
    kind: GitRepository
    name: flux-system
```

Add the decryption block:

```yaml
spec:
  path: ./apps/my-app
  sourceRef:
    kind: GitRepository
    name: flux-system
  decryption:
    provider: sops
    secretRef:
      name: sops-age
```

### Wrong secret key name

The age key must be stored under the correct key in the Kubernetes secret. The default expected key is `age.agekey`:

```bash
# Correct way to create the age secret
kubectl create secret generic sops-age \
  --namespace=flux-system \
  --from-file=age.agekey=./age-key.txt
```

### File not recognized as SOPS-encrypted

SOPS-encrypted files must contain the `sops` metadata block. If the file was not properly encrypted, the controller skips decryption and applies the raw content:

```bash
# Verify a file is properly SOPS-encrypted
grep "sops:" my-secret.sops.yaml
grep "version:" my-secret.sops.yaml
```

### Key rotation

If you rotated your SOPS keys, you need to re-encrypt all secrets with the new key and update the Kubernetes secret:

```bash
# Re-encrypt with the new key
sops updatekeys my-secret.sops.yaml

# Update the cluster secret
kubectl create secret generic sops-age \
  --namespace=flux-system \
  --from-file=age.agekey=./new-age-key.txt \
  --dry-run=client -o yaml | kubectl apply -f -
```

## Step 8: Verify the Fix

After applying a fix, trigger reconciliation and verify:

```bash
# Force reconciliation
flux reconcile kustomization my-app --with-source

# Check the status
flux get kustomizations my-app

# Verify the secret was created in the target namespace
kubectl get secret my-app-secrets -n default

# Verify the secret contains decrypted values
kubectl get secret my-app-secrets -n default \
  -o jsonpath='{.data.password}' | base64 -d
```

## Summary

Debugging secret decryption in Flux follows a systematic path: check the Kustomization status for error messages, verify the decryption secret exists with the correct key, confirm the key matches the encrypted file's recipient, inspect kustomize-controller logs, and test decryption locally. Most failures come from key mismatches, missing secrets, or incorrect secret key names. For cloud KMS, verify that the controller has the necessary IAM permissions to access the key management service.
