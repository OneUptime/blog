# How to Deploy Vault Agent with ArgoCD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: ArgoCD, GitOps, Kubernetes, Vault, Secrets

Description: Learn how to deploy HashiCorp Vault Agent with ArgoCD for GitOps-managed secret injection, dynamic secrets, and secure credential management on Kubernetes.

---

HashiCorp Vault is the industry standard for secrets management. Vault Agent is a client-side daemon that automates the process of authenticating to Vault, fetching secrets, and rendering them into files or environment variables. Deploying Vault Agent with ArgoCD lets you manage your secrets infrastructure through GitOps while keeping the actual secret values securely stored in Vault rather than in Git.

This guide covers deploying the Vault Agent Injector using ArgoCD, configuring Kubernetes authentication, and setting up secret injection for your applications.

## How Vault Agent Injection Works

The Vault Agent Injector is a Kubernetes mutating admission webhook that modifies pod specs to include:

1. An **init container** that authenticates to Vault and pre-fetches secrets before your application starts
2. A **sidecar container** that continuously renews secret leases and updates secrets as they rotate

When a pod has the annotation `vault.hashicorp.com/agent-inject: "true"`, the injector automatically adds these containers.

```mermaid
graph LR
    A[Pod Created] --> B[Mutating Webhook]
    B --> C[Inject Init Container]
    B --> D[Inject Sidecar Container]
    C --> E[Authenticate to Vault]
    E --> F[Fetch Secrets]
    F --> G[Write to Shared Volume]
    G --> H[Application Reads Secrets]
    D --> I[Renew Leases]
    D --> J[Update Rotated Secrets]
```

## Repository Structure

```text
secrets/
  vault/
    Chart.yaml
    values.yaml
    values-production.yaml
  vault-config/
    auth-config.yaml
    policies/
      app-read-policy.yaml
      db-creds-policy.yaml
    roles/
      app-role.yaml
```

## Deploying Vault with the Agent Injector

### Wrapper Chart

```yaml
# secrets/vault/Chart.yaml
apiVersion: v2
name: vault
description: Wrapper chart for HashiCorp Vault
type: application
version: 1.0.0
dependencies:
  - name: vault
    version: "0.28.1"
    repository: "https://helm.releases.hashicorp.com"
```

### Vault Values

```yaml
# secrets/vault/values.yaml
vault:
  # Global settings
  global:
    enabled: true

  # Vault Server configuration
  server:
    # For production, use HA mode with Raft storage
    ha:
      enabled: true
      replicas: 3
      raft:
        enabled: true
        config: |
          ui = true

          listener "tcp" {
            tls_disable = 1
            address = "[::]:8200"
            cluster_address = "[::]:8201"
          }

          storage "raft" {
            path = "/vault/data"
            retry_join {
              leader_api_addr = "http://vault-0.vault-internal:8200"
            }
            retry_join {
              leader_api_addr = "http://vault-1.vault-internal:8200"
            }
            retry_join {
              leader_api_addr = "http://vault-2.vault-internal:8200"
            }
          }

          service_registration "kubernetes" {}

    resources:
      requests:
        cpu: 250m
        memory: 256Mi
      limits:
        memory: 512Mi

    dataStorage:
      enabled: true
      size: 10Gi
      storageClass: gp3

    auditStorage:
      enabled: true
      size: 10Gi
      storageClass: gp3

    # Service account for Kubernetes auth
    serviceAccount:
      create: true
      name: vault

  # Vault Agent Injector
  injector:
    enabled: true
    replicas: 2

    resources:
      requests:
        cpu: 100m
        memory: 128Mi
      limits:
        memory: 256Mi

    # Metrics
    metrics:
      enabled: true

    # Agent defaults
    agentDefaults:
      cpuLimit: 250m
      cpuRequest: 50m
      memLimit: 128Mi
      memRequest: 64Mi
      template: map

    # Webhook failure policy
    failurePolicy: Ignore

  # UI
  ui:
    enabled: true
    serviceType: ClusterIP

  # CSI Provider (alternative to Agent Injector)
  csi:
    enabled: false

  # ServiceMonitor
  serverTelemetry:
    serviceMonitor:
      enabled: true
      selectors:
        release: kube-prometheus-stack
```

