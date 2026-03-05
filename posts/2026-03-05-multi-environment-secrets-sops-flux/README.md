# How to Configure Multi-Environment Secrets with SOPS and Flux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, GitOps, Kubernetes, SOPS, Secrets Management, Multi-Environment

Description: Learn how to manage encrypted secrets across multiple environments using Mozilla SOPS and Flux CD with separate encryption keys per environment.

---

Managing secrets across multiple environments (development, staging, production) requires careful key management and access control. Mozilla SOPS integrated with Flux CD provides a GitOps-native approach to encrypting secrets in your Git repository while ensuring each environment can only decrypt its own secrets.

## Multi-Environment Architecture

The recommended approach uses separate encryption keys for each environment. This ensures that a compromised development key cannot decrypt production secrets. The `.sops.yaml` configuration file at the repository root defines which keys are used for which paths.

## Directory Structure

Organize your repository with per-environment directories:

```
clusters/
  development/
    secrets/
      database.yaml
      api-keys.yaml
  staging/
    secrets/
      database.yaml
      api-keys.yaml
  production/
    secrets/
      database.yaml
      api-keys.yaml
.sops.yaml
```

## Setting Up Age Keys Per Environment

Age is the recommended encryption backend for SOPS with Flux. Generate a separate key for each environment:

```bash
# Generate development key
age-keygen -o dev-age-key.txt
# Public key: age1dev...

# Generate staging key
age-keygen -o staging-age-key.txt
# Public key: age1staging...

# Generate production key
age-keygen -o prod-age-key.txt
# Public key: age1prod...
```

Store each key securely. The private key must be available in the corresponding cluster.

## Configuring .sops.yaml

The `.sops.yaml` file uses `path_regex` to route files to the correct encryption key:

```yaml
creation_rules:
  - path_regex: clusters/development/secrets/.*\.yaml$
    encrypted_regex: ^(data|stringData)$
    age: age1devxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

  - path_regex: clusters/staging/secrets/.*\.yaml$
    encrypted_regex: ^(data|stringData)$
    age: age1stagingxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

  - path_regex: clusters/production/secrets/.*\.yaml$
    encrypted_regex: ^(data|stringData)$
    age: age1prodxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

The `encrypted_regex` ensures only the `data` and `stringData` fields are encrypted, leaving metadata readable for Git diffs.

## Creating Encrypted Secrets

Create a plaintext secret and encrypt it with SOPS:

```bash
# Create the plaintext secret
cat > clusters/production/secrets/database.yaml << EOF
apiVersion: v1
kind: Secret
metadata:
  name: database-credentials
  namespace: default
type: Opaque
stringData:
  username: prod-db-user
  password: super-secret-prod-password
  host: prod-db.example.com
EOF

# Encrypt in place - SOPS reads .sops.yaml to determine the key
sops --encrypt --in-place clusters/production/secrets/database.yaml
```

The encrypted file looks like:

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: database-credentials
  namespace: default
type: Opaque
stringData:
  username: ENC[AES256_GCM,data:...,type:str]
  password: ENC[AES256_GCM,data:...,type:str]
  host: ENC[AES256_GCM,data:...,type:str]
sops:
  age:
    - recipient: age1prodxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
      enc: |
        ...
  lastmodified: "2026-03-05T14:30:00Z"
  version: 3.8.1
```

## Deploying Keys to Clusters

Each cluster needs its environment-specific private key as a Kubernetes secret:

```bash
# On the production cluster
kubectl create secret generic sops-age-key \
  --namespace=flux-system \
  --from-file=age.agekey=prod-age-key.txt

# On the staging cluster
kubectl create secret generic sops-age-key \
  --namespace=flux-system \
  --from-file=age.agekey=staging-age-key.txt

# On the development cluster
kubectl create secret generic sops-age-key \
  --namespace=flux-system \
  --from-file=age.agekey=dev-age-key.txt
```

## Configuring Flux Kustomizations

Each environment's Flux Kustomization references the SOPS decryption key:

```yaml
# Production cluster
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: production-secrets
  namespace: flux-system
spec:
  interval: 10m
  sourceRef:
    kind: GitRepository
    name: flux-system
  path: ./clusters/production/secrets
  prune: true
  decryption:
    provider: sops
    secretRef:
      name: sops-age-key
```

```yaml
# Staging cluster
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: staging-secrets
  namespace: flux-system
spec:
  interval: 10m
  sourceRef:
    kind: GitRepository
    name: flux-system
  path: ./clusters/staging/secrets
  prune: true
  decryption:
    provider: sops
    secretRef:
      name: sops-age-key
```

## Using Multiple Recipients

For shared secrets or team access, add multiple recipients to a creation rule:

```yaml
creation_rules:
  - path_regex: clusters/production/secrets/.*\.yaml$
    encrypted_regex: ^(data|stringData)$
    age: >-
      age1prodxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx,
      age1adminxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

This allows both the cluster key and an admin key to decrypt production secrets.

## Rotating Secrets

To update a secret value:

```bash
# Decrypt the file
sops clusters/production/secrets/database.yaml

# Edit the decrypted content in your editor, save, and SOPS re-encrypts automatically
```

Alternatively, update a specific key:

```bash
sops --set '["stringData"]["password"] "new-password-here"' \
  clusters/production/secrets/database.yaml
```

## Rotating Encryption Keys

When rotating an environment's age key:

1. Generate a new key:

```bash
age-keygen -o new-prod-age-key.txt
```

2. Update `.sops.yaml` to include both old and new keys temporarily
3. Re-encrypt all secrets for that environment:

```bash
for file in clusters/production/secrets/*.yaml; do
  sops updatekeys --yes "$file"
done
```

4. Update the cluster secret:

```bash
kubectl create secret generic sops-age-key \
  --namespace=flux-system \
  --from-file=age.agekey=new-prod-age-key.txt \
  --dry-run=client -o yaml | kubectl apply -f -
```

5. Remove the old key from `.sops.yaml`

## Verifying Decryption

Check that Flux can decrypt secrets correctly:

```bash
# Check the Kustomization status
flux get kustomization production-secrets

# Verify the secret exists in the cluster
kubectl get secret database-credentials -n default

# Check controller logs for decryption errors
kubectl -n flux-system logs deployment/kustomize-controller --tail=20
```

## Troubleshooting

**Decryption failed error**: Verify the correct private key is deployed to the cluster. The key must match the recipient in the encrypted file.

**Wrong key used for encryption**: Check that `.sops.yaml` path patterns correctly match your file paths. Test the pattern with a new file to verify routing.

**Secrets not updating after rotation**: After re-encrypting files, commit and push the changes. Flux will detect the updated files on the next reconciliation.

**Permission denied on .sops.yaml**: Ensure the `.sops.yaml` file is at the repository root and is readable by SOPS from the directory where you run the encrypt command.

Using separate SOPS keys per environment with Flux provides a secure, GitOps-native approach to secrets management. Each environment maintains its own encryption boundary, and all secret changes are tracked as Git commits.
