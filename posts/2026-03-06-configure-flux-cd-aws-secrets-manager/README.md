# How to Configure Flux CD with AWS Secrets Manager

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: flux cd, aws, secrets manager, external secrets, kubernetes, gitops, security

Description: Learn how to integrate Flux CD with AWS Secrets Manager using the External Secrets Operator to securely sync secrets from AWS into Kubernetes.

---

AWS Secrets Manager provides centralized secret management with automatic rotation, auditing, and fine-grained access control. By integrating it with Flux CD through the External Secrets Operator (ESO), you can keep secrets out of Git entirely while still managing everything through GitOps. This guide walks through the complete setup.

## Architecture Overview

The integration works through these components:

1. **AWS Secrets Manager** - Stores the actual secret values.
2. **External Secrets Operator (ESO)** - A Kubernetes operator that syncs secrets from external providers.
3. **SecretStore** - Configures how ESO connects to AWS Secrets Manager.
4. **ExternalSecret** - Declares which secrets to sync and how to map them to Kubernetes Secrets.
5. **Flux CD** - Manages the ESO installation and ExternalSecret resources through GitOps.

## Step 1: Store Secrets in AWS Secrets Manager

```bash
# Create a simple key/value secret
aws secretsmanager create-secret \
  --name production/my-app/database \
  --description "Database credentials for my-app" \
  --secret-string '{"host":"mydb.cluster-abc123.us-east-1.rds.amazonaws.com","username":"admin","password":"super-secret-password-123","dbname":"myapp_production"}' \
  --region us-east-1

# Create another secret for API keys
aws secretsmanager create-secret \
  --name production/my-app/api-keys \
  --description "API keys for my-app" \
  --secret-string '{"stripe_key":"sk_live_abc123","sendgrid_key":"SG.def456"}' \
  --region us-east-1

# Verify the secrets were created
aws secretsmanager list-secrets \
  --filters Key=name,Values=production/my-app \
  --region us-east-1
```

## Step 2: Create IAM Policy for Secrets Manager Access

```bash
# Create a policy with read-only access to specific secrets
cat > /tmp/flux-secrets-manager-policy.json << 'EOF'
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "FluxSecretsManagerRead",
      "Effect": "Allow",
      "Action": [
        "secretsmanager:GetSecretValue",
        "secretsmanager:DescribeSecret",
        "secretsmanager:ListSecretVersionIds"
      ],
      "Resource": [
        "arn:aws:secretsmanager:us-east-1:123456789012:secret:production/my-app/*"
      ]
    }
  ]
}
EOF

aws iam create-policy \
  --policy-name FluxSecretsManagerRead \
  --policy-document file:///tmp/flux-secrets-manager-policy.json
```

## Step 3: Configure IRSA for External Secrets Operator

```bash
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
OIDC_ID=$(aws eks describe-cluster \
  --name my-cluster \
  --query "cluster.identity.oidc.issuer" \
  --output text | cut -d'/' -f5)

# Create trust policy for the ESO service account
cat > /tmp/eso-trust-policy.json << EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Federated": "arn:aws:iam::${ACCOUNT_ID}:oidc-provider/oidc.eks.us-east-1.amazonaws.com/id/${OIDC_ID}"
      },
      "Action": "sts:AssumeRoleWithWebIdentity",
      "Condition": {
        "StringEquals": {
          "oidc.eks.us-east-1.amazonaws.com/id/${OIDC_ID}:sub": "system:serviceaccount:external-secrets:external-secrets",
          "oidc.eks.us-east-1.amazonaws.com/id/${OIDC_ID}:aud": "sts.amazonaws.com"
        }
      }
    }
  ]
}
EOF

aws iam create-role \
  --role-name external-secrets-operator \
  --assume-role-policy-document file:///tmp/eso-trust-policy.json

aws iam attach-role-policy \
  --role-name external-secrets-operator \
  --policy-arn arn:aws:iam::${ACCOUNT_ID}:policy/FluxSecretsManagerRead
```

## Step 4: Install External Secrets Operator via Flux

### Create the HelmRepository

