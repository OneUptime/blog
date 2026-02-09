# How to Use ServiceAccount for AWS IAM Roles with IRSA

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, AWS, Security

Description: Configure AWS IAM Roles for ServiceAccounts (IRSA) in EKS to grant Kubernetes pods secure access to AWS services without static credentials.

---

IAM Roles for ServiceAccounts (IRSA) is an AWS feature that allows Kubernetes pods to assume IAM roles using their ServiceAccount tokens. This eliminates the need for AWS access keys and enables fine-grained IAM permissions for individual workloads.

## Understanding IRSA Architecture

IRSA works through OIDC token exchange. Your EKS cluster exposes an OIDC endpoint that AWS trusts. When a pod needs AWS access, it presents its ServiceAccount token. AWS validates this token against the cluster's OIDC endpoint and exchanges it for temporary AWS credentials.

The flow works like this: the pod reads its ServiceAccount token from the mounted volume. The AWS SDK detects the token and environment variables injected by the IRSA webhook. The SDK calls AWS STS AssumeRoleWithWebIdentity with the token. AWS validates the token and returns temporary credentials. The pod uses these credentials to access AWS services.

This provides several benefits. No static credentials means no credentials to rotate or secure. Permissions are defined in IAM policies, leveraging existing AWS tooling. Tokens expire automatically, limiting exposure. Audit trails in CloudTrail show which pod accessed which resource.

## Setting Up IRSA Prerequisites

First, create an OIDC provider in your AWS account:

```bash
# Get the OIDC issuer URL from your EKS cluster
CLUSTER_NAME="my-cluster"
REGION="us-east-1"

OIDC_ISSUER=$(aws eks describe-cluster \
    --name $CLUSTER_NAME \
    --region $REGION \
    --query "cluster.identity.oidc.issuer" \
    --output text)

# Extract the OIDC ID
OIDC_ID=$(echo $OIDC_ISSUER | cut -d'/' -f 5)

# Check if the provider already exists
aws iam list-open-id-connect-providers | grep $OIDC_ID

# If not, create it
eksctl utils associate-iam-oidc-provider \
    --cluster $CLUSTER_NAME \
    --region $REGION \
    --approve
```

This configures AWS to trust tokens issued by your cluster.

## Creating an IAM Role for ServiceAccount

Create an IAM role with the correct trust policy:

```bash
# Create a trust policy document
cat > trust-policy.json <<EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Federated": "arn:aws:iam::123456789012:oidc-provider/oidc.eks.us-east-1.amazonaws.com/id/$OIDC_ID"
      },
      "Action": "sts:AssumeRoleWithWebIdentity",
      "Condition": {
        "StringEquals": {
          "oidc.eks.us-east-1.amazonaws.com/id/$OIDC_ID:sub": "system:serviceaccount:production:s3-app",
          "oidc.eks.us-east-1.amazonaws.com/id/$OIDC_ID:aud": "sts.amazonaws.com"
        }
      }
    }
  ]
}
EOF

# Create the IAM role
aws iam create-role \
    --role-name s3-app-role \
    --assume-role-policy-document file://trust-policy.json \
    --description "Role for Kubernetes s3-app ServiceAccount"

# Attach permissions policy
aws iam attach-role-policy \
    --role-name s3-app-role \
    --policy-arn arn:aws:iam::aws:policy/AmazonS3ReadOnlyAccess
```

The trust policy binds the IAM role to a specific ServiceAccount in a specific namespace.

## Configuring the ServiceAccount

Annotate the ServiceAccount with the IAM role ARN:

```yaml
# s3-app-serviceaccount.yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: s3-app
  namespace: production
  annotations:
    eks.amazonaws.com/role-arn: arn:aws:iam::123456789012:role/s3-app-role
    eks.amazonaws.com/sts-regional-endpoints: "true"
    eks.amazonaws.com/token-expiration: "86400"
```

The role-arn annotation tells the IRSA webhook which IAM role to use. The sts-regional-endpoints annotation improves performance by using regional STS endpoints. The token-expiration controls credential lifetime.

Apply the ServiceAccount:

```bash
kubectl apply -f s3-app-serviceaccount.yaml

# Verify the annotation
kubectl get serviceaccount s3-app -n production -o yaml
```

## Deploying Pods with IRSA

Create a pod using the annotated ServiceAccount:

```yaml
# s3-reader-pod.yaml
apiVersion: v1
kind: Pod
metadata:
  name: s3-reader
  namespace: production
spec:
  serviceAccountName: s3-app
  containers:
  - name: aws-cli
    image: amazon/aws-cli:latest
    command:
    - /bin/bash
    - -c
    - |
      echo "Testing AWS S3 access with IRSA..."
      aws s3 ls
      aws sts get-caller-identity
      sleep 3600
```

