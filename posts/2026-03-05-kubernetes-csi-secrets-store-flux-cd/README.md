# How to Use Kubernetes CSI Secrets Store with Flux CD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, GitOps, Kubernetes, CSI Secrets Store, Secrets Management, Security

Description: Learn how to integrate the Kubernetes Secrets Store CSI Driver with Flux CD to manage secrets from external providers like AWS Secrets Manager, Azure Key Vault, and HashiCorp Vault.

---

The Secrets Store CSI Driver allows Kubernetes pods to mount secrets from external secret management systems as volumes. When combined with Flux CD, you can declaratively manage SecretProviderClass resources through GitOps while keeping sensitive values out of your Git repository. This guide covers the integration with AWS Secrets Manager, Azure Key Vault, and HashiCorp Vault.

## How the CSI Secrets Store Works

The Secrets Store CSI Driver operates as a DaemonSet that communicates with external secret providers through plugins. When a pod mounts a CSI volume referencing a SecretProviderClass, the driver fetches the secrets from the external provider and makes them available as files in the pod's filesystem. Optionally, it can also sync the secrets into Kubernetes Secret objects.

## Installing the CSI Driver with Flux

Deploy the Secrets Store CSI Driver using a Flux HelmRelease:

```yaml
apiVersion: source.toolkit.fluxcd.io/v1
kind: HelmRepository
metadata:
  name: secrets-store-csi
  namespace: flux-system
spec:
  interval: 1h
  url: https://kubernetes-sigs.github.io/secrets-store-csi-driver/charts
---
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata:
  name: secrets-store-csi-driver
  namespace: kube-system
spec:
  interval: 1h
  chart:
    spec:
      chart: secrets-store-csi-driver
      version: "1.4.x"
      sourceRef:
        kind: HelmRepository
        name: secrets-store-csi
        namespace: flux-system
  values:
    syncSecret:
      enabled: true
    enableSecretRotation: true
    rotationPollInterval: 2m
```

The `syncSecret.enabled: true` setting allows the driver to create Kubernetes Secret objects from the mounted secrets. The `enableSecretRotation` setting enables periodic re-fetching of secrets.

## AWS Secrets Manager Provider

### Installing the AWS Provider

```yaml
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata:
  name: secrets-store-csi-driver-provider-aws
  namespace: kube-system
spec:
  interval: 1h
  chart:
    spec:
      chart: secrets-store-csi-driver-provider-aws
      version: "0.3.x"
      sourceRef:
        kind: HelmRepository
        name: aws-provider
        namespace: flux-system
```

### Creating a SecretProviderClass for AWS

```yaml
apiVersion: secrets-store.csi.x-k8s.io/v1
kind: SecretProviderClass
metadata:
  name: app-secrets
  namespace: default
spec:
  provider: aws
  parameters:
    objects: |
      - objectName: "production/myapp/database"
        objectType: "secretsmanager"
        jmesPath:
          - path: username
            objectAlias: db-username
          - path: password
            objectAlias: db-password
  secretObjects:
    - secretName: app-db-credentials
      type: Opaque
      data:
        - objectName: db-username
          key: username
        - objectName: db-password
          key: password
```

The `secretObjects` section tells the CSI driver to also create a Kubernetes Secret named `app-db-credentials` with the fetched values. This is useful for applications that read secrets from environment variables rather than files.

### Pod Configuration

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: myapp
  namespace: default
spec:
  replicas: 2
  selector:
    matchLabels:
      app: myapp
  template:
    metadata:
      labels:
        app: myapp
    spec:
      serviceAccountName: myapp
      containers:
        - name: myapp
          image: myorg/myapp:v1.0.0
          envFrom:
            - secretRef:
                name: app-db-credentials
          volumeMounts:
            - name: secrets
              mountPath: /mnt/secrets
              readOnly: true
      volumes:
        - name: secrets
          csi:
            driver: secrets-store.csi.k8s.io
            readOnly: true
            volumeAttributes:
              secretProviderClass: app-secrets
```

The service account must have IAM permissions to access the secret in AWS Secrets Manager. Use IRSA to bind the Kubernetes service account to an IAM role.

## Azure Key Vault Provider

### Installing the Azure Provider

```yaml
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata:
  name: csi-secrets-store-provider-azure
  namespace: kube-system
spec:
  interval: 1h
  chart:
    spec:
      chart: csi-secrets-store-provider-azure
      version: "1.5.x"
      sourceRef:
        kind: HelmRepository
        name: azure-provider
        namespace: flux-system
```

### SecretProviderClass for Azure Key Vault

```yaml
apiVersion: secrets-store.csi.x-k8s.io/v1
kind: SecretProviderClass
metadata:
  name: azure-secrets
  namespace: default
spec:
  provider: azure
  parameters:
    usePodIdentity: "false"
    useVMManagedIdentity: "true"
    userAssignedIdentityID: "<managed-identity-client-id>"
    keyvaultName: "my-keyvault"
    objects: |
      array:
        - |
          objectName: db-connection-string
          objectType: secret
        - |
          objectName: api-key
          objectType: secret
    tenantId: "<azure-tenant-id>"
  secretObjects:
    - secretName: azure-app-secrets
      type: Opaque
      data:
        - objectName: db-connection-string
          key: connection-string
        - objectName: api-key
          key: api-key
```

## HashiCorp Vault Provider

### SecretProviderClass for Vault

```yaml
apiVersion: secrets-store.csi.x-k8s.io/v1
kind: SecretProviderClass
metadata:
  name: vault-secrets
  namespace: default
spec:
  provider: vault
  parameters:
    vaultAddress: "https://vault.example.com:8200"
    roleName: "myapp-role"
    objects: |
      - objectName: "db-password"
        secretPath: "secret/data/myapp/database"
        secretKey: "password"
      - objectName: "api-token"
        secretPath: "secret/data/myapp/api"
        secretKey: "token"
  secretObjects:
    - secretName: vault-app-secrets
      type: Opaque
      data:
        - objectName: db-password
          key: password
        - objectName: api-token
          key: token
```

## Managing SecretProviderClass with Flux Kustomization

Organize your SecretProviderClass resources in the GitOps repository:

```
clusters/
  production/
    secrets/
      kustomization.yaml
      secret-provider-class.yaml
```

```yaml
# kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - secret-provider-class.yaml
```

Reference this in your Flux Kustomization:

```yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: app-secrets
  namespace: flux-system
spec:
  interval: 10m
  sourceRef:
    kind: GitRepository
    name: flux-system
  path: ./clusters/production/secrets
  prune: true
```

## Secret Rotation

The CSI driver supports automatic secret rotation when `enableSecretRotation` is enabled. Secrets are re-fetched at the interval specified by `rotationPollInterval`. This means that when you update a secret in your external provider, pods will receive the updated value without restarting.

For synced Kubernetes Secrets, the Secret object is also updated, but pods using environment variables from that Secret will need to be restarted to pick up the new values.

## Troubleshooting

**Pod stuck in ContainerCreating**: Check the CSI driver and provider pods are running. Examine events on the pod:

```bash
kubectl describe pod myapp-xyz -n default
```

**Secret not synced to Kubernetes Secret**: The synced Secret is only created after a pod mounts the volume. Ensure at least one pod is actively mounting the SecretProviderClass.

**Authentication failures**: Verify the service account has the correct IAM role (AWS), managed identity (Azure), or Vault role binding (Vault).

The CSI Secrets Store integration with Flux CD provides a secure, declarative approach to secrets management. Sensitive values never enter your Git repository, while the SecretProviderClass configuration that defines which secrets to fetch is fully managed through GitOps.
