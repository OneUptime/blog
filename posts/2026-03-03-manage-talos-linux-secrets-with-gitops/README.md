# How to Manage Talos Linux Secrets with GitOps

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, GitOps, Secrets Management, Kubernetes, SOPS, Sealed Secrets, Vault

Description: Securely manage Kubernetes secrets on Talos Linux using GitOps with SOPS, Sealed Secrets, and External Secrets Operator.

---

The biggest challenge with GitOps is secrets. You want everything in Git for version control and auditability, but you cannot put passwords, API keys, and TLS certificates in a public or even private repository in plaintext. On Talos Linux, where the entire infrastructure is managed declaratively, you need a way to include secrets in your GitOps workflow without compromising security. This guide covers three approaches: Mozilla SOPS, Bitnami Sealed Secrets, and the External Secrets Operator. Each has different trade-offs, and we will help you pick the right one for your situation.

## The Secret Management Problem

In a GitOps workflow, your Git repository is the source of truth for everything in your cluster. But Kubernetes Secrets are base64-encoded, not encrypted. If you commit a Secret manifest to Git, anyone with repository access can decode it. This is not acceptable for production systems.

You need a solution that lets you:

- Store encrypted secrets in Git alongside your other manifests
- Decrypt secrets automatically when they are applied to the cluster
- Rotate secrets without manual intervention
- Audit who accessed or changed secrets
- Integrate with existing secret stores (AWS Secrets Manager, HashiCorp Vault, etc.)

## Option 1: Mozilla SOPS with Flux CD

SOPS (Secrets OPerationS) encrypts specific values in YAML files while leaving the structure readable. Flux CD has built-in SOPS support, making this the most straightforward option for Flux users.

### Step 1: Install SOPS and Set Up Encryption Keys

```bash
# Install SOPS
brew install sops  # macOS
# or
curl -LO https://github.com/getsops/sops/releases/latest/download/sops-v3-linux-amd64
chmod +x sops-v3-linux-amd64 && sudo mv sops-v3-linux-amd64 /usr/local/bin/sops

# Install age for encryption (simpler alternative to PGP)
brew install age  # macOS
# or
curl -LO https://github.com/FiloSottile/age/releases/latest/download/age-v1-linux-amd64.tar.gz
tar xf age-v1-linux-amd64.tar.gz && sudo mv age/age /usr/local/bin/

# Generate an age key pair
age-keygen -o age.key
# Output: public key: age1xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

Save the public key for encryption. The private key stays secure and goes into the cluster.

### Step 2: Configure SOPS

Create a `.sops.yaml` configuration file at the root of your Git repository:

```yaml
# .sops.yaml
creation_rules:
  # Encrypt all secret files in the cluster directories
  - path_regex: clusters/.*/secrets/.*\.yaml$
    encrypted_regex: ^(data|stringData)$
    age: age1xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
  # Encrypt Talos machine secrets
  - path_regex: .*talos-secrets.*\.yaml$
    age: age1xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

### Step 3: Encrypt Secrets

Create a Kubernetes Secret and encrypt it with SOPS:

```yaml
# clusters/production/secrets/database-credentials.yaml (before encryption)
apiVersion: v1
kind: Secret
metadata:
  name: database-credentials
  namespace: default
type: Opaque
stringData:
  username: db_admin
  password: super-secret-password-123
  connection-string: "postgresql://db_admin:super-secret-password-123@postgres:5432/mydb"
```

Encrypt the file:

```bash
sops --encrypt --in-place clusters/production/secrets/database-credentials.yaml
```

After encryption, the file looks like:

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: database-credentials
  namespace: default
type: Opaque
stringData:
  username: ENC[AES256_GCM,data:xxxxxxx,iv:xxx,tag:xxx,type:str]
  password: ENC[AES256_GCM,data:xxxxxxxxxxxxxxx,iv:xxx,tag:xxx,type:str]
  connection-string: ENC[AES256_GCM,data:xxxxxxxxxxxxxxxxxxxxxxxxx,iv:xxx,tag:xxx,type:str]
