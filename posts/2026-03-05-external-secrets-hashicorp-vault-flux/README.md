# How to Configure External Secrets with HashiCorp Vault in Flux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, GitOps, Kubernetes, External Secrets, HashiCorp Vault, Secrets Management

Description: Learn how to configure the External Secrets Operator with HashiCorp Vault in a Flux CD GitOps workflow to sync secrets from Vault into Kubernetes.

---

HashiCorp Vault is a widely adopted secrets management solution that provides dynamic secrets, encryption as a service, and fine-grained access control. By combining Vault with the External Secrets Operator (ESO) and Flux CD, you can manage Vault secret references through GitOps while keeping sensitive values securely stored in Vault. This guide covers the full integration using Kubernetes authentication.

## Prerequisites

- A Kubernetes cluster with Flux CD bootstrapped
- HashiCorp Vault instance (self-hosted or HCP Vault)
- Vault CLI installed and configured
- kubectl and flux CLI installed

## Step 1: Install External Secrets Operator with Flux

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
```

```yaml
# infrastructure/external-secrets/helmrelease.yaml
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata:
  name: external-secrets
  namespace: external-secrets
spec:
  interval: 30m
  chart:
    spec:
      chart: external-secrets
      version: "0.10.x"
      sourceRef:
        kind: HelmRepository
        name: external-secrets
        namespace: flux-system
  install:
    createNamespace: true
```

## Step 2: Configure Vault Kubernetes Authentication

Enable the Kubernetes auth method in Vault:

```bash
vault auth enable kubernetes
```

Configure it to connect to the Kubernetes API:

```bash
vault write auth/kubernetes/config \
  kubernetes_host="https://kubernetes.default.svc" \
  token_reviewer_jwt="$(cat /var/run/secrets/kubernetes.io/serviceaccount/token)" \
  kubernetes_ca_cert="$(cat /var/run/secrets/kubernetes.io/serviceaccount/ca.crt)"
```

If configuring from outside the cluster:

```bash
K8S_HOST=$(kubectl config view --minify -o jsonpath='{.clusters[0].cluster.server}')
K8S_CA=$(kubectl config view --minify --raw -o jsonpath='{.clusters[0].cluster.certificate-authority-data}' | base64 -d)
SA_TOKEN=$(kubectl create token external-secrets -n external-secrets --duration=8760h)

vault write auth/kubernetes/config \
  kubernetes_host="$K8S_HOST" \
  kubernetes_ca_cert="$K8S_CA" \
  token_reviewer_jwt="$SA_TOKEN"
```

## Step 3: Create a Vault Policy and Role

Define a policy that grants read access to your secrets:

```bash
vault policy write external-secrets - <<EOF
path "secret/data/myapp/*" {
  capabilities = ["read"]
}
path "secret/metadata/myapp/*" {
  capabilities = ["read", "list"]
}
EOF
```

Create a Kubernetes auth role that binds the policy to the ESO service account:

```bash
vault write auth/kubernetes/role/external-secrets \
  bound_service_account_names=external-secrets \
  bound_service_account_namespaces=external-secrets \
  policies=external-secrets \
  ttl=1h
```

## Step 4: Store Secrets in Vault

```bash
# Enable the KV v2 secrets engine if not already enabled
vault secrets enable -path=secret kv-v2

# Store database credentials
vault kv put secret/myapp/database \
  host=db.example.com \
  port=5432 \
  username=myapp_user \
  password=s3cret-password \
  dbname=production

# Store an API key
vault kv put secret/myapp/api-key \
  value=ak_live_xxxxxxxxxxxx
```

## Step 5: Create a ClusterSecretStore

```yaml
# infrastructure/external-secrets/clustersecretstore.yaml
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

For Vault with a self-signed certificate, add the CA bundle:

```yaml
spec:
  provider:
    vault:
      server: "https://vault.example.com"
      path: "secret"
      version: "v2"
      caBundle: "LS0tLS1CRUdJTi..."  # base64-encoded CA cert
      auth:
        kubernetes:
          mountPath: "kubernetes"
          role: "external-secrets"
          serviceAccountRef:
            name: external-secrets
            namespace: external-secrets
```

## Step 6: Create ExternalSecret Resources

For the database credentials:

```yaml
# apps/my-app/external-secret-db.yaml
apiVersion: external-secrets.io/v1beta1
kind: ExternalSecret
metadata:
  name: database-credentials
  namespace: my-app
spec:
  refreshInterval: 30m
  secretStoreRef:
    name: vault-backend
    kind: ClusterSecretStore
  target:
    name: database-credentials
    creationPolicy: Owner
  data:
    - secretKey: DB_HOST
      remoteRef:
        key: myapp/database
        property: host
    - secretKey: DB_PORT
      remoteRef:
        key: myapp/database
        property: port
    - secretKey: DB_USER
      remoteRef:
        key: myapp/database
        property: username
    - secretKey: DB_PASSWORD
      remoteRef:
        key: myapp/database
        property: password
    - secretKey: DB_NAME
      remoteRef:
        key: myapp/database
        property: dbname
```

For the API key:

```yaml
# apps/my-app/external-secret-api.yaml
apiVersion: external-secrets.io/v1beta1
kind: ExternalSecret
metadata:
  name: api-key
  namespace: my-app
spec:
  refreshInterval: 30m
  secretStoreRef:
    name: vault-backend
    kind: ClusterSecretStore
  target:
    name: api-key
    creationPolicy: Owner
  data:
    - secretKey: API_KEY
      remoteRef:
        key: myapp/api-key
        property: value
```

## Step 7: Use dataFrom for All Keys

If you want all keys from a Vault secret mapped into the Kubernetes Secret:

```yaml
apiVersion: external-secrets.io/v1beta1
kind: ExternalSecret
metadata:
  name: database-credentials-all
  namespace: my-app
spec:
  refreshInterval: 30m
  secretStoreRef:
    name: vault-backend
    kind: ClusterSecretStore
  target:
    name: database-credentials
    creationPolicy: Owner
  dataFrom:
    - extract:
        key: myapp/database
```

This creates a Kubernetes Secret with keys matching the Vault secret keys: `host`, `port`, `username`, `password`, and `dbname`.

## Step 8: Verify and Troubleshoot

```bash
# Check ClusterSecretStore status
kubectl get clustersecretstore vault-backend

# Check ExternalSecret sync status
kubectl get externalsecrets -n my-app

# Verify the Kubernetes Secret
kubectl get secret database-credentials -n my-app -o jsonpath='{.data}' | jq

# Check ESO logs for errors
kubectl logs -n external-secrets deploy/external-secrets -f
```

Common issues:
- **Permission denied**: The Vault policy does not grant access to the secret path
- **Role not found**: The Kubernetes auth role name does not match the ClusterSecretStore configuration
- **Connection refused**: The Vault server URL is incorrect or not reachable from the cluster
- **Certificate errors**: Missing or incorrect CA bundle for self-signed Vault certificates

## Summary

Integrating External Secrets with HashiCorp Vault in Flux CD provides enterprise-grade secrets management with a GitOps workflow. Vault's Kubernetes authentication eliminates the need for static credentials, and the ExternalSecret resources managed by Flux define a clear mapping between Vault paths and Kubernetes Secrets. This approach supports secret versioning, dynamic secrets, and centralized access control while keeping your Git repository free of sensitive values.
