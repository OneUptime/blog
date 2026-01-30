# How to Implement AWS EKS IRSA

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, EKS, IAM, Security

Description: Configure IAM Roles for Service Accounts (IRSA) in EKS to grant pods fine-grained AWS permissions without static credentials.

---

## Introduction

IAM Roles for Service Accounts (IRSA) is the recommended way to grant AWS permissions to workloads running in Amazon EKS. Before IRSA, teams had to use node-level IAM roles (giving all pods on a node the same permissions) or manage static AWS credentials in secrets. Both approaches have security drawbacks.

IRSA solves this by allowing you to associate an IAM role directly with a Kubernetes service account. When a pod uses that service account, it automatically receives temporary AWS credentials scoped to the specific IAM role. This follows the principle of least privilege and eliminates credential management overhead.

## How IRSA Works

The IRSA mechanism relies on several components working together:

1. **OIDC Identity Provider**: EKS exposes an OpenID Connect (OIDC) provider endpoint for your cluster
2. **IAM Role Trust Policy**: The IAM role trusts the OIDC provider and restricts access to specific service accounts
3. **Service Account Annotation**: The Kubernetes service account is annotated with the IAM role ARN
4. **Mutating Webhook**: EKS injects AWS credential environment variables into pods using annotated service accounts
5. **AWS SDK**: The application uses the projected token to assume the IAM role

Here is a visual representation of the IRSA flow:

```
┌─────────────────────────────────────────────────────────────────────────┐
│                              EKS Cluster                                │
│  ┌─────────────┐     ┌─────────────────┐     ┌─────────────────────┐   │
│  │    Pod      │────▶│ Service Account │────▶│  Projected Token    │   │
│  │ (your app)  │     │ (annotated)     │     │  (JWT)              │   │
│  └─────────────┘     └─────────────────┘     └──────────┬──────────┘   │
│                                                          │              │
└──────────────────────────────────────────────────────────┼──────────────┘
                                                           │
                                                           ▼
┌──────────────────────────────────────────────────────────────────────────┐
│                              AWS IAM                                     │
│  ┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐    │
│  │ OIDC Provider   │────▶│ Trust Policy    │────▶│ IAM Role        │    │
│  │ (validates JWT) │     │ (checks claims) │     │ (grants access) │    │
│  └─────────────────┘     └─────────────────┘     └─────────────────┘    │
│                                                                          │
└──────────────────────────────────────────────────────────────────────────┘
```

## Prerequisites

Before implementing IRSA, ensure you have:

- An existing EKS cluster (version 1.14 or later)
- `kubectl` configured to access your cluster
- AWS CLI v2 installed and configured
- `eksctl` installed (optional but recommended)
- Sufficient IAM permissions to create roles and OIDC providers

You can verify your setup with these commands:

```bash
# Check EKS cluster access
kubectl cluster-info

# Verify AWS CLI configuration
aws sts get-caller-identity

# Check eksctl version (if using eksctl)
eksctl version
```

## Step 1: Create the OIDC Identity Provider

The first step is to create an IAM OIDC identity provider for your EKS cluster. This allows IAM to trust and validate tokens issued by your cluster.

### Option A: Using eksctl (Recommended)

The simplest approach is using eksctl, which handles the OIDC provider creation automatically.

```bash
# Set your cluster name and region
export CLUSTER_NAME="my-eks-cluster"
export AWS_REGION="us-west-2"

# Create the OIDC provider for your cluster
eksctl utils associate-iam-oidc-provider \
    --cluster ${CLUSTER_NAME} \
    --region ${AWS_REGION} \
    --approve
```

### Option B: Using AWS CLI

If you prefer manual control or do not have eksctl, use the AWS CLI.

First, retrieve the OIDC issuer URL from your cluster:

```bash
# Get the OIDC issuer URL
export CLUSTER_NAME="my-eks-cluster"
export AWS_REGION="us-west-2"

OIDC_URL=$(aws eks describe-cluster \
    --name ${CLUSTER_NAME} \
    --region ${AWS_REGION} \
    --query "cluster.identity.oidc.issuer" \
    --output text)

echo "OIDC URL: ${OIDC_URL}"
```

The output will look similar to:

```
OIDC URL: https://oidc.eks.us-west-2.amazonaws.com/id/EXAMPLED539D4633E53DE1B71EXAMPLE
```

Next, get the OIDC provider thumbprint. AWS requires this to verify the OIDC provider certificate:

