# How to Configure SecretStore for AWS Secrets Manager with Flux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, Kubernetes, GitOps, External Secrets Operator, AWS, Secrets Manager

Description: Configure an ESO SecretStore for AWS Secrets Manager using Flux CD, enabling Kubernetes workloads to consume AWS-hosted secrets through GitOps-managed resources.

---

## Introduction

AWS Secrets Manager is the most widely used external secret store for Kubernetes workloads running on AWS. It provides automatic rotation, fine-grained IAM policies, and audit logging through CloudTrail. The External Secrets Operator's `SecretStore` resource bridges AWS Secrets Manager and Kubernetes, pulling secrets on demand and keeping them synchronized.

Managing the `SecretStore` configuration through Flux CD means the connection between your Kubernetes cluster and AWS Secrets Manager is declarative and version-controlled. Changes to authentication methods, region configuration, or secret path conventions go through your standard pull request review process and are applied consistently across all clusters.

This guide covers configuring a `SecretStore` for AWS Secrets Manager using both IRSA (IAM Roles for Service Accounts) and static credential authentication, managed by Flux CD.

## Prerequisites

- External Secrets Operator deployed via Flux HelmRelease
- An AWS account with secrets stored in Secrets Manager
- For IRSA: an EKS cluster with OIDC provider configured
- For static credentials: an IAM user with `secretsmanager:GetSecretValue` permission

## Step 1: Create an IAM Policy for ESO

Create an IAM policy in AWS that grants read access to specific secret paths:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "ESOSecretsAccess",
      "Effect": "Allow",
      "Action": [
        "secretsmanager:GetSecretValue",
        "secretsmanager:DescribeSecret"
      ],
      "Resource": [
        "arn:aws:secretsmanager:us-east-1:123456789012:secret:myapp/*"
      ]
    }
  ]
}
```

## Step 2: Configure IRSA (Recommended for EKS)

Annotate the ESO service account with the IAM role ARN to use IRSA:

```yaml
# clusters/my-cluster/external-secrets/irsa-service-account.yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: external-secrets
  namespace: external-secrets
  annotations:
    # Link the Kubernetes service account to the IAM role via IRSA
    eks.amazonaws.com/role-arn: arn:aws:iam::123456789012:role/ExternalSecretsRole
```

## Step 3: Configure a SecretStore for AWS Secrets Manager

```yaml
# clusters/my-cluster/external-secrets/secretstore-aws.yaml
apiVersion: external-secrets.io/v1beta1
kind: SecretStore
metadata:
  name: aws-secrets-manager
  namespace: default
spec:
  provider:
    aws:
      service: SecretsManager
      # AWS region where your secrets are stored
      region: us-east-1
      auth:
        # Use IRSA: reference the annotated service account
        jwt:
          serviceAccountRef:
            name: external-secrets
            namespace: external-secrets
```

## Step 4: Configure SecretStore with Static Credentials (Non-EKS)

For clusters not running on EKS, use a Kubernetes Secret containing AWS credentials:

```yaml
# clusters/my-cluster/external-secrets/aws-credentials-secret.yaml
# IMPORTANT: This secret should be created via SOPS or another secure mechanism
# Never commit plain-text credentials to Git
apiVersion: v1
kind: Secret
metadata:
  name: aws-credentials
  namespace: external-secrets
type: Opaque
stringData:
  access-key-id: "REPLACE_WITH_SOPS_ENCRYPTED_VALUE"
  secret-access-key: "REPLACE_WITH_SOPS_ENCRYPTED_VALUE"
```

```yaml
# clusters/my-cluster/external-secrets/secretstore-aws-static.yaml
apiVersion: external-secrets.io/v1beta1
kind: SecretStore
metadata:
  name: aws-secrets-manager-static
  namespace: default
spec:
  provider:
    aws:
      service: SecretsManager
      region: us-east-1
      auth:
        secretRef:
          accessKeyIDSecretRef:
            name: aws-credentials
            key: access-key-id
          secretAccessKeySecretRef:
            name: aws-credentials
            key: secret-access-key
```

## Step 5: Manage via Flux Kustomization

```yaml
# clusters/my-cluster/external-secrets/kustomization.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: secret-stores
  namespace: flux-system
spec:
  interval: 10m
  path: ./clusters/my-cluster/external-secrets
  prune: true
  sourceRef:
    kind: GitRepository
    name: flux-system
  # Ensure ESO operator is healthy before applying SecretStore resources
  dependsOn:
    - name: external-secrets
```

## Step 6: Verify SecretStore Connectivity

```bash
# Check SecretStore status
kubectl get secretstore aws-secrets-manager -n default

# View detailed status including last sync time
kubectl describe secretstore aws-secrets-manager -n default

# Expected condition:
# Type: Ready
# Status: True
# Reason: Valid
# Message: store validated
```

## Step 7: Test with an ExternalSecret

```yaml
# Test that the SecretStore can read a secret from AWS
apiVersion: external-secrets.io/v1beta1
kind: ExternalSecret
metadata:
  name: test-aws-secret
  namespace: default
spec:
  refreshInterval: 1h
  secretStoreRef:
    name: aws-secrets-manager
    kind: SecretStore
  target:
    name: test-secret
  data:
    - secretKey: db-password
      remoteRef:
        # The path of the secret in AWS Secrets Manager
        key: myapp/database
        property: password
```

## Best Practices

- Always use IRSA on EKS instead of static credentials; it eliminates credential rotation burden.
- Scope the IAM policy to specific secret ARN prefixes (`myapp/*`) rather than `*` to enforce least privilege.
- Use `SecretStore` (namespace-scoped) for application-specific stores and `ClusterSecretStore` for shared infrastructure secrets.
- Monitor `SecretStore` status with Prometheus alerts on the `externalsecret_sync_calls_error` metric to detect authentication failures.
- Add the `SecretStore` resource to a Flux health check so dependent `ExternalSecret` resources are not applied until the store is validated.

## Conclusion

Configuring an AWS Secrets Manager `SecretStore` through Flux CD gives you a declarative, auditable connection between Kubernetes and your cloud secret store. Application teams can consume secrets via `ExternalSecret` resources without needing AWS console access, while your platform team retains control over which namespaces can access which secret paths through RBAC and IAM policy.
