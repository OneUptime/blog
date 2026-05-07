# How to Generate API Keys in Rancher

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rancher, Kubernetes, API, REST API, Authentication

Description: Step-by-step guide to generating and managing API keys in Rancher for programmatic access to your Kubernetes clusters.

API keys are the foundation of programmatic access to Rancher. Whether you need to automate cluster provisioning, build custom integrations, or script routine maintenance tasks, you need properly configured API keys. This guide covers every method for creating and managing API keys in Rancher.

## Understanding Rancher API Key Types

Rancher supports API keys with or without a cluster scope:

- **No-Scope API Keys**: These inherit the permissions of the user who created them and can access all Rancher resources that user can access.
- **Cluster-Scoped API Keys**: These are limited to the Kubernetes API of a specific cluster.

Each API key consists of an Access Key (username) and a Secret Key (password), combined in the format `access_key:secret_key`.

## Generating API Keys Through the UI

The simplest way to create an API key is through the Rancher UI.

### Step 1: Navigate to API Keys

Log into your Rancher instance and click on your user avatar in the top-right corner. Select **Account & API Keys** from the dropdown menu.

### Step 2: Create a New API Key

Click the **Create API Key** button. You can set the following options:

- **Description**: A human-readable label for the key (e.g., "CI/CD Pipeline Key")
- **Scope**: Choose between "No Scope" (full access) or limit to a specific cluster
- **Expiration**: Select an expiration period. Rancher enforces the `auth-token-max-ttl-minutes` maximum TTL setting.

### Step 3: Save Your Credentials

After clicking **Create**, Rancher displays the API Endpoint, Access Key, Secret Key, and Bearer Token. Copy these immediately because the Secret Key and Bearer Token are only shown once.

```plaintext
Access Key:  token-abc12
Secret Key:  xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
Bearer Token: token-abc12:xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

Store these securely in a password manager or secrets vault.

## Generating API Keys Through the API

Starting with Rancher v2.14.0, legacy v3 API tokens are being phased out. For new automation, Rancher's supported public token API is `tokens.ext.cattle.io`, which you use through the Rancher Kubernetes API.

To use the following commands, configure `kubectl` to authenticate to Rancher with an existing Rancher API key that has no scope.

### Creating a No-Scope Key

```bash
kubectl create -o json -f - <<'EOF'
apiVersion: ext.cattle.io/v1
kind: Token
spec:
  description: Automation Key - Created via API
EOF
```

If `spec.ttl` is omitted, Rancher uses the value from `auth-token-max-ttl-minutes` as the expiration period. If you set `spec.ttl`, the value is in milliseconds and must be greater than `0` and less than or equal to the configured maximum TTL.

### Creating a Cluster-Scoped Key

To create a key scoped to a specific cluster:

```bash
kubectl create -o json -f - <<'EOF'
apiVersion: ext.cattle.io/v1
kind: Token
spec:
  description: Production Cluster Key
  clusterName: c-m-abc12345
  ttl: 7200000
EOF
```

### Parsing the Response

The response contains the token metadata, the access key, and a ready-to-use bearer token:

```bash
kubectl create -o json -f - <<'EOF' | jq '{
  tokenId: .metadata.name,
  accessKey: .status.value,
  bearerToken: .status.bearerToken,
  expiresAt: .status.expiresAt
}'
apiVersion: ext.cattle.io/v1
kind: Token
spec:
  description: Script Key
EOF
```

With `tokens.ext.cattle.io`, `.status.value` is the access key and `.status.bearerToken` is the fully formed bearer token you can use in API requests.

## Using API Keys with the Rancher CLI

The Rancher CLI authenticates with an existing API bearer token; it does not create a new Rancher API key.

```bash
rancher login https://rancher.example.com --token ${RANCHER_BEARER_TOKEN}
```

The `rancher token` command generates kubeconfig tokens, not Rancher API keys.

## Managing Existing API Keys

### Listing All API Keys

To list all API keys for your account:

```bash
kubectl get tokens.ext.cattle.io -o json | jq '.items[] | {
  id: .metadata.name,
  description: .spec.description,
  expired: .status.expired,
  expiresAt: .status.expiresAt,
  clusterName: .spec.clusterName
}'
```

### Deleting an API Key

To revoke an API key:

```bash
TOKEN_ID="token-abc12"

