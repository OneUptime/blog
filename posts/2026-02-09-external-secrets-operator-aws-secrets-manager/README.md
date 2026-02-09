# How to Use External Secrets Operator to Sync AWS Secrets Manager with Kubernetes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, AWS, Secrets Management

Description: Learn how to sync secrets from AWS Secrets Manager into Kubernetes using External Secrets Operator, enabling centralized secret management and automatic rotation.

---

Storing secrets directly in Kubernetes as base64-encoded values is risky and difficult to manage. You need a separate process for rotation, auditing is limited, and secrets often end up in Git repositories accidentally. This creates security vulnerabilities and compliance issues.

External Secrets Operator (ESO) solves this by syncing secrets from external secret management systems like AWS Secrets Manager into Kubernetes. Your secrets stay in AWS, managed centrally with proper rotation and audit logging, while Kubernetes pods consume them seamlessly.

In this guide, you'll learn how to install External Secrets Operator, configure it to work with AWS Secrets Manager, and implement automatic secret synchronization with rotation support.

## Understanding External Secrets Operator

External Secrets Operator uses Custom Resource Definitions (CRDs) to define how to fetch secrets from external systems. The main components are:

- **SecretStore**: Defines connection to AWS Secrets Manager for a single namespace
- **ClusterSecretStore**: Defines connection accessible from all namespaces
- **ExternalSecret**: Specifies which secrets to sync from AWS to Kubernetes

The operator continuously watches ExternalSecret resources, fetches data from AWS, and creates or updates corresponding Kubernetes Secrets.

## Installing External Secrets Operator

Install ESO using Helm:

```bash
# Add External Secrets Helm repository
helm repo add external-secrets https://charts.external-secrets.io
helm repo update

# Install External Secrets Operator
helm install external-secrets \
  external-secrets/external-secrets \
  --namespace external-secrets-system \
  --create-namespace \
  --set installCRDs=true
```

Verify the installation:

```bash
# Check pods are running
kubectl get pods -n external-secrets-system

# Verify CRDs are installed
kubectl get crd | grep external-secrets
```

You should see:
```
clustersecretstores.external-secrets.io
externalsecrets.external-secrets.io
secretstores.external-secrets.io
```

## Setting Up AWS IAM Permissions

Create an IAM policy that allows reading secrets from AWS Secrets Manager:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "secretsmanager:GetSecretValue",
        "secretsmanager:DescribeSecret",
        "secretsmanager:ListSecrets"
      ],
      "Resource": [
        "arn:aws:secretsmanager:us-east-1:123456789012:secret:prod/*"
      ]
    }
  ]
}
```

### Using IRSA (IAM Roles for Service Accounts)

The recommended approach for EKS clusters is IRSA:

```bash
# Create IAM policy
aws iam create-policy \
  --policy-name ESO-SecretsManager-Policy \
  --policy-document file://policy.json

# Create IAM role with OIDC provider
eksctl create iamserviceaccount \
  --name external-secrets \
  --namespace external-secrets-system \
  --cluster my-cluster \
  --attach-policy-arn arn:aws:iam::123456789012:policy/ESO-SecretsManager-Policy \
  --approve \
  --override-existing-serviceaccounts
```

Update the External Secrets deployment to use this service account:

```bash
helm upgrade external-secrets \
  external-secrets/external-secrets \
  --namespace external-secrets-system \
  --set serviceAccount.name=external-secrets \
  --set serviceAccount.create=false
```

### Using Access Keys (Alternative)

For non-EKS clusters, use access keys (less secure):

```bash
# Create Kubernetes Secret with AWS credentials
kubectl create secret generic aws-credentials \
  --namespace external-secrets-system \
  --from-literal=access-key-id=AKIAIOSFODNN7EXAMPLE \
  --from-literal=secret-access-key=wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY
```

## Creating Secrets in AWS Secrets Manager

Create secrets in AWS Secrets Manager that you want to sync:

```bash
# Create a database password secret
aws secretsmanager create-secret \
  --name prod/database/credentials \
  --description "Production database credentials" \
  --secret-string '{
    "username": "dbadmin",
    "password": "SuperSecurePassword123!",
    "host": "postgres.example.com",
    "port": "5432",
    "database": "production"
  }' \
  --region us-east-1

# Create an API key secret
aws secretsmanager create-secret \
  --name prod/api/keys \
  --description "External API keys" \
  --secret-string '{
    "stripe_key": "sk_live_...",
    "sendgrid_key": "SG.abc123...",
    "datadog_key": "abc123..."
  }' \
  --region us-east-1