sops:
  age:
    - recipient: age1xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
      enc: |
        -----BEGIN AGE ENCRYPTED FILE-----
        ...
        -----END AGE ENCRYPTED FILE-----
```

The structure is visible (you can see the key names) but the values are encrypted.

### Step 4: Configure Flux to Decrypt

Create a Kubernetes Secret with the age private key in your cluster:

```bash
# Create the secret containing the decryption key
kubectl create secret generic sops-age \
  --namespace=flux-system \
  --from-file=age.agekey=age.key
```

Update your Flux Kustomization to use SOPS decryption:

```yaml
# clusters/production/secrets-kustomization.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: cluster-secrets
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
      name: sops-age
```

Now when Flux syncs, it automatically decrypts the SOPS-encrypted files before applying them to the cluster.

### Step 5: Edit Encrypted Secrets

To modify an encrypted secret:

```bash
# This opens the decrypted content in your editor
sops clusters/production/secrets/database-credentials.yaml

# Make your changes, save, and the file is re-encrypted automatically
# Commit the encrypted file
git add clusters/production/secrets/database-credentials.yaml
git commit -m "Rotate database password"
git push
```

## Option 2: Bitnami Sealed Secrets

Sealed Secrets takes a different approach. You encrypt secrets client-side using a public key, and a controller in the cluster decrypts them using the corresponding private key.

### Step 1: Install the Sealed Secrets Controller

```bash
helm repo add sealed-secrets https://bitnami-labs.github.io/sealed-secrets
helm repo update

helm install sealed-secrets sealed-secrets/sealed-secrets \
  --namespace kube-system \
  --set fullnameOverride=sealed-secrets-controller
```

### Step 2: Install kubeseal CLI

```bash
# macOS
brew install kubeseal

# Linux
curl -LO https://github.com/bitnami-labs/sealed-secrets/releases/latest/download/kubeseal-linux-amd64
chmod +x kubeseal-linux-amd64 && sudo mv kubeseal-linux-amd64 /usr/local/bin/kubeseal
```

### Step 3: Create Sealed Secrets

```bash
# Create a regular Secret manifest (do not apply this directly)
cat > /tmp/database-secret.yaml <<EOF
apiVersion: v1
kind: Secret
metadata:
  name: database-credentials
  namespace: default
type: Opaque
stringData:
  username: db_admin
  password: super-secret-password-123
EOF

# Seal the secret
kubeseal --format yaml < /tmp/database-secret.yaml > clusters/production/secrets/database-credentials-sealed.yaml

# Delete the plaintext file
rm /tmp/database-secret.yaml
```

The sealed secret looks like:

```yaml
apiVersion: bitnami.com/v1alpha1
kind: SealedSecret
metadata:
  name: database-credentials
  namespace: default
spec:
  encryptedData:
    username: AgBy3i4OJSWK+PiTySYZZA9rO43cGDEq...
    password: AgBy3i4OJSWK+PiTySYZZA9rO43cGDEq...
  template:
    metadata:
      name: database-credentials
      namespace: default
    type: Opaque
```

Commit this safely to Git. The Sealed Secrets controller in the cluster will decrypt it and create the regular Kubernetes Secret.

### Step 4: Manage Key Rotation

The Sealed Secrets controller generates new key pairs periodically. Back up the keys:

```bash
# Backup the sealing key
kubectl get secret -n kube-system -l sealedsecrets.bitnami.com/sealed-secrets-key \
  -o yaml > sealed-secrets-master-key.yaml

# Store this backup securely (NOT in Git)
```

## Option 3: External Secrets Operator

The External Secrets Operator syncs secrets from external secret stores (AWS Secrets Manager, HashiCorp Vault, Azure Key Vault) into Kubernetes Secrets. This is the best option when you already have a centralized secret management system.

### Step 1: Install the External Secrets Operator

```bash
helm repo add external-secrets https://charts.external-secrets.io
helm repo update