kubectl delete tokens.ext.cattle.io "${TOKEN_ID}"
```

### Checking Key Validity

For a no-scope key, test whether the bearer token is still valid:

```bash
curl -s -o /dev/null -w "%{http_code}" \
  -H "Authorization: Bearer ${RANCHER_BEARER_TOKEN}" \
  "${RANCHER_URL}/apis/management.cattle.io/v3/users"
```

A `200` response means the token authenticated successfully. A `401` means authentication failed because the token is expired, revoked, or invalid.

## Best Practices for API Key Management

### Use Short-Lived Keys When Possible

For CI/CD pipelines that run on a schedule, create keys with a TTL that slightly exceeds the expected run time:

```bash
# Create a key that expires in 2 hours (7200000 ms)

kubectl create -o jsonpath='{.status.bearerToken}' -f - <<'EOF'
apiVersion: ext.cattle.io/v1
kind: Token
spec:
  description: CI Pipeline - Short-lived
  ttl: 7200000
EOF
```

### Use Scoped Keys for Least Privilege

Instead of granting full access, scope keys to specific clusters:

```bash
kubectl create -o jsonpath='{.status.bearerToken}' -f - <<'EOF'
apiVersion: ext.cattle.io/v1
kind: Token
spec:
  description: Staging Only Key
  clusterName: c-m-staging01
  ttl: 7200000
EOF
```

### Rotate Keys Regularly

Build a rotation script that creates a new key and deletes the old one:

```bash
#!/bin/bash

# Assumes kubectl is already configured to authenticate to Rancher.
OLD_TOKEN_ID="token-old123"

NEW_TOKEN_JSON=$(kubectl create -o json -f - <<EOF
apiVersion: ext.cattle.io/v1
kind: Token
spec:
  description: Rotated Key - $(date +%Y-%m-%d)
EOF
)

NEW_BEARER_TOKEN=$(echo "$NEW_TOKEN_JSON" | jq -r '.status.bearerToken')
NEW_TOKEN_ID=$(echo "$NEW_TOKEN_JSON" | jq -r '.metadata.name')
echo "New token created: ${NEW_TOKEN_ID}"

# Store the new bearer token in your secrets manager before revoking the old token
# vault kv put secret/rancher token="${NEW_BEARER_TOKEN}"

kubectl delete tokens.ext.cattle.io "${OLD_TOKEN_ID}"

echo "Old token deleted: ${OLD_TOKEN_ID}"
```

### Store Keys Securely

Never store API keys in plain text files, environment variables in shared systems, or version control. Use a secrets manager:

```bash
# HashiCorp Vault
vault kv put secret/rancher/api-key token="${RANCHER_BEARER_TOKEN}"

# AWS Secrets Manager
aws secretsmanager create-secret \
  --name rancher-api-key \
  --secret-string "${RANCHER_BEARER_TOKEN}"

# Kubernetes Secret
kubectl create secret generic rancher-api-key \
  --from-literal=token="${RANCHER_BEARER_TOKEN}" \
  -n automation
```

### Audit Key Usage

Periodically review all active keys and remove unused ones:

```bash
kubectl get tokens.ext.cattle.io -o json | jq '.items[] | select(.status.expired == false) | {
  id: .metadata.name,
  description: .spec.description,
  expiresAt: .status.expiresAt,
  lastUsedAt: .status.lastUsedAt
}'
```

## Summary

Generating and managing API keys in Rancher is straightforward whether you use the UI or the Rancher Kubernetes API. The Rancher CLI authenticates with existing API keys rather than creating them. The key practices to follow are using scoped keys with appropriate TTLs, rotating them regularly, and storing them in a secrets manager. With properly configured API keys, you can safely automate any Rancher operation.
