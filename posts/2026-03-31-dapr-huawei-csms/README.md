# How to Use Dapr with Huawei Cloud CSMS

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Huawei, Secret, CSMS, Security

Description: Configure Dapr's secrets building block with Huawei Cloud Cloud Secret Management Service to retrieve secrets securely in microservices on Huawei Cloud.

---

## Overview

Huawei Cloud Secret Management Service (CSMS) provides centralized storage for application secrets, API keys, and credentials. Dapr integrates with CSMS as a secrets store, allowing microservices to retrieve secrets at runtime through a unified API without direct CSMS SDK dependencies.

## Prerequisites

- Huawei Cloud account with CSMS service enabled
- Secrets created in CSMS
- IAM credentials with CSMS read permissions (`csms:secret:get`, `csms:secret:getVersion`, `kms:cmk:decryptDataKey`)
- Dapr installed

## Creating Secrets in Huawei CSMS

From Huawei Cloud Console or CLI:

```bash
# Create a secret
hcloud KMS CreateSecret \
  --name="dapr/db-password" \
  --secret_string='{"password": "s3cr3t"}' \
  --description="Database password for order service" \
  --cli-region="cn-north-4"

# Create a binary secret
hcloud KMS CreateSecret \
  --name="dapr/tls-cert" \
  --secret_binary=@cert.pem \
  --description="TLS certificate" \
  --cli-region="cn-north-4"
```

## Configuring the Dapr Secrets Component

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: huawei-csms
  namespace: default
spec:
  type: secretstores.huaweicloud.csms
  version: v1
  metadata:
  - name: region
    value: "cn-north-4"
  - name: accessKey
    secretKeyRef:
      name: huawei-credentials
      key: accessKey
  - name: secretAccessKey
    secretKeyRef:
      name: huawei-credentials
      key: secretAccessKey
```

## Retrieving Secrets

```bash
# Get a specific secret
curl http://localhost:3500/v1.0/secrets/huawei-csms/dapr%2Fdb-password

# Response
# {"dapr/db-password": "{\"password\": \"s3cr3t\"}"}
```

Using the Python SDK:

```python
from dapr.clients import DaprClient
import json

def get_db_credentials():
    with DaprClient() as client:
        secret = client.get_secret(
            store_name="huawei-csms",
            key="dapr/db-password"
        )
        creds = json.loads(secret.secret["dapr/db-password"])
        return creds["password"]
```

## Referencing CSMS Secrets in Dapr Components

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
    value: "redis:6379"
  - name: redisPassword
    secretKeyRef:
      name: dapr/redis-password
      key: password
auth:
  secretStore: huawei-csms
```

## Secret Rotation Handling

CSMS supports versioned secrets for zero-downtime rotation:

```bash
# Create a new version of the secret
hcloud KMS CreateSecretVersion \
  --secret_name="dapr/db-password" \
  --secret_string='{"password": "new-s3cr3t"}' \
  --cli-region="cn-north-4"

# List versions
hcloud KMS ListSecretVersions \
  --secret_name="dapr/db-password" \
  --cli-region="cn-north-4"
```

Dapr always fetches the latest active version automatically.

## Summary

Dapr's Huawei Cloud CSMS integration provides secure, centralized secret management for microservices on Huawei Cloud. By retrieving secrets through the Dapr secrets API, services avoid hardcoding credentials and gain automatic support for secret rotation, audit logging, and fine-grained IAM access control.
