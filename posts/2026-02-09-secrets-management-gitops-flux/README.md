# How to Implement Secrets Management in GitOps Using External Secrets Operator with Flux

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GitOps, Secrets Management, External Secrets, Flux, Kubernetes

Description: Learn how to securely manage Kubernetes secrets in GitOps workflows using External Secrets Operator with Flux to sync credentials from HashiCorp Vault, AWS Secrets Manager, and other secret stores without storing sensitive data in Git.

---

Storing secrets in Git defeats the purpose of GitOps security. You need a way to reference secrets in your manifests while keeping the actual values in a secure secret store. External Secrets Operator bridges this gap by syncing secrets from external providers into Kubernetes without ever committing them to Git.

This guide shows you how to integrate External Secrets Operator with Flux for secure, automated secrets management.

## Installing External Secrets Operator with Flux

Create a HelmRepository for External Secrets:

```yaml
# infrastructure/sources/external-secrets.yaml
apiVersion: source.toolkit.fluxcd.io/v1beta2
kind: HelmRepository
metadata:
  name: external-secrets
  namespace: flux-system
spec:
  interval: 1h
  url: https://charts.external-secrets.io
```

Deploy External Secrets Operator:

```yaml
# infrastructure/controllers/external-secrets.yaml
apiVersion: helm.toolkit.fluxcd.io/v2beta1
kind: HelmRelease
metadata:
  name: external-secrets
  namespace: flux-system
spec:
  interval: 30m
  chart:
    spec:
      chart: external-secrets
      version: "0.9.x"
      sourceRef:
        kind: HelmRepository
        name: external-secrets
        namespace: flux-system
  values:
    installCRDs: true
    webhook:
      port: 9443
```

## Configuring Vault as Secret Backend

Create a SecretStore for HashiCorp Vault:

```yaml
# infrastructure/secret-stores/vault.yaml
apiVersion: external-secrets.io/v1beta1
kind: SecretStore
metadata:
  name: vault-backend
  namespace: production
spec:
  provider:
    vault:
      server: "https://vault.company.com:8200"
      path: "secret"
      version: "v2"
      auth:
        kubernetes:
          mountPath: "kubernetes"
          role: "external-secrets"
          serviceAccountRef:
            name: external-secrets-sa
```

Create the ServiceAccount:

```yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: external-secrets-sa
  namespace: production
```

## Creating ExternalSecret Resources

Define an ExternalSecret to sync from Vault:

```yaml
# apps/api-gateway/external-secret.yaml
apiVersion: external-secrets.io/v1beta1
kind: ExternalSecret
metadata:
  name: api-gateway-secrets
  namespace: production
spec:
  refreshInterval: 1h
  secretStoreRef:
    name: vault-backend
    kind: SecretStore
  target:
    name: api-gateway-credentials
    creationPolicy: Owner
  data:
  - secretKey: database-password
    remoteRef:
      key: api-gateway/database
      property: password
  - secretKey: api-key
    remoteRef:
      key: api-gateway/external-service
      property: api_key
```

This creates a Kubernetes Secret named `api-gateway-credentials` with keys synced from Vault.

## Using AWS Secrets Manager

Configure AWS Secrets Manager as backend:

```yaml
apiVersion: external-secrets.io/v1beta1
kind: SecretStore
metadata:
  name: aws-secrets
  namespace: production
spec:
  provider:
    aws:
      service: SecretsManager
      region: us-east-1
      auth:
        jwt:
          serviceAccountRef:
            name: external-secrets-sa
---
apiVersion: external-secrets.io/v1beta1
kind: ExternalSecret
metadata:
  name: rds-credentials
  namespace: production
spec:
  refreshInterval: 5m
  secretStoreRef:
    name: aws-secrets
    kind: SecretStore
  target:
    name: rds-password
  data:
  - secretKey: password
    remoteRef:
      key: production/rds/master
      property: password
```

## Using Google Secret Manager

Configure GCP Secret Manager:

```yaml
apiVersion: external-secrets.io/v1beta1
kind: SecretStore
metadata:
  name: gcpsm-backend
  namespace: production
spec:
  provider:
    gcpsm:
      projectID: "my-project"
      auth:
        workloadIdentity:
          clusterLocation: us-central1
          clusterName: production-cluster
          serviceAccountRef:
            name: external-secrets-sa
---
apiVersion: external-secrets.io/v1beta1
kind: ExternalSecret
metadata:
  name: cloudsql-credentials
  namespace: production
spec:
  refreshInterval: 10m
  secretStoreRef:
    name: gcpsm-backend
    kind: SecretStore
  target:
    name: cloudsql-creds
  data:
  - secretKey: username
    remoteRef:
      key: cloudsql-username
  - secretKey: password
    remoteRef:
      key: cloudsql-password
```

## Using ClusterSecretStore for Multi-Namespace Access

Create a cluster-wide secret store:

