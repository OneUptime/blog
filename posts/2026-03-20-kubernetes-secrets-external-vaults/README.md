# How to Configure Kubernetes Secrets with External Vaults in Rancher (2)

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rancher, Kubernetes, Secret, HashiCorp Vault, External Secrets, Security

Description: Configure Kubernetes secrets management using external vaults in Rancher, integrating HashiCorp Vault and the External Secrets Operator for centralized, auditable secret storage.

## Introduction

Kubernetes native Secrets are base64-encoded and are stored unencrypted in etcd unless you enable encryption at rest. They also do not provide built-in secret rotation or centralized secret management features. External vault solutions like HashiCorp Vault provide encryption, dynamic secrets, audit logging, and fine-grained access policies. This guide covers integrating external vaults with Kubernetes clusters managed by Rancher.

## Architecture Overview

```text
┌─────────────────────────────────────────┐
│  Kubernetes Cluster (Rancher-managed)   │
│                                         │
│  ┌─────────────┐    ┌────────────────┐  │
│  │ Application │───▶│  K8s Secret    │  │
│  │    Pod      │    │  (synced copy) │  │
│  └─────────────┘    └───────┬────────┘  │
│                             │ sync      │
│  ┌─────────────────────────▼──────────┐ │
│  │   External Secrets Operator (ESO)  │ │
│  └─────────────────────────┬──────────┘ │
└─────────────────────────────┼──────────┘
                              │ fetch
                    ┌─────────▼─────────┐
                    │  HashiCorp Vault   │
                    │  (external)        │
                    └───────────────────┘
```

## Option 1: External Secrets Operator with HashiCorp Vault

### Install External Secrets Operator

```bash
helm repo add external-secrets https://charts.external-secrets.io
helm repo update

helm install external-secrets \
  external-secrets/external-secrets \
  --namespace external-secrets \
  --create-namespace \
  --set installCRDs=true \
  --set metrics.service.enabled=true
```

### Configure Vault Authentication

```bash
# Enable Kubernetes auth in Vault

vault auth enable kubernetes

# Grant the Vault service account permission to call the TokenReview API
kubectl create clusterrolebinding vault-tokenreview-binding \
  --clusterrole=system:auth-delegator \
  --serviceaccount=<vault-namespace>:<vault-service-account>

# Configure the Kubernetes auth method
vault write auth/kubernetes/config \
  kubernetes_host="https://kubernetes.default.svc" \
  kubernetes_ca_cert=@/var/run/secrets/kubernetes.io/serviceaccount/ca.crt \
  token_reviewer_jwt=@/var/run/secrets/kubernetes.io/serviceaccount/token

# Create a Vault policy for secret access
vault policy write app-secrets - <<EOF
path "secret/data/myapp/*" {
  capabilities = ["read"]
}
EOF

# Bind the policy to the Kubernetes service account
vault write auth/kubernetes/role/myapp \
  bound_service_account_names=myapp-sa \
  bound_service_account_namespaces=production \
  policies=app-secrets \
  audience=vault \
  ttl=1h
```

### Create SecretStore

```yaml
# secretstore.yaml
apiVersion: external-secrets.io/v1
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
          role: "myapp"
          serviceAccountRef:
            name: "myapp-sa"
            audiences:
              - "vault"
```

### Create ExternalSecret

```yaml
# externalsecret.yaml
apiVersion: external-secrets.io/v1
kind: ExternalSecret
metadata:
  name: myapp-secrets
  namespace: production
spec:
  refreshInterval: 1h
  secretStoreRef:
    name: vault-backend
    kind: SecretStore
  target:
    name: myapp-secret
    creationPolicy: Owner
  data:
    - secretKey: database-password
      remoteRef:
        key: myapp/database
        property: password
    - secretKey: api-key
      remoteRef:
        key: myapp/api
        property: key
```

## Option 2: Vault Agent Injector

The Vault Agent Injector uses a mutating webhook to inject secrets directly into pod filesystems:

```yaml
# pod with vault annotations
apiVersion: v1
kind: Pod
metadata:
  name: myapp
  namespace: production
  annotations:
    vault.hashicorp.com/agent-inject: "true"
    vault.hashicorp.com/role: "myapp"
    vault.hashicorp.com/agent-inject-secret-config: "secret/data/myapp/database"
    vault.hashicorp.com/agent-inject-template-config: |
      {{- with secret "secret/data/myapp/database" -}}
      export DB_PASSWORD="{{ .Data.data.password }}"
      export DB_HOST="{{ .Data.data.host }}"
      {{- end }}
spec:
  serviceAccountName: myapp-sa
  containers:
    - name: app
      image: myregistry/myapp:latest
      command: ["/bin/sh", "-c", ". /vault/secrets/config && ./start.sh"]
```

## Option 3: AWS Secrets Manager via ESO on Amazon EKS

For Amazon EKS clusters with IRSA already configured:

```yaml
# ClusterSecretStore for AWS Secrets Manager
apiVersion: external-secrets.io/v1
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

## Step 4: Sync Rotated Secrets

Configure automatic refresh by setting a short refresh interval:

```yaml
spec:
  refreshInterval: 15m    # Sync every 15 minutes from Vault
```

Force immediate sync:

```bash
# Trigger immediate secret refresh
kubectl annotate externalsecret myapp-secrets \
  force-sync=$(date +%s) \
  --overwrite \
  -n production
```

## Step 5: Monitor Secret Sync Status

```bash
# Check ExternalSecret sync status
kubectl get externalsecrets -n production

# View sync details
kubectl describe externalsecret myapp-secrets -n production

# Check ESO metrics
kubectl port-forward svc/external-secrets-metrics 8080:8080 -n external-secrets
```

## Conclusion

External vaults combined with the External Secrets Operator provide enterprise-grade secret management for Rancher-managed Kubernetes clusters. Secrets are centrally managed in Vault with audit trails and access policies, while Kubernetes applications consume them as synced native Secrets or injected files. This approach can support compliance controls for frameworks such as PCI-DSS, SOC 2, and HIPAA when it is implemented alongside the required platform and organizational controls.