helm install external-secrets external-secrets/external-secrets \
  --namespace external-secrets \
  --create-namespace
```

### Step 2: Configure a Secret Store

For AWS Secrets Manager:

```yaml
# aws-secret-store.yaml
apiVersion: external-secrets.io/v1beta1
kind: ClusterSecretStore
metadata:
  name: aws-secrets-manager
spec:
  provider:
    aws:
      service: SecretsManager
      region: us-east-1
      auth:
        secretRef:
          accessKeyIDSecretRef:
            name: aws-credentials
            namespace: external-secrets
            key: access-key-id
          secretAccessKeySecretRef:
            name: aws-credentials
            namespace: external-secrets
            key: secret-access-key
```

For HashiCorp Vault:

```yaml
# vault-secret-store.yaml
apiVersion: external-secrets.io/v1beta1
kind: ClusterSecretStore
metadata:
  name: vault
spec:
  provider:
    vault:
      server: "https://vault.example.com"
      path: "secret"
      version: "v2"
      auth:
        kubernetes:
          mountPath: "kubernetes"
          role: "external-secrets"
          serviceAccountRef:
            name: external-secrets
            namespace: external-secrets
```

### Step 3: Create ExternalSecret Resources

```yaml
# clusters/production/secrets/database-external-secret.yaml
apiVersion: external-secrets.io/v1beta1
kind: ExternalSecret
metadata:
  name: database-credentials
  namespace: default
spec:
  refreshInterval: 1h
  secretStoreRef:
    name: aws-secrets-manager
    kind: ClusterSecretStore
  target:
    name: database-credentials
    creationPolicy: Owner
  data:
    - secretKey: username
      remoteRef:
        key: production/database
        property: username
    - secretKey: password
      remoteRef:
        key: production/database
        property: password
    - secretKey: connection-string
      remoteRef:
        key: production/database
        property: connection_string
```

This ExternalSecret resource can be safely committed to Git because it contains only references to secrets, not the secrets themselves. The External Secrets Operator fetches the actual values from AWS Secrets Manager and creates a regular Kubernetes Secret in the cluster.

### Step 4: Monitor Secret Sync Status

```bash
# Check ExternalSecret sync status
kubectl get externalsecrets -A

# Detailed status
kubectl describe externalsecret database-credentials -n default
```

## Choosing the Right Approach

| Feature | SOPS | Sealed Secrets | External Secrets |
|---------|------|----------------|-----------------|
| Secrets stored in | Git (encrypted) | Git (encrypted) | External store |
| Key management | Manual (age/PGP) | Controller-managed | External (Vault/AWS) |
| Secret rotation | Manual commit | Manual reseal | Automatic refresh |
| Complexity | Low | Medium | Medium-High |
| Best for | Small teams | Medium teams | Enterprises |
| External dependencies | None | None | Secret store required |

## Best Practices

1. **Never commit plaintext secrets** to Git, even temporarily. Use git-secrets or pre-commit hooks to prevent this.
2. **Rotate secrets regularly**. Automate this with External Secrets Operator's refresh interval.
3. **Limit secret access** with Kubernetes RBAC. Not every pod needs every secret.
4. **Audit secret access** by enabling Kubernetes audit logging for Secret resources.
5. **Back up encryption keys** for SOPS and Sealed Secrets. Without the key, encrypted secrets are lost forever.

```bash
# Install git-secrets to prevent accidental secret commits
git secrets --install
git secrets --register-aws  # Catches AWS credentials
```

## Conclusion

Managing secrets with GitOps on Talos Linux does not have to be a security compromise. SOPS with Flux gives you the simplest path to encrypted secrets in Git. Sealed Secrets provides controller-managed encryption without external dependencies. The External Secrets Operator integrates with enterprise secret stores for automatic rotation and centralized management. Pick the approach that matches your team's existing infrastructure and security requirements. Whatever you choose, the goal is the same: keep your secrets secure while maintaining the auditability and version control that GitOps provides.
