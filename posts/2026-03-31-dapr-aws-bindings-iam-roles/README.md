# How to Use Dapr AWS Bindings with IAM Roles

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, AWS, IAM, Binding, Security

Description: Learn how to configure Dapr AWS bindings to use IAM roles via role assumption and EKS IRSA for secure, credential-free access to AWS services in Kubernetes.

---

## Why Use IAM Roles Instead of Static Credentials?

Static AWS access keys are long-lived credentials that can be leaked through logs, Git history, or misconfigured environments. IAM roles provide temporary, automatically rotated credentials with fine-grained permissions scoped to specific resources - a much more secure approach for production deployments.

## IAM Role Assumption with STS

The `AssumeRole` approach lets a Dapr service assume a role with specific permissions:

```bash
# Create the target role with an S3 policy
aws iam create-role \
  --role-name dapr-data-lake-role \
  --assume-role-policy-document file://trust-policy.json
```

`trust-policy.json`:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "AWS": "arn:aws:iam::123456789012:root"
      },
      "Action": "sts:AssumeRole",
      "Condition": {
        "StringEquals": {
          "aws:RequestedRegion": "us-east-1"
        }
      }
    }
  ]
}
```

Attach a permissions policy:

```bash
aws iam put-role-policy \
  --role-name dapr-data-lake-role \
  --policy-name s3-permissions \
  --policy-document '{
    "Version": "2012-10-17",
    "Statement": [
      {
        "Effect": "Allow",
        "Action": [
          "s3:GetObject",
          "s3:PutObject",
          "s3:DeleteObject",
          "s3:ListBucket"
        ],
        "Resource": [
          "arn:aws:s3:::my-data-lake",
          "arn:aws:s3:::my-data-lake/*"
        ]
      }
    ]
  }'
```

## Using IRSA on EKS (Recommended for Kubernetes)

IRSA (IAM Roles for Service Accounts) is the preferred approach for EKS because it provides pod-level credential isolation without any code changes.

### Step 1: Enable OIDC for Your Cluster

```bash
eksctl utils associate-iam-oidc-provider \
  --cluster production-cluster \
  --region us-east-1 \
  --approve
```

### Step 2: Create the IAM Role with IRSA Trust Policy

```bash
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
OIDC_PROVIDER=$(aws eks describe-cluster \
  --name production-cluster \
  --region us-east-1 \
  --query "cluster.identity.oidc.issuer" \
  --output text | sed 's|https://||')

cat > trust-policy.json <<EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Federated": "arn:aws:iam::${ACCOUNT_ID}:oidc-provider/${OIDC_PROVIDER}"
      },
      "Action": "sts:AssumeRoleWithWebIdentity",
      "Condition": {
        "StringEquals": {
          "${OIDC_PROVIDER}:sub": "system:serviceaccount:production:order-service",
          "${OIDC_PROVIDER}:aud": "sts.amazonaws.com"
        }
      }
    }
  ]
}
EOF

aws iam create-role \
  --role-name dapr-order-service \
  --assume-role-policy-document file://trust-policy.json
```

### Step 3: Attach Permissions

```bash
aws iam attach-role-policy \
  --role-name dapr-order-service \
  --policy-arn arn:aws:iam::aws:policy/AmazonSQSFullAccess
```

### Step 4: Annotate the Kubernetes Service Account

```yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: order-service
  namespace: production
  annotations:
    eks.amazonaws.com/role-arn: arn:aws:iam::123456789012:role/dapr-order-service
```

### Step 5: Configure the Dapr Binding - No Credentials Needed

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: order-queue
  namespace: production
spec:
  type: bindings.aws.sqs
  version: v1
  metadata:
    - name: queueNameOrUrl
      value: "order-processing"
    - name: region
      value: "us-east-1"
```

Dapr automatically picks up the IRSA credentials via the projected service account token at `/var/run/secrets/eks.amazonaws.com/serviceaccount/token`.

### Step 6: Configure the Pod to Use the Service Account

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: order-service
  namespace: production
spec:
  template:
    spec:
      serviceAccountName: order-service
      containers:
        - name: order-service
          image: myrepo/order-service:latest
```

## Least Privilege Policy Design

Always scope permissions to the minimum required:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": ["sqs:ReceiveMessage", "sqs:DeleteMessage", "sqs:GetQueueAttributes"],
      "Resource": "arn:aws:sqs:us-east-1:123456789012:order-processing"
    },
    {
      "Effect": "Allow",
      "Action": ["sqs:SendMessage"],
      "Resource": "arn:aws:sqs:us-east-1:123456789012:order-processing-dlq"
    }
  ]
}
```

## Summary

Dapr AWS bindings integrate seamlessly with IAM roles through EKS IRSA, providing temporary credentials at the pod level without any credentials in your component YAML. Configure OIDC on your EKS cluster, create a role with IRSA trust policy, annotate the Kubernetes service account, and Dapr handles the rest automatically. This approach eliminates long-lived credentials and provides fine-grained permission scoping per service.
