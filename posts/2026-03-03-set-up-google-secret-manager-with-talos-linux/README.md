# How to Set Up Google Secret Manager with Talos Linux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Google Secret Manager, Kubernetes, GCP, Secrets Management

Description: Learn how to integrate Google Cloud Secret Manager with Talos Linux clusters for centralized and automated secrets delivery.

---

Google Cloud Secret Manager is a fully managed service for storing API keys, passwords, certificates, and other sensitive data. If your organization uses Google Cloud, integrating Secret Manager with your Talos Linux Kubernetes cluster allows you to keep secrets centralized in GCP while making them available to your containerized workloads. This approach eliminates the need to store sensitive values in Kubernetes manifests or container images.

Talos Linux's immutable design means you cannot drop credential files onto nodes, which makes Kubernetes-native integration patterns essential. In this guide, we will walk through connecting Google Secret Manager to a Talos Linux cluster using the External Secrets Operator, and we will also cover the Secrets Store CSI Driver approach.

## Prerequisites

Make sure you have:

- A running Talos Linux cluster with kubectl access
- A Google Cloud project with Secret Manager API enabled
- gcloud CLI installed and authenticated
- Helm installed locally

## Creating Secrets in Google Secret Manager

Start by enabling the API and creating some test secrets.

```bash
# Enable the Secret Manager API
gcloud services enable secretmanager.googleapis.com

# Create secrets
echo -n "dbadmin" | gcloud secrets create database-username \
  --data-file=- \
  --replication-policy=automatic

echo -n "S3cureP@ssw0rd!" | gcloud secrets create database-password \
  --data-file=- \
  --replication-policy=automatic

echo -n "sk_prod_abc123def456" | gcloud secrets create api-key \
  --data-file=- \
  --replication-policy=automatic

# Verify the secrets exist
gcloud secrets list
```

## Setting Up Authentication

For Talos Linux clusters that are not running on GKE, you need a service account key to authenticate with Google Cloud.

```bash
# Create a service account
gcloud iam service-accounts create talos-secret-reader \
  --display-name "Talos Secret Manager Reader"

# Grant the Secret Manager accessor role
gcloud projects add-iam-policy-binding YOUR_PROJECT_ID \
  --member "serviceAccount:talos-secret-reader@YOUR_PROJECT_ID.iam.gserviceaccount.com" \
  --role "roles/secretmanager.secretAccessor"

# Create and download a key file
gcloud iam service-accounts keys create gcp-sa-key.json \
  --iam-account talos-secret-reader@YOUR_PROJECT_ID.iam.gserviceaccount.com
```

Store the service account key as a Kubernetes secret.

```bash
# Create the secret in the cluster
kubectl create secret generic gcp-sm-credentials \
  --namespace external-secrets \
  --from-file=secret-access-credentials=gcp-sa-key.json

# Remove the local key file for security
rm gcp-sa-key.json
```

## Installing External Secrets Operator

```bash
# Add the Helm repo
helm repo add external-secrets https://charts.external-secrets.io
helm repo update

# Install ESO
helm install external-secrets external-secrets/external-secrets \
  --namespace external-secrets \
  --create-namespace \
  --set installCRDs=true
```

Wait for the pods to be ready.

```bash
kubectl get pods -n external-secrets -w
```

## Creating a ClusterSecretStore for GCP

```yaml
# gcp-cluster-secret-store.yaml
apiVersion: external-secrets.io/v1beta1
kind: ClusterSecretStore
metadata:
  name: gcp-secret-manager
spec:
  provider:
    gcpsm:
      projectID: YOUR_PROJECT_ID
      auth:
        secretRef:
          secretAccessKeySecretRef:
            name: gcp-sm-credentials
            namespace: external-secrets
            key: secret-access-credentials
```

```bash
kubectl apply -f gcp-cluster-secret-store.yaml

# Verify the connection is healthy
kubectl get clustersecretstore gcp-secret-manager
```

The status should show "Valid" if the credentials are correct and the API is reachable.

## Fetching Secrets with ExternalSecret

Create an ExternalSecret to pull your Google Cloud secrets into Kubernetes.

```yaml
# app-external-secret.yaml
apiVersion: external-secrets.io/v1beta1
kind: ExternalSecret
metadata:
  name: my-app-secrets
  namespace: default
spec:
  refreshInterval: 30m
  secretStoreRef:
    name: gcp-secret-manager
    kind: ClusterSecretStore
  target:
    name: my-app-credentials
    creationPolicy: Owner
    deletionPolicy: Retain
  data:
    - secretKey: DB_USERNAME
      remoteRef:
        key: database-username
    - secretKey: DB_PASSWORD
      remoteRef:
        key: database-password
    - secretKey: API_KEY
      remoteRef:
        key: api-key
```

```bash
kubectl apply -f app-external-secret.yaml

# Check the sync status
kubectl get externalsecret my-app-secrets

# Verify the Kubernetes secret
kubectl get secret my-app-credentials
kubectl get secret my-app-credentials -o jsonpath='{.data.DB_USERNAME}' | base64 -d
```

## Fetching Specific Secret Versions

Google Secret Manager supports versioning. You can pin an ExternalSecret to a specific version.

