# How to Use Dapr with IRSA on Amazon EKS

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, EKS, IRSA, AWS, Authentication

Description: Configure Dapr components on Amazon EKS with IAM Roles for Service Accounts (IRSA) for credential-free access to AWS services like S3, SQS, and Secrets Manager.

---

## What Is IRSA?

IAM Roles for Service Accounts (IRSA) allows Kubernetes pods on EKS to assume IAM roles using the pod's projected service account token. The EKS OIDC provider validates the token, allowing AWS to trust the Kubernetes identity and issue temporary IAM credentials. Dapr components can use these credentials to authenticate with AWS services.

## Step 1 - Create an EKS OIDC Provider

```bash
# Get the EKS cluster's OIDC issuer URL
OIDC_PROVIDER=$(aws eks describe-cluster \
  --name my-eks-cluster \
  --query "cluster.identity.oidc.issuer" \
  --output text | sed 's|https://||')

echo "OIDC Provider: $OIDC_PROVIDER"

# Create the OIDC provider in IAM
aws iam create-open-id-connect-provider \
  --url "https://$OIDC_PROVIDER" \
  --client-id-list "sts.amazonaws.com" \
  --thumbprint-list <thumbprint>
```

## Step 2 - Create IAM Role with Trust Policy

```bash
AWS_ACCOUNT=$(aws sts get-caller-identity --query Account --output text)

cat > trust-policy.json <<EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Federated": "arn:aws:iam::${AWS_ACCOUNT}:oidc-provider/${OIDC_PROVIDER}"
      },
      "Action": "sts:AssumeRoleWithWebIdentity",
      "Condition": {
        "StringEquals": {
          "${OIDC_PROVIDER}:sub": "system:serviceaccount:production:my-app",
          "${OIDC_PROVIDER}:aud": "sts.amazonaws.com"
        }
      }
    }
  ]
}
EOF

aws iam create-role \
  --role-name dapr-eks-role \
  --assume-role-policy-document file://trust-policy.json
```

## Step 3 - Attach IAM Policies

```bash
# Grant SQS access
aws iam attach-role-policy \
  --role-name dapr-eks-role \
  --policy-arn arn:aws:iam::aws:policy/AmazonSQSFullAccess

# Grant S3 access
aws iam attach-role-policy \
  --role-name dapr-eks-role \
  --policy-arn arn:aws:iam::aws:policy/AmazonS3ReadOnlyAccess

# Grant Secrets Manager access
aws iam attach-role-policy \
  --role-name dapr-eks-role \
  --policy-arn arn:aws:iam::aws:policy/SecretsManagerReadWrite
```

## Step 4 - Annotate Kubernetes ServiceAccount

```yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: my-app
  namespace: production
  annotations:
    eks.amazonaws.com/role-arn: arn:aws:iam::<account-id>:role/dapr-eks-role
```

```bash
kubectl apply -f service-account.yaml
```

## Step 5 - Configure Dapr AWS Components

SNS/SQS pubsub component without static credentials:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: sqs-pubsub
spec:
  type: pubsub.aws.snssqs
  version: v1
  metadata:
    - name: region
      value: "us-east-1"
    # No accessKey or secretKey - IRSA provides credentials
```

Secrets Manager component:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: aws-secrets
spec:
  type: secretstores.aws.secretmanager
  version: v1
  metadata:
    - name: region
      value: "us-east-1"
```

## Step 6 - Configure Pod ServiceAccount

```yaml
spec:
  serviceAccountName: my-app
  containers:
    - name: app
      image: my-app:latest
```

## Verifying IRSA

```bash
# Check the projected token is present
kubectl exec -it <pod-name> -- \
  ls /var/run/secrets/eks.amazonaws.com/serviceaccount/

# Verify AWS identity
kubectl exec -it <pod-name> -- \
  aws sts get-caller-identity
```

## Summary

Configure Dapr on EKS with IRSA by creating an OIDC provider in IAM, defining an IAM role with a trust policy scoped to the specific Kubernetes ServiceAccount, attaching needed AWS policies, and annotating the ServiceAccount with the role ARN. Dapr AWS components automatically obtain temporary credentials via the projected service account token - no static credentials needed.
