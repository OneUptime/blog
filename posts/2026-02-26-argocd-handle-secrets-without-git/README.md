# How to Handle Secrets Without Committing Them to Git

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: ArgoCD, GitOps, Kubernetes, Secrets, Security

Description: Compare practical approaches for managing Kubernetes secrets in ArgoCD GitOps workflows without storing sensitive data in Git repositories.

---

The biggest tension in GitOps is secrets management. Git should be the source of truth for everything in your cluster, but you obviously cannot commit database passwords, API keys, and TLS certificates to a Git repository. So how do you manage secrets in an ArgoCD workflow?

This is probably the most asked question in the ArgoCD community, and there are several good solutions. Let me walk through each one with honest pros and cons.

## The Options at a Glance

| Approach | Complexity | Security | GitOps Purity |
|----------|-----------|----------|---------------|
| Sealed Secrets | Low | Good | High |
| External Secrets Operator | Medium | Excellent | High |
| Vault with ArgoCD Vault Plugin | High | Excellent | High |
| SOPS with Age/GPG | Low | Good | High |
| Kubernetes External Secrets | Medium | Good | Medium |
| Just use cloud-native secrets | Low | Good | Low |

## Option 1: Bitnami Sealed Secrets

Sealed Secrets encrypts your secrets so they can be safely stored in Git. Only the Sealed Secrets controller running in your cluster can decrypt them.

### How It Works

```mermaid
flowchart LR
    A[Secret] --> B[kubeseal encrypts]
    B --> C[SealedSecret in Git]
    C --> D[ArgoCD deploys]
    D --> E[Controller decrypts]
    E --> F[Kubernetes Secret]
```

### Setup

```bash
# Install the Sealed Secrets controller
helm repo add sealed-secrets https://bitnami-labs.github.io/sealed-secrets
helm install sealed-secrets sealed-secrets/sealed-secrets -n kube-system

# Install the kubeseal CLI
brew install kubeseal
```

### Usage

```bash
# Create a regular secret
kubectl create secret generic db-creds \
  --from-literal=password=mysecretpassword \
  --dry-run=client -o yaml > secret.yaml

# Encrypt it with kubeseal
kubeseal --format yaml < secret.yaml > sealed-secret.yaml

# Commit the SealedSecret to Git
git add sealed-secret.yaml
git commit -m "Add encrypted database credentials"
```

The SealedSecret looks like this:

```yaml
apiVersion: bitnami.com/v1alpha1
kind: SealedSecret
metadata:
  name: db-creds
  namespace: myapp
spec:
  encryptedData:
    password: AgA3+kEJ...long-encrypted-string...
```

**Pros:**
- Simple to understand and use
- Secrets are encrypted in Git (truly GitOps)
- No external dependencies
- Works offline

**Cons:**
- Secrets are tied to a specific cluster (you cannot unseal them elsewhere)
- Key rotation requires re-encrypting all secrets
- No central secret management - secrets are scattered across repos
- Cannot integrate with existing secret stores (Vault, AWS Secrets Manager)

## Option 2: External Secrets Operator (ESO)

ESO syncs secrets from external secret management systems into Kubernetes. It works with AWS Secrets Manager, Azure Key Vault, Google Secret Manager, HashiCorp Vault, and more.

### Setup

```bash
helm repo add external-secrets https://charts.external-secrets.io
helm install external-secrets external-secrets/external-secrets -n external-secrets --create-namespace
```

### Usage

First, create a SecretStore that points to your secret provider:

```yaml
apiVersion: external-secrets.io/v1beta1
kind: SecretStore
metadata:
  name: aws-secrets
  namespace: myapp
spec:
  provider:
    aws:
      service: SecretsManager
      region: us-east-1
      auth:
        jwt:
          serviceAccountRef:
            name: external-secrets-sa
```

Then create an ExternalSecret that references secrets from the store:

```yaml
apiVersion: external-secrets.io/v1beta1
kind: ExternalSecret
metadata:
  name: db-creds
  namespace: myapp
spec:
  refreshInterval: 1h
  secretStoreRef:
    name: aws-secrets
    kind: SecretStore
  target:
    name: db-creds
    creationPolicy: Owner
  data:
    - secretKey: password
      remoteRef:
        key: myapp/production/db-password
    - secretKey: username
      remoteRef:
        key: myapp/production/db-username
```

This ExternalSecret manifest is safe to commit to Git because it only contains references, not actual secret values. ArgoCD deploys it, and ESO creates the actual Kubernetes Secret.

**Pros:**
- Integrates with existing enterprise secret management
- Automatic secret rotation
- Central management of secrets
- Safe to commit to Git (only references, no values)
- Works across clusters

