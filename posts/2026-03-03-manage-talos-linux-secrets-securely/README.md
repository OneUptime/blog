# How to Manage Talos Linux Secrets Securely

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Secrets Management, Security, Kubernetes, Best Practices

Description: Best practices and practical approaches for securely managing secrets in Talos Linux including machine configs, Kubernetes secrets, and external secret stores.

---

Secrets are everywhere in a Talos Linux cluster. The machine configuration contains certificates, encryption keys, and bootstrap tokens. Kubernetes stores application credentials, API keys, and database passwords. CI/CD pipelines hold deployment credentials. Managing all of these secrets securely is one of the most critical operational challenges for any Talos Linux cluster.

This guide covers the different types of secrets in a Talos Linux environment and practical approaches for keeping them safe.

## Types of Secrets in Talos Linux

### Machine Configuration Secrets

The Talos machine configuration contains sensitive data:

- Talos API CA certificate and private key
- Kubernetes CA certificate and private key
- etcd CA certificate and private key
- Bootstrap token
- Cluster secret
- AES-CBC encryption key for Kubernetes secrets

```yaml
# These are the sensitive fields in a machine config
machine:
  ca:
    crt: <sensitive>
    key: <highly-sensitive>
  token: <sensitive>
cluster:
  ca:
    crt: <sensitive>
    key: <highly-sensitive>
  secret: <highly-sensitive>
  etcd:
    ca:
      crt: <sensitive>
      key: <highly-sensitive>
  aescbcEncryptionSecret: <highly-sensitive>
```

### Kubernetes Secrets

Application secrets stored in Kubernetes:

- Database credentials
- API keys for external services
- TLS certificates for applications
- Docker registry credentials
- OAuth tokens

### Client Credentials

Credentials used by operators and CI/CD:

- talosconfig (Talos API client certificate and key)
- kubeconfig (Kubernetes API client certificate and key)
- CI/CD service account tokens

## Securing Machine Configuration Secrets

### Use talosctl gen secrets

Generate secrets separately from the machine configuration so they can be stored securely.

```bash
# Generate cluster secrets
talosctl gen secrets --output-file secrets.yaml

# Generate machine configs using the secrets
talosctl gen config my-cluster https://k8s.example.com:6443 \
  --with-secrets secrets.yaml \
  --output-dir configs/

# The secrets.yaml file contains all sensitive data
# Store it securely and separately from the configs
```

### Encrypt Secrets at Rest

Never store secrets in plain text files. Use encryption.

```bash
# Encrypt secrets with age
age-keygen -o key.txt
age -r $(cat key.txt | grep "public key:" | awk '{print $4}') \
  -o secrets.yaml.age \
  secrets.yaml

# Or encrypt with SOPS
sops --encrypt --age $(cat key.txt | grep "public key:" | awk '{print $4}') \
  secrets.yaml > secrets.yaml.enc

# Decrypt when needed
sops --decrypt secrets.yaml.enc > secrets.yaml
```

### Store Secrets in a Vault

For production environments, use a proper secrets management system.

```bash
# Store secrets in HashiCorp Vault
vault kv put secret/talos/production/secrets \
  secrets=@secrets.yaml

# Retrieve when needed
vault kv get -format=json secret/talos/production/secrets | \
  jq -r '.data.data.secrets' > secrets.yaml

# Store individual sensitive values
vault kv put secret/talos/production/ca \
  crt=@talos-ca.crt \
  key=@talos-ca.key
```

### Git-Encrypt Configuration Files

If you store configs in git (which you should for version control), encrypt the sensitive parts.

```bash
# Using SOPS with age for git-stored configs
# .sops.yaml in the repository root
cat > .sops.yaml <<EOF
creation_rules:
  - path_regex: .*secrets\.yaml$
    age: >-
      age1xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
  - path_regex: .*talosconfig.*
    age: >-
      age1xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
EOF

# Encrypt before committing
sops -e secrets.yaml > secrets.yaml.enc
git add secrets.yaml.enc
# Never commit secrets.yaml directly

# Add to .gitignore
echo "secrets.yaml" >> .gitignore
echo "*.key" >> .gitignore
echo "talosconfig" >> .gitignore
```

## Securing Kubernetes Secrets

### Enable Encryption at Rest

Configure Kubernetes to encrypt secrets in etcd.

```yaml
# Talos machine configuration
cluster:
  secretboxEncryptionSecret: "your-base64-encoded-32-byte-key"
```

Generate the encryption key:

```bash
# Generate a 32-byte encryption key
head -c 32 /dev/urandom | base64
```

### Use External Secret Stores

Instead of storing secrets directly in Kubernetes, use the External Secrets Operator to sync from external stores.

```bash
# Install External Secrets Operator
helm repo add external-secrets https://charts.external-secrets.io
helm install external-secrets external-secrets/external-secrets \
  --namespace external-secrets \
  --create-namespace
```

Configure a SecretStore:

```yaml
# vault-secret-store.yaml
apiVersion: external-secrets.io/v1beta1
kind: ClusterSecretStore
metadata:
  name: vault-store
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

Create ExternalSecrets that sync from Vault to Kubernetes:

```yaml
# database-external-secret.yaml
apiVersion: external-secrets.io/v1beta1
kind: ExternalSecret
metadata:
  name: database-credentials
  namespace: production
