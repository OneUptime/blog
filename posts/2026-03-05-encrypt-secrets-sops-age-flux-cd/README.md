# How to Encrypt Secrets with SOPS and Age for Flux CD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, GitOps, Kubernetes, Secret, SOPS, Age, Encryption

Description: Learn how to encrypt Kubernetes secrets using SOPS with Age encryption for secure GitOps workflows with Flux CD.

---

Managing secrets in a GitOps workflow presents a fundamental challenge: you want everything in Git, but secrets should never be stored in plaintext. SOPS (Secrets OPerationS) combined with Age encryption provides a modern, straightforward solution for encrypting secrets that Flux CD can automatically decrypt during reconciliation.

Age is a simple, modern file encryption tool that serves as an excellent alternative to GPG. It uses X25519 keys, which are shorter and easier to manage than GPG keys.

## Prerequisites

Before getting started, ensure you have the following tools installed:

- A running Kubernetes cluster with Flux CD bootstrapped
- `sops` CLI installed (v3.7+)
- `age` CLI installed
- `kubectl` access to your cluster

## Step 1: Generate an Age Key Pair

Generate a new Age key pair that will be used for encryption and decryption.

```bash
# Generate an Age key pair
age-keygen -o age.agekey

# View the public key (you will need this for encryption)
cat age.agekey | grep "public key"
# Output example: # public key: age1ql3z7hjy54pw3hyww5ayyfg7zqgvc7w3j2elw8zmrj2kg5sfn9aqmcac8p
```

## Step 2: Create the Age Secret in Your Cluster

Flux needs access to the private key to decrypt secrets during reconciliation. Store the Age key as a Kubernetes secret in the flux-system namespace.

```bash
# Create a Kubernetes secret containing the Age private key
cat age.agekey | kubectl create secret generic sops-age \
  --namespace=flux-system \
  --from-file=age.agekey=/dev/stdin
```

## Step 3: Create a Kubernetes Secret Manifest

Create a standard Kubernetes secret manifest that you want to encrypt.

```yaml
# secret.yaml - The plaintext secret (will be encrypted before committing)
apiVersion: v1
kind: Secret
metadata:
  name: my-app-secret
  namespace: default
type: Opaque
stringData:
  username: admin
  password: super-secret-password
  api-key: sk-1234567890abcdef
```

## Step 4: Encrypt the Secret with SOPS

Use the `sops` CLI to encrypt the secret file using your Age public key.

```bash
# Encrypt the secret file using the Age public key
sops --encrypt \
  --age age1ql3z7hjy54pw3hyww5ayyfg7zqgvc7w3j2elw8zmrj2kg5sfn9aqmcac8p \
  --encrypted-regex '^(data|stringData)$' \
  secret.yaml > secret.enc.yaml
```

The `--encrypted-regex` flag ensures that only the `data` and `stringData` fields are encrypted, leaving metadata readable for easier Git diffs.

## Step 5: Examine the Encrypted File

After encryption, the file will look something like this.

```yaml
# secret.enc.yaml - Encrypted secret safe for Git
apiVersion: v1
kind: Secret
metadata:
  name: my-app-secret
  namespace: default
type: Opaque
stringData:
  username: ENC[AES256_GCM,data:k8sFw==,iv:...,tag:...,type:str]
  password: ENC[AES256_GCM,data:7sHd9fKx...,iv:...,tag:...,type:str]
  api-key: ENC[AES256_GCM,data:pQ3mN7v...,iv:...,tag:...,type:str]
sops:
  age:
    - recipient: age1ql3z7hjy54pw3hyww5ayyfg7zqgvc7w3j2elw8zmrj2kg5sfn9aqmcac8p
      enc: |
        -----BEGIN AGE ENCRYPTED FILE-----
        ...
        -----END AGE ENCRYPTED FILE-----
  lastmodified: "2026-03-05T00:00:00Z"
  version: 3.7.3
```

## Step 6: Configure the Flux Kustomization with SOPS Decryption

Update your Flux Kustomization resource to enable SOPS decryption. The `decryption` block tells Flux how to decrypt the secrets.

```yaml
# clusters/my-cluster/apps-kustomization.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: my-app
  namespace: flux-system
spec:
  interval: 10m
  path: ./apps/my-app
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

## Step 7: Commit and Push the Encrypted Secret

Now you can safely commit the encrypted secret to your Git repository.

```bash
# Remove the plaintext secret file
rm secret.yaml

# Add the encrypted secret to Git
git add secret.enc.yaml
git commit -m "Add encrypted application secrets"
git push
```

## Step 8: Verify the Decryption

After Flux reconciles, verify that the secret was properly decrypted and created in the cluster.

```bash
# Check the Flux Kustomization status
flux get kustomizations my-app

# Verify the secret exists and contains decrypted values
kubectl get secret my-app-secret -n default -o jsonpath='{.data.username}' | base64 -d
# Output: admin
```

## Best Practices

When working with SOPS and Age in a Flux CD workflow, keep these best practices in mind:

1. **Never commit the Age private key to Git.** The private key should only exist in the Kubernetes cluster and in a secure backup location.

2. **Use `.sops.yaml` for consistent encryption rules.** Instead of passing flags every time, define a `.sops.yaml` configuration file in your repository root.

```yaml
# .sops.yaml - Repository-level SOPS configuration
creation_rules:
  - path_regex: .*\.enc\.yaml$
    encrypted_regex: ^(data|stringData)$
    age: age1ql3z7hjy54pw3hyww5ayyfg7zqgvc7w3j2elw8zmrj2kg5sfn9aqmcac8p
```

3. **Back up your Age key securely.** If the key is lost, you will not be able to decrypt any secrets encrypted with it.

4. **Use separate keys per environment.** Generate different Age keys for development, staging, and production clusters.

5. **Add pre-commit hooks** to prevent accidentally committing unencrypted secrets.

## Troubleshooting

If Flux fails to decrypt secrets, check the Kustomization status for errors.

```bash
# Check for decryption errors
flux get kustomizations my-app

# View detailed logs from the kustomize-controller
kubectl logs -n flux-system deployment/kustomize-controller | grep -i sops
```

Common issues include a missing or incorrectly named Age secret in the `flux-system` namespace, or a mismatch between the Age public key used for encryption and the private key stored in the cluster.

Age encryption with SOPS provides a clean, modern approach to secrets management in Flux CD. Its simplicity compared to GPG makes it the recommended choice for most teams starting with encrypted secrets in GitOps workflows.
