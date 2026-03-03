# How to Handle Environment-Specific Secrets in ArgoCD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: ArgoCD, GitOps, Kubernetes, Secrets Management, Security

Description: Learn how to manage environment-specific secrets across dev, staging, and production environments in ArgoCD using Sealed Secrets, External Secrets, and Vault.

---

Secrets are the trickiest part of GitOps. You want everything in Git, but storing plaintext database passwords, API keys, and TLS certificates in a repository is a security disaster. The challenge gets harder when each environment needs different secrets - dev uses a test database, staging uses a staging API key, and production uses the real credentials. This guide covers practical approaches to handling environment-specific secrets in ArgoCD while keeping your Git repository secure.

## The Problem with Secrets in GitOps

ArgoCD follows the GitOps principle that the desired state of your cluster lives in Git. But Kubernetes Secrets are just base64-encoded, not encrypted. Committing them to Git exposes sensitive data to anyone with repository access. You need a solution that lets you store encrypted or referenced secrets in Git while providing the actual values at deploy time.

## Approach 1: Sealed Secrets with Per-Environment Keys

Bitnami Sealed Secrets encrypts secrets with a public key, and only the Sealed Secrets controller in the cluster can decrypt them. Each environment can use different encryption keys.

Install Sealed Secrets in each cluster:

```bash
# Install the controller
helm install sealed-secrets sealed-secrets/sealed-secrets \
  --namespace kube-system
```

Create environment-specific sealed secrets:

```bash
# Fetch the public key for the staging cluster
kubeseal --fetch-cert \
  --controller-namespace kube-system \
  --controller-name sealed-secrets \
  > staging-pub-cert.pem

# Create a sealed secret for staging
kubectl create secret generic my-app-secrets \
  --namespace staging \
  --from-literal=DATABASE_URL='postgres://staging-user:staging-pass@staging-db:5432/myapp' \
  --from-literal=API_KEY='staging-api-key-12345' \
  --dry-run=client -o yaml | \
  kubeseal --cert staging-pub-cert.pem -o yaml > staging-sealed-secret.yaml
```

The resulting SealedSecret can safely live in Git:

```yaml
# overlays/staging/sealed-secret.yaml
apiVersion: bitnami.com/v1alpha1
kind: SealedSecret
metadata:
  name: my-app-secrets
  namespace: staging
spec:
  encryptedData:
    DATABASE_URL: AgBy3i4OJSWK+PiTySYZZA9rO...
    API_KEY: AgCtr5KjPQz8KmU7xL...
  template:
    metadata:
      name: my-app-secrets
      namespace: staging
```

Repeat for each environment with that environment's public key:

```bash
# Production sealed secret
kubectl create secret generic my-app-secrets \
  --namespace production \
  --from-literal=DATABASE_URL='postgres://prod-user:prod-pass@prod-db:5432/myapp' \
  --from-literal=API_KEY='prod-api-key-real-67890' \
  --dry-run=client -o yaml | \
  kubeseal --cert production-pub-cert.pem -o yaml > production-sealed-secret.yaml
```

Your directory structure includes the sealed secrets per environment:

```text
overlays/
  dev/
    kustomization.yaml
    sealed-secret.yaml       # Dev secrets
  staging/
    kustomization.yaml
    sealed-secret.yaml       # Staging secrets
  production/
    kustomization.yaml
    sealed-secret.yaml       # Production secrets
```

Reference the sealed secret in your Kustomization:

```yaml
# overlays/staging/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - ../../base
  - sealed-secret.yaml
namespace: staging
```

## Approach 2: External Secrets Operator

External Secrets Operator (ESO) syncs secrets from external providers like AWS Secrets Manager, HashiCorp Vault, Azure Key Vault, or Google Secret Manager into Kubernetes Secrets. Each environment points to different secret paths.

Install ESO:

```bash
helm install external-secrets external-secrets/external-secrets \
  --namespace external-secrets \
  --create-namespace
```

Create a SecretStore for each environment:

```yaml
# overlays/staging/secret-store.yaml
apiVersion: external-secrets.io/v1beta1
kind: SecretStore
metadata:
  name: aws-secret-store
  namespace: staging
spec:
  provider:
    aws:
      service: SecretsManager
      region: us-east-1
      auth:
        secretRef:
          accessKeyIDSecretRef:
            name: aws-credentials
            key: access-key-id
          secretAccessKeySecretRef:
            name: aws-credentials
            key: secret-access-key
```

Create ExternalSecrets that reference environment-specific paths:

```yaml
# overlays/staging/external-secret.yaml
apiVersion: external-secrets.io/v1beta1
kind: ExternalSecret
metadata:
  name: my-app-secrets
  namespace: staging
spec:
  refreshInterval: 5m
  secretStoreRef:
    name: aws-secret-store
    kind: SecretStore
  target:
    name: my-app-secrets
    creationPolicy: Owner
  data:
    - secretKey: DATABASE_URL
      remoteRef:
        key: staging/my-app/database-url     # Staging path
    - secretKey: API_KEY
      remoteRef:
        key: staging/my-app/api-key           # Staging path
```

