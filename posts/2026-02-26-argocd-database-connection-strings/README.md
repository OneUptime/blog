# How to Manage Database Connection Strings with ArgoCD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: ArgoCD, GitOps, Kubernetes, Database, Secrets Management

Description: Learn how to securely manage database connection strings in ArgoCD deployments using Sealed Secrets, External Secrets Operator, and Vault integration for GitOps-friendly secret handling.

---

Database connection strings are one of the most sensitive pieces of configuration in any application. They contain hostnames, credentials, and database names that must be managed securely while still fitting into a GitOps workflow. This guide covers multiple approaches to managing database connection strings with ArgoCD, from basic Sealed Secrets to advanced Vault integration.

## The Challenge: Secrets in GitOps

GitOps requires everything to be in Git, but you cannot store plain-text database passwords in a repository. You need a way to:

1. Reference database credentials in your Kubernetes manifests
2. Store the encrypted or referenced version in Git
3. Have ArgoCD sync the decrypted credentials to your cluster

```mermaid
graph LR
    A[Plain Secret] --> B{Encryption Method}
    B --> C[Sealed Secrets]
    B --> D[External Secrets]
    B --> E[SOPS]
    C --> F[Git Repository]
    D --> F
    E --> F
    F --> G[ArgoCD Sync]
    G --> H[Kubernetes Secret]
    H --> I[Application Pod]
```

## Method 1: Sealed Secrets

Sealed Secrets encrypts Kubernetes Secrets using a cluster-specific key. The encrypted version is safe to store in Git.

### Deploy the Sealed Secrets Controller

```yaml
# applications/sealed-secrets.yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: sealed-secrets
  namespace: argocd
spec:
  project: infrastructure
  source:
    repoURL: https://bitnami-labs.github.io/sealed-secrets
    chart: sealed-secrets
    targetRevision: 2.15.0
    helm:
      values: |
        fullnameOverride: sealed-secrets-controller
  destination:
    server: https://kubernetes.default.svc
    namespace: kube-system
  syncPolicy:
    automated:
      selfHeal: true
```

### Create a Sealed Secret for Database Credentials

```bash
# Create the plain secret first (locally, never commit this)
kubectl create secret generic db-credentials \
  --from-literal=url="postgres://app:MySecretP4ss@postgres.database.svc:5432/mydb?sslmode=require" \
  --from-literal=username="app" \
  --from-literal=password="MySecretP4ss" \
  --from-literal=host="postgres.database.svc" \
  --from-literal=port="5432" \
  --from-literal=database="mydb" \
  --dry-run=client -o yaml | \
  kubeseal --format yaml > sealed-db-credentials.yaml
```

The resulting Sealed Secret is safe to commit:

```yaml
# secrets/sealed-db-credentials.yaml
apiVersion: bitnami.com/v1alpha1
kind: SealedSecret
metadata:
  name: db-credentials
  namespace: production
spec:
  encryptedData:
    url: AgBY2k...long encrypted string...
    username: AgCx9p...long encrypted string...
    password: AgDf3m...long encrypted string...
    host: AgEh7q...long encrypted string...
    port: AgFj9s...long encrypted string...
    database: AgGl1u...long encrypted string...
  template:
    metadata:
      name: db-credentials
      namespace: production
      labels:
        app: myapp
        secret-type: database
```

### Reference in Deployment

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: myapp
spec:
  template:
    spec:
      containers:
        - name: app
          image: registry.example.com/myapp:v2.1.0
          env:
            - name: DATABASE_URL
              valueFrom:
                secretKeyRef:
                  name: db-credentials
                  key: url
            # Or individual components
            - name: DB_HOST
              valueFrom:
                secretKeyRef:
                  name: db-credentials
                  key: host
            - name: DB_PASSWORD
              valueFrom:
                secretKeyRef:
                  name: db-credentials
                  key: password
```

## Method 2: External Secrets Operator

External Secrets Operator syncs secrets from external providers (AWS Secrets Manager, Azure Key Vault, GCP Secret Manager, HashiCorp Vault) into Kubernetes.

### Deploy External Secrets Operator

```yaml
# applications/external-secrets.yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: external-secrets
  namespace: argocd
spec:
  project: infrastructure
  source:
    repoURL: https://charts.external-secrets.io
    chart: external-secrets
    targetRevision: 0.9.11
    helm:
      values: |
        installCRDs: true
  destination:
    server: https://kubernetes.default.svc
    namespace: external-secrets
  syncPolicy:
    automated:
      selfHeal: true
    syncOptions:
      - CreateNamespace=true
```

### Create a SecretStore

```yaml
# secrets/secret-store.yaml
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

### Create an ExternalSecret for Database Credentials

```yaml
# secrets/db-external-secret.yaml
apiVersion: external-secrets.io/v1beta1
kind: ExternalSecret
metadata:
  name: db-credentials
  namespace: production
spec:
  refreshInterval: 1h
  secretStoreRef:
    name: aws-secrets-manager
    kind: ClusterSecretStore
  target:
    name: db-credentials
    template:
      type: Opaque
      data:
        # Construct the connection URL from individual fields
        url: "postgres://{{ .username }}:{{ .password }}@{{ .host }}:{{ .port }}/{{ .database }}?sslmode=require"
  data:
    - secretKey: username
      remoteRef:
        key: production/database
        property: username
    - secretKey: password
      remoteRef:
        key: production/database
        property: password
    - secretKey: host
      remoteRef:
        key: production/database
        property: host
    - secretKey: port
      remoteRef:
        key: production/database
        property: port
    - secretKey: database
      remoteRef:
        key: production/database
        property: database
```

