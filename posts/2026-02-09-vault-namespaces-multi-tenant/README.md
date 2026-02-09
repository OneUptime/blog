# How to configure Vault namespaces for multi-tenant secret isolation

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: HashiCorp Vault, Namespaces, Multi-Tenancy, Kubernetes, Security Isolation

Description: Learn how to implement Vault namespaces for complete tenant isolation in multi-tenant Kubernetes environments, ensuring secrets remain separated and secure.

---

In multi-tenant environments, isolating secrets between tenants is critical for security and compliance. Vault Enterprise namespaces provide complete isolation, with each namespace having its own policies, auth methods, and secrets engines. This guide shows you how to implement namespace-based multi-tenancy for Kubernetes workloads.

## Understanding Vault Namespaces

Vault namespaces create isolated environments within a single Vault cluster. Each namespace operates independently with its own authentication, authorization, and secret storage. This allows different teams, customers, or environments to share infrastructure while maintaining complete separation.

Namespaces support hierarchical structure, where child namespaces inherit from parents. The root namespace has full administrative control, while child namespaces can be delegated to specific teams or tenants.

Note that namespaces are a Vault Enterprise feature.

## Creating Namespaces

Set up namespace structure:

```bash
# Create top-level namespaces for teams
vault namespace create team-a
vault namespace create team-b
vault namespace create shared

# Create nested namespaces
vault namespace create -namespace=team-a production
vault namespace create -namespace=team-a development

# List namespaces
vault namespace list

# List nested namespaces
vault namespace list -namespace=team-a
```

## Configuring Secrets Engines per Namespace

Each namespace has independent secrets engines:

```bash
# Configure secrets for team-a/production
export VAULT_NAMESPACE="team-a/production"

vault secrets enable -path=secret kv-v2
vault secrets enable database
vault secrets enable pki

# Configure completely different engines for team-b
export VAULT_NAMESPACE="team-b"

vault secrets enable -path=secrets kv-v2
vault secrets enable transit
```

## Setting Up Authentication per Namespace

Configure Kubernetes auth for each tenant:

```bash
# Setup auth for team-a
export VAULT_NAMESPACE="team-a/production"

vault auth enable kubernetes

# Configure for team-a's Kubernetes cluster
KUBERNETES_HOST=$(kubectl config view --raw --minify --flatten \
  -o jsonpath='{.clusters[0].cluster.server}')

vault write auth/kubernetes/config \
  token_reviewer_jwt="$TOKEN_REVIEWER_JWT" \
  kubernetes_host="$KUBERNETES_HOST" \
  kubernetes_ca_cert="$KUBERNETES_CA_CERT"

# Create role for team-a apps
vault write auth/kubernetes/role/app \
  bound_service_account_names=app-sa \
  bound_service_account_namespaces=team-a-prod \
  policies=app-policy \
  ttl=1h

# Repeat for team-b with different configuration
export VAULT_NAMESPACE="team-b"
vault auth enable kubernetes
# ... configure for team-b
```

## Creating Namespace-Scoped Policies

Define policies within each namespace:

```bash
# Policy in team-a namespace
export VAULT_NAMESPACE="team-a/production"

vault policy write app-policy - <<EOF
# Access to team-a secrets only
path "secret/data/apps/*" {
  capabilities = ["read", "list"]
}

path "database/creds/app-role" {
  capabilities = ["read"]
}
EOF

# Policy in team-b namespace (completely separate)
export VAULT_NAMESPACE="team-b"

vault policy write app-policy - <<EOF
# Access to team-b secrets only
path "secrets/data/*" {
  capabilities = ["read", "list", "create", "update"]
}

path "transit/encrypt/app-data" {
  capabilities = ["update"]
}

path "transit/decrypt/app-data" {
  capabilities = ["update"]
}
EOF
```

## Accessing Vault from Kubernetes with Namespaces

Configure applications to use specific namespaces:

```yaml
# team-a-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: team-a-app
  namespace: team-a-prod
spec:
  replicas: 2
  selector:
    matchLabels:
      app: team-a-app
  template:
    metadata:
      labels:
        app: team-a-app
      annotations:
        vault.hashicorp.com/agent-inject: "true"
        vault.hashicorp.com/role: "app"
        vault.hashicorp.com/namespace: "team-a/production"
        vault.hashicorp.com/agent-inject-secret-config: "secret/data/apps/config"
    spec:
      serviceAccountName: app-sa
      containers:
      - name: app
        image: team-a-app:latest
        env:
        - name: VAULT_NAMESPACE
          value: "team-a/production"
```

In application code:

```go
package main

import (
    "io/ioutil"
    vault "github.com/hashicorp/vault/api"
)

func NewVaultClient(namespace string) (*vault.Client, error) {
    config := vault.DefaultConfig()
    config.Address = "http://vault.vault.svc.cluster.local:8200"

    client, err := vault.NewClient(config)
    if err != nil {
        return nil, err
    }

    // Set namespace
    client.SetNamespace(namespace)

    // Authenticate
    jwt, err := ioutil.ReadFile("/var/run/secrets/kubernetes.io/serviceaccount/token")
    if err != nil {
        return nil, err
    }

    params := map[string]interface{}{
        "jwt":  string(jwt),
        "role": "app",
    }

    secret, err := client.Logical().Write("auth/kubernetes/login", params)
    if err != nil {
        return nil, err
    }

    client.SetToken(secret.Auth.ClientToken)
    return client, nil
}

func main() {
    // Team A application uses team-a namespace
    client, err := NewVaultClient("team-a/production")
    if err != nil {
        log.Fatal(err)
    }

    // Access secrets in team-a namespace
    secret, err := client.Logical().Read("secret/data/apps/config")
    if err != nil {
        log.Fatal(err)
    }

    // Use secret data
    data := secret.Data["data"].(map[string]interface{})
    apiKey := data["api_key"].(string)
}
```

## Implementing Namespace Administration

Create admin policies for namespace management:

```bash
# Root namespace policy for namespace admin
vault policy write namespace-admin - <<EOF
# Can create and manage namespaces
path "sys/namespaces/*" {
  capabilities = ["create", "read", "update", "delete", "list"]
}

# Can view namespace metadata
path "sys/namespaces" {
  capabilities = ["list"]
}
EOF

# Team-specific admin policy (in team-a namespace)
export VAULT_NAMESPACE="team-a"

vault policy write team-admin - <<EOF
# Full control within team-a namespace
path "secret/*" {
  capabilities = ["create", "read", "update", "delete", "list"]
}

path "database/*" {
  capabilities = ["create", "read", "update", "delete", "list"]
}

path "auth/*" {
  capabilities = ["create", "read", "update", "delete", "list"]
}

path "sys/policies/acl/*" {
  capabilities = ["create", "read", "update", "delete", "list"]
}

# Can manage child namespaces
path "sys/namespaces/*" {
  capabilities = ["create", "read", "update", "delete", "list"]
}
EOF
```

## Cross-Namespace Access Patterns

Enable controlled cross-namespace access:

```bash
# In root namespace, create policy allowing cross-namespace read
vault policy write cross-namespace-reader - <<EOF
# Can read from team-a namespace
path "team-a/+/secret/data/shared/*" {
  capabilities = ["read"]
}

# Can read from team-b namespace
path "team-b/+/secret/data/shared/*" {
  capabilities = ["read"]
}
EOF

# Attach to entity that needs cross-namespace access
vault write identity/entity name="shared-service" \
  policies="cross-namespace-reader"
```

## Monitoring Namespace Usage

Track metrics per namespace:

```bash
# View namespace audit logs
export VAULT_NAMESPACE="team-a/production"

vault audit enable file file_path=/vault/logs/team-a-audit.log

# Query namespace-specific metrics
vault read sys/metrics

# Filter audit logs by namespace
cat /vault/logs/audit.log | \
  jq 'select(.request.namespace == "team-a/production")'
```

## Implementing Resource Quotas

Prevent resource exhaustion:

```bash
# Create rate limit quota for namespace
vault write sys/quotas/rate-limit/team-a-quota \
  path="team-a/" \
  rate=1000

# Create lease count quota
vault write sys/quotas/lease-count/team-a-leases \
  path="team-a/" \
  max_leases=5000

# View quota usage
vault read sys/quotas/rate-limit/team-a-quota
```

## Namespace Isolation Best Practices

Always use namespaces for multi-tenant deployments to ensure complete isolation. Create hierarchical structures that match organizational boundaries. Implement separate authentication methods per namespace to prevent cross-tenant access. Use resource quotas to prevent one tenant from exhausting cluster resources. Configure namespace-specific audit logs for compliance and troubleshooting. Grant minimum necessary cross-namespace permissions when required. Regularly review namespace access patterns and policies. Automate namespace provisioning for consistent configuration.

Vault namespaces provide enterprise-grade multi-tenancy with complete secret isolation. By creating separate namespaces for each tenant, team, or environment, you ensure that secrets remain segregated while sharing underlying infrastructure. This approach enables secure multi-tenant Kubernetes deployments with clear security boundaries and simplified administration.
