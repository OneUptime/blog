# How to configure Vault Kubernetes auth method for pod authentication

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: HashiCorp Vault, Kubernetes, Authentication, Service Accounts, Security

Description: Learn how to configure Vault Kubernetes authentication method to allow pods to authenticate using their service account tokens for secure secret access.

---

The Kubernetes authentication method allows pods to authenticate to Vault using their Kubernetes service account tokens. This eliminates the need to manage separate credentials for each application, leveraging Kubernetes' native identity system. This guide shows you how to configure and use Kubernetes auth for seamless secret access.

## Understanding Kubernetes Auth Method

When a pod authenticates to Vault using Kubernetes auth, it presents its service account JWT token. Vault validates this token with the Kubernetes API server, then issues a Vault token based on the pod's identity. This approach provides strong authentication without storing Vault credentials in pods.

The authentication flow works like this: pod reads its service account token from `/var/run/secrets/kubernetes.io/serviceaccount/token`, sends it to Vault's Kubernetes auth endpoint, Vault validates the token with Kubernetes API, and Vault returns a Vault token tied to policies.

## Prerequisites

Ensure Vault is running and you have admin access:

```bash
# Set Vault address
export VAULT_ADDR='http://vault.vault.svc.cluster.local:8200'

# Login with root token or admin credentials
export VAULT_TOKEN='your-vault-token'

# Verify connectivity
vault status
```

## Enabling Kubernetes Auth Method

Enable and configure the Kubernetes authentication method:

```bash
# Enable Kubernetes auth
vault auth enable kubernetes

# Get Kubernetes API server address
KUBERNETES_HOST=$(kubectl config view --raw --minify --flatten \
  -o jsonpath='{.clusters[0].cluster.server}')

echo "Kubernetes API: $KUBERNETES_HOST"

# Get the service account token Vault will use
TOKEN_REVIEWER_JWT=$(kubectl -n vault get secret \
  $(kubectl -n vault get sa vault -o jsonpath='{.secrets[0].name}') \
  -o jsonpath='{.data.token}' | base64 -d)

# Get Kubernetes CA certificate
KUBERNETES_CA_CERT=$(kubectl config view --raw --minify --flatten \
  -o jsonpath='{.clusters[0].cluster.certificate-authority-data}' | base64 -d)

# Configure Kubernetes auth method
vault write auth/kubernetes/config \
  token_reviewer_jwt="$TOKEN_REVIEWER_JWT" \
  kubernetes_host="$KUBERNETES_HOST" \
  kubernetes_ca_cert="$KUBERNETES_CA_CERT"
```

## Creating Policies for Applications

Define policies that control what secrets applications can access:

```bash
# Create policy for application secrets
vault policy write app-policy - <<EOF
# Allow reading app secrets
path "secret/data/app/*" {
  capabilities = ["read", "list"]
}

# Allow reading database credentials
path "database/creds/app-role" {
  capabilities = ["read"]
}
EOF

# Create policy for admin tasks
vault policy write admin-policy - <<EOF
path "secret/data/admin/*" {
  capabilities = ["create", "read", "update", "delete", "list"]
}

path "sys/policies/acl/*" {
  capabilities = ["read", "list"]
}
EOF
```

## Configuring Authentication Roles

Create Kubernetes auth roles that map service accounts to Vault policies:

```bash
# Create role for application pods
vault write auth/kubernetes/role/app \
  bound_service_account_names=app-sa \
  bound_service_account_namespaces=default \
  policies=app-policy \
  ttl=1h

# Create role allowing any service account in namespace
vault write auth/kubernetes/role/namespace-wide \
  bound_service_account_names="*" \
  bound_service_account_namespaces=production \
  policies=app-policy \
  ttl=30m

# Create role for specific service accounts across namespaces
vault write auth/kubernetes/role/monitoring \
  bound_service_account_names=monitoring-sa \
  bound_service_account_namespaces="default,production,staging" \
  policies=monitoring-policy \
  ttl=24h
```

Key parameters explained:
- `bound_service_account_names`: Which service accounts can use this role
- `bound_service_account_namespaces`: Which namespaces those service accounts must be in
- `policies`: Vault policies assigned to authenticated pods
- `ttl`: Token lifetime

## Creating Service Accounts for Applications

Create Kubernetes service accounts that will authenticate to Vault:

