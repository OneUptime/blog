# How to Use External Secrets Operator with GCP Secret Manager

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, GCP, Secrets Management

Description: Learn how to sync secrets from Google Cloud Secret Manager into Kubernetes using External Secrets Operator with Workload Identity and automatic version management.

---

Storing secrets in Kubernetes manifests creates security risks and makes rotation difficult. Google Cloud Secret Manager provides centralized secret storage with versioning, IAM integration, and audit logging, but consuming these secrets in Kubernetes requires custom code or complex sidecar patterns.

External Secrets Operator eliminates this complexity by automatically syncing GCP Secret Manager secrets into Kubernetes Secrets. Your applications use standard Kubernetes APIs while benefiting from GCP's enterprise secret management features.

In this guide, you'll learn how to configure External Secrets Operator with GCP Secret Manager, implement Workload Identity authentication, and handle secret versions and rotation.

## Prerequisites

You need a GCP project and a GKE cluster with Workload Identity enabled. You also need:

- gcloud CLI installed and configured
- kubectl access to your GKE cluster
- Permissions to create GCP resources (secrets, service accounts, IAM bindings)

## Creating GCP Secret Manager Secrets

Enable Secret Manager API:

```bash
# Set project
PROJECT_ID="my-gcp-project"
gcloud config set project $PROJECT_ID

# Enable Secret Manager API
gcloud services enable secretmanager.googleapis.com
```

Create secrets:

```bash
# Create database password
echo -n "SuperSecurePassword123" | \
  gcloud secrets create database-password \
  --data-file=- \
  --replication-policy="automatic"

# Create API key
echo -n "sk_live_abc123xyz789" | \
  gcloud secrets create stripe-api-key \
  --data-file=- \
  --replication-policy="automatic"

# Create connection string
echo -n "postgresql://user:pass@host:5432/db" | \
  gcloud secrets create database-connection-string \
  --data-file=- \
  --replication-policy="automatic"

# Create JSON secret
cat > api-credentials.json <<EOF
{
  "stripe_key": "sk_live_abc123",
  "sendgrid_key": "SG.xyz789",
  "datadog_key": "dd_api_key_456"
}
EOF

gcloud secrets create api-credentials \
  --data-file=api-credentials.json \
  --replication-policy="automatic"
```

List secrets:

```bash
gcloud secrets list
```

## Installing External Secrets Operator

Install ESO using Helm:

```bash
helm repo add external-secrets https://charts.external-secrets.io
helm repo update

helm install external-secrets \
  external-secrets/external-secrets \
  --namespace external-secrets-system \
  --create-namespace \
  --set installCRDs=true
```

Verify installation:

```bash
kubectl get pods -n external-secrets-system
kubectl get crd | grep external-secrets
```

## Setting Up Workload Identity

Workload Identity allows Kubernetes service accounts to authenticate as GCP service accounts without storing keys.

Create a GCP service account:

```bash
# Create service account
GSA_NAME="external-secrets-sa"
GSA_EMAIL="${GSA_NAME}@${PROJECT_ID}.iam.gserviceaccount.com"

gcloud iam service-accounts create $GSA_NAME \
  --display-name="External Secrets Operator Service Account"
```

Grant permissions to access secrets:

```bash
# Grant Secret Manager Secret Accessor role
gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:${GSA_EMAIL}" \
  --role="roles/secretmanager.secretAccessor"
```

Bind Kubernetes service account to GCP service account:

```bash
# Get GKE cluster details
CLUSTER_NAME="my-gke-cluster"
CLUSTER_REGION="us-central1"
K8S_NAMESPACE="external-secrets-system"
KSA_NAME="external-secrets"

# Allow Kubernetes service account to impersonate GCP service account
gcloud iam service-accounts add-iam-policy-binding $GSA_EMAIL \
  --role roles/iam.workloadIdentityUser \
  --member "serviceAccount:${PROJECT_ID}.svc.id.goog[${K8S_NAMESPACE}/${KSA_NAME}]"
```

Annotate the Kubernetes service account:

```bash
kubectl annotate serviceaccount $KSA_NAME \
  --namespace $K8S_NAMESPACE \
  iam.gke.io/gcp-service-account=$GSA_EMAIL
```

## Creating SecretStore with Workload Identity

Create a SecretStore that uses Workload Identity:

```yaml
apiVersion: external-secrets.io/v1beta1
kind: SecretStore
metadata:
  name: gcpsm-secret-store
  namespace: production
spec:
  provider:
    gcpsm:
      projectID: "my-gcp-project"
      auth:
        workloadIdentity:
          clusterLocation: us-central1
          clusterName: my-gke-cluster
          serviceAccountRef:
            name: external-secrets
            namespace: external-secrets-system
```

For a ClusterSecretStore:

