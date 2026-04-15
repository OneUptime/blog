# How to Use Dapr with Alibaba Cloud OOS Parameter Store

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Alibaba, Secret, OOS, Configuration

Description: Configure Dapr's secrets building block with Alibaba Cloud OOS Parameter Store to securely retrieve configuration values and secrets in microservices.

---

## Overview

Alibaba Cloud Operation Orchestration Service (OOS) Parameter Store provides a secure, hierarchical store for configuration data and secrets. Dapr integrates with OOS Parameter Store as a secrets store, allowing microservices to fetch parameters at runtime without hardcoding sensitive values.

## Prerequisites

- Alibaba Cloud account with OOS enabled
- Parameters created in OOS Parameter Store
- RAM user with permissions for `oos:GetParameter` and `oos:GetSecretParameter` actions
- Dapr installed

## Creating Parameters in OOS

```bash
# Using aliyun CLI - create a plain text parameter
aliyun oos CreateParameter \
  --Name="/dapr/db-host" \
  --Value="mydb.cn-hangzhou.rds.aliyuncs.com" \
  --Type="String" \
  --Description="Database host"

# Create an encrypted parameter (Secret)
aliyun oos CreateSecretParameter \
  --Name="/dapr/db-password" \
  --Value="super-secret-password" \
  --Type="Secret" \
  --Description="Database password"
```

## Configuring the Dapr Secrets Component

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: alicloud-oos
  namespace: default
spec:
  type: secretstores.alicloud.parameterstore
  version: v1
  metadata:
  - name: accessKeyId
    secretKeyRef:
      name: alibaba-credentials
      key: accessKeyId
  - name: accessKeySecret
    secretKeyRef:
      name: alibaba-credentials
      key: accessKeySecret
  - name: regionId
    value: "cn-hangzhou"
```

## Retrieving Secrets

```bash
# Get a parameter value
curl http://localhost:3500/v1.0/secrets/alicloud-oos/%2Fdapr%2Fdb-password

# Get multiple secrets
curl http://localhost:3500/v1.0/secrets/alicloud-oos/bulk
```

From application code:

```go
import dapr "github.com/dapr/go-sdk/client"

func getDBPassword(ctx context.Context, client dapr.Client) (string, error) {
    secrets, err := client.GetSecret(ctx, "alicloud-oos", "/dapr/db-password", nil)
    if err != nil {
        return "", err
    }
    return secrets["/dapr/db-password"], nil
}
```

## Referencing Parameters in Dapr Components

Use OOS parameters to configure other Dapr components:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: statestore
spec:
  type: state.redis
  version: v1
  metadata:
  - name: redisHost
    secretKeyRef:
      name: /dapr/redis-host
      key: /dapr/redis-host
  - name: redisPassword
    secretKeyRef:
      name: /dapr/redis-password
      key: /dapr/redis-password
  auth:
    secretStore: alicloud-oos
```

## Access Control with Secret Scopes

Restrict which secrets specific Dapr apps can access:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Configuration
metadata:
  name: order-service-config
spec:
  secrets:
    scopes:
    - storeName: alicloud-oos
      defaultAccess: deny
      allowedSecrets: ["/dapr/db-password", "/dapr/db-host"]
```

## Summary

Dapr's Alibaba Cloud OOS Parameter Store integration provides secure, centralized management of configuration values and secrets for microservices on Alibaba Cloud. By using OOS as a Dapr secrets store, you keep sensitive values out of Kubernetes manifests and application code while supporting centralized rotation and audit logging.
