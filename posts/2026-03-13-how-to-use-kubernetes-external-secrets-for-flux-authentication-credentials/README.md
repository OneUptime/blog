# How to Use Kubernetes External Secrets for Flux Authentication Credentials

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux, Kubernetes, GitOps, Source Controller, Authentication, Secrets, External Secrets, External Secrets Operator, Vault, AWS Secrets Manager, Secret Management

Description: How to use the External Secrets Operator with Flux CD to automatically sync and rotate authentication credentials from external secret stores.

---

## Introduction

Managing Flux authentication credentials as static Kubernetes secrets works but creates operational overhead around rotation, auditing, and access control. The External Secrets Operator (ESO) bridges Kubernetes with external secret management systems like HashiCorp Vault, AWS Secrets Manager, Azure Key Vault, and Google Secret Manager. By combining ESO with Flux, your Git and Helm repository credentials are automatically synced and rotated without manual intervention. This guide covers the full integration.

## Prerequisites

- A Kubernetes cluster with Flux CD installed
- `kubectl` and `helm` configured to access your cluster
- An external secret store (Vault, AWS Secrets Manager, Azure Key Vault, or GCP Secret Manager)
- Credentials to access the external secret store from the cluster

## Architecture Overview

The flow works as follows:

1. Credentials are stored in an external secret store (e.g., Vault)
2. The External Secrets Operator watches `ExternalSecret` resources
3. ESO fetches secrets from the store and creates Kubernetes secrets
4. Flux source controller reads the Kubernetes secrets for authentication
5. When the external secret is updated, ESO syncs the change to Kubernetes
6. Flux picks up the new credentials on the next reconciliation

## Step 1: Install the External Secrets Operator

Install ESO using Flux itself, keeping everything in your GitOps pipeline.

```yaml
apiVersion: source.toolkit.fluxcd.io/v1
kind: HelmRepository
metadata:
  name: external-secrets
  namespace: flux-system
spec:
  interval: 1h
  url: https://charts.external-secrets.io
```

```yaml
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata:
  name: external-secrets
  namespace: flux-system
spec:
  interval: 30m
  chart:
    spec:
      chart: external-secrets
      version: ">=0.9.0"
      sourceRef:
        kind: HelmRepository
        name: external-secrets
  targetNamespace: external-secrets
  install:
    createNamespace: true
```

Apply these resources:

```bash
kubectl apply -f helm-repository.yaml
kubectl apply -f helm-release.yaml

# Wait for ESO to be ready
kubectl wait --for=condition=ready pod -l app.kubernetes.io/name=external-secrets -n external-secrets --timeout=120s
```

## Step 2: Configure the SecretStore

A `SecretStore` (or `ClusterSecretStore`) defines the connection to your external secret provider.

### HashiCorp Vault

```yaml
apiVersion: external-secrets.io/v1beta1
kind: ClusterSecretStore
metadata:
  name: vault-backend
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

### AWS Secrets Manager

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
            name: external-secrets-sa
            namespace: external-secrets
```

### Azure Key Vault

```yaml
apiVersion: external-secrets.io/v1beta1
kind: ClusterSecretStore
metadata:
  name: azure-keyvault
spec:
  provider:
    azurekv:
      tenantId: "YOUR_TENANT_ID"
      vaultUrl: "https://my-keyvault.vault.azure.net"
      authType: WorkloadIdentity
      serviceAccountRef:
        name: external-secrets-sa
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
      projectID: "my-gcp-project"
      auth:
        workloadIdentity:
          clusterLocation: us-central1
          clusterName: my-cluster
          clusterProjectID: my-gcp-project
          serviceAccountRef:
            name: external-secrets-sa
            namespace: external-secrets
```

Apply the secret store:

```bash
kubectl apply -f cluster-secret-store.yaml

# Verify it is ready
kubectl get clustersecretstore
```

## Step 3: Store Flux Credentials in the External Store

### Vault Example

