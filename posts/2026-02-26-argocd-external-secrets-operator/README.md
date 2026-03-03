# How to Manage Secrets with ArgoCD and External Secrets Operator

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: ArgoCD, GitOps, Kubernetes, External Secrets, Security

Description: Learn how to use the External Secrets Operator with ArgoCD to sync secrets from AWS Secrets Manager, Vault, Azure Key Vault and other providers into Kubernetes.

---

The External Secrets Operator (ESO) takes a different approach to secret management than sealed secrets. Instead of encrypting secrets and storing them in Git, ESO pulls secrets from external secret stores at runtime. Your Git repository only contains references to secrets, not the secrets themselves. This guide covers how to integrate ESO with ArgoCD for a production-ready secret management workflow.

## How External Secrets Operator Works

```mermaid
graph LR
    A[Git Repository] -->|Contains ExternalSecret CR| B[ArgoCD]
    B -->|Syncs ExternalSecret| C[Kubernetes Cluster]
    C -->|ESO Controller reads| D[ExternalSecret CR]
    D -->|Fetches from| E[Secret Store]
    E -->|Returns secret data| D
    D -->|Creates| F[Kubernetes Secret]
    E --> E1[AWS Secrets Manager]
    E --> E2[HashiCorp Vault]
    E --> E3[Azure Key Vault]
    E --> E4[GCP Secret Manager]
```

The ExternalSecret custom resource defines which secrets to fetch and from where. The ESO controller continuously syncs secrets from the external store into Kubernetes Secrets.

## Installing External Secrets Operator

Deploy ESO using ArgoCD:

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: external-secrets
  namespace: argocd
spec:
  project: default
  source:
    repoURL: https://charts.external-secrets.io
    chart: external-secrets
    targetRevision: 0.10.0
    helm:
      values: |
        installCRDs: true
        serviceAccount:
          create: true
          name: external-secrets
  destination:
    server: https://kubernetes.default.svc
    namespace: external-secrets
  syncPolicy:
    automated:
      prune: true
      selfHeal: true
    syncOptions:
      - CreateNamespace=true
```

## Configuring Secret Stores

### AWS Secrets Manager

First, create IAM credentials for ESO:

```bash
# Create a Kubernetes secret with AWS credentials
kubectl create secret generic aws-secret \
  --namespace external-secrets \
  --from-literal=access-key=AKIAIOSFODNN7EXAMPLE \
  --from-literal=secret-access-key=wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY
```

Then create a SecretStore:

```yaml
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
            name: aws-secret
            namespace: external-secrets
            key: access-key
          secretAccessKeySecretRef:
            name: aws-secret
            namespace: external-secrets
            key: secret-access-key
```

For EKS clusters, use IRSA (IAM Roles for Service Accounts) instead of static credentials:

```yaml
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
            name: external-secrets
            namespace: external-secrets
```

### HashiCorp Vault

```yaml
apiVersion: external-secrets.io/v1beta1
kind: ClusterSecretStore
metadata:
  name: vault-backend
spec:
  provider:
    vault:
      server: https://vault.example.com
      path: secret
      version: v2
      auth:
        kubernetes:
          mountPath: kubernetes
          role: external-secrets
          serviceAccountRef:
            name: external-secrets
            namespace: external-secrets
```

### Azure Key Vault

```yaml
apiVersion: external-secrets.io/v1beta1
kind: ClusterSecretStore
metadata:
  name: azure-key-vault
spec:
  provider:
    azurekv:
      tenantId: "your-tenant-id"
      vaultUrl: "https://your-vault.vault.azure.net"
      authType: WorkloadIdentity
      serviceAccountRef:
        name: external-secrets
        namespace: external-secrets
```

### Google Secret Manager

```yaml
apiVersion: external-secrets.io/v1beta1
kind: ClusterSecretStore
metadata:
  name: gcp-secret-manager
spec:
  provider:
    gcpsm:
      projectID: your-gcp-project
      auth:
        workloadIdentity:
          clusterLocation: us-central1
          clusterName: my-cluster
          clusterProjectID: your-gcp-project
          serviceAccountRef:
            name: external-secrets
            namespace: external-secrets
```

## Creating ExternalSecrets for ArgoCD Applications

Now create ExternalSecret resources that ArgoCD will sync:

```yaml
apiVersion: external-secrets.io/v1beta1
kind: ExternalSecret
metadata:
  name: my-app-secrets
  namespace: app
spec:
  refreshInterval: 1h  # How often to sync from the external store
  secretStoreRef:
    name: aws-secrets-manager
    kind: ClusterSecretStore
  target:
    name: my-app-secrets  # Name of the K8s Secret to create
    creationPolicy: Owner
  data:
    - secretKey: DB_PASSWORD
      remoteRef:
        key: production/my-app
        property: db_password
    - secretKey: API_KEY
      remoteRef:
        key: production/my-app
        property: api_key