```yaml
# overlays/production/external-secret.yaml
apiVersion: external-secrets.io/v1beta1
kind: ExternalSecret
metadata:
  name: my-app-secrets
  namespace: production
spec:
  refreshInterval: 5m
  secretStoreRef:
    name: aws-secret-store
    kind: SecretStore
  target:
    name: my-app-secrets
    creationPolicy: Owner
  data:
    - secretKey: DATABASE_URL
      remoteRef:
        key: production/my-app/database-url   # Production path
    - secretKey: API_KEY
      remoteRef:
        key: production/my-app/api-key         # Production path
```

The ExternalSecret manifests are safe to store in Git because they only contain references, not actual secret values.

## Approach 3: HashiCorp Vault with ArgoCD Vault Plugin

The ArgoCD Vault Plugin (AVP) replaces placeholders in your manifests with values from Vault at sync time:

```yaml
# base/secret.yaml - with Vault placeholders
apiVersion: v1
kind: Secret
metadata:
  name: my-app-secrets
  annotations:
    avp.kubernetes.io/path: "secret/data/<environment>/my-app"
type: Opaque
stringData:
  DATABASE_URL: <DATABASE_URL>
  API_KEY: <API_KEY>
```

Configure ArgoCD to use the Vault plugin:

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: my-app-staging
  namespace: argocd
spec:
  source:
    repoURL: https://github.com/myorg/app-config.git
    path: overlays/staging
    plugin:
      name: argocd-vault-plugin-kustomize
      env:
        - name: AVP_TYPE
          value: vault
        - name: VAULT_ADDR
          value: https://vault.myorg.com
        - name: AVP_AUTH_TYPE
          value: k8s
```

Store secrets in Vault under environment-specific paths:

```bash
# Store staging secrets
vault kv put secret/staging/my-app \
  DATABASE_URL='postgres://staging-user:staging-pass@staging-db:5432/myapp' \
  API_KEY='staging-key-12345'

# Store production secrets
vault kv put secret/production/my-app \
  DATABASE_URL='postgres://prod-user:prod-pass@prod-db:5432/myapp' \
  API_KEY='prod-key-67890'
```

## Using Kustomize to Parameterize Secret Paths

You can use Kustomize patches to set environment-specific paths in your ExternalSecret resources:

```yaml
# base/external-secret.yaml
apiVersion: external-secrets.io/v1beta1
kind: ExternalSecret
metadata:
  name: my-app-secrets
spec:
  refreshInterval: 5m
  secretStoreRef:
    name: aws-secret-store
    kind: SecretStore
  target:
    name: my-app-secrets
  data:
    - secretKey: DATABASE_URL
      remoteRef:
        key: ENVIRONMENT/my-app/database-url
```

```yaml
# overlays/production/secret-path-patch.yaml
apiVersion: external-secrets.io/v1beta1
kind: ExternalSecret
metadata:
  name: my-app-secrets
spec:
  data:
    - secretKey: DATABASE_URL
      remoteRef:
        key: production/my-app/database-url
    - secretKey: API_KEY
      remoteRef:
        key: production/my-app/api-key
```

## Secret Rotation Across Environments

When rotating secrets, update one environment at a time and verify the application is healthy before proceeding:

```bash
# 1. Rotate in dev first
vault kv put secret/dev/my-app DATABASE_URL='new-connection-string'
# Wait for ESO to sync (based on refreshInterval)
# Verify dev is healthy

# 2. Promote to staging
vault kv put secret/staging/my-app DATABASE_URL='new-connection-string'
# Verify staging is healthy

# 3. Promote to production
vault kv put secret/production/my-app DATABASE_URL='new-connection-string'
```

## Best Practices

Never store plaintext secrets in Git, even temporarily. Git history preserves everything, and removing secrets after the fact requires rewriting history.

Use different secret values for each environment. Never share database credentials between staging and production. If staging is compromised, production should not be affected.

Set appropriate refresh intervals on ExternalSecrets. Too frequent refreshing adds load to your secret store. Too infrequent means rotated secrets take longer to propagate. Five minutes is a reasonable default.

Audit secret access. Use Vault audit logs or cloud provider logging to track who accessed which secrets and when.

For a detailed walkthrough of managing secrets with Sealed Secrets in ArgoCD, see our post on [ArgoCD Secrets with Sealed Secrets](https://oneuptime.com/blog/post/2026-02-26-argocd-environment-specific-configmaps/view).

The right approach depends on your infrastructure. Sealed Secrets is simplest but requires re-encryption when rotating. External Secrets Operator works well with cloud-native secret stores. Vault provides the most features but adds operational complexity. Pick the approach that matches your team's capabilities and security requirements.
