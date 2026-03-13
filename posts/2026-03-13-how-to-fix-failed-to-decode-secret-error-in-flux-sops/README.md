# How to Fix failed to decode secret Error in Flux SOPS

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux, Kubernetes, GitOps, Troubleshooting, Error Messages, SOPS, Secrets Management, Encryption

Description: Learn how to diagnose and fix the "failed to decode secret" error when using SOPS decryption with Flux CD Kustomization controller.

---

If you are using Flux CD with SOPS for secret management, you may encounter the following error during reconciliation:

```
kustomize controller: failed to decode secret 'flux-system/sops-age': illegal base64 data at input byte 0
```

or a variant such as:

```
kustomize controller: failed to decode secret data: failed to decrypt sops-encrypted data: error decrypting key
```

This error indicates that the Flux kustomize-controller cannot decrypt or decode a SOPS-encrypted secret. It typically surfaces during Kustomization reconciliation when the controller attempts to apply manifests that contain SOPS-encrypted values.

## Root Causes

There are several common reasons why this error occurs.

### 1. Incorrect or Missing Decryption Key

The most frequent cause is that the AGE or PGP key used to encrypt the secret is not available to the kustomize-controller, or the key stored in the cluster does not match the one used during encryption.

### 2. Malformed Base64 Encoding in the Secret

If the decryption key secret itself contains improperly encoded base64 data, the controller will fail to read it. This often happens when the key is created manually and whitespace or newline characters are inadvertently included.

### 3. Wrong SOPS Configuration

The `.sops.yaml` configuration file may reference a key fingerprint or AGE recipient that does not match the key available in the cluster.

### 4. Secret Not in the Correct Namespace

The decryption secret must be in the same namespace as the Kustomization resource, typically `flux-system`.

## Diagnostic Steps

### Step 1: Check the Kustomization Status

```bash
flux get kustomizations
```

Look for the specific error message associated with the failing Kustomization.

### Step 2: Inspect the Decryption Secret

```bash
kubectl get secret sops-age -n flux-system -o yaml
```

Verify that the secret exists and contains a valid `age.agekey` data field.

### Step 3: Validate the Key Format

Decode the secret data to check for formatting issues:

```bash
kubectl get secret sops-age -n flux-system -o jsonpath='{.data.age\.agekey}' | base64 -d
```

The output should be a valid AGE private key starting with `AGE-SECRET-KEY-`.

### Step 4: Verify the SOPS Configuration

Check your `.sops.yaml` file in the repository:

```yaml
creation_rules:
  - path_regex: \.yaml$
    encrypted_regex: ^(data|stringData)$
    age: age1xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

Ensure the AGE public key matches the private key deployed to the cluster.

### Step 5: Check Kustomize Controller Logs

```bash
kubectl logs -n flux-system deploy/kustomize-controller | grep -i "failed to decode"
```

## How to Fix

### Fix 1: Recreate the Decryption Secret with Correct Encoding

Delete the existing secret and recreate it from the key file:

```bash
kubectl delete secret sops-age -n flux-system

kubectl create secret generic sops-age \
  --namespace=flux-system \
  --from-file=age.agekey=/path/to/age.key
```

Make sure the key file does not contain trailing newlines or extra whitespace.

### Fix 2: Update the Kustomization to Reference the Correct Secret

Verify that your Kustomization resource references the decryption secret correctly:

```yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: my-app
  namespace: flux-system
spec:
  interval: 10m
  path: ./clusters/my-cluster
  prune: true
  sourceRef:
    kind: GitRepository
    name: flux-system
  decryption:
    provider: sops
    secretRef:
      name: sops-age
```

### Fix 3: Re-encrypt Secrets with the Correct Key

If the encryption key has changed, re-encrypt all secrets in your repository:

```bash
sops --encrypt --age age1xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx \
  --encrypted-regex '^(data|stringData)$' \
  --in-place secret.yaml
```

### Fix 4: Force Reconciliation

After applying the fix, trigger a reconciliation:

```bash
flux reconcile kustomization my-app --with-source
```

## Prevention

To avoid this error in the future, store the AGE key securely and use a consistent process for creating the decryption secret. Consider using a bootstrap script that automates the creation of the SOPS secret as part of cluster provisioning. Always test decryption locally with `sops -d secret.yaml` before pushing changes to the repository.