```yaml
# app-serviceaccount.yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: app-sa
  namespace: default
---
apiVersion: v1
kind: ServiceAccount
metadata:
  name: monitoring-sa
  namespace: default
```

```bash
kubectl apply -f app-serviceaccount.yaml
```

## Testing Authentication from a Pod

Deploy a test pod to verify authentication:

```yaml
# test-vault-auth.yaml
apiVersion: v1
kind: Pod
metadata:
  name: vault-auth-test
  namespace: default
spec:
  serviceAccountName: app-sa
  containers:
  - name: app
    image: hashicorp/vault:latest
    command: ['sh', '-c', 'sleep 3600']
```

```bash
kubectl apply -f test-vault-auth.yaml

# Exec into the pod
kubectl exec -it vault-auth-test -- sh

# Inside the pod, authenticate to Vault
export VAULT_ADDR='http://vault.vault.svc.cluster.local:8200'

# Get the service account token
SA_TOKEN=$(cat /var/run/secrets/kubernetes.io/serviceaccount/token)

# Authenticate and get Vault token
VAULT_TOKEN=$(vault write -field=token auth/kubernetes/login \
  role=app \
  jwt=$SA_TOKEN)

export VAULT_TOKEN

# Test access to secrets
vault kv get secret/app/config
```

## Implementing Authentication in Applications

Here's how to authenticate from different application types:

### Go Application

```go
package main

import (
    "context"
    "fmt"
    "io/ioutil"
    "log"

    vault "github.com/hashicorp/vault/api"
)

func main() {
    // Create Vault client
    config := vault.DefaultConfig()
    config.Address = "http://vault.vault.svc.cluster.local:8200"

    client, err := vault.NewClient(config)
    if err != nil {
        log.Fatal(err)
    }

    // Read service account token
    jwt, err := ioutil.ReadFile("/var/run/secrets/kubernetes.io/serviceaccount/token")
    if err != nil {
        log.Fatal(err)
    }

    // Authenticate to Vault
    params := map[string]interface{}{
        "jwt":  string(jwt),
        "role": "app",
    }

    secret, err := client.Logical().Write("auth/kubernetes/login", params)
    if err != nil {
        log.Fatal(err)
    }

    // Set token for subsequent requests
    client.SetToken(secret.Auth.ClientToken)

    // Read secret
    secret, err = client.Logical().Read("secret/data/app/config")
    if err != nil {
        log.Fatal(err)
    }

    data := secret.Data["data"].(map[string]interface{})
    fmt.Printf("Database URL: %s\n", data["database_url"])
}
```

### Python Application

```python
import os
import hvac

def authenticate_to_vault():
    # Read service account token
    with open('/var/run/secrets/kubernetes.io/serviceaccount/token') as f:
        jwt = f.read()

    # Create Vault client
    client = hvac.Client(url='http://vault.vault.svc.cluster.local:8200')

    # Authenticate
    response = client.auth.kubernetes.login(
        role='app',
        jwt=jwt
    )

    # Token is automatically set in client
    return client

def main():
    # Authenticate
    client = authenticate_to_vault()

    # Read secret
    secret = client.secrets.kv.v2.read_secret_version(
        path='app/config',
        mount_point='secret'
    )

    db_url = secret['data']['data']['database_url']
    print(f"Database URL: {db_url}")

if __name__ == '__main__':
    main()
```

### Shell Script

```bash
#!/bin/bash
# vault-auth.sh

VAULT_ADDR="http://vault.vault.svc.cluster.local:8200"
VAULT_ROLE="app"

# Read service account token
SA_TOKEN=$(cat /var/run/secrets/kubernetes.io/serviceaccount/token)

# Authenticate to Vault
VAULT_TOKEN=$(curl -s --request POST \
  --data "{\"jwt\": \"$SA_TOKEN\", \"role\": \"$VAULT_ROLE\"}" \
  $VAULT_ADDR/v1/auth/kubernetes/login | jq -r '.auth.client_token')

if [ -z "$VAULT_TOKEN" ] || [ "$VAULT_TOKEN" = "null" ]; then
  echo "Failed to authenticate to Vault"
  exit 1
fi

# Export token for other commands
export VAULT_TOKEN

# Read secret
SECRET=$(curl -s --header "X-Vault-Token: $VAULT_TOKEN" \
  $VAULT_ADDR/v1/secret/data/app/config)

# Extract value
DATABASE_URL=$(echo $SECRET | jq -r '.data.data.database_url')
echo "Database URL: $DATABASE_URL"
```