```yaml
apiVersion: external-secrets.io/v1beta1
kind: ClusterSecretStore
metadata:
  name: gcpsm-secret-store
spec:
  provider:
    gcpsm:
      projectID: "my-gcp-project"
      auth:
        workloadIdentity:
          clusterLocation: us-central1
          clusterName: my-gke-cluster
          serviceAccountRef:
            name: external-secrets
            namespace: external-secrets-system
```

## Creating ExternalSecret Resources

### Syncing Simple Secrets

Sync a single secret:

```yaml
apiVersion: external-secrets.io/v1beta1
kind: ExternalSecret
metadata:
  name: database-password
  namespace: production
spec:
  refreshInterval: 1h
  secretStoreRef:
    name: gcpsm-secret-store
    kind: SecretStore
  target:
    name: database-password
    creationPolicy: Owner
  data:
  - secretKey: password
    remoteRef:
      key: database-password
```

### Syncing Multiple Secrets

Combine multiple GCP secrets into one Kubernetes Secret:

```yaml
apiVersion: external-secrets.io/v1beta1
kind: ExternalSecret
metadata:
  name: app-secrets
  namespace: production
spec:
  refreshInterval: 30m
  secretStoreRef:
    name: gcpsm-secret-store
    kind: SecretStore
  target:
    name: app-secrets
    creationPolicy: Owner
  data:
  - secretKey: db_password
    remoteRef:
      key: database-password
  - secretKey: stripe_key
    remoteRef:
      key: stripe-api-key
  - secretKey: connection_string
    remoteRef:
      key: database-connection-string
```

### Extracting JSON Properties

Parse JSON secrets and extract specific fields:

```yaml
apiVersion: external-secrets.io/v1beta1
kind: ExternalSecret
metadata:
  name: api-credentials
  namespace: production
spec:
  refreshInterval: 15m
  secretStoreRef:
    name: gcpsm-secret-store
    kind: SecretStore
  target:
    name: api-credentials
    creationPolicy: Owner
  data:
  - secretKey: stripe_key
    remoteRef:
      key: api-credentials
      property: stripe_key
  - secretKey: sendgrid_key
    remoteRef:
      key: api-credentials
      property: sendgrid_key
  - secretKey: datadog_key
    remoteRef:
      key: api-credentials
      property: datadog_key
```

### Using dataFrom for Complete Secrets

Import entire JSON secrets:

```yaml
apiVersion: external-secrets.io/v1beta1
kind: ExternalSecret
metadata:
  name: api-credentials-full
  namespace: production
spec:
  refreshInterval: 15m
  secretStoreRef:
    name: gcpsm-secret-store
    kind: SecretStore
  target:
    name: api-credentials-full
    creationPolicy: Owner
  dataFrom:
  - extract:
      key: api-credentials
```

### Working with Secret Versions

GCP Secret Manager supports versioning. Access specific versions:

```yaml
apiVersion: external-secrets.io/v1beta1
kind: ExternalSecret
metadata:
  name: versioned-secret
  namespace: production
spec:
  refreshInterval: 1h
  secretStoreRef:
    name: gcpsm-secret-store
    kind: SecretStore
  target:
    name: versioned-secret
    creationPolicy: Owner
  data:
  # Use latest version (default)
  - secretKey: current_password
    remoteRef:
      key: database-password
  # Use specific version number
  - secretKey: previous_password
    remoteRef:
      key: database-password
      version: "1"
  # Use version alias
  - secretKey: stable_password
    remoteRef:
      key: database-password
      version: "stable"
```

Create version aliases in GCP:

```bash
# Add version alias
gcloud secrets versions enable 2 --secret=database-password
gcloud secrets add-version-alias stable \
  --secret=database-password \
  --version=2
```

### Using Templates

Transform secrets with templates:

```yaml
apiVersion: external-secrets.io/v1beta1
kind: ExternalSecret
metadata:
  name: database-config
  namespace: production
spec:
  refreshInterval: 1h
  secretStoreRef:
    name: gcpsm-secret-store
    kind: SecretStore
  target:
    name: database-config
    creationPolicy: Owner
    template:
      engineVersion: v2
      data:
        # Parse connection string into structured config
        config.yaml: |
          database:
            connection_string: "{{ .connection_string }}"
            password: "{{ .password }}"
            max_connections: 100
        # Create .env file format
        .env: |
          DATABASE_URL={{ .connection_string }}
          DATABASE_PASSWORD={{ .password }}
  data:
  - secretKey: connection_string
    remoteRef:
      key: database-connection-string
  - secretKey: password
    remoteRef:
      key: database-password
```

## Using Secrets in Deployments