```yaml
apiVersion: external-secrets.io/v1beta1
kind: ClusterSecretStore
metadata:
  name: vault-cluster-backend
spec:
  provider:
    vault:
      server: "https://vault.company.com:8200"
      path: "secret"
      version: "v2"
      auth:
        kubernetes:
          mountPath: "kubernetes"
          role: "cluster-external-secrets"
          serviceAccountRef:
            name: external-secrets-sa
            namespace: flux-system
```

Reference from any namespace:

```yaml
apiVersion: external-secrets.io/v1beta1
kind: ExternalSecret
metadata:
  name: shared-secrets
  namespace: team-alpha
spec:
  refreshInterval: 1h
  secretStoreRef:
    name: vault-cluster-backend
    kind: ClusterSecretStore
  target:
    name: shared-credentials
  data:
  - secretKey: api-token
    remoteRef:
      key: shared/api-tokens
      property: service-account-token
```

## Templating Secret Values

Use templates to transform secret data:

```yaml
apiVersion: external-secrets.io/v1beta1
kind: ExternalSecret
metadata:
  name: connection-string
  namespace: production
spec:
  refreshInterval: 1h
  secretStoreRef:
    name: vault-backend
    kind: SecretStore
  target:
    name: database-connection
    template:
      type: Opaque
      data:
        connection-string: |
          postgresql://{{ .username }}:{{ .password }}@{{ .host }}:{{ .port }}/{{ .database }}?sslmode=require
  dataFrom:
  - extract:
      key: database/postgresql
```

## Syncing Entire Secret Paths

Import all keys from a secret path:

```yaml
apiVersion: external-secrets.io/v1beta1
kind: ExternalSecret
metadata:
  name: env-variables
  namespace: production
spec:
  refreshInterval: 5m
  secretStoreRef:
    name: vault-backend
    kind: SecretStore
  target:
    name: app-environment
  dataFrom:
  - extract:
      key: applications/api-gateway/env
```

This syncs all key-value pairs from the Vault path into the Kubernetes Secret.

## Implementing Secret Rotation

Configure automatic rotation:

```yaml
apiVersion: external-secrets.io/v1beta1
kind: ExternalSecret
metadata:
  name: rotated-credentials
  namespace: production
spec:
  refreshInterval: 15m  # Check every 15 minutes
  secretStoreRef:
    name: vault-backend
    kind: SecretStore
  target:
    name: api-credentials
    creationPolicy: Owner
    deletionPolicy: Retain
  data:
  - secretKey: password
    remoteRef:
      key: api-service/credentials
      property: password
```

Monitor rotation with alerts:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: secret-rotation-alert
  namespace: monitoring
data:
  alert.yaml: |
    - alert: SecretSyncFailed
      expr: external_secrets_sync_calls_error > 0
      for: 5m
      annotations:
        summary: "ExternalSecret sync failing"
```

## Using with Sealed Secrets as Fallback

Combine with Sealed Secrets for git-encrypted backups:

```yaml
apiVersion: bitnami.com/v1alpha1
kind: SealedSecret
metadata:
  name: fallback-secrets
  namespace: production
spec:
  encryptedData:
    api-key: AgBR8F3k...  # Encrypted value
---
apiVersion: external-secrets.io/v1beta1
kind: ExternalSecret
metadata:
  name: primary-secrets
  namespace: production
spec:
  refreshInterval: 1h
  secretStoreRef:
    name: vault-backend
    kind: SecretStore
  target:
    name: api-secrets
  data:
  - secretKey: api-key
    remoteRef:
      key: api/credentials
      property: key
```

## Monitoring External Secrets

Track sync status:

```bash
kubectl get externalsecrets -A

kubectl describe externalsecret api-gateway-secrets -n production
```

View metrics:

```bash
kubectl port-forward -n external-secrets-system svc/external-secrets-webhook 8080:8080

curl localhost:8080/metrics | grep external_secrets
```

Create dashboards:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: external-secrets-dashboard
  namespace: monitoring
data:
  dashboard.json: |
    {
      "panels": [
        {
          "title": "Secret Sync Success Rate",
          "expr": "rate(external_secrets_sync_calls_total{status=\"success\"}[5m])"
        },
        {
          "title": "Sync Errors",
          "expr": "rate(external_secrets_sync_calls_error[5m])"
        }
      ]
    }
```

## Best Practices

Never commit actual secret values to Git. Only commit ExternalSecret and SecretStore manifests.

Use separate SecretStores per environment. Production secrets should use different Vault paths or AWS accounts than development.

Set appropriate refreshInterval based on sensitivity. High-security secrets might refresh every 5 minutes, while API tokens could use 1 hour.

Implement least-privilege access. The External Secrets ServiceAccount should only read secrets, never write.

Monitor sync failures aggressively. A failed sync means applications can't access credentials.

Use ClusterSecretStore for shared infrastructure secrets, namespace-scoped SecretStore for application secrets.

External Secrets Operator with Flux provides secure, automated secrets management that maintains GitOps principles while keeping sensitive data out of your Git repository.
