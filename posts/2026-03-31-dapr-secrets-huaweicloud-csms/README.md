# How to Configure Dapr with HuaweiCloud CSMS Secret Store

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, HuaweiCloud, Secret Management, CSMS, Cloud

Description: Learn how to configure the Dapr secret store component for HuaweiCloud Cloud Secret Management Service to retrieve secrets in Huawei Cloud deployments.

---

HuaweiCloud Cloud Secret Management Service (CSMS) is the managed secret service for teams running on Huawei Cloud. It provides centralized secret storage, versioning, and rotation with IAM-based access control. Dapr's CSMS component lets your services retrieve secrets through the standard Dapr secrets API.

## Create Secrets in CSMS

Use the Huawei Cloud console or CLI to create secrets:

```bash
# Using KooCLI (hcloud)
hcloud KMS CreateSecret \
  --name="myapp/db-password" \
  --kms_key_id="your-kms-key-id" \
  --secret_string="supersecretpassword" \
  --cli-region="cn-north-4"
```

Grant your service's IAM user or agency the CSMS read permissions:

```json
{
  "Version": "1.1",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "csms:secret:get",
        "csms:secret:getVersion",
        "kms:cmk:decryptDataKey"
      ],
      "Resource": "*"
    }
  ]
}
```

## Configure the Dapr Component

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: huawei-csms
  namespace: production
spec:
  type: secretstores.huaweicloud.csms
  version: v1
  metadata:
    - name: region
      value: "cn-north-4"
    - name: accessKey
      secretKeyRef:
        name: huawei-credentials
        key: access-key
    - name: secretAccessKey
      secretKeyRef:
        name: huawei-credentials
        key: secret-key
```

Create the Kubernetes secret holding HuaweiCloud credentials:

```bash
kubectl create secret generic huawei-credentials \
  --from-literal=access-key="AXXXXXXXXXXXXXXXXXXX" \
  --from-literal=secret-key="xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx" \
  -n production
```

## Retrieve a Secret

With the component configured, retrieve a secret by name:

```bash
curl http://localhost:3500/v1.0/secrets/huawei-csms/myapp%2Fdb-password
```

Response:

```json
{
  "myapp/db-password": "supersecretpassword"
}
```

## Using in a Java Service

```java
import io.dapr.client.DaprClient;
import io.dapr.client.DaprClientBuilder;
import java.util.Map;

@Service
public class ConfigService {

    private final DaprClient daprClient;

    public ConfigService() {
        this.daprClient = new DaprClientBuilder().build();
    }

    public String getDbPassword() {
        Map<String, String> secrets = daprClient
            .getSecret("huawei-csms", "myapp/db-password")
            .block();
        return secrets.get("myapp/db-password");
    }
}
```

## Secret Versioning

CSMS supports secret versions. Retrieve a specific version:

```bash
curl "http://localhost:3500/v1.0/secrets/huawei-csms/myapp%2Fdb-password?metadata.version_id=v1"
```

## Restricting Component Access

Apply component scoping to limit which services can use this secret store:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: huawei-csms
  namespace: production
spec:
  type: secretstores.huaweicloud.csms
  version: v1
  metadata:
    - name: region
      value: "cn-north-4"
scopes:
  - backend-api
  - batch-processor
```

## Summary

Configuring Dapr with HuaweiCloud CSMS requires creating an IAM user with CSMS permissions, storing the access key in a Kubernetes secret, and defining a Dapr component with the region. Once configured, your services on Huawei Cloud can use the standard Dapr secrets API to retrieve secrets without writing any HuaweiCloud SDK code in their applications.
