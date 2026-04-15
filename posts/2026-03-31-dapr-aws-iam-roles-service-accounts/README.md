# How to Use Dapr with AWS IAM Roles for Service Accounts

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, AWS, IAM, EKS, IRSA, Security

Description: Configure Dapr on EKS to use IAM Roles for Service Accounts (IRSA), eliminating long-lived credentials while granting precise AWS permissions to each service.

---

IAM Roles for Service Accounts (IRSA) lets pods on Amazon EKS assume AWS IAM roles without distributing access keys. Dapr components that use AWS services - DynamoDB, S3, SQS - can leverage IRSA by associating a Kubernetes service account with an IAM role.

## Prerequisites

You need an EKS cluster with the OIDC provider enabled:

```bash
# Enable OIDC provider for the cluster
eksctl utils associate-iam-oidc-provider \
  --cluster my-cluster \
  --region us-east-1 \
  --approve

# Get the OIDC provider URL
aws eks describe-cluster \
  --name my-cluster \
  --query "cluster.identity.oidc.issuer" \
  --output text
```

## Step 1: Create the IAM Policy

```bash
cat > dapr-dynamodb-policy.json << 'EOF'
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "dynamodb:GetItem",
        "dynamodb:PutItem",
        "dynamodb:DeleteItem",
        "dynamodb:Query",
        "dynamodb:Scan"
      ],
      "Resource": "arn:aws:dynamodb:us-east-1:123456789012:table/dapr-*"
    }
  ]
}
EOF

aws iam create-policy \
  --policy-name DaprDynamoDBPolicy \
  --policy-document file://dapr-dynamodb-policy.json
```

## Step 2: Create the IAM Role with Trust Policy

```bash
OIDC_PROVIDER=$(aws eks describe-cluster \
  --name my-cluster \
  --query "cluster.identity.oidc.issuer" \
  --output text | sed 's|https://||')

cat > trust-policy.json << EOF
{
  "Version": "2012-10-17",
  "Statement": [{
    "Effect": "Allow",
    "Principal": {
      "Federated": "arn:aws:iam::123456789012:oidc-provider/${OIDC_PROVIDER}"
    },
    "Action": "sts:AssumeRoleWithWebIdentity",
    "Condition": {
      "StringEquals": {
        "${OIDC_PROVIDER}:sub": "system:serviceaccount:default:order-service",
        "${OIDC_PROVIDER}:aud": "sts.amazonaws.com"
      }
    }
  }]
}
EOF

aws iam create-role \
  --role-name DaprOrderServiceRole \
  --assume-role-policy-document file://trust-policy.json

aws iam attach-role-policy \
  --role-name DaprOrderServiceRole \
  --policy-arn arn:aws:iam::123456789012:policy/DaprDynamoDBPolicy
```

## Step 3: Create and Annotate the Kubernetes Service Account

```yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: order-service
  namespace: default
  annotations:
    eks.amazonaws.com/role-arn: arn:aws:iam::123456789012:role/DaprOrderServiceRole
```

## Step 4: Configure Dapr Component Without Credentials

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: statestore
  namespace: default
spec:
  type: state.aws.dynamodb
  version: v1
  metadata:
  - name: region
    value: us-east-1
  - name: table
    value: dapr-state
  - name: partitionKey
    value: key
  # No accessKey or secretKey - IRSA handles authentication
```

## Step 5: Deploy the Application Using the Service Account

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: order-service
spec:
  selector:
    matchLabels:
      app: order-service
  template:
    metadata:
      labels:
        app: order-service
      annotations:
        dapr.io/enabled: "true"
        dapr.io/app-id: "order-service"
        dapr.io/app-port: "8080"
    spec:
      serviceAccountName: order-service
      containers:
      - name: order-service
        image: myrepo/order-service:latest
```

## Verify IRSA Is Working

```bash
# Check that the pod has the AWS_WEB_IDENTITY_TOKEN_FILE env var
kubectl exec -it order-service-pod -- env | grep AWS

# Test the DynamoDB call via Dapr
kubectl exec -it order-service-pod -- \
  curl http://localhost:3500/v1.0/state/statestore/test-key
```

## Summary

IRSA integrates Kubernetes service accounts with AWS IAM, letting Dapr components authenticate to AWS services without static credentials. Each service gets its own IAM role with least-privilege policies, and credentials rotate automatically via the EKS token endpoint. This is the recommended authentication approach for all Dapr AWS integrations running on EKS.
