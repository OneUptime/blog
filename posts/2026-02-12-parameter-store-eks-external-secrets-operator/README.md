# How to Use Parameter Store with EKS (External Secrets Operator)

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, EKS, Parameter Store, Kubernetes, Terraform

Description: Learn how to integrate AWS Systems Manager Parameter Store with Amazon EKS using the External Secrets Operator for secure, automated secret management in Kubernetes.

---

Managing secrets in Kubernetes is one of those problems that sounds simple until you actually try to do it properly. You've got application credentials, API keys, database passwords - all of which need to land in your pods without being checked into version control. AWS Systems Manager Parameter Store is a natural fit for teams already running on AWS, and the External Secrets Operator (ESO) bridges the gap between Parameter Store and Kubernetes-native secrets.

In this guide, we'll walk through setting up the entire pipeline: storing parameters in AWS, deploying the External Secrets Operator on EKS, and configuring it to pull values automatically.

## Why Parameter Store + External Secrets Operator?

Kubernetes has its own Secret resource, but it comes with some well-known downsides. Secrets are base64-encoded (not encrypted by default), they're hard to rotate, and managing them across multiple clusters gets messy fast. Parameter Store gives you encryption via KMS, versioning, access control through IAM, and a central place to manage values.

The External Secrets Operator watches for `ExternalSecret` custom resources in your cluster and syncs them into native Kubernetes Secrets. Your applications don't need to know anything about Parameter Store - they just read from the usual Secret volume mounts or environment variables.

## Prerequisites

Before we dive in, you'll need:

- An EKS cluster up and running
- `kubectl` configured to talk to your cluster
- Helm v3 installed
- AWS CLI configured with appropriate permissions
- Terraform (if you want to manage infrastructure as code)

## Step 1: Store Parameters in AWS SSM

Let's start by putting some values into Parameter Store. Here's a Terraform configuration that creates a few parameters.

This Terraform block creates two SecureString parameters encrypted with the default AWS KMS key:

```hcl
resource "aws_ssm_parameter" "db_password" {
  name        = "/myapp/production/db-password"
  description = "Database password for production"
  type        = "SecureString"
  value       = "super-secret-password-123"

  tags = {
    Environment = "production"
    ManagedBy   = "terraform"
  }
}

resource "aws_ssm_parameter" "api_key" {
  name        = "/myapp/production/api-key"
  description = "Third-party API key"
  type        = "SecureString"
  value       = "ak_live_abc123def456"

  tags = {
    Environment = "production"
    ManagedBy   = "terraform"
  }
}
```

You can also create parameters with the AWS CLI for quick testing:

```bash
# Create a parameter directly from the command line
aws ssm put-parameter \
  --name "/myapp/production/db-host" \
  --type "SecureString" \
  --value "prod-db.cluster-abc123.us-east-1.rds.amazonaws.com"
```

## Step 2: Create an IAM Role for the External Secrets Operator

ESO needs permission to read from Parameter Store. The cleanest way to handle this on EKS is through IAM Roles for Service Accounts (IRSA).

This Terraform configuration creates an IAM role that can be assumed by the ESO service account in your cluster:

```hcl
# Data source to get the OIDC provider for your EKS cluster
data "aws_eks_cluster" "main" {
  name = "my-eks-cluster"
}

data "aws_iam_openid_connect_provider" "eks" {
  url = data.aws_eks_cluster.main.identity[0].oidc[0].issuer
}

# IAM role that ESO will assume
resource "aws_iam_role" "external_secrets" {
  name = "external-secrets-operator"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Principal = {
          Federated = data.aws_iam_openid_connect_provider.eks.arn
        }
        Action = "sts:AssumeRoleWithWebIdentity"
        Condition = {
          StringEquals = {
            "${replace(data.aws_eks_cluster.main.identity[0].oidc[0].issuer, "https://", "")}:sub" = "system:serviceaccount:external-secrets:external-secrets"
          }
        }
      }
    ]
  })
}

# Policy granting read access to Parameter Store
resource "aws_iam_role_policy" "external_secrets_ssm" {
  name = "ssm-parameter-access"
  role = aws_iam_role.external_secrets.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "ssm:GetParameter",
          "ssm:GetParameters",
          "ssm:GetParametersByPath",
          "ssm:DescribeParameters"
        ]
        Resource = "arn:aws:ssm:us-east-1:*:parameter/myapp/*"
      },
      {
        Effect = "Allow"
        Action = [
          "kms:Decrypt"
        ]
        Resource = "*"
      }
    ]
  })
}
```

## Step 3: Install the External Secrets Operator

With the IAM role ready, install ESO using Helm. The service account annotation tells EKS to inject the IAM role credentials.

This Helm install command deploys ESO into the `external-secrets` namespace with IRSA configured:

```bash
# Add the ESO Helm chart repository
helm repo add external-secrets https://charts.external-secrets.io
helm repo update

# Install ESO with the IAM role annotation
helm install external-secrets external-secrets/external-secrets \
  --namespace external-secrets \
  --create-namespace \
  --set serviceAccount.annotations."eks\.amazonaws\.com/role-arn"="arn:aws:iam::123456789012:role/external-secrets-operator" \
  --set webhook.port=9443
```

