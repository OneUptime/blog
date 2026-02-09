# How to Implement Pod Identity for AWS Workloads with IRSA on Kubernetes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, AWS, Security

Description: Learn how to configure IAM Roles for Service Accounts (IRSA) to give Kubernetes pods secure, fine-grained access to AWS services without embedding credentials.

---

Kubernetes pods often need to access AWS services like S3, DynamoDB, or SQS. The traditional approach of embedding AWS credentials in pods creates security risks and management overhead. IAM Roles for Service Accounts (IRSA) provides a better solution by allowing pods to assume IAM roles using OpenID Connect (OIDC), giving each workload only the permissions it needs without storing any credentials.

This guide will show you how to set up IRSA in your EKS cluster and configure pods to access AWS services securely using temporary credentials.

## Understanding IRSA Architecture

IRSA works by establishing a trust relationship between your EKS cluster and AWS IAM using an OIDC identity provider. When a pod needs AWS access, it uses a service account annotated with an IAM role ARN. The AWS SDK running in the pod automatically exchanges the service account token for temporary AWS credentials.

This approach follows the principle of least privilege, as each service account can have a different IAM role with specific permissions. Credentials are temporary and rotated automatically, eliminating the risk of leaked long-term credentials.

## Prerequisites and Cluster Setup

First, verify your EKS cluster has an OIDC provider configured:

```bash
# Get cluster OIDC issuer URL
aws eks describe-cluster --name my-cluster \
  --query "cluster.identity.oidc.issuer" --output text

# Example output: https://oidc.eks.us-west-2.amazonaws.com/id/EXAMPLED539D4633E53DE1B71EXAMPLE

# Check if OIDC provider exists in IAM
aws iam list-open-id-connect-providers | grep $(echo $OIDC_URL | cut -d'/' -f5)
```

If no OIDC provider exists, create one:

```bash
# Enable OIDC provider for your cluster
eksctl utils associate-iam-oidc-provider \
  --cluster my-cluster \
  --region us-west-2 \
  --approve

# Or use AWS CLI
aws eks update-cluster-config \
  --name my-cluster \
  --region us-west-2
```

## Creating an IAM Role for a Service Account

Create an IAM role that pods can assume. This role needs a trust policy allowing the OIDC provider to assume it:

```bash
# Store your cluster's OIDC provider URL
OIDC_PROVIDER=$(aws eks describe-cluster --name my-cluster \
  --query "cluster.identity.oidc.issuer" --output text | sed 's/https:\/\///')

# Define the namespace and service account
NAMESPACE="production"
SERVICE_ACCOUNT="s3-access"

# Create trust policy document
cat > trust-policy.json <<EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Federated": "arn:aws:iam::${AWS_ACCOUNT_ID}:oidc-provider/${OIDC_PROVIDER}"
      },
      "Action": "sts:AssumeRoleWithWebIdentity",
      "Condition": {
        "StringEquals": {
          "${OIDC_PROVIDER}:sub": "system:serviceaccount:${NAMESPACE}:${SERVICE_ACCOUNT}",
          "${OIDC_PROVIDER}:aud": "sts.amazonaws.com"
        }
      }
    }
  ]
}
EOF

# Create the IAM role
aws iam create-role \
  --role-name eks-pod-s3-access \
  --assume-role-policy-document file://trust-policy.json \
  --description "Role for Kubernetes pods to access S3"
```

The trust policy ensures only pods using the specific service account in the specified namespace can assume this role.

## Attaching IAM Policies to the Role

Define what AWS resources the pods can access:

```bash
# Create a policy for S3 access
cat > s3-policy.json <<EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:GetObject",
        "s3:PutObject",
        "s3:ListBucket"
      ],
      "Resource": [
        "arn:aws:s3:::my-application-bucket",
        "arn:aws:s3:::my-application-bucket/*"
      ]
    }
  ]
}
EOF

# Create and attach the policy
aws iam create-policy \
  --policy-name pod-s3-access-policy \
  --policy-document file://s3-policy.json

aws iam attach-role-policy \
  --role-name eks-pod-s3-access \
  --policy-arn arn:aws:iam::${AWS_ACCOUNT_ID}:policy/pod-s3-access-policy
```