Deploy and test:

```bash
kubectl apply -f s3-reader-pod.yaml

# Check the pod logs
kubectl logs s3-reader -n production

# Verify environment variables were injected
kubectl exec s3-reader -n production -- env | grep AWS
```

You should see environment variables like:

```
AWS_ROLE_ARN=arn:aws:iam::123456789012:role/s3-app-role
AWS_WEB_IDENTITY_TOKEN_FILE=/var/run/secrets/eks.amazonaws.com/serviceaccount/token
AWS_REGION=us-east-1
```

## Using IRSA with AWS SDK

The AWS SDK automatically detects IRSA configuration:

```go
// s3-reader.go
package main

import (
    "context"
    "fmt"

    "github.com/aws/aws-sdk-go-v2/config"
    "github.com/aws/aws-sdk-go-v2/service/s3"
    "github.com/aws/aws-sdk-go-v2/service/sts"
)

func main() {
    ctx := context.Background()

    // Load AWS configuration - automatically uses IRSA
    cfg, err := config.LoadDefaultConfig(ctx)
    if err != nil {
        panic(fmt.Sprintf("unable to load SDK config: %v", err))
    }

    // Verify identity
    stsClient := sts.NewFromConfig(cfg)
    identity, err := stsClient.GetCallerIdentity(ctx, &sts.GetCallerIdentityInput{})
    if err != nil {
        panic(fmt.Sprintf("unable to get caller identity: %v", err))
    }

    fmt.Printf("Account: %s\n", *identity.Account)
    fmt.Printf("User ARN: %s\n", *identity.Arn)

    // List S3 buckets
    s3Client := s3.NewFromConfig(cfg)
    result, err := s3Client.ListBuckets(ctx, &s3.ListBucketsInput{})
    if err != nil {
        panic(fmt.Sprintf("unable to list buckets: %v", err))
    }

    fmt.Println("S3 Buckets:")
    for _, bucket := range result.Buckets {
        fmt.Printf("  - %s\n", *bucket.Name)
    }
}
```

The SDK handles token exchange automatically.

## Python Implementation

For Python applications using boto3:

```python
# s3_reader.py
import boto3
import os

def main():
    # boto3 automatically uses IRSA credentials
    session = boto3.Session()

    # Verify identity
    sts = session.client('sts')
    identity = sts.get_caller_identity()
    print(f"Account: {identity['Account']}")
    print(f"User ARN: {identity['Arn']}")

    # List S3 buckets
    s3 = session.client('s3')
    response = s3.list_buckets()

    print("\nS3 Buckets:")
    for bucket in response['Buckets']:
        print(f"  - {bucket['Name']}")

if __name__ == "__main__":
    main()
```

No explicit credential configuration needed - boto3 detects IRSA automatically.

## Multiple AWS Services Access

Grant access to multiple AWS services:

```bash
# Create a custom policy for multiple services
cat > app-policy.json <<EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:GetObject",
        "s3:ListBucket"
      ],
      "Resource": [
        "arn:aws:s3:::my-bucket",
        "arn:aws:s3:::my-bucket/*"
      ]
    },
    {
      "Effect": "Allow",
      "Action": [
        "dynamodb:GetItem",
        "dynamodb:Query",
        "dynamodb:Scan"
      ],
      "Resource": [
        "arn:aws:dynamodb:us-east-1:123456789012:table/my-table"
      ]
    },
    {
      "Effect": "Allow",
      "Action": [
        "sqs:SendMessage",
        "sqs:ReceiveMessage",
        "sqs:DeleteMessage"
      ],
      "Resource": [
        "arn:aws:sqs:us-east-1:123456789012:my-queue"
      ]
    }
  ]
}
EOF

# Create and attach the policy
aws iam create-policy \
    --policy-name multi-service-app-policy \
    --policy-document file://app-policy.json

aws iam attach-role-policy \
    --role-name s3-app-role \
    --policy-arn arn:aws:iam::123456789012:policy/multi-service-app-policy
```

## Using IRSA in Deployments

Production applications use Deployments:

```yaml
# s3-app-deployment.yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: s3-app
  namespace: production
  annotations:
    eks.amazonaws.com/role-arn: arn:aws:iam::123456789012:role/s3-app-role
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: s3-app
  namespace: production
spec:
  replicas: 3
  selector:
    matchLabels:
      app: s3-app
  template:
    metadata:
      labels:
        app: s3-app
    spec:
      serviceAccountName: s3-app
      containers:
      - name: app
        image: my-app:latest
        ports:
        - containerPort: 8080
        env:
        - name: AWS_REGION
          value: us-east-1
        - name: S3_BUCKET
          value: my-bucket
```

