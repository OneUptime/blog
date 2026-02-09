# How to use Vault with External Secrets Operator for sync to Kubernetes secrets

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: HashiCorp Vault, External Secrets Operator, Kubernetes, Secret Synchronization, GitOps

Description: Learn how to use External Secrets Operator to automatically synchronize secrets from Vault into Kubernetes native Secret objects for seamless application integration.

---

While Vault Agent Injector works well for many scenarios, some applications require secrets as native Kubernetes Secret objects. External Secrets Operator (ESO) synchronizes secrets from Vault into Kubernetes Secrets automatically, providing a declarative, GitOps-friendly approach to secret management. This guide shows you how to integrate Vault with ESO.

## Understanding External Secrets Operator

External Secrets Operator watches ExternalSecret custom resources and automatically creates and updates Kubernetes Secret objects with data from external secret stores like Vault. It provides a declarative interface for secret management while keeping sensitive data in Vault.

The workflow operates like this: define ExternalSecret resource pointing to Vault path, ESO authenticates to Vault using configured method, ESO fetches secret data from Vault, ESO creates or updates Kubernetes Secret with the data, and ESO continuously syncs to keep secrets updated.

## Installing External Secrets Operator

Deploy ESO using Helm:

```bash
# Add External Secrets Helm repository
helm repo add external-secrets https://charts.external-secrets.io
helm repo update

# Install External Secrets Operator
helm install external-secrets \
  external-secrets/external-secrets \
  --namespace external-secrets-system \
  --create-namespace \
  --set installCRDs=true

# Verify installation
kubectl -n external-secrets-system get pods
kubectl get crds | grep external-secrets
```

## Configuring Vault Authentication

Create a SecretStore that defines how to connect to Vault:

```yaml
# vault-secretstore.yaml
apiVersion: external-secrets.io/v1beta1
kind: SecretStore
metadata:
  name: vault-backend
  namespace: default
spec:
  provider:
    vault:
      server: "http://vault.vault.svc.cluster.local:8200"
      path: "secret"
      version: "v2"
      auth:
        kubernetes:
          mountPath: "kubernetes"
          role: "app"
          serviceAccountRef:
            name: "app-sa"
```

Apply the SecretStore:

```bash
kubectl apply -f vault-secretstore.yaml

# Verify SecretStore is ready
kubectl get secretstore vault-backend

# Check status
kubectl describe secretstore vault-backend
```

## Creating External Secrets

Define an ExternalSecret that references Vault data:

```yaml
# external-secret.yaml
apiVersion: external-secrets.io/v1beta1
kind: ExternalSecret
metadata:
  name: app-config
  namespace: default
spec:
  refreshInterval: 1h  # How often to sync from Vault
  secretStoreRef:
    name: vault-backend
    kind: SecretStore
  target:
    name: app-config-secret  # Name of Kubernetes Secret to create
    creationPolicy: Owner
  data:
  - secretKey: database_url  # Key in Kubernetes Secret
    remoteRef:
      key: app/config  # Path in Vault (secret/data/app/config)
      property: database_url  # Field in Vault secret

  - secretKey: api_key
    remoteRef:
      key: app/config
      property: api_key
```

```bash
kubectl apply -f external-secret.yaml

# Verify ExternalSecret status
kubectl get externalsecret app-config

# Check the created Kubernetes Secret
kubectl get secret app-config-secret
kubectl describe secret app-config-secret

# View secret data
kubectl get secret app-config-secret -o jsonpath='{.data.database_url}' | base64 -d
```

## Syncing Entire Secret

Import all fields from a Vault secret:

```yaml
# external-secret-all-fields.yaml
apiVersion: external-secrets.io/v1beta1
kind: ExternalSecret
metadata:
  name: app-all-secrets
  namespace: default
spec:
  refreshInterval: 30m
  secretStoreRef:
    name: vault-backend
    kind: SecretStore
  target:
    name: app-all-secrets
  dataFrom:
  - extract:
      key: app/config  # Imports all fields from secret/data/app/config
```

## Using Templates

Transform secret data during sync:

```yaml
# external-secret-template.yaml
apiVersion: external-secrets.io/v1beta1
kind: ExternalSecret
metadata:
  name: app-connection-string
  namespace: default
spec:
  refreshInterval: 1h
  secretStoreRef:
    name: vault-backend
    kind: SecretStore
  target:
    name: connection-string-secret
    template:
      engineVersion: v2
      data:
        config.yaml: |
          database:
            url: {{ .database_url }}
            username: {{ .db_user }}
            password: {{ .db_password }}
          api:
            key: {{ .api_key }}
  data:
  - secretKey: database_url
    remoteRef:
      key: app/database
      property: url
  - secretKey: db_user
    remoteRef:
      key: app/database
      property: username
  - secretKey: db_password
    remoteRef:
      key: app/database
      property: password
  - secretKey: api_key
    remoteRef:
      key: app/config
      property: api_key
```

## Configuring Cluster-Wide SecretStore