You can also attach AWS managed policies for common use cases:

```bash
# Attach managed policy for DynamoDB access
aws iam attach-role-policy \
  --role-name eks-pod-s3-access \
  --policy-arn arn:aws:iam::aws:policy/AmazonDynamoDBReadOnlyAccess
```

## Creating the Kubernetes Service Account

Create a service account annotated with the IAM role:

```yaml
# service-account.yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: s3-access
  namespace: production
  annotations:
    eks.amazonaws.com/role-arn: arn:aws:iam::123456789012:role/eks-pod-s3-access
```

Apply the service account:

```bash
kubectl apply -f service-account.yaml

# Verify the annotation
kubectl get sa s3-access -n production -o yaml | grep role-arn
```

The annotation is critical - it tells the EKS pod identity webhook which IAM role to inject credentials for.

## Using IRSA in Pod Deployments

Configure your pods to use the service account:

```yaml
# deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: s3-application
  namespace: production
spec:
  replicas: 2
  selector:
    matchLabels:
      app: s3-application
  template:
    metadata:
      labels:
        app: s3-application
    spec:
      serviceAccountName: s3-access  # Reference the IRSA service account
      containers:
      - name: app
        image: myapp:latest
        env:
        # AWS SDK will automatically use IRSA credentials
        - name: AWS_REGION
          value: us-west-2
        # Optional: Override default web identity token file path
        - name: AWS_WEB_IDENTITY_TOKEN_FILE
          value: /var/run/secrets/eks.amazonaws.com/serviceaccount/token
        - name: AWS_ROLE_ARN
          value: arn:aws:iam::123456789012:role/eks-pod-s3-access
```

When you deploy this, the EKS pod identity webhook automatically injects environment variables and mounts the service account token that AWS SDKs use to authenticate.

## Testing AWS Access from Pods

Verify that pods can access AWS services:

```bash
# Deploy a test pod with AWS CLI
kubectl run aws-cli -n production \
  --image=amazon/aws-cli \
  --serviceaccount=s3-access \
  --command -- sleep infinity

# Exec into the pod and test AWS access
kubectl exec -it aws-cli -n production -- sh

# Inside the pod, verify credentials
aws sts get-caller-identity

# Example output shows the assumed role:
# {
#     "UserId": "AROAEXAMPLE:aws-cli",
#     "Account": "123456789012",
#     "Arn": "arn:aws:sts::123456789012:assumed-role/eks-pod-s3-access/aws-cli"
# }

# Test S3 access
aws s3 ls s3://my-application-bucket/

# Clean up test pod
kubectl delete pod aws-cli -n production
```

## Using IRSA with AWS SDKs

AWS SDKs automatically detect and use IRSA credentials. Here's a Python example:

```python
# app.py
import boto3
import os

# No credentials needed in code!
# SDK automatically uses IRSA
s3 = boto3.client('s3')

def upload_file(file_path, bucket_name, object_name):
    """Upload file to S3 using IRSA credentials"""
    try:
        s3.upload_file(file_path, bucket_name, object_name)
        print(f"Successfully uploaded {object_name}")
    except Exception as e:
        print(f"Error uploading: {e}")

def list_objects(bucket_name):
    """List objects in S3 bucket"""
    try:
        response = s3.list_objects_v2(Bucket=bucket_name)
        for obj in response.get('Contents', []):
            print(obj['Key'])
    except Exception as e:
        print(f"Error listing objects: {e}")

if __name__ == "__main__":
    # AWS SDK automatically uses IRSA credentials
    print("Testing IRSA authentication...")
    list_objects('my-application-bucket')
```

