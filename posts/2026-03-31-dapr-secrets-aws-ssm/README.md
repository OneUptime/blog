# How to Configure Dapr with AWS SSM Parameter Store

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, AWS, SSM, Parameter Store, Secret Management

Description: Learn how to configure Dapr to use AWS Systems Manager Parameter Store as a secret store backend for retrieving application secrets and configuration.

---

AWS Systems Manager (SSM) Parameter Store is a popular choice for teams already running on AWS. It integrates with IAM for access control, supports parameter versioning, and offers both plaintext and SecureString parameter types. Dapr's SSM component lets you use this as a secret backend with the standard Dapr secrets API.

## Prerequisites

Before configuring the Dapr component, ensure your service has an IAM role with the appropriate permissions:

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
    }
  ]
}
```

If running on EKS, use IAM Roles for Service Accounts (IRSA):

```bash
eksctl create iamserviceaccount \
  --cluster my-cluster \
  --namespace production \
  --name my-service-sa \
  --attach-policy-arn arn:aws:iam::123456789012:policy/DaprSSMPolicy \
  --approve
```

## Create Parameters in SSM

```bash
# Create a SecureString parameter
aws ssm put-parameter \
  --name "/myapp/db-password" \
  --value "supersecretpassword" \
  --type SecureString \
  --region us-east-1

# Create a String parameter for non-sensitive config
aws ssm put-parameter \
  --name "/myapp/db-host" \
  --value "postgres.internal.example.com" \
  --type String \
  --region us-east-1
```

## Configure the Dapr Component

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: ssm-store
  namespace: production
spec:
  type: secretstores.aws.parameterstore
  version: v1
  metadata:
    - name: region
      value: "us-east-1"
    - name: prefix
      value: "/myapp/"
```

When using IRSA on EKS, no explicit credentials are needed in the component. Dapr uses the pod's IAM role automatically.

For local development with explicit credentials:

```yaml
spec:
  metadata:
    - name: region
      value: "us-east-1"
    - name: accessKey
      secretKeyRef:
        name: aws-creds
        key: access-key
    - name: secretKey
      secretKeyRef:
        name: aws-creds
        key: secret-key
```

## Retrieving Parameters

With the prefix `/myapp/` configured, retrieve the `db-password` parameter:

```bash
curl http://localhost:3500/v1.0/secrets/ssm-store/db-password
```

Response:

```json
{
  "db-password": "supersecretpassword"
}
```

To retrieve all parameters under your configured prefix, use the bulk secrets endpoint:

```bash
curl "http://localhost:3500/v1.0/secrets/ssm-store/bulk"
```

## Annotate Your Kubernetes Deployment

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-service
spec:
  template:
    metadata:
      annotations:
        dapr.io/enabled: "true"
        dapr.io/app-id: "my-service"
    spec:
      serviceAccountName: my-service-sa
```

## Summary

Configuring Dapr with AWS SSM Parameter Store involves creating an IAM role with ssm:GetParameter permissions, defining the Dapr component with the appropriate region and optional prefix, and using IRSA for seamless authentication on EKS. Once configured, the standard Dapr secrets API retrieves both SecureString and String parameters transparently.
