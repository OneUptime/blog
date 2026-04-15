# How to Authenticate Dapr with AWS Services

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, AWS, Authentication, IAM, Security

Description: Learn how to authenticate Dapr components with AWS services using IAM roles, instance profiles, and explicit credentials for state, pub/sub, and bindings.

---

Dapr components that integrate with AWS services - DynamoDB, S3, SQS, SNS, and others - require AWS credentials to authenticate API calls. Dapr supports three authentication methods: explicit access keys, EC2 instance profiles, and IAM Roles for Service Accounts (IRSA) on EKS.

## Authentication Method 1: Explicit Credentials

Store access keys in a Kubernetes secret and reference them in component metadata:

```bash
kubectl create secret generic aws-credentials \
  --from-literal=accessKey=AKIAIOSFODNN7EXAMPLE \
  --from-literal=secretKey=wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY
```

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: statestore
spec:
  type: state.aws.dynamodb
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
  - name: table
    value: dapr-state
```

## Authentication Method 2: Instance Profile or EC2 Role

When running on EC2 or ECS with an attached IAM role, omit access keys and Dapr uses the instance metadata service automatically:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: statestore
spec:
  type: state.aws.dynamodb
  version: v1
  metadata:
  - name: region
    value: us-east-1
  - name: table
    value: dapr-state
  # No accessKey/secretKey - uses instance profile
```

The EC2 instance or ECS task role must have the correct IAM policy:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "dynamodb:GetItem",
        "dynamodb:PutItem",
        "dynamodb:DeleteItem",
        "dynamodb:Query"
      ],
      "Resource": "arn:aws:dynamodb:us-east-1:123456789012:table/dapr-state"
    }
  ]
}
```

## Authentication Method 3: IRSA on EKS

IRSA lets Kubernetes service accounts assume IAM roles without long-lived credentials:

```bash
# Create IAM role with trust policy for the service account
aws iam create-role \
  --role-name dapr-state-role \
  --assume-role-policy-document file://trust-policy.json

# Annotate the Kubernetes service account
kubectl annotate serviceaccount dapr-app \
  eks.amazonaws.com/role-arn=arn:aws:iam::123456789012:role/dapr-state-role
```

```json
// trust-policy.json
{
  "Version": "2012-10-17",
  "Statement": [{
    "Effect": "Allow",
    "Principal": {
      "Federated": "arn:aws:iam::123456789012:oidc-provider/oidc.eks.us-east-1.amazonaws.com/id/EXAMPLED539D4633E53DE1B71EXAMPLE"
    },
    "Action": "sts:AssumeRoleWithWebIdentity",
    "Condition": {
      "StringEquals": {
        "oidc.eks.us-east-1.amazonaws.com/id/EXAMPLED539D4633E53DE1B71EXAMPLE:sub": "system:serviceaccount:default:dapr-app"
      }
    }
  }]
}
```

## Using AWS Session Tokens

For temporary credentials from STS AssumeRole:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: pubsub
spec:
  type: pubsub.aws.sqs
  version: v1
  metadata:
  - name: region
    value: us-east-1
  - name: accessKey
    secretKeyRef:
      name: aws-temp-creds
      key: accessKey
  - name: secretKey
    secretKeyRef:
      name: aws-temp-creds
      key: secretKey
  - name: sessionToken
    secretKeyRef:
      name: aws-temp-creds
      key: sessionToken
```

## Summary

Dapr supports three AWS authentication patterns: explicit access keys stored as Kubernetes secrets, EC2/ECS instance profiles using the metadata service, and IRSA for EKS workloads. The recommended approach for production Kubernetes deployments is IRSA, as it eliminates long-lived credentials and aligns with AWS security best practices. Always use Kubernetes secrets or IRSA rather than embedding credentials in component YAML files.
