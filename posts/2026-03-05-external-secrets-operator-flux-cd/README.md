# How to Use External Secrets Operator with Flux CD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, GitOps, Kubernetes, Secret, External Secrets Operator, ESO

Description: Learn how to deploy and use the External Secrets Operator with Flux CD to sync secrets from external providers into Kubernetes.

---

The External Secrets Operator (ESO) takes a fundamentally different approach to GitOps secrets management. Instead of encrypting secrets and storing them in Git, ESO syncs secrets from external secret management systems (like AWS Secrets Manager, HashiCorp Vault, Azure Key Vault) directly into Kubernetes. You store only the reference to the secret in Git, not the secret itself.

## How External Secrets Operator Works

1. You deploy the ESO controller and configure a `SecretStore` pointing to your secret provider
2. You create an `ExternalSecret` resource that references specific secrets in the provider
3. ESO fetches the secret values from the provider and creates a Kubernetes Secret
4. The Secret is automatically refreshed on a configurable interval

## Prerequisites

- A Kubernetes cluster with Flux CD bootstrapped
- An external secret management system (AWS Secrets Manager, Vault, etc.)
- `kubectl` access to your cluster

## Step 1: Deploy ESO with Flux

Install the External Secrets Operator using a Flux HelmRelease.

```yaml
# infrastructure/external-secrets/helmrepository.yaml
apiVersion: source.toolkit.fluxcd.io/v1
kind: HelmRepository
metadata:
  name: external-secrets
  namespace: flux-system
spec:
  interval: 1h
  url: https://charts.external-secrets.io
---
# infrastructure/external-secrets/helmrelease.yaml
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata:
  name: external-secrets
  namespace: flux-system
spec:
  interval: 1h
  chart:
    spec:
      chart: external-secrets
      version: ">=0.9.0"
      sourceRef:
        kind: HelmRepository
        name: external-secrets
      interval: 1h
  targetNamespace: external-secrets
  install:
    createNamespace: true
    crds: Create
    remediation:
      retries: 3
  upgrade:
    crds: CreateReplace
    remediation:
      retries: 3
  values:
    installCRDs: true
    resources:
      requests:
        cpu: 50m
        memory: 64Mi
      limits:
        cpu: 200m
        memory: 256Mi
```

```yaml
# infrastructure/external-secrets/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - helmrepository.yaml
  - helmrelease.yaml
```

## Step 2: Create a SecretStore

The SecretStore defines the connection to your external secret provider. This example uses AWS Secrets Manager.

```yaml
# apps/my-app/secret-store.yaml
apiVersion: external-secrets.io/v1beta1
kind: SecretStore
metadata:
  name: aws-secrets-manager
  namespace: default
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

Alternatively, use a ClusterSecretStore for cluster-wide access.

```yaml
# infrastructure/external-secrets/cluster-secret-store.yaml
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
            key: access-key-id
            namespace: external-secrets
          secretAccessKeySecretRef:
            name: aws-credentials
            key: secret-access-key
            namespace: external-secrets
```

## Step 3: Create an ExternalSecret

The ExternalSecret resource defines which secrets to fetch and how to map them to a Kubernetes Secret.

```yaml
# apps/my-app/external-secret.yaml
apiVersion: external-secrets.io/v1beta1
kind: ExternalSecret
metadata:
  name: my-app-secret
  namespace: default
spec:
  # How often to sync the secret
  refreshInterval: 1h
  secretStoreRef:
    name: aws-secrets-manager
    kind: SecretStore
  # Target Kubernetes Secret to create
  target:
    name: my-app-secret
    creationPolicy: Owner
  # Map external secrets to Kubernetes secret keys
  data:
    - secretKey: username
      remoteRef:
        key: myapp/credentials
        property: username
    - secretKey: password
      remoteRef:
        key: myapp/credentials
        property: password
    - secretKey: api-key
      remoteRef:
        key: myapp/api-key
```

## Step 4: Include in Flux Kustomization

Add the ExternalSecret and SecretStore to your application's kustomization.

```yaml
# apps/my-app/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - deployment.yaml
  - service.yaml
  - secret-store.yaml
  - external-secret.yaml
```

The Flux Kustomization does not need a decryption provider since secrets are fetched at runtime.

```yaml
# clusters/my-cluster/apps.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: my-app
  namespace: flux-system
spec:
  interval: 10m
  path: ./apps/my-app
  prune: true
  sourceRef:
    kind: GitRepository
    name: flux-system
  dependsOn:
    - name: infrastructure
  # No decryption block needed for External Secrets
```

## Step 5: Commit and Verify

Push the configuration and verify that secrets are synced.

```bash
# Commit all resources
git add apps/my-app/
git commit -m "Add ExternalSecret for my-app credentials"
git push

# Wait for reconciliation
flux reconcile kustomization my-app --with-source

# Check the ExternalSecret status
kubectl get externalsecret my-app-secret -n default

# Verify the Kubernetes Secret was created
kubectl get secret my-app-secret -n default
kubectl get secret my-app-secret -n default -o jsonpath='{.data.username}' | base64 -d
```

## Using dataFrom for Bulk Secret Sync

Sync all key-value pairs from an external secret at once.

```yaml
# apps/my-app/external-secret-bulk.yaml
apiVersion: external-secrets.io/v1beta1
kind: ExternalSecret
metadata:
  name: my-app-all-secrets
  namespace: default
spec:
  refreshInterval: 1h
  secretStoreRef:
    name: aws-secrets-manager
    kind: SecretStore
  target:
    name: my-app-all-secrets
    creationPolicy: Owner
  # Sync all properties from the remote secret
  dataFrom:
    - extract:
        key: myapp/all-config
```

## Template for Custom Secret Format

Use templates to customize the generated Kubernetes Secret.

```yaml
# apps/my-app/external-secret-templated.yaml
apiVersion: external-secrets.io/v1beta1
kind: ExternalSecret
metadata:
  name: my-app-db-url
  namespace: default
spec:
  refreshInterval: 1h
  secretStoreRef:
    name: aws-secrets-manager
    kind: SecretStore
  target:
    name: my-app-db-url
    template:
      type: Opaque
      data:
        # Construct a database URL from individual components
        DATABASE_URL: "postgres://{{ .username }}:{{ .password }}@{{ .host }}:5432/{{ .dbname }}"
  data:
    - secretKey: username
      remoteRef:
        key: myapp/db
        property: username
    - secretKey: password
      remoteRef:
        key: myapp/db
        property: password
    - secretKey: host
      remoteRef:
        key: myapp/db
        property: host
    - secretKey: dbname
      remoteRef:
        key: myapp/db
        property: dbname
```

## Troubleshooting

Check the ExternalSecret status for sync errors.

```bash
# Check ExternalSecret sync status
kubectl get externalsecret my-app-secret -n default -o yaml | grep -A 10 "status:"

# Check ESO controller logs
kubectl logs -n external-secrets deployment/external-secrets | grep -i "error\|my-app"

# Verify the SecretStore connectivity
kubectl get secretstore aws-secrets-manager -n default -o yaml | grep -A 5 "status:"
```

Common issues include incorrect provider credentials, missing IAM permissions, incorrect secret paths in the `remoteRef`, and network connectivity problems between the cluster and the secret provider.

The External Secrets Operator provides a clean separation between secret storage and secret consumption, making it an excellent choice for teams that already use external secret management systems and want to integrate them with Flux CD GitOps workflows.