Verify that the operator pods are running:

```bash
# Check that all ESO pods are healthy
kubectl get pods -n external-secrets
```

You should see three pods: the main controller, the webhook, and the cert controller.

## Step 4: Create a SecretStore

The `SecretStore` resource tells ESO where to find your secrets. You can create a namespace-scoped `SecretStore` or a cluster-wide `ClusterSecretStore`.

This manifest configures a ClusterSecretStore pointing to AWS Parameter Store in us-east-1:

```yaml
apiVersion: external-secrets.io/v1beta1
kind: ClusterSecretStore
metadata:
  name: aws-parameter-store
spec:
  provider:
    aws:
      service: ParameterStore
      region: us-east-1
      auth:
        jwt:
          serviceAccountRef:
            name: external-secrets
            namespace: external-secrets
```

Apply it:

```bash
kubectl apply -f cluster-secret-store.yaml
```

Check that the store is healthy:

```bash
# Verify the SecretStore can connect to AWS
kubectl get clustersecretstore aws-parameter-store
```

The `STATUS` column should show `Valid`.

## Step 5: Create ExternalSecret Resources

Now for the fun part. Create `ExternalSecret` resources that tell ESO which parameters to sync.

This ExternalSecret pulls two parameters from SSM and creates a Kubernetes Secret named `myapp-secrets`:

```yaml
apiVersion: external-secrets.io/v1beta1
kind: ExternalSecret
metadata:
  name: myapp-secrets
  namespace: default
spec:
  refreshInterval: 1h  # How often to sync from Parameter Store
  secretStoreRef:
    name: aws-parameter-store
    kind: ClusterSecretStore
  target:
    name: myapp-secrets  # Name of the K8s Secret to create
    creationPolicy: Owner
  data:
    - secretKey: db-password      # Key in the K8s Secret
      remoteRef:
        key: /myapp/production/db-password  # Path in Parameter Store
    - secretKey: api-key
      remoteRef:
        key: /myapp/production/api-key
```

Apply and verify:

```bash
kubectl apply -f external-secret.yaml

# Check sync status
kubectl get externalsecret myapp-secrets

# Verify the actual Kubernetes Secret was created
kubectl get secret myapp-secrets -o jsonpath='{.data.db-password}' | base64 -d
```

## Step 6: Use the Secrets in Your Pods

With the Kubernetes Secret in place, reference it like any other secret in your pod spec.

This deployment mounts the synced secrets as environment variables:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: myapp
  namespace: default
spec:
  replicas: 2
  selector:
    matchLabels:
      app: myapp
  template:
    metadata:
      labels:
        app: myapp
    spec:
      containers:
        - name: myapp
          image: myapp:latest
          envFrom:
            - secretRef:
                name: myapp-secrets
          # Or reference individual keys:
          env:
            - name: DATABASE_PASSWORD
              valueFrom:
                secretKeyRef:
                  name: myapp-secrets
                  key: db-password
```

## Handling Rotation

One of the biggest advantages of this setup is secret rotation. When you update a parameter in Parameter Store, ESO picks up the change on the next refresh interval. If you set `refreshInterval: 1h`, the Kubernetes Secret updates within an hour.

For more aggressive rotation, lower the interval:

```yaml
spec:
  refreshInterval: 5m  # Check every 5 minutes
```

Keep in mind that very short intervals increase API calls to Parameter Store. For most applications, 15 to 60 minutes is a reasonable balance.

## Troubleshooting Common Issues

**SecretStore shows "Invalid"**: Usually an IAM permissions issue. Double-check that the IRSA trust policy references the correct service account name and namespace.

**ExternalSecret stuck in "SecretSyncedError"**: The parameter path might not exist, or the IAM role might lack `kms:Decrypt` permission for SecureString parameters.

**Secrets not updating**: Verify the `refreshInterval` and check ESO controller logs with `kubectl logs -n external-secrets -l app.kubernetes.io/name=external-secrets`.

## Monitoring Your Secrets Pipeline

Once you've got this running in production, you'll want visibility into sync failures and latency. ESO exposes Prometheus metrics that you can scrape and alert on. For a broader monitoring setup that covers your entire infrastructure, take a look at our guide on [monitoring Kubernetes clusters](https://oneuptime.com/blog/post/kubernetes-monitoring-best-practices/view).

## Wrapping Up

The combination of Parameter Store and External Secrets Operator gives you a production-grade secret management pipeline without bolting on heavyweight tools like HashiCorp Vault (though Vault has its place for more complex use cases). Your secrets live in AWS, encrypted at rest, versioned, and access-controlled through IAM. ESO handles the plumbing of getting those values into Kubernetes.

The key things to remember: use IRSA for authentication, keep your IAM policies scoped to specific parameter paths, and set refresh intervals that match your rotation requirements. Once you've set this up for one application, extending it to others is just a matter of adding more `ExternalSecret` resources.
