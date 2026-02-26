# ArgoCD Best Practices for Secret Management

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: ArgoCD, GitOps, Kubernetes, Secret Management, Security

Description: Learn ArgoCD secret management best practices including Sealed Secrets, External Secrets Operator, Vault integration, SOPS encryption, and strategies for keeping secrets out of Git.

---

The fundamental tension in GitOps is that everything should be in Git, but secrets should never be in Git. ArgoCD does not have built-in secret management - it syncs whatever is in your Git repository to Kubernetes. If you put plaintext secrets in Git, they end up in your Git history permanently, accessible to anyone with repo access.

This guide covers the best practices and tools for managing secrets in ArgoCD without compromising security.

## The golden rule: never store plaintext secrets in Git

Before diving into solutions, understand why this matters:

- Git history is permanent. Even if you delete a secret and push, it exists in every clone of the repo
- Git repositories are often backed up, mirrored, and shared across systems
- A single compromised developer machine can expose every secret in the repo
- Compliance frameworks (SOC2, PCI-DSS, HIPAA) explicitly prohibit storing credentials in version control

## Approach 1: Sealed Secrets (simplest)

Bitnami Sealed Secrets encrypts secrets client-side so only the cluster can decrypt them:

```bash
# Install the Sealed Secrets controller via ArgoCD
# manifests/sealed-secrets/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - https://github.com/bitnami-labs/sealed-secrets/releases/download/v0.27.0/controller.yaml
```

Create and seal a secret:

```bash
# Create a regular secret (locally, never committed)
kubectl create secret generic db-credentials \
  --from-literal=username=admin \
  --from-literal=password=supersecret \
  --dry-run=client -o yaml > /tmp/db-credentials.yaml

# Seal it - output is safe to commit to Git
kubeseal --format yaml < /tmp/db-credentials.yaml > manifests/my-app/sealed-db-credentials.yaml

# Delete the plaintext file
rm /tmp/db-credentials.yaml
```

The sealed secret YAML is safe to commit:

```yaml
apiVersion: bitnami.com/v1alpha1
kind: SealedSecret
metadata:
  name: db-credentials
  namespace: my-app
spec:
  encryptedData:
    username: AgBy3i4OJSWK+PiTySYZZA9rO...  # Encrypted
    password: AgBy3i4OJSWK+PiTySYZZA9rO...  # Encrypted
  template:
    metadata:
      name: db-credentials
      namespace: my-app
    type: Opaque
```

**Best practices for Sealed Secrets:**
- Back up the Sealed Secrets controller's key pair
- Rotate the encryption key regularly
- Use scope: strict (default) to prevent sealed secrets from being used in other namespaces
- Set up key rotation automation

```bash
# Backup the key pair - critical for disaster recovery
kubectl get secret -n kube-system -l sealedsecrets.bitnami.com/sealed-secrets-key \
  -o yaml > sealed-secrets-key-backup.yaml
# Store this backup in a secure vault, NOT in Git
```

## Approach 2: External Secrets Operator (most flexible)

External Secrets Operator (ESO) syncs secrets from external providers (AWS Secrets Manager, Vault, Azure Key Vault, GCP Secret Manager) into Kubernetes:

```yaml
# Install ESO via ArgoCD
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: external-secrets
  namespace: argocd
spec:
  source:
    repoURL: https://charts.external-secrets.io
    chart: external-secrets
    targetRevision: 0.10.0
  destination:
    server: https://kubernetes.default.svc
    namespace: external-secrets
```

Configure a SecretStore:

```yaml
# Connect to AWS Secrets Manager
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
        jwt:
          serviceAccountRef:
            name: external-secrets-sa
            namespace: external-secrets
```

Define ExternalSecrets in your Git repo (safe to commit - no secret values):

```yaml
apiVersion: external-secrets.io/v1beta1
kind: ExternalSecret
metadata:
  name: db-credentials
  namespace: my-app
spec:
  refreshInterval: 1h  # How often to sync from provider
  secretStoreRef:
    name: aws-secrets-manager
    kind: ClusterSecretStore
  target:
    name: db-credentials  # Kubernetes Secret to create
    creationPolicy: Owner
  data:
    - secretKey: username
      remoteRef:
        key: my-app/database
        property: username
    - secretKey: password
      remoteRef:
        key: my-app/database
        property: password
```

**Best practices for ESO:**
- Use ClusterSecretStore for organization-wide providers
- Set appropriate refresh intervals (not too frequent, not too slow)
- Configure secret rotation in your provider (AWS, Vault, etc.)
- Use IAM roles for authentication (IRSA on EKS, Workload Identity on GKE)