The boto3 SDK automatically reads the `AWS_WEB_IDENTITY_TOKEN_FILE` and `AWS_ROLE_ARN` environment variables injected by the EKS pod identity webhook.

## Multiple Service Accounts for Different Permissions

Create separate service accounts for different access levels:

```bash
# Create read-only role and service account
cat > trust-policy-readonly.json <<EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Federated": "arn:aws:iam::${AWS_ACCOUNT_ID}:oidc-provider/${OIDC_PROVIDER}"
      },
      "Action": "sts:AssumeRoleWithWebIdentity",
      "Condition": {
        "StringEquals": {
          "${OIDC_PROVIDER}:sub": "system:serviceaccount:production:s3-readonly",
          "${OIDC_PROVIDER}:aud": "sts.amazonaws.com"
        }
      }
    }
  ]
}
EOF

aws iam create-role \
  --role-name eks-pod-s3-readonly \
  --assume-role-policy-document file://trust-policy-readonly.json

aws iam attach-role-policy \
  --role-name eks-pod-s3-readonly \
  --policy-arn arn:aws:iam::aws:policy/AmazonS3ReadOnlyAccess
```

Create the service account:

```yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: s3-readonly
  namespace: production
  annotations:
    eks.amazonaws.com/role-arn: arn:aws:iam::123456789012:role/eks-pod-s3-readonly
```

Now different pods can use different service accounts based on their needs.

## Troubleshooting IRSA Issues

Common problems and solutions:

```bash
# Check if pod has correct environment variables
kubectl exec -it pod-name -n production -- env | grep AWS

# Should see:
# AWS_ROLE_ARN=arn:aws:iam::123456789012:role/eks-pod-s3-access
# AWS_WEB_IDENTITY_TOKEN_FILE=/var/run/secrets/eks.amazonaws.com/serviceaccount/token

# Verify service account token is mounted
kubectl exec -it pod-name -n production -- ls -la /var/run/secrets/eks.amazonaws.com/serviceaccount/

# Check EKS pod identity webhook is running
kubectl get mutatingwebhookconfiguration pod-identity-webhook

# View webhook logs
kubectl logs -n kube-system -l app.kubernetes.io/name=aws-pod-identity-webhook
```

If credentials aren't working, verify the IAM role trust policy allows the specific service account and the OIDC provider is correctly configured.

## Security Best Practices

Limit IAM roles to only the permissions pods actually need. Use separate roles for different workloads rather than sharing a single role. Regularly audit role usage to identify over-permissioned pods:

```bash
# Generate IAM credential report
aws iam generate-credential-report
aws iam get-credential-report --output text | base64 -d > iam-report.csv

# Review which roles are being used
grep eks-pod iam-report.csv
```

Enable CloudTrail to log all API calls made by pod identities. This provides an audit trail of what AWS resources your pods accessed.

## Using eksctl for Simplified Setup

eksctl automates IRSA configuration:

```bash
# Create service account with IAM role in one command
eksctl create iamserviceaccount \
  --name s3-access \
  --namespace production \
  --cluster my-cluster \
  --attach-policy-arn arn:aws:iam::aws:policy/AmazonS3ReadOnlyAccess \
  --approve \
  --override-existing-serviceaccounts

# Verify creation
kubectl get sa s3-access -n production -o yaml
```

This creates both the IAM role and Kubernetes service account with proper annotations automatically.

## Conclusion

IAM Roles for Service Accounts provides a secure, maintainable way to grant Kubernetes pods access to AWS services. By eliminating embedded credentials and using temporary, scoped permissions, IRSA significantly improves your security posture.

Start by identifying which pods need AWS access and what permissions they require. Create separate IAM roles and service accounts for different permission levels. Use eksctl to simplify setup, and always follow the principle of least privilege when defining IAM policies.

IRSA integrates seamlessly with AWS SDKs, requiring no application code changes. Combined with proper RBAC and network policies, it forms a critical component of secure Kubernetes deployments on AWS.