# Create a simple string secret
aws secretsmanager create-secret \
  --name prod/app/license \
  --description "Application license key" \
  --secret-string "LICENSE-KEY-ABC-123-XYZ" \
  --region us-east-1
```

## Configuring SecretStore

Create a SecretStore that connects to AWS Secrets Manager:

```yaml
apiVersion: external-secrets.io/v1beta1
kind: SecretStore
metadata:
  name: aws-secretsmanager
  namespace: production
spec:
  provider:
    aws:
      service: SecretsManager
      region: us-east-1
      # Using IRSA (recommended for EKS)
      auth:
        jwt:
          serviceAccountRef:
            name: external-secrets
```

For access key authentication:

```yaml
apiVersion: external-secrets.io/v1beta1
kind: SecretStore
metadata:
  name: aws-secretsmanager
  namespace: production
spec:
  provider:
    aws:
      service: SecretsManager
      region: us-east-1
      # Using access keys (less secure)
      auth:
        secretRef:
          accessKeyIDSecretRef:
            name: aws-credentials
            key: access-key-id
            namespace: external-secrets-system
          secretAccessKeySecretRef:
            name: aws-credentials
            key: secret-access-key
            namespace: external-secrets-system
```

## Creating ClusterSecretStore

For secrets accessible from any namespace, use ClusterSecretStore:

```yaml
apiVersion: external-secrets.io/v1beta1
kind: ClusterSecretStore
metadata:
  name: aws-secretsmanager-global
spec:
  provider:
    aws:
      service: SecretsManager
      region: us-east-1
      auth:
        jwt:
          serviceAccountRef:
            name: external-secrets
            namespace: external-secrets-system
```

## Creating ExternalSecret Resources

### Syncing All Fields from a JSON Secret

Sync the entire database credentials secret:

```yaml
apiVersion: external-secrets.io/v1beta1
kind: ExternalSecret
metadata:
  name: database-credentials
  namespace: production
spec:
  refreshInterval: 1h  # Check for updates every hour
  secretStoreRef:
    name: aws-secretsmanager
    kind: SecretStore
  target:
    name: database-credentials  # Name of Kubernetes Secret to create
    creationPolicy: Owner
  data:
  - secretKey: username
    remoteRef:
      key: prod/database/credentials
      property: username
  - secretKey: password
    remoteRef:
      key: prod/database/credentials
      property: password
  - secretKey: host
    remoteRef:
      key: prod/database/credentials
      property: host
  - secretKey: port
    remoteRef:
      key: prod/database/credentials
      property: port
  - secretKey: database
    remoteRef:
      key: prod/database/credentials
      property: database
```

This creates a Kubernetes Secret:

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: database-credentials
  namespace: production
type: Opaque
data:
  username: ZGJhZG1pbg==  # base64 encoded
  password: U3VwZXJTZWN1cmVQYXNzd29yZDEyMyE=
  host: cG9zdGdyZXMuZXhhbXBsZS5jb20=
  port: NTQzMg==
  database: cHJvZHVjdGlvbg==
```

### Using dataFrom for Entire Secrets

Sync all properties at once using `dataFrom`:

```yaml
apiVersion: external-secrets.io/v1beta1
kind: ExternalSecret
metadata:
  name: api-keys
  namespace: production
spec:
  refreshInterval: 15m
  secretStoreRef:
    name: aws-secretsmanager
    kind: SecretStore
  target:
    name: api-keys
    creationPolicy: Owner
  dataFrom:
  - extract:
      key: prod/api/keys  # Extracts all JSON fields
```

This automatically creates keys for `stripe_key`, `sendgrid_key`, and `datadog_key`.

### Syncing Simple String Secrets

For non-JSON secrets:

```yaml
apiVersion: external-secrets.io/v1beta1
kind: ExternalSecret
metadata:
  name: app-license
  namespace: production
spec:
  refreshInterval: 24h
  secretStoreRef:
    name: aws-secretsmanager
    kind: SecretStore
  target:
    name: app-license
    creationPolicy: Owner
  data:
  - secretKey: license
    remoteRef:
      key: prod/app/license
```

### Templating Secrets

Transform secret data using templates:

```yaml
apiVersion: external-secrets.io/v1beta1
kind: ExternalSecret
metadata:
  name: database-url
  namespace: production
spec:
  refreshInterval: 1h
  secretStoreRef:
    name: aws-secretsmanager
    kind: SecretStore
  target:
    name: database-url
    creationPolicy: Owner
    template:
      engineVersion: v2
      data:
        # Create a connection string from individual fields
        DATABASE_URL: |
          postgresql://{{ .username }}:{{ .password }}@{{ .host }}:{{ .port }}/{{ .database }}
  data:
  - secretKey: username
    remoteRef:
      key: prod/database/credentials
      property: username
  - secretKey: password
    remoteRef:
      key: prod/database/credentials
      property: password
  - secretKey: host
    remoteRef:
      key: prod/database/credentials
      property: host
  - secretKey: port
    remoteRef:
      key: prod/database/credentials
      property: port
  - secretKey: database
    remoteRef:
      key: prod/database/credentials
      property: database
```

## Using Synced Secrets in Deployments

Reference the synced Kubernetes Secrets normally:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: web-app
  namespace: production
spec:
  replicas: 3
  selector:
    matchLabels:
      app: web-app
  template:
    metadata:
      labels:
        app: web-app
    spec:
      containers:
      - name: app
        image: web-app:latest
        env:
        # Use individual fields
        - name: DB_USERNAME
          valueFrom:
            secretKeyRef:
              name: database-credentials
              key: username
        - name: DB_PASSWORD
          valueFrom:
            secretKeyRef:
              name: database-credentials
              key: password
        # Use templated connection string
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: database-url
              key: DATABASE_URL
        # Use API keys
        envFrom:
        - secretRef:
            name: api-keys
```

## Implementing Automatic Secret Rotation

AWS Secrets Manager supports automatic rotation. External Secrets Operator will detect changes and update Kubernetes Secrets.

Configure rotation in AWS:

```bash
# Enable automatic rotation (30 days)
aws secretsmanager rotate-secret \
  --secret-id prod/database/credentials \
  --rotation-lambda-arn arn:aws:lambda:us-east-1:123456789012:function:SecretsManagerRotation \
  --rotation-rules AutomaticallyAfterDays=30 \
  --region us-east-1
```

External Secrets Operator will sync the new value based on `refreshInterval`. To trigger immediate rotation in your pods, use a tool like Reloader:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: web-app
  namespace: production
  annotations:
    secret.reloader.stakater.com/reload: "database-credentials,api-keys"
spec:
  # ... deployment spec
```

## Monitoring External Secrets

Check the status of ExternalSecrets:

```bash
# List all ExternalSecrets
kubectl get externalsecrets -A

# Check status of specific ExternalSecret
kubectl describe externalsecret database-credentials -n production
```

A healthy ExternalSecret shows:

```
Status:
  Conditions:
    Last Transition Time:  2026-02-09T10:00:00Z
    Status:                True
    Type:                  Ready
  Refresh Time:            2026-02-09T10:30:00Z
  Synced Resource Version: 1-abc123def456
```

## Handling Multiple Regions

For multi-region deployments, create separate SecretStores:

```yaml
apiVersion: external-secrets.io/v1beta1
kind: SecretStore
metadata:
  name: aws-secretsmanager-us-east-1
  namespace: production
spec:
  provider:
    aws:
      service: SecretsManager
      region: us-east-1
      auth:
        jwt:
          serviceAccountRef:
            name: external-secrets
---
apiVersion: external-secrets.io/v1beta1
kind: SecretStore
metadata:
  name: aws-secretsmanager-eu-west-1
  namespace: production
spec:
  provider:
    aws:
      service: SecretsManager
      region: eu-west-1
      auth:
        jwt:
          serviceAccountRef:
            name: external-secrets
```

## Best Practices

1. **Use IRSA**: Always use IAM Roles for Service Accounts on EKS instead of access keys.

2. **Set appropriate refresh intervals**: Balance between freshness and API costs. Most secrets don't need checking every minute.

3. **Use ClusterSecretStore for shared secrets**: Reduce duplication by using ClusterSecretStore for secrets needed across namespaces.

4. **Monitor sync failures**: Set up alerts for ExternalSecret sync failures to catch permission or connectivity issues.

5. **Tag secrets in AWS**: Use AWS tags to organize secrets by environment, team, or application.

6. **Enable AWS CloudTrail**: Audit all access to secrets for compliance and security monitoring.

External Secrets Operator bridges the gap between AWS Secrets Manager and Kubernetes, giving you centralized secret management with automatic synchronization. Your secrets stay in AWS where they can be properly managed, rotated, and audited, while Kubernetes pods consume them as native Secrets.