## Approach 3: HashiCorp Vault with ArgoCD Vault Plugin

For organizations already using Vault:

```yaml
# ArgoCD repo server with Vault plugin sidecar
apiVersion: apps/v1
kind: Deployment
metadata:
  name: argocd-repo-server
  namespace: argocd
spec:
  template:
    spec:
      containers:
        - name: argocd-repo-server
          # ... standard config
        - name: avp
          image: quay.io/argoproj-labs/argocd-vault-plugin:v1.17.0
          command: ["/var/run/argocd/argocd-cmp-server"]
          securityContext:
            runAsNonRoot: true
            runAsUser: 999
          volumeMounts:
            - name: plugins
              mountPath: /home/argocd/cmp-server/plugins
            - name: tmp
              mountPath: /tmp
```

Reference Vault secrets in your manifests:

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: db-credentials
  namespace: my-app
  annotations:
    avp.kubernetes.io/path: "secret/data/my-app/database"
type: Opaque
stringData:
  username: <username>  # Replaced by AVP with Vault value
  password: <password>  # Replaced by AVP with Vault value
```

## Approach 4: SOPS encrypted secrets

Mozilla SOPS encrypts specific values in YAML files while keeping keys readable:

```yaml
# Encrypted with SOPS - safe to commit
apiVersion: v1
kind: Secret
metadata:
  name: db-credentials
type: Opaque
stringData:
  username: ENC[AES256_GCM,data:aGVsbG8=,iv:...,tag:...,type:str]
  password: ENC[AES256_GCM,data:d29ybGQ=,iv:...,tag:...,type:str]
sops:
  kms:
    - arn: arn:aws:kms:us-east-1:123456789:key/abc-123
  encrypted_regex: ^(data|stringData)$
```

Use the KSOPS plugin with ArgoCD:

```yaml
# kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
generators:
  - secret-generator.yaml

# secret-generator.yaml
apiVersion: viaduct.ai/v1
kind: ksops
metadata:
  name: db-credentials
files:
  - secrets/db-credentials.enc.yaml
```

## Comparing approaches

| Feature | Sealed Secrets | External Secrets | Vault Plugin | SOPS |
|---------|---------------|-------------------|-------------|------|
| Setup complexity | Low | Medium | High | Medium |
| External dependencies | None | Secret provider | Vault | KMS |
| Secret rotation | Manual reseal | Automatic | Automatic | Manual |
| Audit trail | Git history | Provider logs | Vault audit | Git + KMS |
| Multi-cluster | Per-cluster keys | Shared provider | Shared Vault | Shared KMS |
| Best for | Small teams | Medium to large | Vault shops | Existing SOPS users |

## Handling ArgoCD's own secrets

ArgoCD stores sensitive data (repo credentials, cluster credentials, SSO configs) in Kubernetes Secrets:

```bash
# ArgoCD secrets in the argocd namespace
kubectl get secrets -n argocd -l app.kubernetes.io/part-of=argocd

# Critical secrets:
# argocd-secret - admin password, SSO config
# repo-* - Git repository credentials
# cluster-* - Remote cluster credentials
```

Protect ArgoCD's own secrets:

```yaml
# Use External Secrets for ArgoCD repo credentials
apiVersion: external-secrets.io/v1beta1
kind: ExternalSecret
metadata:
  name: repo-github-creds
  namespace: argocd
spec:
  secretStoreRef:
    name: aws-secrets-manager
    kind: ClusterSecretStore
  target:
    name: repo-github-creds
    template:
      metadata:
        labels:
          argocd.argoproj.io/secret-type: repository
      data:
        type: git
        url: https://github.com/myorg
        password: "{{ .github_token }}"
        username: not-used
  data:
    - secretKey: github_token
      remoteRef:
        key: argocd/github-token
```

## Ignore secret diffs in ArgoCD

Prevent ArgoCD from showing false diffs on secrets:

```yaml
spec:
  ignoreDifferences:
    - group: ""
      kind: Secret
      jsonPointers:
        - /data
    # Or for specific secrets only
    - group: ""
      kind: Secret
      name: auto-rotated-credentials
      jsonPointers:
        - /data
```

## Summary

ArgoCD secret management best practices come down to one principle: use a tool that keeps plaintext secrets out of Git while keeping secret references in Git. For small teams, start with Sealed Secrets for simplicity. For medium to large organizations, External Secrets Operator provides the best balance of flexibility and automation. For organizations with existing Vault infrastructure, the Vault plugin integrates naturally. Whichever approach you choose, protect ArgoCD's own secrets with the same rigor, set up secret rotation, and configure ignoreDifferences for automatically-rotated secrets to avoid false drift alerts.