## Advanced Role Configuration

Configure roles with additional constraints:

```bash
# Role with audience restriction
vault write auth/kubernetes/role/secure-app \
  bound_service_account_names=app-sa \
  bound_service_account_namespaces=production \
  audience="vault://production" \
  policies=app-policy \
  ttl=1h \
  max_ttl=4h

# Role with token period for renewable tokens
vault write auth/kubernetes/role/long-running \
  bound_service_account_names=worker-sa \
  bound_service_account_namespaces=default \
  policies=worker-policy \
  period=24h

# Role with bound CIDR blocks
vault write auth/kubernetes/role/restricted \
  bound_service_account_names=restricted-sa \
  bound_service_account_namespaces=default \
  token_bound_cidrs="10.244.0.0/16" \
  policies=restricted-policy \
  ttl=30m
```

## Troubleshooting Authentication Issues

Debug common authentication problems:

```bash
# Check if auth method is enabled
vault auth list | grep kubernetes

# View role configuration
vault read auth/kubernetes/role/app

# Test with verbose output
vault write -field=token auth/kubernetes/login role=app jwt=$SA_TOKEN -output-curl-string

# Check Vault logs
kubectl -n vault logs vault-0 | grep kubernetes

# Verify service account exists
kubectl get sa app-sa -n default

# Check service account token exists
kubectl get sa app-sa -n default -o yaml | grep secrets
```

Common errors and solutions:

**Error: "permission denied"**
```bash
# Check if role exists
vault list auth/kubernetes/role

# Verify policy is attached
vault read auth/kubernetes/role/app | grep policies
```

**Error: "service account not found"**
```bash
# Verify bound service account name matches
vault read auth/kubernetes/role/app | grep bound_service_account_names

# Check actual service account name
kubectl get pod vault-auth-test -o jsonpath='{.spec.serviceAccountName}'
```

**Error: "invalid JWT"**
```bash
# Check token exists in pod
kubectl exec vault-auth-test -- cat /var/run/secrets/kubernetes.io/serviceaccount/token

# Verify Vault can reach Kubernetes API
vault read auth/kubernetes/config
```

## Rotating Service Account Tokens

Handle service account token rotation:

```bash
# Create a role that handles token rotation
vault write auth/kubernetes/role/rotating-app \
  bound_service_account_names=app-sa \
  bound_service_account_namespaces=default \
  policies=app-policy \
  ttl=15m \
  token_explicit_max_ttl=1h

# In your application, implement token renewal
# Check token TTL and renew before expiration
```

Example renewal logic:

```go
// Renew token before it expires
func renewToken(client *vault.Client) {
    secret, err := client.Auth().Token().LookupSelf()
    if err != nil {
        log.Fatal(err)
    }

    ttl := secret.Data["ttl"].(json.Number)
    ttlInt, _ := ttl.Int64()

    // Renew when 80% of TTL has passed
    renewAt := time.Duration(ttlInt) * 8 / 10 * time.Second

    time.Sleep(renewAt)

    secret, err = client.Auth().Token().RenewSelf(0)
    if err != nil {
        log.Printf("Token renewal failed: %v", err)
        // Re-authenticate if renewal fails
        authenticate()
    }
}
```

## Monitoring Authentication

Track authentication patterns:

```bash
# View authentication audit logs
vault audit list

# Enable file audit backend if not already enabled
vault audit enable file file_path=/vault/logs/audit.log

# Query successful authentications
kubectl -n vault exec vault-0 -- cat /vault/logs/audit.log | \
  jq 'select(.type == "response" and .request.path == "auth/kubernetes/login")'

# Count authentications by role
kubectl -n vault exec vault-0 -- cat /vault/logs/audit.log | \
  jq -r 'select(.type == "response" and .request.path == "auth/kubernetes/login") | .auth.metadata.role' | \
  sort | uniq -c
```

The Kubernetes authentication method provides seamless integration between Kubernetes and Vault, allowing pods to authenticate using their native service account identities. This approach eliminates credential management overhead while maintaining strong security through role-based access control and policy enforcement. Implement these patterns to give your applications secure, auditable access to secrets.