```bash
# Extract the OIDC ID from the URL
OIDC_ID=$(echo ${OIDC_URL} | cut -d '/' -f 5)

# Get the thumbprint (this gets the root CA thumbprint)
THUMBPRINT=$(echo | openssl s_client -servername oidc.eks.${AWS_REGION}.amazonaws.com \
    -showcerts -connect oidc.eks.${AWS_REGION}.amazonaws.com:443 2>/dev/null \
    | openssl x509 -fingerprint -sha1 -noout \
    | sed 's/://g' \
    | awk -F= '{print tolower($2)}')

echo "Thumbprint: ${THUMBPRINT}"
```

Now create the OIDC identity provider in IAM:

```bash
# Create the OIDC provider
aws iam create-open-id-connect-provider \
    --url ${OIDC_URL} \
    --client-id-list sts.amazonaws.com \
    --thumbprint-list ${THUMBPRINT} \
    --region ${AWS_REGION}
```

### Verify the OIDC Provider

Confirm the OIDC provider was created successfully:

```bash
# List OIDC providers and filter for your cluster
aws iam list-open-id-connect-providers \
    --query "OpenIDConnectProviderList[?contains(Arn, '${OIDC_ID}')]" \
    --output table
```

You should see output similar to:

```
-----------------------------------------------------------------------------------
|                          ListOpenIDConnectProviders                             |
+---------------------------------------------------------------------------------+
|                                      Arn                                        |
+---------------------------------------------------------------------------------+
|  arn:aws:iam::123456789012:oidc-provider/oidc.eks.us-west-2.amazonaws.com/id/...|
+---------------------------------------------------------------------------------+
```

## Step 2: Create the IAM Role with Trust Policy

The IAM role defines what AWS permissions your pods will have. The trust policy specifies which service accounts can assume the role.

### Define the Trust Policy

The trust policy is the critical security component. It restricts role assumption to specific service accounts in specific namespaces.

Create a file named `trust-policy.json`:

```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Principal": {
                "Federated": "arn:aws:iam::ACCOUNT_ID:oidc-provider/oidc.eks.REGION.amazonaws.com/id/OIDC_ID"
            },
            "Action": "sts:AssumeRoleWithWebIdentity",
            "Condition": {
                "StringEquals": {
                    "oidc.eks.REGION.amazonaws.com/id/OIDC_ID:sub": "system:serviceaccount:NAMESPACE:SERVICE_ACCOUNT_NAME",
                    "oidc.eks.REGION.amazonaws.com/id/OIDC_ID:aud": "sts.amazonaws.com"
                }
            }
        }
    ]
}
```

Here is a breakdown of the trust policy components:

| Component | Description |
|-----------|-------------|
| `Principal.Federated` | The ARN of your EKS OIDC provider |
| `Action` | Must be `sts:AssumeRoleWithWebIdentity` for OIDC federation |
| `Condition.StringEquals` | Restricts which service accounts can assume the role |
| `:sub` condition | The subject claim, formatted as `system:serviceaccount:namespace:sa-name` |
| `:aud` condition | The audience claim, must be `sts.amazonaws.com` |

### Generate the Trust Policy Dynamically

Use this script to generate the trust policy with your specific values:

```bash
# Set variables
export CLUSTER_NAME="my-eks-cluster"
export AWS_REGION="us-west-2"
export NAMESPACE="my-app"
export SERVICE_ACCOUNT_NAME="my-app-sa"

# Get AWS account ID
ACCOUNT_ID=$(aws sts get-caller-identity --query "Account" --output text)

# Get OIDC provider ID
OIDC_PROVIDER=$(aws eks describe-cluster \
    --name ${CLUSTER_NAME} \
    --region ${AWS_REGION} \
    --query "cluster.identity.oidc.issuer" \
    --output text | sed 's|https://||')

# Generate the trust policy
cat > trust-policy.json << EOF
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
                    "${OIDC_PROVIDER}:sub": "system:serviceaccount:${NAMESPACE}:${SERVICE_ACCOUNT_NAME}",
                    "${OIDC_PROVIDER}:aud": "sts.amazonaws.com"
                }
            }
        }
    ]
}
EOF

# Display the generated policy
cat trust-policy.json
```

### Create the IAM Role

Create the IAM role with the trust policy:

