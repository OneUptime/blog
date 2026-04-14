# How to Configure Dapr with Tencent Cloud SSM Secret Store

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Tencent Cloud, Secret Management, SSM, Cloud

Description: Learn how to configure the Dapr secret store component for Tencent Cloud Secret Manager (SSM) to securely retrieve secrets in Tencent Cloud deployments.

---

Tencent Cloud Secret Manager (SSM) is the managed secret service for teams running workloads on Tencent Cloud. It provides secret versioning, automatic rotation, and tight IAM integration. Dapr includes a dedicated component for Tencent SSM, allowing your microservices to retrieve secrets using the standard Dapr API.

## Prerequisites: Create Secrets in Tencent SSM

Use the Tencent Cloud console or CLI to create your secrets:

```bash
# Using tccli
tccli ssm CreateSecret \
  --SecretName "myapp-db-credentials" \
  --Description "Database credentials for myapp" \
  --SecretString '{"password":"mysecret","username":"appuser"}' \
  --Region ap-guangzhou
```

Grant your service's CAM role access to SSM:

```json
{
  "version": "2.0",
  "statement": [
    {
      "effect": "allow",
      "action": [
        "ssm:GetSecretValue",
        "ssm:DescribeSecret"
      ],
      "resource": [
        "qcs::ssm:ap-guangzhou:uin/123456789:secret/myapp-*"
      ]
    }
  ]
}
```

## Configure the Dapr Component

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: tencent-ssm
  namespace: production
spec:
  type: secretstores.tencentcloud.ssm
  version: v1
  metadata:
    - name: secretId
      secretKeyRef:
        name: tencent-credentials
        key: secret-id
    - name: secretKey
      secretKeyRef:
        name: tencent-credentials
        key: secret-key
    - name: region
      value: "ap-guangzhou"
```

Store the Tencent Cloud credentials in a Kubernetes secret:

```bash
kubectl create secret generic tencent-credentials \
  --from-literal=secret-id="AKIDxxxxxxxxxxxxxxxxx" \
  --from-literal=secret-key="xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx" \
  -n production
```

## Retrieve a Secret

```bash
curl http://localhost:3500/v1.0/secrets/tencent-ssm/myapp-db-credentials
```

Response with JSON-formatted secret value:

```json
{
  "myapp-db-credentials": "{\"password\":\"mysecret\",\"username\":\"appuser\"}"
}
```

Parse the JSON in your application:

```python
import json
import httpx

async def get_db_credentials():
    async with httpx.AsyncClient() as client:
        resp = await client.get(
            "http://localhost:3500/v1.0/secrets/tencent-ssm/myapp-db-credentials"
        )
        secret_json = resp.json()["myapp-db-credentials"]
        credentials = json.loads(secret_json)
        return credentials["username"], credentials["password"]
```

## Using a Specific Version

Tencent SSM supports secret versions. Retrieve a specific version:

```bash
curl "http://localhost:3500/v1.0/secrets/tencent-ssm/myapp-db-credentials?metadata.version_id=SSMUserDefinedVersion-1"
```

## Scoping the Component

Restrict which services can use the Tencent SSM component:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: tencent-ssm
  namespace: production
spec:
  type: secretstores.tencentcloud.ssm
  version: v1
  metadata:
    - name: region
      value: "ap-guangzhou"
scopes:
  - backend-service
  - worker-service
```

## Summary

Configuring Dapr with Tencent Cloud SSM requires creating a CAM role with SSM read permissions, storing Tencent Cloud credentials in a Kubernetes secret, and defining a Dapr component that references the region and credentials. Once configured, all services in the component's scope can retrieve secrets using the same Dapr secrets API regardless of the underlying cloud platform.