**Cons:**
- Depends on an external secret management service
- More moving parts (ESO operator + secret store)
- Latency in secret sync (configurable refresh interval)
- Need to manage the SecretStore credentials

## Option 3: SOPS with Age or GPG

SOPS (Secrets OPerationS) encrypts values within YAML/JSON files. Combined with the KSOPS Kustomize plugin or ArgoCD's native SOPS support, it integrates well with ArgoCD.

### Setup

```bash
# Install SOPS
brew install sops

# Generate an Age key
age-keygen -o age-key.txt
```

### Usage

Create a SOPS config file:

```yaml
# .sops.yaml in your repo root
creation_rules:
  - path_regex: .*secrets.*\.yaml$
    age: age1abc...your-public-key...
```

Encrypt a secret file:

```bash
# Create the secret file
cat > secrets.yaml << 'EOF'
apiVersion: v1
kind: Secret
metadata:
  name: db-creds
  namespace: myapp
type: Opaque
stringData:
  password: mysecretpassword
  username: dbadmin
EOF

# Encrypt it with SOPS
sops -e secrets.yaml > secrets.enc.yaml
```

The encrypted file has the values encrypted but the structure visible:

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: db-creds
  namespace: myapp
type: Opaque
stringData:
  password: ENC[AES256_GCM,data:abc123...,type:str]
  username: ENC[AES256_GCM,data:def456...,type:str]
sops:
  age:
    - recipient: age1abc...
      enc: |
        -----BEGIN AGE ENCRYPTED FILE-----
        ...
        -----END AGE ENCRYPTED FILE-----
```

Configure ArgoCD to decrypt with SOPS using KSOPS or the Helm secrets plugin.

**Pros:**
- No external service dependency
- File-level encryption visible in Git
- Works with any text editor
- Can encrypt specific fields, leaving structure visible
- Supports multiple key holders

**Cons:**
- Key management is your responsibility
- Need to install decryption plugin in ArgoCD repo server
- No automatic rotation
- Encryption/decryption adds friction to the workflow

## Option 4: ArgoCD Vault Plugin (AVP)

The ArgoCD Vault Plugin reads secrets from HashiCorp Vault (or other sources) and injects them into manifests during ArgoCD's manifest generation phase.

### Usage

Your manifest uses placeholders:

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: db-creds
  namespace: myapp
  annotations:
    avp.kubernetes.io/path: "secret/data/myapp/production"
type: Opaque
stringData:
  password: <password>
  username: <username>
```

ArgoCD replaces `<password>` and `<username>` with values from Vault during sync. The manifest in Git never contains actual secret values.

**Pros:**
- Leverages Vault's full feature set (rotation, audit, dynamic secrets)
- Placeholders in Git are self-documenting
- Works with any Vault backend

**Cons:**
- Complex setup (Vault + AVP plugin + ArgoCD configuration)
- Vault becomes a critical dependency for deployments
- Requires Vault token management for ArgoCD

## Option 5: Cloud-Native Secret Management

If you are all-in on a single cloud provider, use their native secret management without any Kubernetes operator:

```yaml
# AWS: Use IRSA to let pods access Secrets Manager directly
apiVersion: apps/v1
kind: Deployment
metadata:
  name: myapp
spec:
  template:
    spec:
      serviceAccountName: myapp-sa  # SA with IRSA for Secrets Manager
      containers:
        - name: myapp
          env:
            - name: DATABASE_URL
              value: "aws-secretsmanager://myapp/production/db-url"
```

Your application reads secrets from the cloud provider at runtime. ArgoCD only manages the deployment, not the secrets.

**Pros:** Simplest approach. No extra operators.
**Cons:** Application code needs cloud SDK integration. Not pure GitOps.

## My Recommendation

For most teams:

1. **Starting out / small team:** Use Sealed Secrets. It is simple, works offline, and is fully GitOps.

2. **Medium teams with cloud infrastructure:** Use External Secrets Operator. It integrates with your existing secret management and scales well.

3. **Enterprise with HashiCorp Vault:** Use External Secrets Operator with Vault backend. AVP works too but ESO is more flexible.

4. **Teams that want encrypted secrets in Git:** Use SOPS with Age. It provides a good balance of simplicity and security.

The choice depends on your existing infrastructure. If you already have Vault or AWS Secrets Manager, use ESO to bridge it to Kubernetes. If you are starting fresh, Sealed Secrets is the quickest path forward.

Whatever you choose, the principle is the same: never commit plaintext secrets to Git. Every option above lets you commit something to Git (encrypted secrets, references, or placeholders) without exposing sensitive values.