```bash
# Define the role name
export ROLE_NAME="eks-my-app-role"

# Create the IAM role
aws iam create-role \
    --role-name ${ROLE_NAME} \
    --assume-role-policy-document file://trust-policy.json \
    --description "IAM role for my-app pods in EKS"
```

### Attach Permissions to the Role

Attach the necessary IAM policies to grant AWS permissions. Here are examples for common use cases:

```bash
# Example 1: Allow S3 access
aws iam attach-role-policy \
    --role-name ${ROLE_NAME} \
    --policy-arn arn:aws:iam::aws:policy/AmazonS3ReadOnlyAccess

# Example 2: Allow DynamoDB access
aws iam attach-role-policy \
    --role-name ${ROLE_NAME} \
    --policy-arn arn:aws:iam::aws:policy/AmazonDynamoDBReadOnlyAccess

# Example 3: Allow SQS access
aws iam attach-role-policy \
    --role-name ${ROLE_NAME} \
    --policy-arn arn:aws:iam::aws:policy/AmazonSQSFullAccess
```

For production workloads, create a custom policy with minimal permissions:

```bash
# Create a custom policy for specific S3 bucket access
cat > s3-policy.json << EOF
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

# Create the policy
aws iam create-policy \
    --policy-name my-app-s3-policy \
    --policy-document file://s3-policy.json

# Attach the custom policy to the role
aws iam attach-role-policy \
    --role-name ${ROLE_NAME} \
    --policy-arn arn:aws:iam::${ACCOUNT_ID}:policy/my-app-s3-policy
```

### Get the Role ARN

Save the role ARN for the next step:

```bash
# Get and export the role ARN
export ROLE_ARN=$(aws iam get-role \
    --role-name ${ROLE_NAME} \
    --query "Role.Arn" \
    --output text)

echo "Role ARN: ${ROLE_ARN}"
```

## Step 3: Create the Kubernetes Service Account

The Kubernetes service account links your pods to the IAM role through an annotation.

### Create the Namespace (if needed)

```bash
# Create the namespace
kubectl create namespace my-app

# Verify the namespace exists
kubectl get namespace my-app
```

### Create the Service Account with Annotation

Create a file named `service-account.yaml`:

```yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: my-app-sa
  namespace: my-app
  annotations:
    # This annotation links the service account to the IAM role
    eks.amazonaws.com/role-arn: arn:aws:iam::123456789012:eks-my-app-role
  labels:
    app: my-app
```

Apply the service account:

```bash
# Apply the service account manifest
kubectl apply -f service-account.yaml

# Verify the service account was created with the annotation
kubectl describe serviceaccount my-app-sa -n my-app
```

The output should show the annotation:

```
Name:                my-app-sa
Namespace:           my-app
Labels:              app=my-app
Annotations:         eks.amazonaws.com/role-arn: arn:aws:iam::123456789012:eks-my-app-role
Image pull secrets:  <none>
Mountable secrets:   <none>
Tokens:              <none>
Events:              <none>
```

### Alternative: Create Service Account Using eksctl

eksctl can create the service account and IAM role together:

```bash
# Create both the IAM role and service account in one command
eksctl create iamserviceaccount \
    --cluster ${CLUSTER_NAME} \
    --region ${AWS_REGION} \
    --namespace my-app \
    --name my-app-sa \
    --role-name eks-my-app-role \
    --attach-policy-arn arn:aws:iam::aws:policy/AmazonS3ReadOnlyAccess \
    --approve \
    --override-existing-serviceaccounts
```

## Step 4: Configure Pods to Use IRSA

Now configure your pods to use the annotated service account.

### Basic Pod Configuration

Create a file named `pod.yaml`:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: my-app-pod
  namespace: my-app
  labels:
    app: my-app
spec:
  # Reference the annotated service account
  serviceAccountName: my-app-sa
  containers:
    - name: my-app
      image: amazon/aws-cli:latest
      command: ["sleep", "infinity"]
      resources:
        requests:
          memory: "64Mi"
          cpu: "100m"
        limits:
          memory: "128Mi"
          cpu: "200m"
