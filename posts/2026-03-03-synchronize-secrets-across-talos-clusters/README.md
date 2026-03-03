# How to Synchronize Secrets Across Talos Clusters

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Kubernetes, Secrets Management, Multi-Cluster, Vault, External Secrets

Description: Learn how to synchronize and manage Kubernetes secrets across multiple Talos Linux clusters using external secret stores and automated synchronization tools.

---

Secrets management is hard enough in a single cluster. When you have multiple Talos Linux clusters that need access to the same credentials, API keys, and certificates, it gets even more challenging. You cannot just copy secrets between clusters manually - that does not scale, leaves no audit trail, and is a security incident waiting to happen.

This guide covers practical approaches to synchronizing secrets across multiple Talos Linux clusters while maintaining security and operational sanity.

## The Problem with Secrets at Scale

In a multi-cluster setup, the same secrets often need to exist in several places. Your application clusters all need database credentials. Every cluster needs TLS certificates for ingress. Service accounts for cloud providers need to be available wherever your workloads run.

The naive approach is to create Kubernetes Secrets in each cluster manually or through scripts. This breaks down quickly because there is no single source of truth, rotation requires updating every cluster, and there is no audit trail showing who accessed what.

## Using an External Secret Store

The foundation of multi-cluster secret management is an external secret store that serves as the single source of truth. All clusters pull secrets from this central store. When a secret changes, all clusters pick up the update automatically.

Popular options include HashiCorp Vault, AWS Secrets Manager, Azure Key Vault, and Google Secret Manager. For this guide, we will focus on Vault since it works with any infrastructure.

### Setting Up HashiCorp Vault

First, deploy Vault. You can run it on one of your Talos clusters or as a separate service:

```bash
# Install Vault via Helm on a management cluster
helm repo add hashicorp https://helm.releases.hashicorp.com
helm repo update

helm install vault hashicorp/vault \
  --namespace vault \
  --create-namespace \
  --set server.ha.enabled=true \
  --set server.ha.replicas=3 \
  --set server.dataStorage.size=10Gi
```

Initialize and unseal Vault:

```bash
# Initialize Vault
kubectl exec -n vault vault-0 -- vault operator init \
  -key-shares=5 \
  -key-threshold=3 \
  -format=json > vault-keys.json

# Unseal (repeat for each replica)
UNSEAL_KEY_1=$(jq -r '.unseal_keys_b64[0]' vault-keys.json)
UNSEAL_KEY_2=$(jq -r '.unseal_keys_b64[1]' vault-keys.json)
UNSEAL_KEY_3=$(jq -r '.unseal_keys_b64[2]' vault-keys.json)

kubectl exec -n vault vault-0 -- vault operator unseal $UNSEAL_KEY_1
kubectl exec -n vault vault-0 -- vault operator unseal $UNSEAL_KEY_2
kubectl exec -n vault vault-0 -- vault operator unseal $UNSEAL_KEY_3
```

Store your secrets in Vault:

```bash
# Enable the KV secrets engine
vault secrets enable -path=apps kv-v2

# Store application secrets
vault kv put apps/database \
  username="app_user" \
  password="s3cur3-p@ss" \
  host="db.example.com" \
  port="5432"

vault kv put apps/redis \
  url="redis://redis.example.com:6379" \
  password="r3dis-p@ss"
```

## External Secrets Operator

The External Secrets Operator (ESO) runs in each Kubernetes cluster and syncs secrets from external stores into Kubernetes Secrets. Install it on every Talos cluster that needs access to shared secrets:

```bash
# Install ESO on each cluster
helm install external-secrets external-secrets/external-secrets \
  --namespace external-secrets \
  --create-namespace \
  --set installCRDs=true
```

Configure a SecretStore that points to your Vault instance:

```yaml
# vault-secret-store.yaml
apiVersion: external-secrets.io/v1beta1
kind: ClusterSecretStore
metadata:
  name: vault-backend
spec:
  provider:
    vault:
      server: "https://vault.example.com"
      path: "apps"
      version: "v2"
      auth:
        kubernetes:
          mountPath: "kubernetes"
          role: "external-secrets"
          serviceAccountRef:
            name: external-secrets
            namespace: external-secrets
```

```bash
kubectl apply -f vault-secret-store.yaml
```

### Configuring Vault Authentication per Cluster

Each cluster needs its own Vault authentication. Kubernetes auth is the cleanest approach because it uses the cluster's own service account tokens:

