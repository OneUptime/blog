# How to Store Database Credentials in Git with SOPS and Flux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, GitOps, Kubernetes, SOPS, Secrets Management, Database, Security

Description: Learn how to securely store and manage database credentials in Git using Mozilla SOPS encryption with Flux CD for automated decryption during reconciliation.

---

Storing secrets in Git is a fundamental challenge in GitOps. You want every piece of configuration version-controlled, but database credentials cannot be committed in plaintext. Mozilla SOPS solves this by encrypting secret values while keeping the keys readable, and Flux CD natively supports SOPS decryption during reconciliation. This guide shows how to encrypt database credentials with SOPS and have Flux automatically decrypt them into Kubernetes Secrets.

## How SOPS Works with Flux

SOPS (Secrets OPerationS) encrypts the values in YAML and JSON files while leaving the structure and keys in plaintext. This means you can still see which secrets exist and diff changes, but the actual credential values are encrypted. Flux's kustomize-controller has built-in SOPS support and will decrypt secrets before applying them to the cluster.

## Prerequisites

- Flux CD bootstrapped on your cluster
- SOPS CLI installed locally (`brew install sops` or equivalent)
- An encryption provider: AWS KMS, Azure Key Vault, GCP KMS, or age

This guide uses age for simplicity, but the same approach works with cloud KMS providers.

## Step 1: Generate an age Key Pair

```bash
age-keygen -o age.agekey
```

This outputs a file containing both the public and secret key. Note the public key (starts with `age1...`).

Create a Kubernetes Secret with the private key so Flux can decrypt:

```bash
cat age.agekey | kubectl create secret generic sops-age \
  --namespace=flux-system \
  --from-file=age.agekey=/dev/stdin
```

## Step 2: Configure SOPS Encryption Rules

Create a `.sops.yaml` file in your repository root to define encryption rules:

```yaml
creation_rules:
  - path_regex: .*\.enc\.yaml$
    age: age1ql3z7hjy54pw3hyww5ayyfg7zqgvc7w3j2elw8zmrj2kg5sfn9aqmcac8p
  - path_regex: clusters/.*/secrets/.*\.yaml$
    age: age1ql3z7hjy54pw3hyww5ayyfg7zqgvc7w3j2elw8zmrj2kg5sfn9aqmcac8p
```

Replace the age public key with your own. The `path_regex` patterns determine which files get encrypted.

## Step 3: Create and Encrypt Database Credentials

Create a Kubernetes Secret manifest for your database credentials:

```yaml
# clusters/my-cluster/secrets/database-credentials.yaml
apiVersion: v1
kind: Secret
metadata:
  name: database-credentials
  namespace: my-app
type: Opaque
stringData:
  DB_HOST: db.example.com
  DB_PORT: "5432"
  DB_NAME: myapp_production
  DB_USER: myapp_user
  DB_PASSWORD: super-secret-password-here
  DB_SSL_MODE: require
  DATABASE_URL: postgresql://myapp_user:super-secret-password-here@db.example.com:5432/myapp_production?sslmode=require
```

Encrypt the file in place with SOPS:

```bash
sops --encrypt --in-place clusters/my-cluster/secrets/database-credentials.yaml
```

The file now looks like this (values encrypted, keys visible):

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: database-credentials
  namespace: my-app
type: Opaque
stringData:
  DB_HOST: ENC[AES256_GCM,data:k8TnW2R3bQ==,iv:...,tag:...,type:str]
  DB_PORT: ENC[AES256_GCM,data:NjQzMg==,iv:...,tag:...,type:str]
  DB_NAME: ENC[AES256_GCM,data:bXlhcHBfcHJv,iv:...,tag:...,type:str]
  DB_USER: ENC[AES256_GCM,data:bXlhcHBfdXNl,iv:...,tag:...,type:str]
  DB_PASSWORD: ENC[AES256_GCM,data:c3VwZXItc2VjcmV0,iv:...,tag:...,type:str]
  DB_SSL_MODE: ENC[AES256_GCM,data:cmVxdWlyZQ==,iv:...,tag:...,type:str]
  DATABASE_URL: ENC[AES256_GCM,data:cG9zdGdyZXNxbDov,iv:...,tag:...,type:str]
sops:
  age:
    - recipient: age1ql3z7hjy54pw3hyww5ayyfg7zqgvc7w3j2elw8zmrj2kg5sfn9aqmcac8p
      enc: |
        -----BEGIN AGE ENCRYPTED FILE-----
        ...
        -----END AGE ENCRYPTED FILE-----
  lastmodified: "2026-03-05T10:00:00Z"
  version: 3.8.1
```

## Step 4: Configure Flux to Decrypt SOPS Secrets

Tell the Flux Kustomization to use SOPS decryption by referencing the age key secret:

```yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: my-app-secrets
  namespace: flux-system
spec:
  interval: 10m
  sourceRef:
    kind: GitRepository
    name: flux-system
  path: ./clusters/my-cluster/secrets
  prune: true
  decryption:
    provider: sops
    secretRef:
      name: sops-age
```

The `decryption` block tells Flux to use SOPS with the age key stored in the `sops-age` secret. When Flux reconciles this Kustomization, it decrypts the secret values before applying the Kubernetes Secret to the cluster.

## Step 5: Reference Credentials in Your Application

Your application deployment can now reference the database credentials:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-app
  namespace: my-app
spec:
  template:
    spec:
      containers:
        - name: my-app
          image: my-app:latest
          envFrom:
            - secretRef:
                name: database-credentials
```

Or reference individual keys:

```yaml
env:
  - name: DATABASE_URL
    valueFrom:
      secretKeyRef:
        name: database-credentials
        key: DATABASE_URL
```

## Step 6: Rotating Database Credentials

To rotate credentials, decrypt the file locally, update the values, and re-encrypt:

```bash
# Decrypt for editing
sops clusters/my-cluster/secrets/database-credentials.yaml

# Or decrypt in place, edit, then re-encrypt
sops --decrypt --in-place clusters/my-cluster/secrets/database-credentials.yaml
# Edit the file with new credentials
sops --encrypt --in-place clusters/my-cluster/secrets/database-credentials.yaml
```

Commit and push the changes. Flux will automatically reconcile and update the Kubernetes Secret with the new credentials.

## Using Cloud KMS Instead of age

For production environments, use a cloud KMS provider. Update your `.sops.yaml`:

```yaml
creation_rules:
  - path_regex: clusters/.*/secrets/.*\.yaml$
    kms: arn:aws:kms:us-east-1:123456789:key/your-key-id
```

Configure Flux with the appropriate IAM credentials. For AWS, use IRSA (IAM Roles for Service Accounts) on the kustomize-controller service account.

## Summary

SOPS and Flux CD together provide a secure way to store database credentials in Git. SOPS encrypts the sensitive values while keeping the YAML structure readable, and Flux decrypts them automatically during reconciliation. This approach keeps your entire configuration in Git, supports credential rotation through standard Git workflows, and works with multiple encryption providers including age, AWS KMS, Azure Key Vault, and GCP KMS.