All replicas automatically get AWS access through IRSA.

## Cross-Account Access

Access resources in different AWS accounts:

```bash
# In target account, create a role that trusts the source account role
cat > cross-account-trust-policy.json <<EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "AWS": "arn:aws:iam::123456789012:role/s3-app-role"
      },
      "Action": "sts:AssumeRole"
    }
  ]
}
EOF

aws iam create-role \
    --role-name cross-account-s3-access \
    --assume-role-policy-document file://cross-account-trust-policy.json \
    --profile target-account

# Grant the source role permission to assume the target role
cat > assume-role-policy.json <<EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": "sts:AssumeRole",
      "Resource": "arn:aws:iam::987654321098:role/cross-account-s3-access"
    }
  ]
}
EOF

aws iam put-role-policy \
    --role-name s3-app-role \
    --policy-name AssumeTargetAccountRole \
    --policy-document file://assume-role-policy.json
```

Applications assume the cross-account role:

```python
# cross_account_access.py
import boto3

def access_cross_account_s3():
    sts = boto3.client('sts')

    # Assume role in target account
    assumed_role = sts.assume_role(
        RoleArn='arn:aws:iam::987654321098:role/cross-account-s3-access',
        RoleSessionName='cross-account-session'
    )

    # Create S3 client with assumed role credentials
    s3 = boto3.client(
        's3',
        aws_access_key_id=assumed_role['Credentials']['AccessKeyId'],
        aws_secret_access_key=assumed_role['Credentials']['SecretAccessKey'],
        aws_session_token=assumed_role['Credentials']['SessionToken']
    )

    # Access resources in target account
    response = s3.list_buckets()
    for bucket in response['Buckets']:
        print(f"  - {bucket['Name']}")

if __name__ == "__main__":
    access_cross_account_s3()
```

## Troubleshooting IRSA

Common issues and solutions:

```bash
# Check if OIDC provider is configured
aws iam list-open-id-connect-providers

# Verify ServiceAccount annotation
kubectl get serviceaccount s3-app -n production -o jsonpath='{.metadata.annotations}'

# Check if webhook injected environment variables
kubectl get pod <pod-name> -n production -o yaml | grep -A 10 env

# Test IAM role assumption manually
aws sts assume-role-with-web-identity \
    --role-arn arn:aws:iam::123456789012:role/s3-app-role \
    --role-session-name test-session \
    --web-identity-token file://token.jwt

# Check CloudTrail for permission denied errors
aws cloudtrail lookup-events \
    --lookup-attributes AttributeKey=Username,AttributeValue=s3-app-role \
    --max-results 10
```

## Security Best Practices

Follow the principle of least privilege:

```bash
# Good: Specific resource access
{
  "Effect": "Allow",
  "Action": "s3:GetObject",
  "Resource": "arn:aws:s3:::my-bucket/app-data/*"
}

# Bad: Overly broad access
{
  "Effect": "Allow",
  "Action": "s3:*",
  "Resource": "*"
}
```

Use condition keys to further restrict access:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::my-bucket/*",
      "Condition": {
        "StringEquals": {
          "aws:SourceAccount": "123456789012"
        },
        "IpAddress": {
          "aws:SourceIp": ["10.0.0.0/8"]
        }
      }
    }
  ]
}
```

## Monitoring and Auditing

Track IRSA usage in CloudWatch and CloudTrail:

```bash
# Query CloudTrail for AssumeRoleWithWebIdentity events
aws cloudtrail lookup-events \
    --lookup-attributes AttributeKey=EventName,AttributeValue=AssumeRoleWithWebIdentity \
    --max-results 100 \
    --output table

# Create CloudWatch metric filter for failed assumptions
aws logs put-metric-filter \
    --log-group-name /aws/cloudtrail \
    --filter-name FailedIRSAAssumptions \
    --filter-pattern '{ $.eventName = "AssumeRoleWithWebIdentity" && $.errorCode = "*" }' \
    --metric-transformations \
        metricName=FailedIRSAAssumptions,\
metricNamespace=Security,\
metricValue=1
```

## Conclusion

IRSA provides secure, credential-free AWS access for Kubernetes workloads. By annotating ServiceAccounts with IAM role ARNs and configuring trust relationships, you enable pods to assume IAM roles using their ServiceAccount tokens. This eliminates static credentials, provides fine-grained permissions through IAM policies, and creates comprehensive audit trails. Configure IRSA for all workloads that need AWS access - it's more secure than any alternative involving static credentials.
