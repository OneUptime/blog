# How to Set Up EKS Pod Identity for Fine-Grained AWS IAM Permissions

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, AWS, EKS

Description: Configure EKS Pod Identity to grant fine-grained AWS IAM permissions to Kubernetes pods without using instance profiles or managing credentials.

---

EKS Pod Identity allows Kubernetes pods to assume AWS IAM roles, providing secure, fine-grained access to AWS services without managing credentials or using instance profiles. This newer alternative to IRSA (IAM Roles for Service Accounts) simplifies configuration and improves scalability. This guide covers setting up and using EKS Pod Identity for secure AWS access from pods.

## Understanding EKS Pod Identity

EKS Pod Identity associates IAM roles directly with Kubernetes service accounts. When a pod uses a service account configured with Pod Identity, it automatically receives temporary AWS credentials through the EKS Pod Identity Agent running on each node.

Pod Identity offers advantages over IRSA including simpler configuration, no OIDC provider required, better scalability, and improved performance for credential rotation.

## Prerequisites

Ensure your cluster supports Pod Identity:

```bash
# Check EKS cluster version (requires 1.24+)
aws eks describe-cluster --name my-cluster --query 'cluster.version'

# Verify Pod Identity add-on is available
aws eks describe-addon-versions \
  --addon-name eks-pod-identity-agent \
  --kubernetes-version 1.28

# Check if add-on is installed
aws eks describe-addon \
  --cluster-name my-cluster \
  --addon-name eks-pod-identity-agent
```

## Installing Pod Identity Add-on

Install the EKS Pod Identity agent:

```bash
# Install using AWS CLI
aws eks create-addon \
  --cluster-name my-cluster \
  --addon-name eks-pod-identity-agent \
  --addon-version v1.0.0-eksbuild.1

# Wait for add-on to be active
aws eks wait addon-active \
  --cluster-name my-cluster \
  --addon-name eks-pod-identity-agent

# Verify installation
kubectl get daemonset eks-pod-identity-agent -n kube-system
kubectl get pods -n kube-system -l app.kubernetes.io/name=eks-pod-identity-agent
```

Using Terraform:

```hcl
# pod-identity-addon.tf
resource "aws_eks_addon" "pod_identity" {
  cluster_name = aws_eks_cluster.main.name
  addon_name   = "eks-pod-identity-agent"
  addon_version = "v1.0.0-eksbuild.1"

  resolve_conflicts_on_create = "OVERWRITE"
  resolve_conflicts_on_update = "PRESERVE"

  tags = {
    Name = "eks-pod-identity-agent"
  }
}
```

## Creating IAM Role for Pod Identity

Create an IAM role with trust policy for EKS Pod Identity:

```bash
# Create trust policy
cat > trust-policy.json <<EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Service": "pods.eks.amazonaws.com"
      },
      "Action": [
        "sts:AssumeRole",
        "sts:TagSession"
      ]
    }
  ]
}
EOF

# Create IAM role
aws iam create-role \
  --role-name S3AccessPodRole \
  --assume-role-policy-document file://trust-policy.json \
  --description "Role for pods to access S3"

# Attach policy
aws iam attach-role-policy \
  --role-name S3AccessPodRole \
  --policy-arn arn:aws:iam::aws:policy/AmazonS3ReadOnlyAccess
```

Using Terraform:

```hcl
# iam-role-pod-identity.tf
resource "aws_iam_role" "s3_access" {
  name = "S3AccessPodRole"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect = "Allow"
      Principal = {
        Service = "pods.eks.amazonaws.com"
      }
      Action = [
        "sts:AssumeRole",
        "sts:TagSession"
      ]
    }]
  })

  tags = {
    Purpose = "Pod Identity S3 Access"
  }
}

resource "aws_iam_role_policy" "s3_read" {
  name = "s3-read-policy"
  role = aws_iam_role.s3_access.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect = "Allow"
      Action = [
        "s3:GetObject",
        "s3:ListBucket"
      ]
      Resource = [
        "arn:aws:s3:::my-bucket",
        "arn:aws:s3:::my-bucket/*"
      ]
    }]
  })
}
```

## Creating Service Account and Pod Identity Association

Create Kubernetes service account:

```yaml
# service-account.yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: s3-access-sa
  namespace: default
```

Create Pod Identity association:

```bash
# Associate IAM role with service account
aws eks create-pod-identity-association \
  --cluster-name my-cluster \
  --namespace default \
  --service-account s3-access-sa \
  --role-arn arn:aws:iam::123456789012:role/S3AccessPodRole

# Verify association
aws eks describe-pod-identity-association \
  --cluster-name my-cluster \
  --association-id <association-id>

# List all associations
aws eks list-pod-identity-associations \
  --cluster-name my-cluster
```