```

Apply the pod:

```bash
kubectl apply -f pod.yaml
```

### Deployment Configuration

For production workloads, use a Deployment:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-app
  namespace: my-app
  labels:
    app: my-app
spec:
  replicas: 3
  selector:
    matchLabels:
      app: my-app
  template:
    metadata:
      labels:
        app: my-app
    spec:
      # Reference the annotated service account
      serviceAccountName: my-app-sa
      containers:
        - name: my-app
          image: my-app:latest
          ports:
            - containerPort: 8080
          env:
            # These are automatically injected by EKS, shown here for reference
            # - name: AWS_ROLE_ARN
            #   value: <injected by webhook>
            # - name: AWS_WEB_IDENTITY_TOKEN_FILE
            #   value: <injected by webhook>
            - name: AWS_DEFAULT_REGION
              value: us-west-2
          resources:
            requests:
              memory: "256Mi"
              cpu: "250m"
            limits:
              memory: "512Mi"
              cpu: "500m"
          securityContext:
            readOnlyRootFilesystem: true
            runAsNonRoot: true
            runAsUser: 1000
      # Optional: Use a read-only root filesystem
      securityContext:
        fsGroup: 1000
```

### What Gets Injected

When a pod uses an IRSA-enabled service account, the EKS Pod Identity Webhook automatically injects:

| Injected Component | Description |
|-------------------|-------------|
| `AWS_ROLE_ARN` | Environment variable with the IAM role ARN |
| `AWS_WEB_IDENTITY_TOKEN_FILE` | Path to the projected service account token |
| Token volume | A projected volume containing the JWT token |
| Volume mount | Mounts the token at `/var/run/secrets/eks.amazonaws.com/serviceaccount/token` |

## Step 5: Verify IRSA Configuration

Confirm that IRSA is working correctly.

### Check Environment Variables

Verify the injected environment variables in the pod:

```bash
# Check the AWS-related environment variables
kubectl exec -it my-app-pod -n my-app -- env | grep AWS
```

Expected output:

```
AWS_ROLE_ARN=arn:aws:iam::123456789012:role/eks-my-app-role
AWS_WEB_IDENTITY_TOKEN_FILE=/var/run/secrets/eks.amazonaws.com/serviceaccount/token
```

### Check the Projected Token Volume

Verify the token is mounted:

```bash
# Check if the token file exists
kubectl exec -it my-app-pod -n my-app -- ls -la /var/run/secrets/eks.amazonaws.com/serviceaccount/
```

Expected output:

```
total 4
drwxrwxrwt 3 root root  100 Jan 30 10:00 .
drwxr-xr-x 3 root root   60 Jan 30 10:00 ..
lrwxrwxrwx 1 root root   12 Jan 30 10:00 token -> ..data/token
```

### Test AWS API Access

Test that the pod can successfully call AWS APIs:

```bash
# Get the caller identity from within the pod
kubectl exec -it my-app-pod -n my-app -- aws sts get-caller-identity
```

Expected output:

```json
{
    "UserId": "AROA3XFRBF535EXAMPLE:botocore-session-1234567890",
    "Account": "123456789012",
    "Arn": "arn:aws:sts::123456789012:assumed-role/eks-my-app-role/botocore-session-1234567890"
}
```

The ARN should show the assumed role, not the node instance role.

### Test Service-Specific Access

Test access to the specific AWS service:

```bash
# Test S3 access (if S3 permissions were granted)
kubectl exec -it my-app-pod -n my-app -- aws s3 ls s3://my-application-bucket/

# Test DynamoDB access (if DynamoDB permissions were granted)
kubectl exec -it my-app-pod -n my-app -- aws dynamodb list-tables --region us-west-2
```

## Step 6: Using IRSA in Application Code

AWS SDKs automatically detect and use IRSA credentials. Here are examples in different languages.

### Python (boto3)

```python
import boto3
import os

def get_s3_client():
    """
    Create an S3 client using IRSA credentials.
    boto3 automatically uses the web identity token when running in EKS.
    No explicit credential configuration needed.
    """
    # The SDK automatically detects AWS_ROLE_ARN and AWS_WEB_IDENTITY_TOKEN_FILE
    s3_client = boto3.client('s3', region_name=os.environ.get('AWS_DEFAULT_REGION', 'us-west-2'))
    return s3_client

def list_bucket_objects(bucket_name):
    """List objects in an S3 bucket using IRSA credentials."""
    s3 = get_s3_client()

    try:
        response = s3.list_objects_v2(Bucket=bucket_name)
        objects = response.get('Contents', [])

        for obj in objects:
            print(f"Object: {obj['Key']}, Size: {obj['Size']} bytes")

        return objects
    except Exception as e:
        print(f"Error listing objects: {e}")
        raise

if __name__ == "__main__":
    bucket = os.environ.get('S3_BUCKET', 'my-application-bucket')
    list_bucket_objects(bucket)
```