```yaml
# infrastructure/sources/external-secrets-repo.yaml
apiVersion: source.toolkit.fluxcd.io/v1
kind: HelmRepository
metadata:
  name: external-secrets
  namespace: flux-system
spec:
  interval: 1h
  url: https://charts.external-secrets.io
```

### Create the HelmRelease

```yaml
# infrastructure/controllers/external-secrets.yaml
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
      version: "0.12.x"  # Use the latest stable version
      sourceRef:
        kind: HelmRepository
        name: external-secrets
        namespace: flux-system
  install:
    createNamespace: true
    remediation:
      retries: 3
  upgrade:
    remediation:
      retries: 3
  values:
    # Configure the service account with IRSA
    serviceAccount:
      annotations:
        eks.amazonaws.com/role-arn: "arn:aws:iam::123456789012:role/external-secrets-operator"
    # Set the AWS region
    env:
      - name: AWS_REGION
        value: "us-east-1"
```

### Create the Kustomization to Deploy ESO

```yaml
# infrastructure/controllers/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - external-secrets.yaml
```

```yaml
# clusters/production/infrastructure.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: infrastructure-controllers
  namespace: flux-system
spec:
  interval: 10m
  sourceRef:
    kind: GitRepository
    name: fleet-infra
  path: ./infrastructure/controllers
  prune: true
  dependsOn:
    - name: infrastructure-sources
```

## Step 5: Create a SecretStore

The SecretStore tells ESO how to connect to AWS Secrets Manager:

```yaml
# clusters/production/apps/my-app/secret-store.yaml
apiVersion: external-secrets.io/v1beta1
kind: SecretStore
metadata:
  name: aws-secrets-manager
  namespace: default
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

For cluster-wide access, use a ClusterSecretStore:

```yaml
# infrastructure/configs/cluster-secret-store.yaml
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

## Step 6: Create ExternalSecret Resources

### Sync an Entire Secret as JSON

```yaml
# clusters/production/apps/my-app/external-secret-db.yaml
apiVersion: external-secrets.io/v1beta1
kind: ExternalSecret
metadata:
  name: db-credentials
  namespace: default
spec:
  refreshInterval: 1h  # How often to sync from AWS
  secretStoreRef:
    name: aws-secrets-manager
    kind: SecretStore
  target:
    name: db-credentials  # Name of the Kubernetes Secret to create
    creationPolicy: Owner  # ESO owns and manages the Secret
  data:
    # Map individual keys from the JSON secret
    - secretKey: DB_HOST      # Key in the Kubernetes Secret
      remoteRef:
        key: production/my-app/database   # AWS Secrets Manager secret name
        property: host                     # JSON key within the secret
    - secretKey: DB_USER
      remoteRef:
        key: production/my-app/database
        property: username
    - secretKey: DB_PASSWORD
      remoteRef:
        key: production/my-app/database
        property: password
    - secretKey: DB_NAME
      remoteRef:
        key: production/my-app/database
        property: dbname
```

### Sync All Keys from a Secret

```yaml
# clusters/production/apps/my-app/external-secret-api.yaml
apiVersion: external-secrets.io/v1beta1
kind: ExternalSecret
metadata:
  name: api-keys
  namespace: default
spec:
  refreshInterval: 1h
  secretStoreRef:
    name: aws-secrets-manager
    kind: SecretStore
  target:
    name: api-keys
    creationPolicy: Owner
  dataFrom:
    # Sync all key/value pairs from the AWS secret
    - extract:
        key: production/my-app/api-keys
```

### Sync a Plain Text Secret

```yaml
# clusters/production/apps/my-app/external-secret-tls.yaml
apiVersion: external-secrets.io/v1beta1
kind: ExternalSecret
metadata:
  name: tls-cert
  namespace: default
spec:
  refreshInterval: 24h
  secretStoreRef:
    name: aws-secrets-manager
    kind: SecretStore
  target:
    name: tls-cert
    creationPolicy: Owner
    template:
      type: kubernetes.io/tls
  data:
    - secretKey: tls.crt
      remoteRef:
        key: production/my-app/tls-certificate
        property: certificate
    - secretKey: tls.key
      remoteRef:
        key: production/my-app/tls-certificate
        property: private_key
```

## Step 7: Reference Secrets in Your Deployments