```bash
# Store Git HTTPS credentials
vault kv put secret/flux/git-credentials \
  username=x-access-token \
  password=ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# Store Helm repository credentials
vault kv put secret/flux/helm-credentials \
  username=token \
  password=helm-repo-token-here

# Store SSH credentials
vault kv put secret/flux/ssh-credentials \
  identity="$(cat flux-key)" \
  identity.pub="$(cat flux-key.pub)" \
  known_hosts="$(ssh-keyscan github.com 2>/dev/null)"

# Store OCI registry credentials
vault kv put secret/flux/oci-credentials \
  .dockerconfigjson='{"auths":{"ghcr.io":{"username":"flux","password":"ghp_xxx","auth":"base64encoded"}}}'
```

### AWS Secrets Manager Example

```bash
aws secretsmanager create-secret \
  --name flux/git-credentials \
  --secret-string '{"username":"x-access-token","password":"ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"}'
```

## Step 4: Create ExternalSecret Resources for Flux

### Git HTTPS Credentials

```yaml
apiVersion: external-secrets.io/v1beta1
kind: ExternalSecret
metadata:
  name: flux-git-credentials
  namespace: flux-system
spec:
  refreshInterval: 1h
  secretStoreRef:
    kind: ClusterSecretStore
    name: vault-backend
  target:
    name: flux-git-auth
    creationPolicy: Owner
  data:
  - secretKey: username
    remoteRef:
      key: secret/flux/git-credentials
      property: username
  - secretKey: password
    remoteRef:
      key: secret/flux/git-credentials
      property: password
```

### Git SSH Credentials

```yaml
apiVersion: external-secrets.io/v1beta1
kind: ExternalSecret
metadata:
  name: flux-ssh-credentials
  namespace: flux-system
spec:
  refreshInterval: 1h
  secretStoreRef:
    kind: ClusterSecretStore
    name: vault-backend
  target:
    name: flux-ssh-auth
    creationPolicy: Owner
  data:
  - secretKey: identity
    remoteRef:
      key: secret/flux/ssh-credentials
      property: identity
  - secretKey: identity.pub
    remoteRef:
      key: secret/flux/ssh-credentials
      property: identity.pub
  - secretKey: known_hosts
    remoteRef:
      key: secret/flux/ssh-credentials
      property: known_hosts
```

### OCI Registry Credentials

```yaml
apiVersion: external-secrets.io/v1beta1
kind: ExternalSecret
metadata:
  name: flux-oci-credentials
  namespace: flux-system
spec:
  refreshInterval: 1h
  secretStoreRef:
    kind: ClusterSecretStore
    name: vault-backend
  target:
    name: flux-oci-auth
    creationPolicy: Owner
    template:
      type: kubernetes.io/dockerconfigjson
  data:
  - secretKey: .dockerconfigjson
    remoteRef:
      key: secret/flux/oci-credentials
      property: .dockerconfigjson
```

### Helm Repository Credentials

```yaml
apiVersion: external-secrets.io/v1beta1
kind: ExternalSecret
metadata:
  name: flux-helm-credentials
  namespace: flux-system
spec:
  refreshInterval: 1h
  secretStoreRef:
    kind: ClusterSecretStore
    name: vault-backend
  target:
    name: flux-helm-auth
    creationPolicy: Owner
  data:
  - secretKey: username
    remoteRef:
      key: secret/flux/helm-credentials
      property: username
  - secretKey: password
    remoteRef:
      key: secret/flux/helm-credentials
      property: password
```

Apply all external secrets:

```bash
kubectl apply -f external-secrets/
```

## Step 5: Verify the External Secrets Are Synced

```bash
# Check ExternalSecret status
kubectl get externalsecret -n flux-system

# All should show SecretSynced
kubectl get externalsecret -n flux-system -o jsonpath='{range .items[*]}{.metadata.name}{"\t"}{.status.conditions[0].type}{"\t"}{.status.conditions[0].status}{"\n"}{end}'

# Verify the Kubernetes secrets were created
kubectl get secrets -n flux-system | grep flux-
```

## Step 6: Reference the Synced Secrets in Flux Sources

The secrets created by ESO are standard Kubernetes secrets that Flux can reference.