### Node.js (AWS SDK v3)

```javascript
import { S3Client, ListObjectsV2Command } from "@aws-sdk/client-s3";
import { fromWebToken } from "@aws-sdk/credential-providers";

/**
 * Create an S3 client that uses IRSA credentials.
 * The SDK v3 automatically detects web identity credentials.
 */
function createS3Client() {
    // The SDK automatically uses environment variables for IRSA
    const client = new S3Client({
        region: process.env.AWS_DEFAULT_REGION || "us-west-2",
    });
    return client;
}

/**
 * List objects in an S3 bucket using IRSA credentials.
 */
async function listBucketObjects(bucketName) {
    const s3Client = createS3Client();

    try {
        const command = new ListObjectsV2Command({
            Bucket: bucketName,
        });

        const response = await s3Client.send(command);
        const objects = response.Contents || [];

        objects.forEach((obj) => {
            console.log(`Object: ${obj.Key}, Size: ${obj.Size} bytes`);
        });

        return objects;
    } catch (error) {
        console.error(`Error listing objects: ${error.message}`);
        throw error;
    }
}

// Main execution
const bucket = process.env.S3_BUCKET || "my-application-bucket";
listBucketObjects(bucket);
```

### Go

```go
package main

import (
    "context"
    "fmt"
    "log"
    "os"

    "github.com/aws/aws-sdk-go-v2/config"
    "github.com/aws/aws-sdk-go-v2/service/s3"
)

// createS3Client creates an S3 client using IRSA credentials.
// The SDK automatically detects web identity token configuration.
func createS3Client(ctx context.Context) (*s3.Client, error) {
    // Load default config - SDK auto-detects IRSA environment variables
    cfg, err := config.LoadDefaultConfig(ctx,
        config.WithRegion(getEnvOrDefault("AWS_DEFAULT_REGION", "us-west-2")),
    )
    if err != nil {
        return nil, fmt.Errorf("failed to load AWS config: %w", err)
    }

    return s3.NewFromConfig(cfg), nil
}

// listBucketObjects lists all objects in the specified S3 bucket.
func listBucketObjects(ctx context.Context, bucketName string) error {
    client, err := createS3Client(ctx)
    if err != nil {
        return err
    }

    output, err := client.ListObjectsV2(ctx, &s3.ListObjectsV2Input{
        Bucket: &bucketName,
    })
    if err != nil {
        return fmt.Errorf("failed to list objects: %w", err)
    }

    for _, obj := range output.Contents {
        fmt.Printf("Object: %s, Size: %d bytes\n", *obj.Key, obj.Size)
    }

    return nil
}

func getEnvOrDefault(key, defaultValue string) string {
    if value := os.Getenv(key); value != "" {
        return value
    }
    return defaultValue
}

func main() {
    ctx := context.Background()
    bucket := getEnvOrDefault("S3_BUCKET", "my-application-bucket")

    if err := listBucketObjects(ctx, bucket); err != nil {
        log.Fatalf("Error: %v", err)
    }
}
```

### Java (AWS SDK v2)

```java
package com.example;

import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.ListObjectsV2Request;
import software.amazon.awssdk.services.s3.model.ListObjectsV2Response;
import software.amazon.awssdk.services.s3.model.S3Object;

/**
 * Example S3 client using IRSA credentials.
 * The AWS SDK v2 automatically detects web identity token credentials.
 */
public class S3Example {

    private final S3Client s3Client;

    public S3Example() {
        // SDK automatically uses IRSA credentials from environment
        this.s3Client = S3Client.builder()
                .region(Region.of(System.getenv().getOrDefault("AWS_DEFAULT_REGION", "us-west-2")))
                .build();
    }

    /**
     * List objects in the specified S3 bucket.
     */
    public void listBucketObjects(String bucketName) {
        try {
            ListObjectsV2Request request = ListObjectsV2Request.builder()
                    .bucket(bucketName)
                    .build();

            ListObjectsV2Response response = s3Client.listObjectsV2(request);

            for (S3Object object : response.contents()) {
                System.out.printf("Object: %s, Size: %d bytes%n",
                        object.key(), object.size());
            }
        } catch (Exception e) {
            System.err.println("Error listing objects: " + e.getMessage());
            throw e;
        }
    }

    public static void main(String[] args) {
        String bucket = System.getenv().getOrDefault("S3_BUCKET", "my-application-bucket");
        S3Example example = new S3Example();
        example.listBucketObjects(bucket);
    }
}
```