Reference synced secrets in your deployments:

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
      serviceAccountName: web-app
      containers:
      - name: app
        image: gcr.io/my-project/web-app:latest
        env:
        # Individual secrets
        - name: DB_PASSWORD
          valueFrom:
            secretKeyRef:
              name: database-password
              key: password
        - name: STRIPE_KEY
          valueFrom:
            secretKeyRef:
              name: api-credentials
              key: stripe_key
        # All secrets from one source
        envFrom:
        - secretRef:
            name: api-credentials
```

## Implementing Secret Rotation

GCP Secret Manager supports automatic rotation. Create a new version:

```bash
# Add new version
echo -n "NewSecurePassword456" | \
  gcloud secrets versions add database-password \
  --data-file=-

# Disable old version
gcloud secrets versions disable 1 --secret=database-password
```

External Secrets Operator syncs new versions based on `refreshInterval`. Use Reloader to restart pods automatically:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: web-app
  namespace: production
  annotations:
    secret.reloader.stakater.com/reload: "database-password,api-credentials"
spec:
  # ... deployment spec
```

## Using Service Account Keys (Alternative)

For non-GKE environments, use service account keys:

```bash
# Create key
gcloud iam service-accounts keys create key.json \
  --iam-account=$GSA_EMAIL

# Create Kubernetes secret
kubectl create secret generic gcpsm-secret \
  --namespace external-secrets-system \
  --from-file=secret-access-credentials=key.json
```

SecretStore with service account key:

```yaml
apiVersion: external-secrets.io/v1beta1
kind: SecretStore
metadata:
  name: gcpsm-secret-store
  namespace: production
spec:
  provider:
    gcpsm:
      projectID: "my-gcp-project"
      auth:
        secretRef:
          secretAccessKeySecretRef:
            name: gcpsm-secret
            key: secret-access-credentials
            namespace: external-secrets-system
```

## Monitoring and Troubleshooting

Check ExternalSecret status:

```bash
# List all ExternalSecrets
kubectl get externalsecrets -n production

# Describe specific ExternalSecret
kubectl describe externalsecret database-password -n production

# Check operator logs
kubectl logs -n external-secrets-system -l app.kubernetes.io/name=external-secrets --tail=100
```

Verify secret access in GCP:

```bash
# Test service account access
gcloud secrets versions access latest \
  --secret=database-password \
  --impersonate-service-account=$GSA_EMAIL
```

View audit logs:

```bash
# View Secret Manager audit logs
gcloud logging read "resource.type=secretmanager.googleapis.com/Secret" \
  --limit 50 \
  --format json
```

## Handling Multiple Projects

For secrets across multiple GCP projects, create separate SecretStores:

```yaml
apiVersion: external-secrets.io/v1beta1
kind: SecretStore
metadata:
  name: gcpsm-project-a
  namespace: production
spec:
  provider:
    gcpsm:
      projectID: "project-a"
      auth:
        workloadIdentity:
          clusterLocation: us-central1
          clusterName: my-gke-cluster
          serviceAccountRef:
            name: external-secrets
            namespace: external-secrets-system
---
apiVersion: external-secrets.io/v1beta1
kind: SecretStore
metadata:
  name: gcpsm-project-b
  namespace: production
spec:
  provider:
    gcpsm:
      projectID: "project-b"
      auth:
        workloadIdentity:
          clusterLocation: us-central1
          clusterName: my-gke-cluster
          serviceAccountRef:
            name: external-secrets
            namespace: external-secrets-system
```

## Best Practices

1. **Use Workload Identity**: Always prefer Workload Identity over service account keys for better security.

2. **Enable automatic replication**: For high availability:
   ```bash
   gcloud secrets create my-secret \
     --replication-policy="automatic"
   ```

3. **Set appropriate refresh intervals**: Balance between freshness and API quota consumption.

4. **Use version aliases**: Create aliases like "stable" and "canary" for controlled rollouts.

5. **Enable audit logging**: Monitor secret access:
   ```bash
   gcloud logging read "protoPayload.serviceName=secretmanager.googleapis.com" \
     --limit 10
   ```

6. **Tag secrets**: Organize with labels:
   ```bash
   gcloud secrets update database-password \
     --update-labels=env=production,team=platform
   ```

7. **Set IAM conditions**: Restrict access by time or IP:
   ```bash
   gcloud secrets add-iam-policy-binding database-password \
     --member="serviceAccount:${GSA_EMAIL}" \
     --role="roles/secretmanager.secretAccessor" \
     --condition='expression=request.time < timestamp("2026-12-31T00:00:00Z"),title=temporary-access'
   ```

8. **Use secret rotation**: Implement automatic rotation for sensitive credentials.

External Secrets Operator with GCP Secret Manager provides seamless integration between Google Cloud's secret management and Kubernetes. Your applications consume standard Kubernetes Secrets while benefiting from GCP's enterprise features like Workload Identity, automatic replication, and comprehensive audit logging.
