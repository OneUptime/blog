# How to Configure AWS IAM Roles for Pods on Talos Linux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, AWS, IAM, IRSA, Kubernetes, Security

Description: Learn how to set up IAM Roles for Service Accounts (IRSA) on Talos Linux to give individual pods fine-grained AWS permissions.

---

When your Kubernetes workloads need to talk to AWS services like S3, DynamoDB, or SQS, they need credentials. The old approach was to attach a broad IAM role to the entire node, which meant every pod on that node got the same permissions. That is a security problem. IAM Roles for Service Accounts, or IRSA, solves this by letting you assign specific IAM roles to individual Kubernetes service accounts. Here is how to set it up on Talos Linux.

## The Problem with Node-Level IAM Roles

Consider a node running three pods: one needs access to S3, another needs DynamoDB, and a third is a simple web server that needs no AWS access at all. If you attach an IAM role to the node with S3 and DynamoDB permissions, every pod on that node can access both services. A compromise in the web server pod would give the attacker access to your S3 buckets and DynamoDB tables.

IRSA eliminates this by associating IAM roles with Kubernetes service accounts. Each pod gets only the permissions its service account allows, and pods without annotated service accounts get no AWS access at all.

## How IRSA Works

The mechanism behind IRSA involves OIDC (OpenID Connect). Here is the flow:

1. Your cluster has an OIDC provider that issues tokens for service accounts
2. AWS IAM trusts this OIDC provider through a federation configuration
3. When a pod starts, it gets a projected service account token
4. The AWS SDK in the pod exchanges this token for temporary AWS credentials through STS
5. The STS call verifies the token against the OIDC provider and returns credentials scoped to the IAM role

This all happens transparently to your application code. If your app uses the standard AWS SDK, it picks up the credentials automatically.

## Prerequisites

You need the following:

- A Talos Linux cluster running on AWS
- An S3 bucket (or access to create one) for hosting the OIDC discovery document
- `kubectl`, `talosctl`, and the AWS CLI installed
- Administrative access to IAM

## Setting Up the OIDC Provider

First, you need to extract the service account signing key from your Talos cluster and publish the OIDC discovery document to a public endpoint. This is the trickiest part of the setup.

Extract the service account issuer information:

```bash
# Get the service account issuer from the cluster
kubectl get --raw /.well-known/openid-configuration | jq .
```

For a self-managed cluster, you need to host the OIDC discovery document on S3. Create a public S3 bucket:

```bash
# Create an S3 bucket for the OIDC discovery document
aws s3 mb s3://my-cluster-oidc --region us-east-1

# Enable public access for the discovery document
aws s3api put-public-access-block \
  --bucket my-cluster-oidc \
  --public-access-block-configuration \
  BlockPublicAcls=false,IgnorePublicAcls=false,BlockPublicPolicy=false,RestrictPublicBuckets=false
```

Next, configure Talos to use this bucket as the service account issuer. Patch your machine config:

```yaml
# controlplane-patch.yaml
cluster:
  apiServer:
    extraArgs:
      service-account-issuer: https://my-cluster-oidc.s3.us-east-1.amazonaws.com
      service-account-jwks-uri: https://my-cluster-oidc.s3.us-east-1.amazonaws.com/openid/v1/jwks
```

```bash
# Apply the patch to your control plane nodes
talosctl patch machineconfig --patch @controlplane-patch.yaml --nodes 10.0.1.10
```

## Publishing the OIDC Discovery Document

Extract the JWKS (JSON Web Key Set) from your cluster and upload it to S3:

```bash
# Get the JWKS from the API server
kubectl get --raw /openid/v1/jwks > jwks.json

# Create the discovery document
cat > discovery.json << 'DISC'
{
  "issuer": "https://my-cluster-oidc.s3.us-east-1.amazonaws.com",
  "jwks_uri": "https://my-cluster-oidc.s3.us-east-1.amazonaws.com/openid/v1/jwks",
  "authorization_endpoint": "urn:kubernetes:programmatic_authorization",
  "response_types_supported": ["id_token"],
  "subject_types_supported": ["public"],
  "id_token_signing_alg_values_supported": ["RS256"],
  "claims_supported": ["sub", "iss"]
}
DISC

# Upload to S3
aws s3 cp discovery.json s3://my-cluster-oidc/.well-known/openid-configuration \
  --content-type application/json
aws s3 cp jwks.json s3://my-cluster-oidc/openid/v1/jwks \
  --content-type application/json
```