spec:
  refreshInterval: 1h
  secretStoreRef:
    name: vault-store
    kind: ClusterSecretStore
  target:
    name: database-credentials
    creationPolicy: Owner
  data:
    - secretKey: username
      remoteRef:
        key: secret/data/production/database
        property: username
    - secretKey: password
      remoteRef:
        key: secret/data/production/database
        property: password
```

### Use Sealed Secrets for GitOps

Sealed Secrets lets you safely store encrypted secrets in git.

```bash
# Install Sealed Secrets controller
helm repo add sealed-secrets https://bitnami-labs.github.io/sealed-secrets
helm install sealed-secrets sealed-secrets/sealed-secrets \
  --namespace kube-system

# Install kubeseal CLI
brew install kubeseal

# Create a sealed secret
kubectl create secret generic my-secret \
  --from-literal=password=super-secret \
  --dry-run=client -o yaml | \
  kubeseal --format yaml > sealed-secret.yaml

# This sealed-secret.yaml is safe to commit to git
git add sealed-secret.yaml
```

## Securing Client Credentials

### Rotate talosconfig Regularly

```bash
# Generate new client certificates periodically
openssl genrsa -out new-admin.key 4096
openssl req -new -key new-admin.key -out new-admin.csr \
  -subj "/O=os:admin/CN=admin-$(date +%Y%m%d)"

# Sign with the Talos CA
openssl x509 -req -in new-admin.csr \
  -CA talos-ca.crt -CAkey talos-ca.key \
  -CAcreateserial -out new-admin.crt -days 90

# Update talosconfig
# Keep the old config as backup until the new one is verified
```

### Use Short-Lived Credentials for CI/CD

```bash
# Generate a 24-hour certificate for CI/CD
openssl x509 -req -in ci-cd.csr \
  -CA talos-ca.crt -CAkey talos-ca.key \
  -CAcreateserial -out ci-cd.crt -days 1

# Create a temporary talosconfig
cat > ci-talosconfig.yaml <<EOF
context: ci
contexts:
  ci:
    endpoints:
      - 10.0.1.10
    ca: $(base64 -w0 talos-ca.crt)
    crt: $(base64 -w0 ci-cd.crt)
    key: $(base64 -w0 ci-cd.key)
EOF

# Use in CI/CD pipeline
export TALOSCONFIG=ci-talosconfig.yaml
talosctl -n 10.0.1.10 health
```

### Restrict kubeconfig Distribution

Do not give everyone cluster-admin kubeconfigs. Generate scoped configs.

```bash
# Generate a kubeconfig with limited permissions
# First, create the user certificate
openssl genrsa -out developer.key 4096
openssl req -new -key developer.key -out developer.csr \
  -subj "/CN=developer/O=dev-team"

# Sign with Kubernetes CA
openssl x509 -req -in developer.csr \
  -CA k8s-ca.crt -CAkey k8s-ca.key \
  -CAcreateserial -out developer.crt -days 90

# Create scoped kubeconfig
kubectl config set-cluster talos \
  --server=https://k8s.example.com:6443 \
  --certificate-authority=k8s-ca.crt \
  --embed-certs=true \
  --kubeconfig=developer-kubeconfig.yaml

kubectl config set-credentials developer \
  --client-certificate=developer.crt \
  --client-key=developer.key \
  --embed-certs=true \
  --kubeconfig=developer-kubeconfig.yaml

kubectl config set-context developer \
  --cluster=talos \
  --user=developer \
  --namespace=development \
  --kubeconfig=developer-kubeconfig.yaml
```

## Secrets Hygiene Checklist

Run through this checklist regularly:

```bash
#!/bin/bash
# secrets-hygiene-check.sh

echo "=== Secrets Hygiene Audit ==="

# Check for secrets in git history
echo "Checking for potential secrets in git..."
git log --all --diff-filter=A --name-only --pretty=format: | \
  grep -E "(secret|password|token|key|cred)" | sort -u | head -20

# Check for unencrypted secrets in the filesystem
echo ""
echo "Checking for unencrypted secret files..."
find . -name "*.key" -o -name "talosconfig" -o -name "secrets.yaml" | \
  grep -v ".enc" | grep -v ".age" | grep -v ".gitignore"

# Check Kubernetes secrets that are not from external sources
echo ""
echo "Kubernetes secrets not managed by External Secrets:"
kubectl get secrets --all-namespaces -o json | \
  jq -r '.items[] | select(.metadata.ownerReferences == null) |
    select(.type != "kubernetes.io/service-account-token") |
    "\(.metadata.namespace)/\(.metadata.name) type=\(.type)"' | head -20

echo ""
echo "=== Audit Complete ==="
```

## Conclusion

Secrets management in Talos Linux requires attention at multiple levels: machine configuration secrets, Kubernetes secrets, and client credentials. Use encryption for secrets at rest, external secret stores for production environments, short-lived credentials for automation, and strict access controls for who can access what. Never store plaintext secrets in git, rotate credentials regularly, and audit your secrets posture periodically. Good secrets management is not glamorous, but it is one of the most impactful things you can do for your cluster security.