Using Terraform:

```hcl
# pod-identity-association.tf
resource "kubernetes_service_account" "s3_access" {
  metadata {
    name      = "s3-access-sa"
    namespace = "default"
  }
}

resource "aws_eks_pod_identity_association" "s3_access" {
  cluster_name    = aws_eks_cluster.main.name
  namespace       = kubernetes_service_account.s3_access.metadata[0].namespace
  service_account = kubernetes_service_account.s3_access.metadata[0].name
  role_arn        = aws_iam_role.s3_access.arn

  tags = {
    Purpose = "S3 Access"
  }
}
```

## Using Pod Identity in Pods

Deploy pods using the service account:

```yaml
# s3-access-pod.yaml
apiVersion: v1
kind: Pod
metadata:
  name: s3-reader
  namespace: default
spec:
  serviceAccountName: s3-access-sa
  containers:
  - name: app
    image: amazon/aws-cli:latest
    command:
      - /bin/bash
      - -c
      - |
        # AWS SDK automatically uses Pod Identity credentials
        aws s3 ls s3://my-bucket/
        aws s3 cp s3://my-bucket/file.txt /tmp/file.txt
        cat /tmp/file.txt

        # Credentials are available in environment
        echo "AWS_CONTAINER_CREDENTIALS_FULL_URI: $AWS_CONTAINER_CREDENTIALS_FULL_URI"
        echo "AWS_CONTAINER_AUTHORIZATION_TOKEN_FILE: $AWS_CONTAINER_AUTHORIZATION_TOKEN_FILE"

        sleep 3600
```

Application example using AWS SDK:

```python
# app.py
import boto3
import os

# AWS SDK automatically uses Pod Identity credentials
# No need to configure credentials explicitly

def main():
    # Create S3 client - credentials auto-configured
    s3 = boto3.client('s3')

    # List buckets
    response = s3.list_buckets()
    print("Buckets:")
    for bucket in response['Buckets']:
        print(f"  {bucket['Name']}")

    # Read object
    obj = s3.get_object(Bucket='my-bucket', Key='data.json')
    content = obj['Body'].read().decode('utf-8')
    print(f"File content: {content}")

if __name__ == '__main__':
    main()
```

## Multiple Pod Identity Associations

Configure different permissions for different namespaces:

```hcl
# Multiple IAM roles for different purposes
resource "aws_iam_role" "dynamodb_access" {
  name = "DynamoDBAccessPodRole"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect = "Allow"
      Principal = {
        Service = "pods.eks.amazonaws.com"
      }
      Action = ["sts:AssumeRole", "sts:TagSession"]
    }]
  })
}

resource "aws_iam_role_policy_attachment" "dynamodb_full" {
  role       = aws_iam_role.dynamodb_access.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonDynamoDBFullAccess"
}

# Service account in different namespace
resource "kubernetes_service_account" "db_access" {
  metadata {
    name      = "db-access-sa"
    namespace = "database"
  }
}

# Pod Identity association for DynamoDB access
resource "aws_eks_pod_identity_association" "dynamodb" {
  cluster_name    = aws_eks_cluster.main.name
  namespace       = "database"
  service_account = "db-access-sa"
  role_arn        = aws_iam_role.dynamodb_access.arn
}
```

## Testing Pod Identity

Verify credentials are available:

```bash
# Deploy test pod
kubectl run test-pod --image=amazon/aws-cli:latest \
  --serviceaccount=s3-access-sa \
  --command -- sleep 3600

# Check environment variables
kubectl exec test-pod -- env | grep AWS

# Test AWS CLI access
kubectl exec test-pod -- aws s3 ls
kubectl exec test-pod -- aws sts get-caller-identity

# View assumed role
kubectl exec test-pod -- aws sts get-caller-identity --query 'Arn'
```

## Debugging Pod Identity

Common troubleshooting steps:

```bash
# Check Pod Identity agent is running
kubectl get pods -n kube-system -l app.kubernetes.io/name=eks-pod-identity-agent

# View agent logs
kubectl logs -n kube-system -l app.kubernetes.io/name=eks-pod-identity-agent

# Verify service account exists
kubectl get sa s3-access-sa -n default

# Check Pod Identity association
aws eks list-pod-identity-associations --cluster-name my-cluster

# Describe association
aws eks describe-pod-identity-association \
  --cluster-name my-cluster \
  --association-id <id>

# Check IAM role trust policy
aws iam get-role --role-name S3AccessPodRole --query 'Role.AssumeRolePolicyDocument'

# Test from within pod
kubectl exec -it test-pod -- /bin/bash
# Inside pod:
curl $AWS_CONTAINER_CREDENTIALS_FULL_URI
aws sts get-caller-identity
```