### ArgoCD Application

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: vault
  namespace: argocd
  finalizers:
    - resources-finalizer.argocd.argoproj.io
spec:
  project: secrets
  source:
    repoURL: https://github.com/your-org/gitops-repo.git
    targetRevision: main
    path: secrets/vault
    helm:
      valueFiles:
        - values.yaml
        - values-production.yaml
  destination:
    server: https://kubernetes.default.svc
    namespace: vault
  syncPolicy:
    automated:
      prune: true
      selfHeal: true
    syncOptions:
      - CreateNamespace=true
      - ServerSideApply=true
    retry:
      limit: 5
      backoff:
        duration: 10s
        factor: 2
        maxDuration: 5m
  ignoreDifferences:
    - group: admissionregistration.k8s.io
      kind: MutatingWebhookConfiguration
      jqPathExpressions:
        - '.webhooks[]?.clientConfig.caBundle'
```

## Configuring Kubernetes Authentication

After Vault is deployed and initialized, configure the Kubernetes auth method. This is typically done as a one-time setup, but you can manage the configuration as code.

```bash
# Initialize Vault (one-time)
kubectl exec -n vault vault-0 -- vault operator init -key-shares=5 -key-threshold=3

# Unseal Vault (required after every restart)
kubectl exec -n vault vault-0 -- vault operator unseal <key1>
kubectl exec -n vault vault-0 -- vault operator unseal <key2>
kubectl exec -n vault vault-0 -- vault operator unseal <key3>

# Enable Kubernetes auth method
kubectl exec -n vault vault-0 -- vault auth enable kubernetes

# Configure Kubernetes auth
kubectl exec -n vault vault-0 -- vault write auth/kubernetes/config \
    kubernetes_host="https://kubernetes.default.svc:443"
```

## Creating Vault Policies

Store Vault policies in Git for documentation, though they need to be applied to Vault separately.

```hcl
# secrets/vault-config/policies/app-read-policy.hcl
# Policy allowing read access to application secrets
path "secret/data/apps/{{identity.entity.aliases.auth_kubernetes_*.metadata.service_account_namespace}}/*" {
  capabilities = ["read"]
}

path "secret/metadata/apps/{{identity.entity.aliases.auth_kubernetes_*.metadata.service_account_namespace}}/*" {
  capabilities = ["list"]
}
```

```hcl
# secrets/vault-config/policies/db-creds-policy.hcl
# Policy for dynamic database credentials
path "database/creds/{{identity.entity.aliases.auth_kubernetes_*.metadata.service_account_namespace}}-readonly" {
  capabilities = ["read"]
}
```

## Configuring Vault Roles for Kubernetes

```bash
# Create a Vault role for the backend service account
kubectl exec -n vault vault-0 -- vault write auth/kubernetes/role/backend-app \
    bound_service_account_names=backend-app \
    bound_service_account_namespaces=backend \
    policies=app-read-policy,db-creds-policy \
    ttl=1h
