# How to Deploy Vault Secrets Operator with Flux CD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: flux cd, vault, secrets operator, kubernetes, security, gitops, hashicorp

Description: A practical guide to deploying and configuring the HashiCorp Vault Secrets Operator on Kubernetes using Flux CD for GitOps-driven secret management.

---

## Introduction

The HashiCorp Vault Secrets Operator (VSO) allows Kubernetes workloads to consume secrets stored in Vault without requiring applications to interact with Vault directly. By combining VSO with Flux CD, you get a fully GitOps-driven secret management pipeline that syncs Vault secrets into native Kubernetes Secret objects automatically.

This guide walks you through deploying the Vault Secrets Operator using Flux CD, configuring Vault authentication, and creating secret synchronization resources.

## Prerequisites

Before getting started, ensure you have:

- A Kubernetes cluster (v1.25+)
- Flux CD installed and bootstrapped
- A running HashiCorp Vault instance (v1.11+)
- kubectl and flux CLI tools installed

## Repository Structure

Organize your GitOps repository with the following structure:

```
clusters/
  my-cluster/
    vault-secrets-operator/
      namespace.yaml
      helmrepository.yaml
      helmrelease.yaml
      vault-connection.yaml
      vault-auth.yaml
      static-secret.yaml
```

## Step 1: Create the Namespace

Define a dedicated namespace for the Vault Secrets Operator.

```yaml
# clusters/my-cluster/vault-secrets-operator/namespace.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: vault-secrets-operator
  labels:
    # Label for Flux to track this resource
    app.kubernetes.io/managed-by: flux
```

## Step 2: Add the HashiCorp Helm Repository

Create a HelmRepository source pointing to the HashiCorp Helm chart registry.

```yaml
# clusters/my-cluster/vault-secrets-operator/helmrepository.yaml
apiVersion: source.toolkit.fluxcd.io/v1
kind: HelmRepository
metadata:
  name: hashicorp
  namespace: vault-secrets-operator
spec:
  interval: 1h
  # Official HashiCorp Helm chart repository
  url: https://helm.releases.hashicorp.com
```

## Step 3: Create the HelmRelease

Deploy the Vault Secrets Operator using a HelmRelease resource.

```yaml
# clusters/my-cluster/vault-secrets-operator/helmrelease.yaml
apiVersion: helm.toolkit.fluxcd.io/v1
kind: HelmRelease
metadata:
  name: vault-secrets-operator
  namespace: vault-secrets-operator
spec:
  interval: 30m
  chart:
    spec:
      chart: vault-secrets-operator
      version: "0.9.x"
      sourceRef:
        kind: HelmRepository
        name: hashicorp
        namespace: vault-secrets-operator
      interval: 12h
  values:
    # Default Vault connection configuration
    defaultVaultConnection:
      enabled: true
      # Address of your Vault instance
      address: "https://vault.example.com:8200"
      # Skip TLS verification (set to false in production)
      skipTLSVerify: false

    # Controller configuration
    controller:
      replicas: 2
      resources:
        requests:
          cpu: 100m
          memory: 128Mi
        limits:
          cpu: 500m
          memory: 256Mi

    # Enable leader election for HA
    controller.manager.leaderElection:
      enabled: true

    # Metrics configuration for monitoring
    telemetry:
      serviceMonitor:
        enabled: true
```

## Step 4: Configure Vault Connection

Define a VaultConnection resource to specify how the operator connects to Vault.

```yaml
# clusters/my-cluster/vault-secrets-operator/vault-connection.yaml
apiVersion: secrets.hashicorp.com/v1beta1
kind: VaultConnection
metadata:
  name: vault-connection
  namespace: vault-secrets-operator
spec:
  # The address of the Vault server
  address: "https://vault.example.com:8200"
  # Path to the CA certificate for TLS verification
  caCertSecretRef: vault-ca-cert
  # Skip TLS verification (not recommended for production)
  skipTLSVerify: false
  # Headers to include in Vault requests
  headers:
    X-Vault-Namespace: "admin"
```

## Step 5: Configure Vault Authentication

Set up Kubernetes-based authentication so the operator can authenticate with Vault.

```yaml
# clusters/my-cluster/vault-secrets-operator/vault-auth.yaml
apiVersion: secrets.hashicorp.com/v1beta1
kind: VaultAuth
metadata:
  name: vault-auth
  namespace: vault-secrets-operator
spec:
  # Reference to the VaultConnection
  vaultConnectionRef: vault-connection
  # Use Kubernetes authentication method
  method: kubernetes
  # Mount path for the Kubernetes auth method in Vault
  mount: kubernetes
  kubernetes:
    # Vault role to authenticate as
    role: vault-secrets-operator
    # Service account used for authentication
    serviceAccount: vault-secrets-operator
    # Audiences for the token review
    audiences:
      - vault
```

## Step 6: Enable Vault Kubernetes Auth (Vault Side)

Run these commands on your Vault instance to enable Kubernetes authentication:

```bash
# Enable the Kubernetes auth method
vault auth enable kubernetes

# Configure the Kubernetes auth method with cluster details
vault write auth/kubernetes/config \
  kubernetes_host="https://kubernetes.default.svc:443"

# Create a policy for the secrets operator
vault policy write vso-policy - <<EOF
path "secret/data/*" {
  capabilities = ["read", "list"]
}
path "secret/metadata/*" {
  capabilities = ["read", "list"]
}
EOF

# Create a role for the secrets operator
vault write auth/kubernetes/role/vault-secrets-operator \
  bound_service_account_names=vault-secrets-operator \
  bound_service_account_namespaces=vault-secrets-operator \
  policies=vso-policy \
  ttl=1h
```

## Step 7: Create a VaultStaticSecret

Sync a secret from Vault into a Kubernetes Secret.

```yaml
# clusters/my-cluster/vault-secrets-operator/static-secret.yaml
apiVersion: secrets.hashicorp.com/v1beta1
kind: VaultStaticSecret
metadata:
  name: app-database-credentials
  namespace: default
spec:
  # Reference to the VaultAuth configuration
  vaultAuthRef: vault-secrets-operator/vault-auth
  # Type of Vault secret engine
  type: kv-v2
  # Mount path of the secret engine in Vault
  mount: secret
  # Path to the secret within the mount
  path: apps/database
  # How often to refresh the secret from Vault
  refreshAfter: 60s
  # Kubernetes Secret to create or update
  destination:
    name: database-credentials
    create: true
    labels:
      app: my-application
    type: Opaque
  # Roll deployments when the secret changes
  rolloutRestartTargets:
    - kind: Deployment
      name: my-application
```

## Step 8: Create a VaultDynamicSecret

For dynamic secrets like database credentials, use VaultDynamicSecret.

```yaml
# clusters/my-cluster/vault-secrets-operator/dynamic-secret.yaml
apiVersion: secrets.hashicorp.com/v1beta1
kind: VaultDynamicSecret
metadata:
  name: postgres-dynamic-creds
  namespace: default
spec:
  # Reference to the VaultAuth configuration
  vaultAuthRef: vault-secrets-operator/vault-auth
  # Mount path for the database secret engine
  mount: database
  # Path to generate credentials
  path: creds/my-postgres-role
  # Renew the lease before expiration
  renewalPercent: 67
  # Kubernetes Secret to create or update
  destination:
    name: postgres-dynamic-credentials
    create: true
    type: Opaque
  # Restart the deployment when credentials rotate
  rolloutRestartTargets:
    - kind: Deployment
      name: postgres-app
```

## Step 9: Add a Kustomization for Flux

Tie everything together with a Flux Kustomization.

```yaml
# clusters/my-cluster/vault-secrets-operator/kustomization.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: vault-secrets-operator
  namespace: flux-system
spec:
  interval: 10m
  # Path to the vault-secrets-operator manifests
  path: ./clusters/my-cluster/vault-secrets-operator
  prune: true
  sourceRef:
    kind: GitRepository
    name: flux-system
  # Wait for resources to become ready
  wait: true
  timeout: 5m
  # Health checks for the deployment
  healthChecks:
    - apiVersion: apps/v1
      kind: Deployment
      name: vault-secrets-operator
      namespace: vault-secrets-operator
```

## Verifying the Deployment

After Flux reconciles the resources, verify the operator is running:

```bash
# Check that the operator pods are running
kubectl get pods -n vault-secrets-operator

# Verify the VaultConnection is established
kubectl get vaultconnection -n vault-secrets-operator

# Verify the VaultAuth is configured
kubectl get vaultauth -n vault-secrets-operator

# Check that secrets are being synced
kubectl get vaultstaticsecret -A

# Inspect a synced Kubernetes secret
kubectl get secret database-credentials -n default -o jsonpath='{.data}' | jq .
```

## Troubleshooting

Common issues and their solutions:

```bash
# Check the operator logs for authentication errors
kubectl logs -n vault-secrets-operator -l app.kubernetes.io/name=vault-secrets-operator

# Verify the service account token is valid
kubectl get serviceaccount vault-secrets-operator -n vault-secrets-operator -o yaml

# Check VaultStaticSecret status for sync errors
kubectl describe vaultstaticsecret app-database-credentials -n default

# Verify Vault connectivity from within the cluster
kubectl run vault-test --rm -it --image=curlimages/curl -- \
  curl -s https://vault.example.com:8200/v1/sys/health
```

## Security Best Practices

When running the Vault Secrets Operator with Flux CD, follow these best practices:

- Use TLS for all Vault communication and avoid skipTLSVerify in production
- Apply the principle of least privilege to Vault policies
- Use short TTLs for dynamic secrets and configure appropriate renewal percentages
- Enable audit logging in Vault to track secret access
- Store Vault CA certificates as Kubernetes secrets managed by Flux
- Use Flux SOPS or Sealed Secrets for any bootstrap secrets the operator needs
- Enable network policies to restrict operator communication to Vault only

## Conclusion

By deploying the Vault Secrets Operator with Flux CD, you establish a secure, GitOps-driven workflow for managing secrets in Kubernetes. The operator automatically syncs secrets from Vault, handles rotation, and can trigger rolling restarts when credentials change. This approach eliminates the need for applications to directly interact with Vault and keeps your secret management configuration version-controlled and auditable.