## Advanced IAM Policies

Create fine-grained permissions:

```hcl
resource "aws_iam_role" "app_specific" {
  name = "AppSpecificPodRole"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect = "Allow"
      Principal = {
        Service = "pods.eks.amazonaws.com"
      }
      Action = ["sts:AssumeRole", "sts:TagSession"]
    }]
  })
}

resource "aws_iam_role_policy" "app_permissions" {
  name = "app-permissions"
  role = aws_iam_role.app_specific.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "s3:GetObject",
          "s3:PutObject"
        ]
        Resource = "arn:aws:s3:::my-app-bucket/*"
      },
      {
        Effect = "Allow"
        Action = [
          "dynamodb:GetItem",
          "dynamodb:PutItem",
          "dynamodb:Query"
        ]
        Resource = "arn:aws:dynamodb:us-east-1:123456789012:table/my-table"
      },
      {
        Effect = "Allow"
        Action = [
          "sqs:SendMessage",
          "sqs:ReceiveMessage",
          "sqs:DeleteMessage"
        ]
        Resource = "arn:aws:sqs:us-east-1:123456789012:my-queue"
      },
      {
        Effect = "Allow"
        Action = [
          "secretsmanager:GetSecretValue"
        ]
        Resource = "arn:aws:secretsmanager:us-east-1:123456789012:secret:app/*"
      }
    ]
  })
}
```

## Monitoring and Auditing

Track Pod Identity usage:

```bash
# CloudWatch Insights query for Pod Identity usage
aws logs start-query \
  --log-group-name /aws/eks/my-cluster/cluster \
  --start-time $(date -u -d '1 hour ago' +%s) \
  --end-time $(date -u +%s) \
  --query-string 'fields @timestamp, @message | filter @message like /pod-identity/ | sort @timestamp desc'

# CloudTrail events for AssumeRole
aws cloudtrail lookup-events \
  --lookup-attributes AttributeKey=EventName,AttributeValue=AssumeRole \
  --max-results 50
```

Set up CloudWatch alarms:

```hcl
resource "aws_cloudwatch_metric_alarm" "pod_identity_errors" {
  alarm_name          = "pod-identity-errors"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "PodIdentityErrors"
  namespace           = "AWS/EKS"
  period              = "300"
  statistic           = "Sum"
  threshold           = "10"
  alarm_description   = "Alert when Pod Identity errors exceed threshold"
  alarm_actions       = [aws_sns_topic.alerts.arn]

  dimensions = {
    ClusterName = aws_eks_cluster.main.name
  }
}
```

## Migration from IRSA to Pod Identity

Migrate existing IRSA to Pod Identity:

```bash
# List existing IRSA service accounts
kubectl get sa -A -o json | jq -r '.items[] | select(.metadata.annotations["eks.amazonaws.com/role-arn"]) | "\(.metadata.namespace)/\(.metadata.name): \(.metadata.annotations["eks.amazonaws.com/role-arn"])"'

# For each service account, create Pod Identity association
aws eks create-pod-identity-association \
  --cluster-name my-cluster \
  --namespace <namespace> \
  --service-account <sa-name> \
  --role-arn <existing-role-arn>

# Remove IRSA annotation (after testing)
kubectl annotate sa <sa-name> -n <namespace> eks.amazonaws.com/role-arn-
```

## Best Practices

1. Use least-privilege IAM policies
2. Create separate roles for different application needs
3. Use namespaces to isolate permissions
4. Monitor and audit Pod Identity usage via CloudTrail
5. Test permissions in non-production first
6. Document which service accounts use which IAM roles
7. Implement resource tags for cost allocation
8. Set up CloudWatch alarms for errors
9. Regularly review and rotate IAM policies
10. Use condition keys in IAM policies for additional security

## Conclusion

EKS Pod Identity simplifies granting AWS permissions to Kubernetes pods with better scalability and easier configuration than IRSA. Install the Pod Identity agent, create IAM roles with appropriate trust policies, associate roles with service accounts, and use those service accounts in your pods. Pod Identity automatically provides temporary credentials without manual configuration or credential management. This enables secure, fine-grained access to AWS services from Kubernetes workloads.