## Creating the IAM OIDC Identity Provider

Register the OIDC provider with IAM:

```bash
# Get the thumbprint of the S3 certificate
THUMBPRINT=$(openssl s_client -connect s3.us-east-1.amazonaws.com:443 -servername s3.us-east-1.amazonaws.com 2>/dev/null | openssl x509 -fingerprint -noout | cut -d= -f2 | tr -d ':' | tr '[:upper:]' '[:lower:]')

# Create the OIDC identity provider in IAM
aws iam create-open-id-connect-provider \
  --url https://my-cluster-oidc.s3.us-east-1.amazonaws.com \
  --client-id-list sts.amazonaws.com \
  --thumbprint-list $THUMBPRINT
```

## Creating an IAM Role for a Service Account

Now create an IAM role with a trust policy that allows your specific service account to assume it:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Federated": "arn:aws:iam::123456789012:oidc-provider/my-cluster-oidc.s3.us-east-1.amazonaws.com"
      },
      "Action": "sts:AssumeRoleWithWebIdentity",
      "Condition": {
        "StringEquals": {
          "my-cluster-oidc.s3.us-east-1.amazonaws.com:sub": "system:serviceaccount:default:my-app-sa",
          "my-cluster-oidc.s3.us-east-1.amazonaws.com:aud": "sts.amazonaws.com"
        }
      }
    }
  ]
}
```

```bash
# Create the IAM role with the trust policy
aws iam create-role \
  --role-name my-app-role \
  --assume-role-policy-document file://trust-policy.json

# Attach the permissions policy
aws iam attach-role-policy \
  --role-name my-app-role \
  --policy-arn arn:aws:iam::aws:policy/AmazonS3ReadOnlyAccess
```

## Configuring the Kubernetes Service Account

Create a service account annotated with the IAM role ARN:

```yaml
# service-account.yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: my-app-sa
  namespace: default
  annotations:
    eks.amazonaws.com/role-arn: arn:aws:iam::123456789012:role/my-app-role
```

## Installing the Pod Identity Webhook

For the token injection to work, you need the Amazon EKS Pod Identity Webhook running in your cluster:

```bash
# Deploy the pod identity webhook
helm repo add eks https://aws.github.io/eks-charts
helm install pod-identity-webhook eks/amazon-eks-pod-identity-webhook \
  --namespace kube-system \
  --set config.defaultAwsRegion=us-east-1
```

This webhook mutates pod specs at admission time. When a pod uses a service account with the IRSA annotation, the webhook injects the necessary environment variables (`AWS_ROLE_ARN` and `AWS_WEB_IDENTITY_TOKEN_FILE`) and mounts the projected service account token.

## Testing the Setup

Deploy a test pod that uses the annotated service account:

```yaml
# test-irsa.yaml
apiVersion: v1
kind: Pod
metadata:
  name: test-irsa
spec:
  serviceAccountName: my-app-sa
  containers:
    - name: aws-cli
      image: amazon/aws-cli:latest
      command: ["sleep", "3600"]
```

```bash
# Deploy and test
kubectl apply -f test-irsa.yaml

# Verify the environment variables are injected
kubectl exec test-irsa -- env | grep AWS

# Test AWS access
kubectl exec test-irsa -- aws s3 ls
kubectl exec test-irsa -- aws sts get-caller-identity
```

The `get-caller-identity` call should show the assumed role ARN, confirming that the pod has the correct IAM identity.

## Conclusion

IRSA on Talos Linux requires more manual setup than on EKS, since you need to manage the OIDC discovery document yourself. But the security benefits are significant. Each pod gets only the AWS permissions it needs, following the principle of least privilege. Once the OIDC provider and webhook are in place, adding new roles is straightforward: create the IAM role with the right trust policy, annotate the service account, and deploy your pod.