## Troubleshooting

### Common Issues and Solutions

| Issue | Symptom | Solution |
|-------|---------|----------|
| Missing OIDC provider | `An error occurred (InvalidIdentityToken)` | Verify OIDC provider exists for your cluster |
| Wrong trust policy | `AccessDenied when calling AssumeRoleWithWebIdentity` | Check namespace and service account name in trust policy |
| Missing annotation | Environment variables not injected | Verify service account has the `eks.amazonaws.com/role-arn` annotation |
| Old SDK version | Credentials not detected | Update AWS SDK to a version supporting web identity tokens |
| Token expired | Intermittent auth failures | SDK should auto-refresh; check for credential caching issues |

### Debug OIDC Provider Issues

Check if the OIDC provider is properly configured:

```bash
# Get the OIDC issuer URL
OIDC_URL=$(aws eks describe-cluster \
    --name ${CLUSTER_NAME} \
    --query "cluster.identity.oidc.issuer" \
    --output text)

echo "OIDC URL: ${OIDC_URL}"

# Extract just the provider ID
OIDC_ID=$(echo ${OIDC_URL} | cut -d '/' -f 5)

# Check if the OIDC provider exists in IAM
aws iam list-open-id-connect-providers | grep ${OIDC_ID}
```

If the provider is missing, create it following Step 1.

### Debug Trust Policy Issues

Verify the trust policy configuration:

```bash
# Get the role's trust policy
aws iam get-role \
    --role-name ${ROLE_NAME} \
    --query "Role.AssumeRolePolicyDocument" \
    --output json | jq .
```

Common trust policy mistakes:

1. **Wrong OIDC provider ARN**: Ensure it matches your cluster's OIDC provider
2. **Wrong namespace**: The `:sub` condition must match the exact namespace
3. **Wrong service account name**: The `:sub` condition must match the exact service account name
4. **Missing `:aud` condition**: Should be `sts.amazonaws.com`

### Debug Service Account Issues

Check the service account configuration:

```bash
# View service account details
kubectl get serviceaccount my-app-sa -n my-app -o yaml

# Check for the IRSA annotation
kubectl get serviceaccount my-app-sa -n my-app \
    -o jsonpath='{.metadata.annotations.eks\.amazonaws\.com/role-arn}'
```

### Debug Pod Issues

Check what is injected into the pod:

```bash
# View the pod spec to see injected volumes and env vars
kubectl get pod my-app-pod -n my-app -o yaml | grep -A 20 "volumes:"
kubectl get pod my-app-pod -n my-app -o yaml | grep -A 10 "env:"

# Check if the token file exists and is readable
kubectl exec -it my-app-pod -n my-app -- cat /var/run/secrets/eks.amazonaws.com/serviceaccount/token

# Decode the token to see its claims (requires jq)
kubectl exec -it my-app-pod -n my-app -- cat /var/run/secrets/eks.amazonaws.com/serviceaccount/token | \
    cut -d '.' -f 2 | base64 -d 2>/dev/null | jq .
```

The decoded token should show claims like:

```json
{
    "aud": ["sts.amazonaws.com"],
    "exp": 1706612345,
    "iat": 1706526345,
    "iss": "https://oidc.eks.us-west-2.amazonaws.com/id/EXAMPLED539D4633E53DE1B71EXAMPLE",
    "kubernetes.io": {
        "namespace": "my-app",
        "serviceaccount": {
            "name": "my-app-sa",
            "uid": "12345678-1234-1234-1234-123456789012"
        }
    },
    "sub": "system:serviceaccount:my-app:my-app-sa"
}
```

### Debug AWS SDK Issues

Test credential retrieval manually:

```bash
# Manually test AssumeRoleWithWebIdentity
kubectl exec -it my-app-pod -n my-app -- sh -c '
    aws sts assume-role-with-web-identity \
        --role-arn $AWS_ROLE_ARN \
        --role-session-name test-session \
        --web-identity-token file://$AWS_WEB_IDENTITY_TOKEN_FILE \
        --duration-seconds 3600
'
```

### Check Pod Identity Webhook

Verify the webhook is functioning:

```bash
# Check if the pod identity webhook is running
kubectl get pods -n kube-system | grep pod-identity-webhook

# View webhook logs
kubectl logs -n kube-system -l app=pod-identity-webhook
```