```yaml
apiVersion: source.toolkit.fluxcd.io/v1
kind: GitRepository
metadata:
  name: my-app
  namespace: flux-system
spec:
  interval: 5m
  url: https://github.com/my-org/my-app.git
  ref:
    branch: main
  secretRef:
    name: flux-git-auth
```

```yaml
apiVersion: source.toolkit.fluxcd.io/v1
kind: HelmRepository
metadata:
  name: private-charts
  namespace: flux-system
spec:
  interval: 30m
  url: https://charts.private.example.com
  secretRef:
    name: flux-helm-auth
```

## Step 7: Automatic Rotation Flow

When you update the credential in the external store, ESO automatically syncs it.

```bash
# Update the token in Vault
vault kv put secret/flux/git-credentials \
  username=x-access-token \
  password=ghp_NEW_TOKEN_HERE

# ESO will sync within the refreshInterval (1h in our example)
# Or force a sync
kubectl annotate externalsecret flux-git-credentials \
  -n flux-system \
  force-sync="$(date +%s)" \
  --overwrite

# Verify the secret was updated
kubectl get externalsecret -n flux-system flux-git-credentials \
  -o jsonpath='{.status.refreshTime}'
```

## Step 8: Set Up Alerts for Sync Failures

Create a Flux alert to notify you if credential syncing fails.

```yaml
apiVersion: notification.toolkit.fluxcd.io/v1
kind: Alert
metadata:
  name: external-secrets-alert
  namespace: flux-system
spec:
  providerRef:
    name: slack-provider
  eventSeverity: error
  eventSources:
  - kind: GitRepository
    name: "*"
  - kind: HelmRepository
    name: "*"
```

## Step 9: Monitoring and Observability

Monitor the health of the credential pipeline.

```bash
# Check ESO operator logs
kubectl logs -n external-secrets deploy/external-secrets --tail=20

# Check for sync errors
kubectl get externalsecret -n flux-system -o jsonpath='{range .items[*]}{.metadata.name}{"\t"}{.status.conditions[0].message}{"\n"}{end}'

# Check Flux source status
flux get sources git
flux get sources helm
```

## Security Considerations

### Least Privilege for ESO

The ESO service account should only have access to the specific secrets Flux needs, not the entire secret store.

### Vault Policy Example

```hcl
path "secret/data/flux/*" {
  capabilities = ["read"]
}
```

### AWS IAM Policy Example

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "secretsmanager:GetSecretValue"
      ],
      "Resource": [
        "arn:aws:secretsmanager:us-east-1:123456789012:secret:flux/*"
      ]
    }
  ]
}
```

### Refresh Interval Tuning

Set `refreshInterval` based on your rotation frequency:
- Tokens that rotate frequently: `15m` to `30m`
- Tokens that rotate monthly: `1h` to `6h`
- Static credentials: `12h` to `24h`

## Troubleshooting

### ExternalSecret Stuck in Error

```bash
# Check the detailed status
kubectl describe externalsecret -n flux-system flux-git-credentials

# Common issues:
# - SecretStore not ready
# - Wrong path or property name
# - Authentication failure to the external store
```

### Secret Not Updating

```bash
# Check the last refresh time
kubectl get externalsecret -n flux-system flux-git-credentials -o jsonpath='{.status.refreshTime}'

# Force a refresh
kubectl annotate externalsecret flux-git-credentials \
  -n flux-system \
  force-sync="$(date +%s)" \
  --overwrite
```

### Flux Not Picking Up Updated Secret

Flux reads the secret on each reconciliation cycle. Force it:

```bash
flux reconcile source git my-app
```

## Conclusion

Using the External Secrets Operator with Flux eliminates manual credential management. Credentials stored in Vault, AWS Secrets Manager, Azure Key Vault, or GCP Secret Manager are automatically synced to Kubernetes secrets that Flux can reference. When credentials are rotated in the external store, ESO propagates the change to Kubernetes, and Flux picks up the new credentials on its next reconciliation. This approach improves security, reduces operational overhead, and fits naturally into a GitOps workflow.
