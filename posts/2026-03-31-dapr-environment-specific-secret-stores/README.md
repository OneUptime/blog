# How to Use Environment-Specific Dapr Secret Stores

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Secret, Environment, Security, Vault

Description: Configure environment-specific Dapr secret stores using local files for development, Azure Key Vault for staging/production, and HashiCorp Vault for multi-cloud scenarios.

---

## Secret Store Strategy Per Environment

Dapr's secret management building block abstracts secret retrieval behind a consistent API. This means your application code never changes between environments - only the secret store component definition changes:

```python
# Same code in all environments - only component config changes
with DaprClient() as client:
    secret = client.get_secret(
        store_name="secret-store",
        key="database-password"
    )
    db_password = secret.secret["database-password"]
```

## Development: Local File Secret Store

```yaml
# components/development/secret-store.yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: secret-store
spec:
  type: secretstores.local.file
  version: v1
  metadata:
  - name: secretsFile
    value: "./secrets/dev-secrets.json"
  - name: nestedSeparator
    value: ":"
```

secrets/dev-secrets.json (never commit to git):

```json
{
  "database-password": "devpassword123",
  "api-key": "dev-api-key-replace-me",
  "jwt-secret": "dev-jwt-secret-not-secure",
  "redis-password": "",
  "smtp": {
    "username": "dev-smtp-user",
    "password": "dev-smtp-pass"
  }
}
```

```bash
# Add to .gitignore
echo "secrets/dev-secrets.json" >> .gitignore
echo "secrets/" >> .gitignore
```

## Staging: Azure Key Vault

```yaml
# components/staging/secret-store.yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: secret-store
  namespace: staging
spec:
  type: secretstores.azure.keyvault
  version: v1
  metadata:
  - name: vaultName
    value: "my-staging-keyvault"
  - name: azureClientId
    value: ""  # Uses Workload Identity or Managed Identity
  - name: azureTenantId
    value: "my-tenant-id"
```

```bash
# Create staging secrets in Azure Key Vault
az keyvault secret set \
  --vault-name my-staging-keyvault \
  --name database-password \
  --value "staging-secure-password"

az keyvault secret set \
  --vault-name my-staging-keyvault \
  --name api-key \
  --value "staging-api-key"

# Grant AKS pod identity access
az keyvault set-policy \
  --name my-staging-keyvault \
  --object-id <pod-identity-object-id> \
  --secret-permissions get list
```

## Production: HashiCorp Vault

```yaml
# components/production/secret-store.yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: secret-store
  namespace: production
spec:
  type: secretstores.hashicorp.vault
  version: v1
  metadata:
  - name: vaultAddr
    value: "https://vault.internal.company.com:8200"
  - name: skipVerify
    value: "false"
  - name: caCert
    secretKeyRef:
      name: vault-ca-cert
      key: ca.crt
  - name: vaultTokenMountPath
    value: "/vault/token"
  - name: vaultKVPrefix
    value: "production/dapr"
  - name: enginePath
    value: "secret"
```

```bash
# Vault policy for Dapr
vault policy write dapr-policy - <<EOF
path "secret/data/production/dapr/*" {
  capabilities = ["read", "list"]
}
EOF

# Enable Kubernetes auth
vault auth enable kubernetes
vault write auth/kubernetes/config \
  kubernetes_host="https://kubernetes.default.svc" \
  kubernetes_ca_cert=@/var/run/secrets/kubernetes.io/serviceaccount/ca.crt

# Bind service accounts to policy
vault write auth/kubernetes/role/order-service \
  bound_service_account_names=order-service \
  bound_service_account_namespaces=production \
  policies=dapr-policy \
  ttl=1h
```

## Reading Secrets in Application Code

```go
// Same across all environments
package main

import (
    "context"
    dapr "github.com/dapr/go-sdk/client"
    "fmt"
)

func getDBConfig(ctx context.Context) (string, error) {
    client, err := dapr.NewClient()
    if err != nil {
        return "", err
    }
    defer client.Close()

    secret, err := client.GetSecret(ctx, "secret-store", "database-password", nil)
    if err != nil {
        return "", fmt.Errorf("failed to get database secret: %w", err)
    }

    return secret["database-password"], nil
}

// Nested secrets
func getSMTPConfig(ctx context.Context) (string, string, error) {
    client, _ := dapr.NewClient()
    defer client.Close()

    // For nested secrets in local file store: "smtp:username"
    username, _ := client.GetSecret(ctx, "secret-store", "smtp:username", nil)
    password, _ := client.GetSecret(ctx, "secret-store", "smtp:password", nil)

    return username["smtp:username"], password["smtp:password"], nil
}
```

## Secret Store Scoping

```yaml
# Restrict secret store access to specific services
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: payment-secrets
  namespace: production
spec:
  type: secretstores.hashicorp.vault
  version: v1
  metadata:
  - name: vaultAddr
    value: "https://vault.internal.company.com"
  - name: vaultKVPrefix
    value: "production/payment"
scopes:
- payment-service
- fraud-detection-service
```

## Summary

Dapr secret store components enable zero-code-change secret management across environments. Development uses local JSON files (fast, simple, never committed to git), staging uses cloud-managed key vaults (Azure Key Vault or AWS Secrets Manager), and production uses HashiCorp Vault with Kubernetes auth and fine-grained access policies. Application code makes identical `GetSecret` calls in all environments - only the component YAML changes when moving between environments.
