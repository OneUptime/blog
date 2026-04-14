# How to Configure Dapr with AlibabaCloud OOS Parameter Store

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Alibaba Cloud, OOS, Parameter Store, Secret Management

Description: Learn how to configure the Dapr secret store component for Alibaba Cloud OOS Parameter Store to retrieve secrets in Alibaba Cloud deployments.

---

Alibaba Cloud OPS Orchestration Service (OOS) Parameter Store provides a centralized, versioned parameter and secret storage service. It integrates with Alibaba Cloud RAM (Resource Access Management) for access control and supports encrypted parameter storage using KMS. Dapr's OOS component enables your microservices to read parameters through the standard Dapr secrets API.

## Create Parameters in OOS

Use the Alibaba Cloud console or CLI to create parameters:

```bash
# Create an encrypted parameter (SecretParameter)
aliyun oos CreateSecretParameter \
  --Name "myapp.db.password" \
  --Value "supersecretpassword" \
  --KeyId "alias/acs/oos" \
  --RegionId cn-hangzhou

# Create a standard parameter
aliyun oos CreateParameter \
  --Name "myapp.db.host" \
  --Value "mydb.internal.example.com" \
  --Type "String" \
  --RegionId cn-hangzhou
```

Grant the RAM role OOS read access:

```json
{
  "Version": "1",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "oos:GetSecretParameter",
        "oos:GetSecretParameters",
        "oos:GetParameter",
        "oos:GetParameters"
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
  name: alibabacloud-oos
  namespace: production
spec:
  type: secretstores.alicloud.parameterstore
  version: v1
  metadata:
    - name: regionId
      value: "cn-hangzhou"
    - name: accessKeyID
      secretKeyRef:
        name: alibaba-credentials
        key: access-key-id
    - name: accessKeySecret
      secretKeyRef:
        name: alibaba-credentials
        key: access-key-secret
```

Create the Kubernetes secret with Alibaba Cloud credentials:

```bash
kubectl create secret generic alibaba-credentials \
  --from-literal=access-key-id="LTAI5tXXXXXXXXXX" \
  --from-literal=access-key-secret="xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx" \
  -n production
```

## Using RRSA for ACK Clusters

For Alibaba Cloud Container Service for Kubernetes (ACK), use RRSA (RAM Roles for Service Accounts) instead of static credentials:

```yaml
spec:
  type: secretstores.alicloud.parameterstore
  version: v1
  metadata:
    - name: regionId
      value: "cn-hangzhou"
    - name: roleArn
      value: "acs:ram::123456789012:role/my-service-role"
    - name: oidcProviderArn
      value: "acs:ram::123456789012:oidc-provider/ack-rrsa-cluster"
    - name: oidcTokenFilePath
      value: "/var/run/secrets/tokens/alibaba-token"
```

## Retrieve a Secret

```bash
curl http://localhost:3500/v1.0/secrets/alibabacloud-oos/myapp.db.password
```

Response:

```json
{
  "myapp.db.password": "supersecretpassword"
}
```

## Example in Go

```go
func getDbConfig() (string, string, error) {
    resp, err := http.Get("http://localhost:3500/v1.0/secrets/alibabacloud-oos/myapp.db.password")
    if err != nil {
        return "", "", err
    }
    defer resp.Body.Close()

    var secret map[string]string
    json.NewDecoder(resp.Body).Decode(&secret)

    hostResp, err := http.Get("http://localhost:3500/v1.0/secrets/alibabacloud-oos/myapp.db.host")
    if err != nil {
        return "", "", err
    }
    defer hostResp.Body.Close()
    var hostSecret map[string]string
    json.NewDecoder(hostResp.Body).Decode(&hostSecret)

    return hostSecret["myapp.db.host"], secret["myapp.db.password"], nil
}
```

## Summary

Configuring Dapr with Alibaba Cloud OOS Parameter Store requires a RAM role with OOS read permissions, Alibaba Cloud credentials stored in a Kubernetes secret or RRSA for ACK clusters, and a Dapr component definition referencing the region. This gives your services a cloud-agnostic secrets API backed by Alibaba Cloud's managed parameter store.
