# How to Use Dapr with AWS SSM Parameter Store

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, AWS, SSM, Parameter Store, Configuration, Secret

Description: Use Dapr with AWS Systems Manager Parameter Store to retrieve application configuration and secrets, supporting both SecureString and plain parameters.

---

AWS SSM Parameter Store provides hierarchical configuration and secrets storage integrated with IAM. Dapr's SSM secrets component maps Parameter Store paths to the Dapr secrets API, giving services a consistent way to access configuration.

## Store Parameters in SSM

```bash
# Create plain string parameter
aws ssm put-parameter \
  --name "/myapp/config/log-level" \
  --type String \
  --value "info" \
  --region us-east-1

# Create a SecureString parameter (encrypted with KMS)
aws ssm put-parameter \
  --name "/myapp/secrets/db-password" \
  --type SecureString \
  --value "s3cret-p@ssword" \
  --region us-east-1

# Create parameters with tags
aws ssm put-parameter \
  --name "/myapp/config/feature-flags" \
  --type String \
  --value '{"darkMode":true,"newCheckout":false}' \
  --tags "Key=Environment,Value=production" \
  --region us-east-1
```

## Configure the Dapr SSM Component

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: ssm-secrets
  namespace: default
spec:
  type: secretstores.aws.parameterstore
  version: v1
  metadata:
  - name: region
    value: us-east-1
  - name: accessKey
    secretKeyRef:
      name: aws-credentials
      key: accessKey
  - name: secretKey
    secretKeyRef:
      name: aws-credentials
      key: secretKey
  - name: prefix
    value: /myapp
```

## Retrieve a Parameter

```python
import requests

def get_parameter(name: str) -> str:
    # With prefix=/myapp, the component prepends /myapp to the key
    resp = requests.get(
        f"http://localhost:3500/v1.0/secrets/ssm-secrets/{name}"
    )
    resp.raise_for_status()
    # SSM parameters return as {"<param-name>": "<value>"}
    return resp.json().get(name)

# Get log level (prefix /myapp is prepended automatically)
log_level = get_parameter("config/log-level")
print(f"Log level: {log_level}")

# Get SecureString (automatically decrypted)
db_password = get_parameter("secrets/db-password")
print("DB password retrieved")
```

## Retrieve Parameters by Path (Bulk)

```python
def get_all_parameters() -> dict:
    # Bulk endpoint returns all parameters under the configured prefix
    resp = requests.get(
        "http://localhost:3500/v1.0/secrets/ssm-secrets/bulk"
    )
    resp.raise_for_status()
    return resp.json()

all_params = get_all_parameters()
for name, values in all_params.items():
    print(f"{name}: {values}")
```

## Use SSM Parameters in Component Definitions

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: statestore
spec:
  type: state.redis
  version: v1
  auth:
    secretStore: ssm-secrets
  metadata:
  - name: redisHost
    value: redis:6379
  - name: redisPassword
    secretKeyRef:
      name: secrets/redis-password
      key: secrets/redis-password
```

## IAM Policy for SSM Parameter Store

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "ssm:GetParameter",
        "ssm:GetParameters",
        "ssm:GetParametersByPath"
      ],
      "Resource": "arn:aws:ssm:us-east-1:123456789012:parameter/myapp/*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "kms:Decrypt"
      ],
      "Resource": "arn:aws:kms:us-east-1:123456789012:key/YOUR-KMS-KEY-ID"
    }
  ]
}
```

## Difference Between SSM and Secrets Manager

```bash
# SSM Parameter Store - best for:
# - Application configuration (feature flags, URLs, log levels)
# - Secrets that don't need automatic rotation
# - Cost-sensitive workloads (free tier for standard parameters)

# Secrets Manager - best for:
# - Database credentials that need automatic rotation
# - Secrets with complex rotation logic
# - Cross-account secret sharing
```

## Summary

Dapr's SSM Parameter Store integration provides access to both plaintext configuration values and SecureString secrets through the Dapr secrets API. The prefix configuration option simplifies path management by stripping common path prefixes. For applications that use both configuration and secrets, SSM Parameter Store with SecureString is a cost-effective alternative to AWS Secrets Manager when automatic rotation is not required.