## Security Best Practices

### 1. Use Specific Trust Policies

Always restrict trust policies to specific namespaces and service accounts:

```json
{
    "Condition": {
        "StringEquals": {
            "oidc.eks.region.amazonaws.com/id/OIDC_ID:sub": "system:serviceaccount:my-app:my-app-sa"
        }
    }
}
```

Never use wildcard conditions like:

```json
{
    "Condition": {
        "StringLike": {
            "oidc.eks.region.amazonaws.com/id/OIDC_ID:sub": "system:serviceaccount:*:*"
        }
    }
}
```

### 2. Apply Least Privilege Permissions

Create custom IAM policies with only the required permissions:

```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Sid": "AllowSpecificS3Operations",
            "Effect": "Allow",
            "Action": [
                "s3:GetObject",
                "s3:PutObject"
            ],
            "Resource": [
                "arn:aws:s3:::my-bucket/specific-prefix/*"
            ]
        }
    ]
}
```

### 3. Use Separate Roles for Different Workloads

Each application or microservice should have its own IAM role:

| Workload | IAM Role | Permissions |
|----------|----------|-------------|
| Frontend API | `eks-frontend-role` | Read from cache bucket |
| Backend Worker | `eks-worker-role` | Read/write to data bucket, SQS access |
| Reporting Service | `eks-reporting-role` | Read from all buckets, Athena query |

### 4. Enable CloudTrail Logging

Monitor IRSA usage through CloudTrail:

```bash
# Search CloudTrail for AssumeRoleWithWebIdentity events
aws cloudtrail lookup-events \
    --lookup-attributes AttributeKey=EventName,AttributeValue=AssumeRoleWithWebIdentity \
    --start-time $(date -u -d '1 hour ago' +%Y-%m-%dT%H:%M:%SZ) \
    --query 'Events[].CloudTrailEvent' \
    --output text | jq -r '.userIdentity.arn, .sourceIPAddress'
```

### 5. Rotate Service Account Tokens

IRSA tokens are automatically rotated by Kubernetes (default 1 hour expiry). Ensure your application handles token refresh:

```bash
# Check token expiration configuration
kubectl get pod my-app-pod -n my-app -o yaml | grep -A 5 "serviceAccountToken"
```

### 6. Use Network Policies

Restrict pod network access alongside IRSA:

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: my-app-network-policy
  namespace: my-app
spec:
  podSelector:
    matchLabels:
      app: my-app
  policyTypes:
    - Egress
  egress:
    # Allow access to AWS services
    - to:
        - ipBlock:
            cidr: 0.0.0.0/0
      ports:
        - protocol: TCP
          port: 443
```

## Comparison with Other Approaches

| Approach | Security | Complexity | Use Case |
|----------|----------|------------|----------|
| IRSA | High - pod-level isolation | Medium | Production workloads |
| Node IAM Role | Low - shared across all pods | Low | Development/testing only |
| Static Credentials (Secrets) | Low - manual rotation needed | Low | Legacy applications |
| EKS Pod Identity | High - simplified setup | Low | New clusters (EKS 1.24+) |
| kiam/kube2iam | Medium - network-based | High | Older clusters without IRSA |

## Conclusion

IRSA provides a secure and scalable way to grant AWS permissions to Kubernetes workloads. By following this guide, you can implement IRSA in your EKS cluster with proper security controls. Key takeaways:

1. Always create an OIDC provider for your EKS cluster
2. Use specific trust policies that restrict access to exact namespaces and service accounts
3. Follow the principle of least privilege when attaching IAM policies
4. Test your configuration thoroughly before deploying to production
5. Monitor IRSA usage through CloudTrail for security auditing

For clusters running EKS 1.24 or later, also consider EKS Pod Identity as a newer alternative that simplifies the setup process while providing similar security benefits.

## Additional Resources

- [AWS Documentation: IAM Roles for Service Accounts](https://docs.aws.amazon.com/eks/latest/userguide/iam-roles-for-service-accounts.html)
- [eksctl Documentation: IAM Service Accounts](https://eksctl.io/usage/iamserviceaccounts/)
- [Kubernetes Documentation: Service Accounts](https://kubernetes.io/docs/concepts/security/service-accounts/)
- [AWS SDK Credential Provider Chain](https://docs.aws.amazon.com/sdkref/latest/guide/standardized-credentials.html)
