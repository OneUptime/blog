# How to Configure SecretStore for AWS SSM Parameter Store with Flux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, Kubernetes, GitOps, External Secrets Operator, AWS, SSM Parameter Store

Description: Configure an ESO SecretStore for AWS Systems Manager Parameter Store using Flux CD to sync hierarchical configuration parameters into Kubernetes Secrets.

---

## Introduction

AWS Systems Manager Parameter Store is a lightweight, cost-effective alternative to AWS Secrets Manager for storing configuration values and secrets. It supports hierarchical parameter paths, making it ideal for organizing application configuration by environment (`/myapp/prod/database-url`). SecureString parameters are encrypted with KMS, providing secret-grade security.

The External Secrets Operator supports both Secrets Manager and Parameter Store through the same AWS provider, but the Parameter Store `SecretStore` configuration differs slightly. It uses the `ParameterStore` service rather than `SecretsManager`, and references parameters by their full path.

This guide covers configuring a `SecretStore` for AWS SSM Parameter Store using IRSA authentication, managing it with Flux CD, and syncing hierarchical parameters into Kubernetes Secrets.

## Prerequisites

- External Secrets Operator deployed via Flux HelmRelease
- AWS SSM Parameter Store with SecureString or String parameters
- EKS cluster with OIDC provider configured (for IRSA)
- IAM role with `ssm:GetParameter` and `ssm:GetParametersByPath` permissions

## Step 1: Create IAM Policy for Parameter Store Access

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "ESOParameterStoreAccess",
      "Effect": "Allow",
      "Action": [
        "ssm:GetParameter",
        "ssm:GetParameters",
        "ssm:GetParametersByPath",
        "ssm:DescribeParameters"
      ],
      "Resource": [
        "arn:aws:ssm:us-east-1:123456789012:parameter/myapp/*"
      ]
    },
    {
      "Sid": "KMSDecrypt",
      "Effect": "Allow",
      "Action": [
        "kms:Decrypt"
      ],
      "Resource": [
        "arn:aws:kms:us-east-1:123456789012:key/YOUR_KMS_KEY_ID"
      ]
    }
  ]
}
```

## Step 2: Annotate the ESO Service Account with IRSA

```yaml
# clusters/my-cluster/external-secrets/service-account.yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: external-secrets
  namespace: external-secrets
  annotations:
    # IAM role with Parameter Store read access
    eks.amazonaws.com/role-arn: arn:aws:iam::123456789012:role/ESOParameterStoreRole
```

## Step 3: Configure SecretStore for SSM Parameter Store

```yaml
# clusters/my-cluster/external-secrets/secretstore-ssm.yaml
apiVersion: external-secrets.io/v1beta1
kind: SecretStore
metadata:
  name: aws-parameter-store
  namespace: default
spec:
  provider:
    aws:
      # Use ParameterStore instead of SecretsManager
      service: ParameterStore
      region: us-east-1
      auth:
        jwt:
          serviceAccountRef:
            name: external-secrets
            namespace: external-secrets
```

## Step 4: Sync Individual Parameters

Reference individual SSM parameters by their full path:

```yaml
# clusters/my-cluster/apps/myapp/externalsecret-ssm.yaml
apiVersion: external-secrets.io/v1beta1
kind: ExternalSecret
metadata:
  name: myapp-config-ssm
  namespace: default
spec:
  refreshInterval: 30m
  secretStoreRef:
    name: aws-parameter-store
    kind: SecretStore
  target:
    name: myapp-config
    creationPolicy: Owner
  data:
    - secretKey: database-url
      remoteRef:
        # Full SSM parameter path
        key: /myapp/prod/database-url
    - secretKey: api-key
      remoteRef:
        key: /myapp/prod/api-key
    - secretKey: redis-password
      remoteRef:
        key: /myapp/prod/redis-password
```

## Step 5: Sync an Entire Parameter Hierarchy

Use `dataFrom` with `find` to sync all parameters under a path prefix:

```yaml
# clusters/my-cluster/apps/myapp/externalsecret-ssm-bulk.yaml
apiVersion: external-secrets.io/v1beta1
kind: ExternalSecret
metadata:
  name: myapp-all-params
  namespace: default
spec:
  refreshInterval: 1h
  secretStoreRef:
    name: aws-parameter-store
    kind: SecretStore
  target:
    name: myapp-all-params
    creationPolicy: Owner
  dataFrom:
    - find:
        # Sync all parameters under this path prefix
        path: /myapp/prod
        # Convert parameter names to valid Secret keys
        # /myapp/prod/database-url -> DATABASE_URL
        conversionStrategy: Unicode
        decodingStrategy: None
```

## Step 6: Manage via Flux Kustomization

```yaml
# clusters/my-cluster/external-secrets/kustomization.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: parameter-store-secrets
  namespace: flux-system
spec:
  interval: 10m
  path: ./clusters/my-cluster/external-secrets
  prune: true
  sourceRef:
    kind: GitRepository
    name: flux-system
  dependsOn:
    - name: external-secrets
```

## Step 7: Verify Parameter Sync

```bash
# Check SecretStore status
kubectl get secretstore aws-parameter-store -n default

# Verify ExternalSecret sync status
kubectl get externalsecret myapp-config-ssm -n default

# Confirm Kubernetes Secret was created with parameter values
kubectl get secret myapp-config -n default -o jsonpath='{.data}' | \
  python3 -c "import sys,json,base64; d=json.load(sys.stdin); \
  [print(k, base64.b64decode(v).decode()) for k,v in d.items()]"
```

## Best Practices

- Use SecureString parameters (KMS-encrypted) for all sensitive values; use String parameters only for non-sensitive configuration.
- Use hierarchical parameter paths (`/app/env/key`) for clean organization and granular IAM path-based access control.
- Prefer `dataFrom` with `find` for syncing application configuration blocks rather than listing parameters individually — it reduces `ExternalSecret` manifest verbosity and automatically picks up new parameters under the path.
- Set `refreshInterval` based on how frequently parameters change; 30 minutes is a good default for most configuration values.
- Avoid using `GetParametersByPath` with very broad paths in production as it can hit API rate limits for large parameter hierarchies.

## Conclusion

AWS SSM Parameter Store is an excellent choice for application configuration that does not require the full secret lifecycle management of Secrets Manager. By configuring the ESO `SecretStore` through Flux CD, your team can manage parameter access policies declaratively, sync entire configuration hierarchies into Kubernetes Secrets, and audit all configuration changes through both Git history and AWS CloudTrail.