```

This ExternalSecret resource is safe to store in Git because it only contains references to secrets, not actual secret values.

## Integrating with ArgoCD

### Repository Structure

```text
my-app/
  base/
    deployment.yaml
    service.yaml
    external-secret.yaml  # ExternalSecret reference
  overlays/
    dev/
      external-secret.yaml  # Points to dev secrets
      kustomization.yaml
    prod/
      external-secret.yaml  # Points to prod secrets
      kustomization.yaml
```

### ArgoCD Application with Sync Ordering

Use sync waves to ensure secrets are fetched before the application starts:

```yaml
apiVersion: external-secrets.io/v1beta1
kind: ExternalSecret
metadata:
  name: my-app-secrets
  namespace: app
  annotations:
    argocd.argoproj.io/sync-wave: "-2"  # Fetch secrets first
spec:
  refreshInterval: 1h
  secretStoreRef:
    name: aws-secrets-manager
    kind: ClusterSecretStore
  target:
    name: my-app-secrets
  data:
    - secretKey: DB_PASSWORD
      remoteRef:
        key: production/my-app
        property: db_password
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-app
  namespace: app
  annotations:
    argocd.argoproj.io/sync-wave: "0"  # Deploy after secrets are ready
spec:
  template:
    spec:
      containers:
        - name: app
          envFrom:
            - secretRef:
                name: my-app-secrets
```

### Custom Health Check for ExternalSecrets

ArgoCD needs to know when an ExternalSecret has successfully synced. Add a custom health check:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: argocd-cm
  namespace: argocd
data:
  resource.customizations.health.external-secrets.io_ExternalSecret: |
    hs = {}
    if obj.status ~= nil then
      if obj.status.conditions ~= nil then
        for i, condition in ipairs(obj.status.conditions) do
          if condition.type == "Ready" and condition.status == "True" then
            hs.status = "Healthy"
            hs.message = condition.message
            return hs
          end
          if condition.type == "Ready" and condition.status == "False" then
            hs.status = "Degraded"
            hs.message = condition.message
            return hs
          end
        end
      end
    end
    hs.status = "Progressing"
    hs.message = "Waiting for ExternalSecret to be ready"
    return hs
```

## Handling Secret Diff in ArgoCD

ArgoCD might show the generated Kubernetes Secret as "OutOfSync" because it was not in Git. Ignore the generated secrets:

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: my-app
  namespace: argocd
spec:
  ignoreDifferences:
    - group: ""
      kind: Secret
      jsonPointers:
        - /data
  source:
    repoURL: https://github.com/your-org/manifests.git
    path: my-app/overlays/prod
  destination:
    server: https://kubernetes.default.svc
    namespace: app
```

## Fetching Multiple Secrets

### Using dataFrom for All Properties

```yaml
apiVersion: external-secrets.io/v1beta1
kind: ExternalSecret
metadata:
  name: my-app-all-secrets
  namespace: app
spec:
  refreshInterval: 1h
  secretStoreRef:
    name: aws-secrets-manager
    kind: ClusterSecretStore
  target:
    name: my-app-secrets
  dataFrom:
    - extract:
        key: production/my-app
        # This fetches ALL properties from the secret
```

### Using Find to Discover Secrets

```yaml
apiVersion: external-secrets.io/v1beta1
kind: ExternalSecret
metadata:
  name: my-app-discover
  namespace: app
spec:
  refreshInterval: 1h
  secretStoreRef:
    name: aws-secrets-manager
    kind: ClusterSecretStore
  target:
    name: my-app-secrets
  dataFrom:
    - find:
        name:
          regexp: "^production/my-app/.*"
```

## Monitoring and Troubleshooting

```bash
# Check ExternalSecret status
kubectl get externalsecret -n app

# Describe for detailed status
kubectl describe externalsecret my-app-secrets -n app

# Check the ESO controller logs
kubectl logs -n external-secrets deployment/external-secrets

# Verify the generated Kubernetes Secret
kubectl get secret my-app-secrets -n app -o yaml
```

## Conclusion

External Secrets Operator is the best choice when you already have a centralized secret management system like AWS Secrets Manager, HashiCorp Vault, or Azure Key Vault. It keeps actual secret values out of Git entirely, centralizes secret management, and supports automatic rotation through the `refreshInterval`. Combined with ArgoCD's sync waves and custom health checks, you get a fully GitOps-driven workflow where only secret references live in Git.

For alternative approaches, see our guides on [using Sealed Secrets with ArgoCD](https://oneuptime.com/blog/post/2026-02-26-argocd-sealed-secrets-management/view) and [using SOPS with ArgoCD](https://oneuptime.com/blog/post/2026-02-26-argocd-sops-secrets/view).
