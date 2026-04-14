# How to Use Dapr with Tencent Cloud SSM

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Tencent, Secret, SSM, Security

Description: Set up Dapr's secrets integration with Tencent Cloud Secrets Manager Service to securely retrieve credentials and configuration in microservices on Tencent Cloud.

---

## Overview

Tencent Cloud Secrets Manager Service (SSM) provides encrypted storage for credentials, API keys, and database passwords. Dapr's secrets building block integrates with SSM, giving microservices a consistent way to retrieve secrets without direct SSM SDK dependencies.

## Prerequisites

- Tencent Cloud account with SSM enabled
- Secrets stored in SSM
- CAM (Cloud Access Management) credentials with SSM read permissions
- Dapr installed

## Creating Secrets in Tencent SSM

Using the Tencent Cloud CLI (tccli):

```bash
# Create a secret
tccli ssm CreateSecret \
  --SecretName "dapr/db-password" \
  --Description "Database password for order service" \
  --SecretString '{"password": "super-secret"}'

# Enable the secret
tccli ssm EnableSecret --SecretName "dapr/db-password"
```

## Configuring the Dapr Secrets Component

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: tencent-ssm
  namespace: default
spec:
  type: secretstores.tencentcloud.ssm
  version: v1
  metadata:
  - name: secretId
    secretKeyRef:
      name: tencent-credentials
      key: secretId
  - name: secretKey
    secretKeyRef:
      name: tencent-credentials
      key: secretKey
  - name: region
    value: "ap-guangzhou"
```

Store credentials as Kubernetes secret:

```bash
kubectl create secret generic tencent-credentials \
  --from-literal=secretId=YOUR_SECRET_ID \
  --from-literal=secretKey=YOUR_SECRET_KEY
```

## Retrieving Secrets from Application Code

```bash
# Get a specific secret
curl "http://localhost:3500/v1.0/secrets/tencent-ssm/dapr%2Fdb-password"
```

Using the Go SDK:

```go
import dapr "github.com/dapr/go-sdk/client"

func getDBPassword(ctx context.Context, client dapr.Client) (string, error) {
    secret, err := client.GetSecret(ctx, "tencent-ssm", "dapr/db-password", nil)
    if err != nil {
        return "", fmt.Errorf("failed to get secret: %w", err)
    }
    return secret["dapr/db-password"], nil
}
```

## Referencing SSM Secrets in Components

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
    value: "redis.example.com:6379"
  - name: redisPassword
    secretKeyRef:
      name: dapr/redis-password
      key: dapr/redis-password
  auth:
    secretStore: tencent-ssm
```

## Secret Rotation

Tencent SSM supports versioned secret rotation:

```bash
# Create a new version
tccli ssm PutSecretValue \
  --SecretName "dapr/db-password" \
  --VersionId "v2" \
  --SecretString '{"password": "new-super-secret"}'
```

Dapr retrieves the current version of the secret by default. After creating a new version with `PutSecretValue`, your applications will pick up the updated value on their next secret retrieval.

## Summary

Dapr's Tencent Cloud SSM integration enables secure secret management for microservices on Tencent Cloud. By retrieving credentials through the Dapr secrets API, services benefit from centralized secret storage, version management, and audit logging without coupling to the Tencent SSM SDK.