```bash
# Add a new version to a secret
echo -n "new-password-value" | gcloud secrets versions add database-password --data-file=-

# List versions
gcloud secrets versions list database-password
```

```yaml
# Pin to a specific version
spec:
  data:
    - secretKey: DB_PASSWORD
      remoteRef:
        key: database-password
        version: "2"  # Use version 2 specifically
```

Using `latest` (the default) always fetches the most recent enabled version. For production workloads, you might want to pin to a specific version and update it deliberately during deployments.

## Using Templates for Complex Secrets

You can combine multiple secret values into a single formatted output using ESO templates.

```yaml
# connection-string-secret.yaml
apiVersion: external-secrets.io/v1beta1
kind: ExternalSecret
metadata:
  name: db-connection-string
  namespace: default
spec:
  refreshInterval: 30m
  secretStoreRef:
    name: gcp-secret-manager
    kind: ClusterSecretStore
  target:
    name: db-connection
    template:
      type: Opaque
      data:
        # Build a connection string from individual secrets
        DATABASE_URL: "postgresql://{{ .username }}:{{ .password }}@db.example.com:5432/myapp?sslmode=require"
  data:
    - secretKey: username
      remoteRef:
        key: database-username
    - secretKey: password
      remoteRef:
        key: database-password
```

## Using the Secrets Store CSI Driver

As an alternative to ESO, you can use the Secrets Store CSI Driver with the GCP provider to mount secrets directly as files in your pods.

```bash
# Install the CSI driver
helm install csi-secrets-store \
  secrets-store-csi-driver/secrets-store-csi-driver \
  --namespace kube-system \
  --set syncSecret.enabled=true

# Install the GCP provider
kubectl apply -f https://raw.githubusercontent.com/GoogleCloudPlatform/secrets-store-csi-driver-provider-gcp/main/deploy/provider-gcp-plugin.yaml
```

Create a SecretProviderClass.

```yaml
# gcp-secret-provider.yaml
apiVersion: secrets-store.csi.x-k8s.io/v1
kind: SecretProviderClass
metadata:
  name: gcp-secrets
  namespace: default
spec:
  provider: gcp
  parameters:
    secrets: |
      - resourceName: "projects/YOUR_PROJECT_ID/secrets/database-username/versions/latest"
        path: "db-username"
      - resourceName: "projects/YOUR_PROJECT_ID/secrets/database-password/versions/latest"
        path: "db-password"
      - resourceName: "projects/YOUR_PROJECT_ID/secrets/api-key/versions/latest"
        path: "api-key"
```

Mount the secrets in a pod.

```yaml
# app-with-csi.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-app
  namespace: default
spec:
  replicas: 1
  selector:
    matchLabels:
      app: my-app
  template:
    metadata:
      labels:
        app: my-app
    spec:
      serviceAccountName: my-app-sa
      containers:
        - name: app
          image: my-app:latest
          volumeMounts:
            - name: secrets
              mountPath: /var/secrets
              readOnly: true
      volumes:
        - name: secrets
          csi:
            driver: secrets-store.csi.k8s.io
            readOnly: true
            volumeAttributes:
              secretProviderClass: gcp-secrets
```

## Setting Up Secret Rotation Notifications

Google Secret Manager supports Pub/Sub notifications when secrets are rotated. You can use this to trigger immediate refreshes in your cluster.

```bash
# Create a Pub/Sub topic for secret events
gcloud pubsub topics create secret-rotation-events

# Set up a notification on the secret
gcloud secrets update database-password \
  --add-topics=projects/YOUR_PROJECT_ID/topics/secret-rotation-events \
  --event-types=SECRET_VERSION_ADD
```

You can then build a small controller or use a Pub/Sub subscriber to trigger a refresh of the ExternalSecret when a notification arrives, rather than waiting for the refresh interval.

## Least Privilege Access

Follow the principle of least privilege when setting up access to Google Secret Manager.

```bash
# Create a custom role with minimal permissions
gcloud iam roles create secretReader \
  --project=YOUR_PROJECT_ID \
  --title="Secret Reader" \
  --description="Read-only access to specific secrets" \
  --permissions=secretmanager.versions.access,secretmanager.secrets.get

# Grant per-secret access instead of project-wide access
gcloud secrets add-iam-policy-binding database-username \
  --member="serviceAccount:talos-secret-reader@YOUR_PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"

gcloud secrets add-iam-policy-binding database-password \
  --member="serviceAccount:talos-secret-reader@YOUR_PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"
```

## Monitoring Secret Access

Enable audit logging to track who accesses your secrets.

```bash
# View recent access logs
gcloud logging read 'resource.type="secretmanager.googleapis.com/Secret"' \
  --limit=20 \
  --format=json
```

Set up alerting for unusual access patterns or failed access attempts.

## Wrapping Up

Integrating Google Secret Manager with a Talos Linux cluster provides a solid foundation for secrets management. The External Secrets Operator gives you a Kubernetes-native way to sync secrets with automatic refresh, while the CSI Driver approach offers file-based access without intermediate Kubernetes Secrets. On Talos Linux, where the OS layer is locked down, these Kubernetes-level integration patterns are the right approach. Combine this with least-privilege IAM policies, secret versioning, and audit logging to build a complete secrets management workflow that is both secure and operationally manageable.