This ExternalSecret is safe to commit to Git because it only contains references to the external secret store, not the actual credentials.

## Method 3: HashiCorp Vault Integration

For organizations using Vault, integrate directly with ArgoCD:

```yaml
# Deploy the Vault Secrets Operator
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: vault-secrets-operator
  namespace: argocd
spec:
  project: infrastructure
  source:
    repoURL: https://helm.releases.hashicorp.com
    chart: vault-secrets-operator
    targetRevision: 0.4.0
  destination:
    server: https://kubernetes.default.svc
    namespace: vault-secrets-operator
  syncPolicy:
    automated:
      selfHeal: true
    syncOptions:
      - CreateNamespace=true
```

```yaml
# secrets/vault-db-secret.yaml
apiVersion: secrets.hashicorp.com/v1beta1
kind: VaultStaticSecret
metadata:
  name: db-credentials
  namespace: production
spec:
  type: kv-v2
  mount: secret
  path: production/database
  destination:
    name: db-credentials
    create: true
    labels:
      app: myapp
    transformation:
      excludeRaw: true
      templates:
        url:
          text: "postgres://{{ .Secrets.username }}:{{ .Secrets.password }}@{{ .Secrets.host }}:{{ .Secrets.port }}/{{ .Secrets.database }}?sslmode=require"
  refreshAfter: 30s
  vaultAuthRef: vault-auth
```

## Method 4: SOPS Encrypted Secrets

Mozilla SOPS encrypts individual values within YAML files:

```yaml
# secrets/db-credentials.enc.yaml
apiVersion: v1
kind: Secret
metadata:
  name: db-credentials
  namespace: production
type: Opaque
stringData:
  url: ENC[AES256_GCM,data:long-encrypted-string,type:str]
  username: ENC[AES256_GCM,data:short-encrypted,type:str]
  password: ENC[AES256_GCM,data:medium-encrypted,type:str]
sops:
  kms:
    - arn: arn:aws:kms:us-east-1:123456789012:key/abc-123
  version: 3.8.1
```

Configure ArgoCD to decrypt SOPS files using the KSOPS plugin:

```yaml
# In your kustomization.yaml
generators:
  - ./secret-generator.yaml
---
# secret-generator.yaml
apiVersion: viaduct.ai/v1
kind: ksops
metadata:
  name: db-credentials
files:
  - ./db-credentials.enc.yaml
```

## Connection String Rotation

Handle automatic credential rotation without downtime:

```yaml
# External Secret with automatic refresh
apiVersion: external-secrets.io/v1beta1
kind: ExternalSecret
metadata:
  name: db-credentials
  namespace: production
spec:
  refreshInterval: 5m  # Check for rotation every 5 minutes
  secretStoreRef:
    name: aws-secrets-manager
    kind: ClusterSecretStore
  target:
    name: db-credentials
    creationPolicy: Owner
    deletionPolicy: Retain
```

Configure your application to handle credential changes gracefully:

```yaml
# deployment.yaml
spec:
  template:
    metadata:
      annotations:
        # Reloader watches for secret changes and triggers rolling restart
        secret.reloader.stakater.com/reload: "db-credentials"
    spec:
      containers:
        - name: app
          envFrom:
            - secretRef:
                name: db-credentials
```

Deploy Reloader through ArgoCD to handle automatic restarts:

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: reloader
  namespace: argocd
spec:
  project: infrastructure
  source:
    repoURL: https://stakater.github.io/stakater-charts
    chart: reloader
    targetRevision: 1.0.63
  destination:
    server: https://kubernetes.default.svc
    namespace: kube-system
```

## Multi-Environment Connection Strings

Use Kustomize overlays for different environments:

```yaml
# base/external-secret.yaml
apiVersion: external-secrets.io/v1beta1
kind: ExternalSecret
metadata:
  name: db-credentials
spec:
  refreshInterval: 1h
  secretStoreRef:
    name: aws-secrets-manager
    kind: ClusterSecretStore
  data:
    - secretKey: url
      remoteRef:
        key: ENVIRONMENT_PLACEHOLDER/database
        property: url
```

```yaml
# overlays/production/kustomization.yaml
patches:
  - target:
      kind: ExternalSecret
      name: db-credentials
    patch: |
      - op: replace
        path: /spec/data/0/remoteRef/key
        value: production/database
```

## Monitoring Secret Health

Monitor that secrets are properly synced and not expired. Use [OneUptime](https://oneuptime.com) to alert when ExternalSecret sync fails or when credentials are about to expire.

## Summary

Managing database connection strings with ArgoCD requires choosing the right secret management strategy. Sealed Secrets is simplest for small teams. External Secrets Operator provides the most flexibility for cloud-native environments. HashiCorp Vault offers enterprise-grade secret management. SOPS works well for teams that want encryption directly in Git. Regardless of the method, the key principles are the same: never store plain-text credentials in Git, use automatic rotation where possible, and configure applications to handle credential changes gracefully.