```yaml
# clusters/production/apps/my-app/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-app
  namespace: default
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
      containers:
        - name: my-app
          image: 123456789012.dkr.ecr.us-east-1.amazonaws.com/my-app:v1.0.0
          ports:
            - containerPort: 8080
          env:
            # Reference individual keys from the synced secret
            - name: DB_HOST
              valueFrom:
                secretKeyRef:
                  name: db-credentials
                  key: DB_HOST
            - name: DB_USER
              valueFrom:
                secretKeyRef:
                  name: db-credentials
                  key: DB_USER
            - name: DB_PASSWORD
              valueFrom:
                secretKeyRef:
                  name: db-credentials
                  key: DB_PASSWORD
          envFrom:
            # Or load all keys from a secret as env vars
            - secretRef:
                name: api-keys
```

## Step 8: Verify the Integration

```bash
# Check that the ExternalSecret is synced
kubectl get externalsecrets -n default

# Expected output:
# NAME              STORE                  REFRESH INTERVAL   STATUS
# db-credentials    aws-secrets-manager    1h                 SecretSynced
# api-keys          aws-secrets-manager    1h                 SecretSynced

# Describe for detailed status
kubectl describe externalsecret db-credentials -n default

# Verify the Kubernetes Secret was created
kubectl get secrets -n default | grep -E "db-credentials|api-keys"

# Check the secret data (base64 encoded)
kubectl get secret db-credentials -n default -o jsonpath='{.data.DB_HOST}' | base64 -d

# Check the SecretStore status
kubectl describe secretstore aws-secrets-manager -n default
```

## Handling Secret Rotation

AWS Secrets Manager supports automatic rotation. ESO picks up rotated values based on the `refreshInterval`:

```yaml
# For frequently rotated secrets, use a shorter refresh interval
apiVersion: external-secrets.io/v1beta1
kind: ExternalSecret
metadata:
  name: rotating-credentials
  namespace: default
spec:
  refreshInterval: 5m  # Check every 5 minutes for rotated values
  secretStoreRef:
    name: aws-secrets-manager
    kind: SecretStore
  target:
    name: rotating-credentials
    creationPolicy: Owner
  data:
    - secretKey: password
      remoteRef:
        key: production/my-app/rotating-password
```

## Troubleshooting

```bash
# Check ESO operator logs
kubectl logs -n external-secrets deployment/external-secrets --tail=50

# Check ExternalSecret status for errors
kubectl describe externalsecret db-credentials -n default

# Common status conditions to look for:
# SecretSynced - Secret was successfully synced
# SecretSyncedError - Sync failed (check the message)

# Check SecretStore connectivity
kubectl describe secretstore aws-secrets-manager -n default

# Verify IRSA is working
kubectl exec -n external-secrets deployment/external-secrets -- env | grep AWS

# Test Secrets Manager access from the ESO pod
kubectl exec -n external-secrets deployment/external-secrets -- \
  aws secretsmanager get-secret-value \
  --secret-id production/my-app/database \
  --region us-east-1 2>&1 | head -5
```

### Common error: "AccessDeniedException"

```bash
# Check the IAM role policy
aws iam list-attached-role-policies --role-name external-secrets-operator

# Verify the trust policy allows the correct service account
aws iam get-role --role-name external-secrets-operator \
  --query 'Role.AssumeRolePolicyDocument' --output json | jq .

# Restart ESO after fixing permissions
kubectl rollout restart deployment/external-secrets -n external-secrets
```

### Common error: "SecretStore not ready"

```bash
# The SecretStore may fail validation if IRSA is not configured
kubectl get secretstore -n default -o json | jq '.items[].status'

# Ensure the referenced service account exists and has the annotation
kubectl get sa external-secrets -n external-secrets -o yaml | grep -A2 annotations
```

## Summary

Integrating Flux CD with AWS Secrets Manager through the External Secrets Operator provides a secure, GitOps-friendly approach to secret management. Secrets stay in AWS Secrets Manager with IAM-based access control and optional automatic rotation. ExternalSecret resources in Git declare what secrets are needed without containing any sensitive values. The ESO operator syncs the actual values into Kubernetes Secrets at runtime. Use IRSA for credential-free authentication and set appropriate `refreshInterval` values based on how frequently your secrets rotate.