Create a ClusterSecretStore for use across all namespaces:

```yaml
# cluster-secretstore.yaml
apiVersion: external-secrets.io/v1beta1
kind: ClusterSecretStore
metadata:
  name: vault-cluster-backend
spec:
  provider:
    vault:
      server: "http://vault.vault.svc.cluster.local:8200"
      path: "secret"
      version: "v2"
      auth:
        kubernetes:
          mountPath: "kubernetes"
          role: "cluster-admin"
          serviceAccountRef:
            name: "external-secrets-sa"
            namespace: "external-secrets-system"
```

```bash
kubectl apply -f cluster-secretstore.yaml

# Use in any namespace
cat <<EOF | kubectl apply -f -
apiVersion: external-secrets.io/v1beta1
kind: ExternalSecret
metadata:
  name: app-secret
  namespace: production
spec:
  refreshInterval: 1h
  secretStoreRef:
    name: vault-cluster-backend
    kind: ClusterSecretStore
  target:
    name: app-secret
  data:
  - secretKey: config
    remoteRef:
      key: production/app/config
EOF
```

## Syncing Dynamic Database Credentials

Sync rotating database credentials:

```yaml
# db-credentials-externalsecret.yaml
apiVersion: external-secrets.io/v1beta1
kind: ExternalSecret
metadata:
  name: db-credentials
  namespace: default
spec:
  refreshInterval: 15m  # Refresh frequently for dynamic creds
  secretStoreRef:
    name: vault-backend
    kind: SecretStore
  target:
    name: db-credentials
    template:
      type: Opaque
      data:
        username: "{{ .username }}"
        password: "{{ .password }}"
  data:
  - secretKey: username
    remoteRef:
      key: database/creds/app-role
      property: username
  - secretKey: password
    remoteRef:
      key: database/creds/app-role
      property: password
```

## Using with Deployments

Reference the synced secret in deployments:

```yaml
# app-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: myapp
  namespace: default
spec:
  replicas: 3
  selector:
    matchLabels:
      app: myapp
  template:
    metadata:
      labels:
        app: myapp
    spec:
      containers:
      - name: app
        image: myapp:latest
        envFrom:
        - secretRef:
            name: app-config-secret  # Created by ExternalSecret
        env:
        - name: DB_USER
          valueFrom:
            secretKeyRef:
              name: db-credentials
              key: username
        - name: DB_PASSWORD
          valueFrom:
            secretKeyRef:
              name: db-credentials
              key: password
```

## Monitoring External Secrets

Check sync status and troubleshoot:

```bash
# View all ExternalSecrets
kubectl get externalsecrets --all-namespaces

# Detailed status
kubectl describe externalsecret app-config

# Check conditions
kubectl get externalsecret app-config -o jsonpath='{.status.conditions}' | jq

# View operator logs
kubectl -n external-secrets-system logs -l app.kubernetes.io/name=external-secrets

# Check Secret creation events
kubectl get events --field-selector involvedObject.name=app-config-secret
```

## Handling Sync Failures

Debug common issues:

```bash
# If ExternalSecret shows SecretSyncedError
kubectl describe externalsecret app-config

# Common issues:
# 1. Vault authentication failure
kubectl get secretstore vault-backend -o yaml

# 2. Secret path doesn't exist in Vault
vault kv get secret/app/config

# 3. ServiceAccount lacks permissions
kubectl get sa app-sa -o yaml

# 4. Policy doesn't allow secret access
vault read auth/kubernetes/role/app
```

## Implementing Secret Rotation

Automatically rotate secrets on a schedule:

```yaml
# rotated-secret.yaml
apiVersion: external-secrets.io/v1beta1
kind: ExternalSecret
metadata:
  name: rotated-api-key
  namespace: default
spec:
  refreshInterval: 10m  # Check every 10 minutes
  secretStoreRef:
    name: vault-backend
    kind: SecretStore
  target:
    name: api-key-secret
    creationPolicy: Owner
    deletionPolicy: Retain
  data:
  - secretKey: api_key
    remoteRef:
      key: app/api-key
      property: current
```

When Vault secret changes, ESO automatically updates the Kubernetes Secret.

## Best Practices

Use ClusterSecretStore for shared Vault configurations to reduce duplication. Set appropriate refreshInterval based on secret sensitivity and change frequency. Use templates to format secrets for application consumption. Monitor ExternalSecret status to catch sync failures quickly. Implement proper RBAC for ServiceAccounts used by SecretStore. Consider refreshInterval overhead - too frequent syncing increases Vault load. Use deletionPolicy: Retain for secrets that shouldn't be auto-deleted. Test secret rotation by updating Vault secrets and verifying Kubernetes Secret updates.

External Secrets Operator bridges Vault and Kubernetes native secrets, providing a GitOps-friendly declarative interface for secret management. By automating secret synchronization, ESO eliminates manual secret distribution while keeping sensitive data secure in Vault. This approach works well for applications that expect Kubernetes Secrets while maintaining Vault as the authoritative secret store.
