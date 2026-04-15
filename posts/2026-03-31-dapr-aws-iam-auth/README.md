# How to Use Dapr with AWS IAM

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, AWS, IAM, Authentication, Security

Description: Configure Dapr components to authenticate with AWS services using IAM roles, instance profiles, and IRSA to avoid embedding AWS credentials in component definitions.

---

## AWS Authentication Options in Dapr

Dapr AWS components support multiple authentication methods:

1. Static credentials (access key / secret - not recommended for production)
2. EC2 Instance Profile (for EC2-hosted clusters)
3. IAM Roles for Service Accounts (IRSA) on EKS
4. Environment-based credential chain (default AWS SDK behavior)

## Using Static Credentials (Development Only)

For development and testing, use static credentials stored as Kubernetes secrets:

```bash
kubectl create secret generic aws-credentials \
  --from-literal=accessKey=AKIAIOSFODNN7EXAMPLE \
  --from-literal=secretKey=wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY
```

Reference in a Dapr component:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: s3-binding
spec:
  type: bindings.aws.s3
  version: v1
  metadata:
    - name: bucket
      value: "my-data-bucket"
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

## Using IAM Roles for Service Accounts (IRSA) on EKS

IRSA is the recommended approach for EKS clusters:

```bash
# Create IAM role with trust policy for EKS OIDC
aws iam create-role \
  --role-name dapr-s3-role \
  --assume-role-policy-document '{
    "Version": "2012-10-17",
    "Statement": [{
      "Effect": "Allow",
      "Principal": {
        "Federated": "arn:aws:iam::<account-id>:oidc-provider/<oidc-provider>"
      },
      "Action": "sts:AssumeRoleWithWebIdentity",
      "Condition": {
        "StringEquals": {
          "<oidc-provider>:sub": "system:serviceaccount:production:my-app"
        }
      }
    }]
  }'

# Attach S3 policy to the role
aws iam attach-role-policy \
  --role-name dapr-s3-role \
  --policy-arn arn:aws:iam::aws:policy/AmazonS3ReadOnlyAccess
```

Annotate the Kubernetes ServiceAccount:

```yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: my-app
  namespace: production
  annotations:
    eks.amazonaws.com/role-arn: arn:aws:iam::<account-id>:role/dapr-s3-role
```

Configure the Dapr component without credentials - the SDK uses the pod's projected token:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: s3-binding
spec:
  type: bindings.aws.s3
  version: v1
  metadata:
    - name: bucket
      value: "my-data-bucket"
    - name: region
      value: "us-east-1"
    # No accessKey or secretKey needed - uses IRSA
```

## Using EC2 Instance Profiles

For EC2-based (non-EKS) deployments, assign an IAM instance profile to the nodes:

```bash
aws iam create-instance-profile --instance-profile-name dapr-node-profile
aws iam add-role-to-instance-profile \
  --instance-profile-name dapr-node-profile \
  --role-name dapr-node-role

aws ec2 associate-iam-instance-profile \
  --instance-id i-1234567890abcdef0 \
  --iam-instance-profile Name=dapr-node-profile
```

The Dapr component will automatically use the instance profile credentials.

## Verifying IAM Authentication

```bash
# Test component connectivity
curl -X POST http://localhost:3500/v1.0/bindings/s3-binding \
  -H "Content-Type: application/json" \
  -d '{"operation": "list"}'

# Check sidecar logs for AWS auth errors
kubectl logs <pod-name> -c daprd | grep -i "aws\|credentials\|iam\|assumed"
```

## Summary

Dapr supports AWS IAM authentication through static credentials (dev only), IRSA on EKS (recommended), and EC2 instance profiles. For EKS, configure an IAM role with an OIDC trust policy, annotate the ServiceAccount with the role ARN, and omit credentials from the Dapr component - the AWS SDK handles credential resolution automatically through the projected service account token.