```bash
# Enable Kubernetes auth for each cluster
vault auth enable -path=kubernetes-cluster-a kubernetes
vault auth enable -path=kubernetes-cluster-b kubernetes

# Configure auth for cluster-a
vault write auth/kubernetes-cluster-a/config \
  kubernetes_host="https://cluster-a.example.com:6443" \
  kubernetes_ca_cert=@cluster-a-ca.pem

# Create a policy
vault policy write external-secrets - <<EOF
path "apps/data/*" {
  capabilities = ["read"]
}
EOF

# Bind the policy to the service account
vault write auth/kubernetes-cluster-a/role/external-secrets \
  bound_service_account_names=external-secrets \
  bound_service_account_namespaces=external-secrets \
  policies=external-secrets \
  ttl=1h
```

## Creating Synchronized Secrets

Now create ExternalSecret resources that pull secrets from Vault and create Kubernetes Secrets:

```yaml
# database-secret.yaml
apiVersion: external-secrets.io/v1beta1
kind: ExternalSecret
metadata:
  name: database-credentials
  namespace: app
spec:
  refreshInterval: 5m  # Check for updates every 5 minutes
  secretStoreRef:
    name: vault-backend
    kind: ClusterSecretStore
  target:
    name: database-credentials
    creationPolicy: Owner
    template:
      type: Opaque
      data:
        DATABASE_URL: "postgresql://{{ .username }}:{{ .password }}@{{ .host }}:{{ .port }}/mydb"
  data:
    - secretKey: username
      remoteRef:
        key: database
        property: username
    - secretKey: password
      remoteRef:
        key: database
        property: password
    - secretKey: host
      remoteRef:
        key: database
        property: host
    - secretKey: port
      remoteRef:
        key: database
        property: port
```

Apply this ExternalSecret definition to every cluster that needs the database credentials. The External Secrets Operator handles syncing and keeps the Kubernetes Secret up to date with whatever is in Vault.

## Automating Secret Deployment Across Clusters

To avoid manually applying ExternalSecret manifests to each cluster, use GitOps. Store your ExternalSecret definitions in Git and let a tool like Flux or ArgoCD apply them:

```yaml
# flux-kustomization.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: shared-secrets
  namespace: flux-system
spec:
  interval: 10m
  path: ./secrets/shared
  prune: true
  sourceRef:
    kind: GitRepository
    name: infrastructure
  targetNamespace: app
```

This way, when you add a new ExternalSecret to your Git repo, it automatically gets deployed to every cluster managed by Flux.

## Secret Rotation

One of the biggest advantages of using an external secret store is automated rotation. When you rotate a secret in Vault, all clusters pick up the change on their next refresh interval:

```bash
# Rotate the database password in Vault
vault kv put apps/database \
  username="app_user" \
  password="new-s3cur3-p@ss" \
  host="db.example.com" \
  port="5432"

# The External Secrets Operator will update the Kubernetes Secret
# within the refreshInterval (5 minutes in our example)
```

For zero-downtime rotation, your applications need to handle secret changes gracefully. The simplest approach is to use a sidecar that watches for Secret changes and triggers a reload:

```yaml
# deployment-with-reloader.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: api-server
  annotations:
    reloader.stakater.com/auto: "true"  # Auto-reload on secret change
spec:
  template:
    spec:
      containers:
        - name: api
          image: api-server:latest
          envFrom:
            - secretRef:
                name: database-credentials
```

## Monitoring Secret Sync Status

Monitor that secrets are syncing correctly across all clusters. The External Secrets Operator exposes status conditions on each ExternalSecret:

```bash
# Check sync status
kubectl get externalsecrets -A
# NAME                    STORE          REFRESH   STATUS
# database-credentials    vault-backend  5m        SecretSynced

# Get detailed status
kubectl describe externalsecret database-credentials -n app
```

Set up alerts for sync failures:

```yaml
# prometheus-rule.yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: external-secrets-alerts
spec:
  groups:
    - name: external-secrets
      rules:
        - alert: ExternalSecretSyncFailed
          expr: external_secrets_sync_calls_error > 0
          for: 15m
          labels:
            severity: warning
          annotations:
            summary: "External secret sync failed"
```

## Summary

The pattern for multi-cluster secret synchronization on Talos Linux is straightforward: use an external secret store as your single source of truth, deploy the External Secrets Operator on every cluster, define your secrets as ExternalSecret resources in Git, and let automation handle the rest. Vault handles access control and audit logging, ESO handles synchronization, and GitOps handles deployment. Talos Linux fits naturally into this model because its API-driven configuration approach already encourages centralized, declarative management. Secrets are just another piece of that puzzle.
