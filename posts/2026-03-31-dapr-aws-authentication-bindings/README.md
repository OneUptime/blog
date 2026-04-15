# How to Configure AWS Authentication for Dapr Bindings

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, AWS, Authentication, Binding, Security

Description: Learn the different AWS authentication methods supported by Dapr bindings, including access keys, IAM roles, instance profiles, and environment-based credentials.

---

## AWS Authentication Options in Dapr

Dapr AWS bindings support multiple authentication mechanisms, following the standard AWS credential resolution chain. Choosing the right method depends on your deployment environment: local development, EC2 instances, ECS tasks, or Kubernetes.

## Method 1: Static Access Key and Secret Key

The simplest approach - suitable for development and CI/CD:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: my-s3-binding
spec:
  type: bindings.aws.s3
  version: v1
  metadata:
    - name: bucket
      value: "my-bucket"
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

Store credentials in a Kubernetes Secret:

```bash
kubectl create secret generic aws-credentials \
  --from-literal=accessKey=AKIAIOSFODNN7EXAMPLE \
  --from-literal=secretKey=wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY
```

## Method 2: Session Token for Temporary Credentials

When using AWS STS `AssumeRole` to generate temporary credentials:

```yaml
  metadata:
    - name: accessKey
      secretKeyRef:
        name: aws-temp-credentials
        key: accessKeyId
    - name: secretKey
      secretKeyRef:
        name: aws-temp-credentials
        key: secretAccessKey
    - name: sessionToken
      secretKeyRef:
        name: aws-temp-credentials
        key: sessionToken
```

## Method 3: Environment Variables

Leave `accessKey` and `secretKey` empty and rely on standard AWS environment variables. This works for EC2 instance profiles, ECS task roles, and environments with the AWS CLI configured:

```yaml
  metadata:
    - name: bucket
      value: "my-bucket"
    - name: region
      value: "us-east-1"
```

Dapr will fall through to the AWS SDK credential chain:
1. `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` environment variables
2. `~/.aws/credentials` and `~/.aws/config` files
3. Web Identity Token credentials (EKS IRSA)
4. ECS container credentials (task role)
5. EC2 instance metadata service (IMDS)

## Method 4: IAM Role for EC2 Instance Profile

When running on EC2, attach an IAM role to the instance. No credentials needed in the component:

```bash
# Create the policy
aws iam create-policy \
  --policy-name dapr-s3-policy \
  --policy-document '{
    "Version": "2012-10-17",
    "Statement": [{
      "Effect": "Allow",
      "Action": ["s3:GetObject", "s3:PutObject", "s3:DeleteObject", "s3:ListBucket"],
      "Resource": ["arn:aws:s3:::my-bucket", "arn:aws:s3:::my-bucket/*"]
    }]
  }'

# Create role and attach to EC2 instance
aws iam create-role \
  --role-name dapr-service-role \
  --assume-role-policy-document '{
    "Version": "2012-10-17",
    "Statement": [{
      "Effect": "Allow",
      "Principal": {"Service": "ec2.amazonaws.com"},
      "Action": "sts:AssumeRole"
    }]
  }'

aws iam attach-role-policy \
  --role-name dapr-service-role \
  --policy-arn arn:aws:iam::123456789012:policy/dapr-s3-policy
```

## Method 5: EKS IRSA (IAM Roles for Service Accounts)

For Kubernetes on EKS, use IRSA for pod-level credential isolation:

```bash
# Enable OIDC for your cluster
eksctl utils associate-iam-oidc-provider \
  --cluster my-cluster \
  --region us-east-1 \
  --approve

# Create IAM role with trust relationship
aws iam create-role \
  --role-name dapr-order-service-role \
  --assume-role-policy-document '{
    "Version": "2012-10-17",
    "Statement": [{
      "Effect": "Allow",
      "Principal": {
        "Federated": "arn:aws:iam::123456789012:oidc-provider/oidc.eks.us-east-1.amazonaws.com/id/EXAMPLED539D4633E53DE1B716D3041E"
      },
      "Action": "sts:AssumeRoleWithWebIdentity",
      "Condition": {
        "StringEquals": {
          "oidc.eks.us-east-1.amazonaws.com/id/EXAMPLED539D4633E53DE1B716D3041E:sub": "system:serviceaccount:default:order-service"
        }
      }
    }]
  }'
```

Annotate the Kubernetes service account:

```yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: order-service
  namespace: default
  annotations:
    eks.amazonaws.com/role-arn: arn:aws:iam::123456789012:role/dapr-order-service-role
```

## Choosing the Right Method

| Environment | Recommended Method |
|-------------|-------------------|
| Local development | Static keys via local secret store |
| EC2 | Instance profile (IMDS) |
| ECS | Task role |
| EKS | IRSA |
| GitHub Actions / CI | OIDC with short-lived tokens |

## Summary

Dapr AWS bindings support the full AWS credential resolution chain. For production Kubernetes deployments on EKS, IRSA provides the strongest security model - no static credentials required. For EC2 and ECS, instance and task roles eliminate credential management. Always use Dapr's secret references to keep any static credentials out of your component YAML files.