```

## Using Vault Agent Injection in Applications

Annotate your application deployments to have secrets injected.

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: backend-api
  namespace: backend
spec:
  replicas: 2
  selector:
    matchLabels:
      app: backend-api
  template:
    metadata:
      labels:
        app: backend-api
      annotations:
        # Enable Vault Agent injection
        vault.hashicorp.com/agent-inject: "true"
        vault.hashicorp.com/role: "backend-app"

        # Inject database credentials
        vault.hashicorp.com/agent-inject-secret-db-creds: "database/creds/backend-readonly"
        vault.hashicorp.com/agent-inject-template-db-creds: |
          {{- with secret "database/creds/backend-readonly" -}}
          export DB_USER="{{ .Data.username }}"
          export DB_PASS="{{ .Data.password }}"
          {{- end }}

        # Inject application config
        vault.hashicorp.com/agent-inject-secret-config: "secret/data/apps/backend/config"
        vault.hashicorp.com/agent-inject-template-config: |
          {{- with secret "secret/data/apps/backend/config" -}}
          {
            "api_key": "{{ .Data.data.api_key }}",
            "jwt_secret": "{{ .Data.data.jwt_secret }}"
          }
          {{- end }}

        # Pre-populate secrets before app starts
        vault.hashicorp.com/agent-pre-populate-only: "false"
    spec:
      serviceAccountName: backend-app
      containers:
        - name: api
          image: your-registry.com/backend-api:v1.0
          command: ["/bin/sh", "-c"]
          args:
            - "source /vault/secrets/db-creds && ./start-server"
          volumeMounts: []
          # Secrets are available at /vault/secrets/
```

## Dynamic Database Credentials

One of Vault's most powerful features is generating short-lived database credentials on demand.

```bash
# Enable database secrets engine
kubectl exec -n vault vault-0 -- vault secrets enable database

# Configure PostgreSQL connection
kubectl exec -n vault vault-0 -- vault write database/config/mydb \
    plugin_name=postgresql-database-plugin \
    connection_url="postgresql://{{username}}:{{password}}@postgresql.database.svc.cluster.local:5432/mydb?sslmode=disable" \
    allowed_roles="backend-readonly" \
    username="vault_admin" \
    password="vault_admin_password"

# Create a role for read-only access
kubectl exec -n vault vault-0 -- vault write database/roles/backend-readonly \
    db_name=mydb \
    creation_statements="CREATE ROLE \"{{name}}\" WITH LOGIN PASSWORD '{{password}}' VALID UNTIL '{{expiration}}'; GRANT SELECT ON ALL TABLES IN SCHEMA public TO \"{{name}}\";" \
    default_ttl=1h \
    max_ttl=24h
```

## Important ArgoCD Considerations

### ArgoCD Cannot Manage Vault's Internal State

ArgoCD manages the Vault deployment (pods, services, configuration), but Vault's internal state (secrets, policies, auth methods) is stored inside Vault itself. These need to be managed separately, either through manual commands, Terraform, or the Vault Operator.

### Handling Vault Unsealing

After Vault pods restart, they need to be unsealed. For automated unsealing, use:

- **Auto-unseal with cloud KMS** (recommended for production)
- **Vault Operator** for automated unsealing in Kubernetes

```yaml
# Auto-unseal configuration in Vault
vault:
  server:
    ha:
      raft:
        config: |
          seal "awskms" {
            region     = "us-east-1"
            kms_key_id = "your-kms-key-id"
          }
```

## Verifying the Deployment

```bash
# Check Vault pods
kubectl get pods -n vault

# Verify Vault is unsealed
kubectl exec -n vault vault-0 -- vault status

# Check injector webhook
kubectl get mutatingwebhookconfigurations | grep vault

# Test injection by deploying a test pod
kubectl apply -f test-pod-with-vault-annotations.yaml
kubectl logs test-pod -c vault-agent-init

# Verify secrets are available
kubectl exec test-pod -- cat /vault/secrets/config
```

## Summary

Deploying Vault Agent with ArgoCD provides a GitOps-managed secrets infrastructure where the deployment configuration lives in Git while actual secrets remain securely stored in Vault. The Agent Injector automates secret delivery to applications through annotations, supporting both static secrets and dynamic credentials. The key distinction is that ArgoCD manages Vault's Kubernetes deployment, while Vault's internal configuration (policies, auth methods, secret engines) requires separate management through Terraform, CLI, or the Vault Operator.
