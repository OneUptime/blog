# How to Configure External Secrets with AWS Secrets Manager in Flux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, GitOps, Kubernetes, External Secrets, AWS Secrets Manager, Secrets Management

Description: Learn how to configure the External Secrets Operator with AWS Secrets Manager in a Flux CD GitOps workflow to sync secrets from AWS into Kubernetes.

---

AWS Secrets Manager is a popular choice for centralized secret storage in AWS-based infrastructure. When combined with the External Secrets Operator (ESO) and Flux CD, you can declaratively sync secrets from AWS into Kubernetes without storing sensitive values in Git. This guide covers the full setup from IAM configuration to ExternalSecret resource creation.

## Architecture Overview

The flow works as follows:

1. Secrets are stored in AWS Secrets Manager
2. External Secrets Operator runs in your cluster and periodically fetches secrets
3. ESO creates or updates Kubernetes Secrets based on ExternalSecret resources
4. Flux CD manages the ExternalSecret and SecretStore resources via GitOps
5. Applications consume the Kubernetes Secrets as usual

The key benefit is that secret values never appear in Git. Only the references (secret names and keys) are stored in your repository.

## Prerequisites

- A Kubernetes cluster (EKS recommended for native IAM integration)
- Flux CD bootstrapped on the cluster
- AWS CLI configured with appropriate permissions
- Secrets stored in AWS Secrets Manager

## Step 1: Install External Secrets Operator with Flux

Create the HelmRepository and HelmRelease:

```yaml
# infrastructure/external-secrets/helmrepository.yaml
apiVersion: source.toolkit.fluxcd.io/v1
kind: HelmRepository
metadata:
  name: external-secrets
  namespace: flux-system
spec:
  interval: 1h
  url: https://charts.external-secrets.io
```

```yaml
# infrastructure/external-secrets/helmrelease.yaml
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata:
  name: external-secrets
  namespace: external-secrets
spec:
  interval: 30m
  chart:
    spec:
      chart: external-secrets
      version: "0.10.x"
      sourceRef:
        kind: HelmRepository
        name: external-secrets
        namespace: flux-system
  install:
    createNamespace: true
  values:
    serviceAccount:
      annotations:
        eks.amazonaws.com/role-arn: arn:aws:iam::123456789012:role/external-secrets-role
```

## Step 2: Configure IAM for EKS (IRSA)

Create an IAM policy that allows reading secrets:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "secretsmanager:GetSecretValue",
        "secretsmanager:DescribeSecret",
        "secretsmanager:ListSecretVersionIds"
      ],
      "Resource": "arn:aws:secretsmanager:us-east-1:123456789012:secret:myapp/*"
    }
  ]
}
```

Create the IAM role with a trust policy for IRSA:

```bash
# Create the policy
aws iam create-policy \
  --policy-name ExternalSecretsPolicy \
  --policy-document file://policy.json

# Create the role with OIDC trust
eksctl create iamserviceaccount \
  --name external-secrets \
  --namespace external-secrets \
  --cluster my-cluster \
  --attach-policy-arn arn:aws:iam::123456789012:policy/ExternalSecretsPolicy \
  --approve
```

## Step 3: Create a ClusterSecretStore

The ClusterSecretStore defines the connection to AWS Secrets Manager and can be used across namespaces:

```yaml
# infrastructure/external-secrets/clustersecretstore.yaml
apiVersion: external-secrets.io/v1beta1
kind: ClusterSecretStore
metadata:
  name: aws-secrets-manager
spec:
  provider:
    aws:
      service: SecretsManager
      region: us-east-1
      auth:
        jwt:
          serviceAccountRef:
            name: external-secrets
            namespace: external-secrets
```

For non-EKS clusters or when not using IRSA, you can use static credentials instead:

```yaml
spec:
  provider:
    aws:
      service: SecretsManager
      region: us-east-1
      auth:
        secretRef:
          accessKeyIDSecretRef:
            name: aws-credentials
            namespace: external-secrets
            key: access-key-id
          secretAccessKeySecretRef:
            name: aws-credentials
            namespace: external-secrets
            key: secret-access-key
```

## Step 4: Store Secrets in AWS Secrets Manager

Create secrets in AWS that your application needs:

```bash
# Store a JSON secret
aws secretsmanager create-secret \
  --name myapp/database \
  --secret-string '{"host":"db.example.com","port":"5432","username":"myapp","password":"s3cret","dbname":"production"}'

# Store a simple string secret
aws secretsmanager create-secret \
  --name myapp/api-key \
  --secret-string "ak_live_xxxxxxxxxxxx"
```

## Step 5: Create ExternalSecret Resources

Now create ExternalSecret resources that tell ESO which secrets to fetch and how to map them to Kubernetes Secrets.

For a JSON secret with multiple keys:

```yaml
# apps/my-app/external-secret-db.yaml
apiVersion: external-secrets.io/v1beta1
kind: ExternalSecret
metadata:
  name: database-credentials
  namespace: my-app
spec:
  refreshInterval: 1h
  secretStoreRef:
    name: aws-secrets-manager
    kind: ClusterSecretStore
  target:
    name: database-credentials
    creationPolicy: Owner
  data:
    - secretKey: DB_HOST
      remoteRef:
        key: myapp/database
        property: host
    - secretKey: DB_PORT
      remoteRef:
        key: myapp/database
        property: port
    - secretKey: DB_USER
      remoteRef:
        key: myapp/database
        property: username
    - secretKey: DB_PASSWORD
      remoteRef:
        key: myapp/database
        property: password
    - secretKey: DB_NAME
      remoteRef:
        key: myapp/database
        property: dbname
```

For a simple string secret:

```yaml
# apps/my-app/external-secret-api.yaml
apiVersion: external-secrets.io/v1beta1
kind: ExternalSecret
metadata:
  name: api-key
  namespace: my-app
spec:
  refreshInterval: 1h
  secretStoreRef:
    name: aws-secrets-manager
    kind: ClusterSecretStore
  target:
    name: api-key
    creationPolicy: Owner
  data:
    - secretKey: API_KEY
      remoteRef:
        key: myapp/api-key
```

## Step 6: Verify the Setup

After Flux reconciles the ExternalSecret resources, verify they are syncing:

```bash
kubectl get externalsecrets -n my-app
kubectl get secrets -n my-app
kubectl describe externalsecret database-credentials -n my-app
```

The ExternalSecret status should show `SecretSynced` with the last sync time. The corresponding Kubernetes Secret should exist with the expected keys:

```bash
kubectl get secret database-credentials -n my-app -o jsonpath='{.data}' | jq
```

## Troubleshooting

If secrets are not syncing, check the ESO controller logs:

```bash
kubectl logs -n external-secrets deploy/external-secrets -f
```

Common issues:
- **AccessDeniedException**: The IAM role lacks the required permissions for the specific secret ARN
- **ResourceNotFoundException**: The secret name in `remoteRef.key` does not match the AWS secret name
- **Invalid property**: The `property` field does not match a key in the JSON secret

Verify the ClusterSecretStore health:

```bash
kubectl get clustersecretstore aws-secrets-manager -o jsonpath='{.status.conditions}'
```

## Summary

Configuring External Secrets with AWS Secrets Manager in Flux CD keeps sensitive values in AWS while managing the secret references through GitOps. The setup involves installing ESO via Flux, configuring IAM permissions (preferably via IRSA on EKS), creating a ClusterSecretStore, and defining ExternalSecret resources that map AWS secrets to Kubernetes Secrets. This approach provides centralized secret management, automatic rotation support, and a clean separation between secret values and configuration.
