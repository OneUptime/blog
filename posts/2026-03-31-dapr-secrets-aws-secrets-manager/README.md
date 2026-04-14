# How to Use Dapr Secrets Management with AWS Secrets Manager

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Secret, AWS, Security, Configuration

Description: Learn how to configure the Dapr AWS Secrets Manager component to read secrets from AWS Secrets Manager using IAM roles or access keys in your microservices.

---

## Introduction

Dapr integrates with AWS Secrets Manager as a secret store backend, enabling your applications to retrieve secrets through Dapr's standard secrets API. This means your application code stays cloud-agnostic while benefiting from AWS Secrets Manager's rotation, versioning, and audit logging features.

## Architecture

```mermaid
flowchart LR
    App[Application] -->|GET /v1.0/secrets/aws-secrets-manager/my-secret| Sidecar[Dapr Sidecar]
    Sidecar -->|AWS API call| ASM[AWS Secrets Manager]
    ASM -->|Secret value| Sidecar
    Sidecar -->|Return JSON| App

    subgraph Auth["AWS Authentication"]
        IAM[IAM Role / IRSA]
        AK[Access Key + Secret]
        IMDS[EC2/ECS Instance Metadata]
    end
    Sidecar --> Auth
```

## Prerequisites

- AWS account with Secrets Manager access
- AWS CLI configured (`aws configure`)
- Dapr installed locally or on Kubernetes
- IAM role or access key with `secretsmanager:GetSecretValue` permission

## Step 1: Create Secrets in AWS Secrets Manager

```bash
# Create a simple string secret
aws secretsmanager create-secret \
  --name "prod/db-credentials" \
  --description "Production database credentials" \
  --secret-string '{"username":"admin","password":"SuperSecretPass123"}' \
  --region us-east-1

# Create individual secrets
aws secretsmanager create-secret \
  --name "prod/stripe-api-key" \
  --secret-string "sk_live_abc123xyz" \
  --region us-east-1
```

## Step 2: Create IAM Policy for Secrets Access

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "secretsmanager:GetSecretValue"
      ],
      "Resource": [
        "arn:aws:secretsmanager:us-east-1:123456789012:secret:prod/*"
      ]
    },
    {
      "Effect": "Allow",
      "Action": [
        "secretsmanager:ListSecrets"
      ],
      "Resource": "*"
    }
  ]
}
```

Save as `dapr-secrets-policy.json` and apply:

```bash
aws iam create-policy \
  --policy-name DaprSecretsPolicy \
  --policy-document file://dapr-secrets-policy.json
```

## Step 3: Configure the Dapr Component

### Using IAM Role for Service Accounts (IRSA) on EKS - Recommended

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: aws-secrets-manager
  namespace: default
spec:
  type: secretstores.aws.secretmanager
  version: v1
  metadata:
  - name: region
    value: "us-east-1"
```

Annotate your Kubernetes Service Account with the IAM role ARN:

```yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: dapr-app-sa
  namespace: default
  annotations:
    eks.amazonaws.com/role-arn: "arn:aws:iam::123456789012:role/DaprSecretsRole"
```

Reference the service account in your deployment:

```yaml
spec:
  template:
    spec:
      serviceAccountName: dapr-app-sa
```

### Using Static Access Keys (Development/Testing)

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: aws-secrets-manager
  namespace: default
spec:
  type: secretstores.aws.secretmanager
  version: v1
  metadata:
  - name: region
    value: "us-east-1"
  - name: accessKey
    secretKeyRef:
      name: aws-credentials
      key: accessKey
  - name: secretKey
    secretKeyRef:
      name: aws-credentials
      key: secretKey
```

Create the Kubernetes secret with AWS credentials:

```bash
kubectl create secret generic aws-credentials \
  --from-literal=accessKey=AKIAIOSFODNN7EXAMPLE \
  --from-literal=secretKey=wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY
```

## Step 4: Read Secrets in Your Application

### Via HTTP API

Read a secret (JSON secrets are returned as-is):

```bash
curl http://localhost:3500/v1.0/secrets/aws-secrets-manager/prod/db-credentials
```

Response (AWS Secrets Manager returns the secret value as a JSON string):

```json
{
  "prod/db-credentials": "{\"username\":\"admin\",\"password\":\"SuperSecretPass123\"}"
}
```

For a string secret:

```bash
curl http://localhost:3500/v1.0/secrets/aws-secrets-manager/prod/stripe-api-key
```

Response:

```json
{
  "prod/stripe-api-key": "sk_live_abc123xyz"
}
```

### Via Go SDK

```go
package main

import (
    "context"
    "encoding/json"
    "fmt"
    "log"

    dapr "github.com/dapr/go-sdk/client"
)

func main() {
    client, err := dapr.NewClient()
    if err != nil {
        log.Fatal(err)
    }
    defer client.Close()

    ctx := context.Background()

    // Get JSON secret
    secret, err := client.GetSecret(ctx, "aws-secrets-manager", "prod/db-credentials", nil)
    if err != nil {
        log.Fatal(err)
    }

    // Parse the JSON string value
    var creds map[string]string
    rawValue := secret["prod/db-credentials"]
    if err := json.Unmarshal([]byte(rawValue), &creds); err != nil {
        log.Fatal(err)
    }

    fmt.Printf("Username: %s\n", creds["username"])
}
```

### Via Python SDK

```python
from dapr.clients import DaprClient
import json

with DaprClient() as client:
    secret = client.get_secret(
        store_name='aws-secrets-manager',
        key='prod/db-credentials'
    )
    raw_value = secret.secret['prod/db-credentials']
    creds = json.loads(raw_value)
    username = creds['username']
    print(f"Username: {username}")
```

## Accessing Specific Secret Versions

AWS Secrets Manager supports version IDs and staging labels:

```bash
# By version ID
curl "http://localhost:3500/v1.0/secrets/aws-secrets-manager/prod/db-credentials?metadata.version_id=abc123"

# By version stage label
curl "http://localhost:3500/v1.0/secrets/aws-secrets-manager/prod/db-credentials?metadata.version_stage=AWSPREVIOUS"
```

## Bulk Secret Retrieval

```bash
curl http://localhost:3500/v1.0/secrets/aws-secrets-manager/bulk
```

## Summary

Dapr's AWS Secrets Manager integration provides a clean abstraction over the AWS Secrets Manager API. Use IAM roles for service accounts (IRSA) on EKS for credential-free access. Configure the component with your AWS region and authentication method. Read secrets via the Dapr HTTP API or SDK - your application code stays the same whether you switch to Azure Key Vault or HashiCorp Vault later. Parse JSON-encoded secret values in your application when reading multi-key secrets.
