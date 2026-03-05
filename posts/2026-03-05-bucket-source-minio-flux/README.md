# How to Configure Bucket Source with MinIO in Flux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, GitOps, Kubernetes, MinIO, S3, Bucket, Self-Hosted

Description: Learn how to configure Flux CD to pull Kubernetes manifests from a self-hosted MinIO object storage instance using the generic S3-compatible provider.

---

## Introduction

MinIO is a high-performance, S3-compatible object storage system that you can self-host on Kubernetes or bare metal. It is a popular choice for teams that want S3-compatible storage without depending on a cloud provider. Flux CD supports MinIO through its `generic` provider, which works with any S3-compatible API. This guide covers deploying MinIO, configuring it as a Flux Bucket source, and integrating it into your GitOps workflow.

## Prerequisites

- Flux CD v2.0 or later installed on your Kubernetes cluster
- `kubectl` access to your cluster
- Helm (optional, for deploying MinIO)
- MinIO client (`mc`) installed locally

## Deploying MinIO on Kubernetes

If you do not already have a MinIO instance, you can deploy one using Helm.

```bash
# Add the MinIO Helm repository
helm repo add minio https://charts.min.io/
helm repo update

# Install MinIO with default settings
helm install minio minio/minio \
  --namespace default \
  --set rootUser=minioadmin \
  --set rootPassword=minioadmin123 \
  --set mode=standalone \
  --set persistence.size=10Gi
```

Verify the deployment.

```bash
# Check that MinIO is running
kubectl get pods -l app=minio

# Port-forward to access MinIO locally
kubectl port-forward svc/minio 9000:9000 &
```

## Creating a Bucket and Uploading Manifests

Use the MinIO client to create a bucket and upload your manifests.

```bash
# Configure the MinIO client alias
mc alias set myminio http://localhost:9000 minioadmin minioadmin123

# Create a bucket for Flux manifests
mc mb myminio/flux-manifests

# Upload your Kubernetes manifests
mc cp --recursive ./manifests/ myminio/flux-manifests/
```

## Creating Flux Credentials

Create a Kubernetes secret with the MinIO access credentials. The `generic` provider expects `accesskey` and `secretkey` fields.

```bash
# Create a secret with MinIO credentials
kubectl create secret generic minio-bucket-creds \
  --namespace flux-system \
  --from-literal=accesskey=minioadmin \
  --from-literal=secretkey=minioadmin123
```

## Configuring the Bucket Source

Create a Bucket source pointing to your MinIO instance. Use the `generic` provider for S3-compatible storage.

```yaml
# flux-system/minio-bucket-source.yaml
apiVersion: source.toolkit.fluxcd.io/v1beta2
kind: Bucket
metadata:
  name: my-app
  namespace: flux-system
spec:
  interval: 5m
  # Use generic provider for S3-compatible storage like MinIO
  provider: generic
  bucketName: flux-manifests
  # MinIO service endpoint within the cluster
  endpoint: minio.default.svc.cluster.local:9000
  # Set insecure to true if MinIO is running without TLS
  insecure: true
  secretRef:
    name: minio-bucket-creds
```

Apply and verify.

```bash
# Apply the Bucket source
kubectl apply -f minio-bucket-source.yaml

# Check the status
flux get sources bucket -n flux-system
```

## Configuring MinIO with TLS

For production environments, MinIO should be configured with TLS. Create a TLS certificate and configure the Bucket source to trust it.

```bash
# Create a self-signed certificate for MinIO (for testing)
openssl req -x509 -nodes -days 365 \
  -newkey rsa:2048 \
  -keyout minio-tls.key \
  -out minio-tls.crt \
  -subj "/CN=minio.default.svc.cluster.local"

# Create a TLS secret for MinIO
kubectl create secret tls minio-tls \
  --namespace default \
  --cert=minio-tls.crt \
  --key=minio-tls.key

# Create a CA cert secret for Flux to trust the self-signed cert
kubectl create secret generic minio-ca \
  --namespace flux-system \
  --from-file=ca.crt=minio-tls.crt
```

Update the Bucket source to use TLS.

```yaml
# flux-system/minio-bucket-tls.yaml
apiVersion: source.toolkit.fluxcd.io/v1beta2
kind: Bucket
metadata:
  name: my-app
  namespace: flux-system
spec:
  interval: 5m
  provider: generic
  bucketName: flux-manifests
  endpoint: minio.default.svc.cluster.local:9000
  # Remove insecure flag and add cert reference
  secretRef:
    name: minio-bucket-creds
  certSecretRef:
    name: minio-ca
```

## Creating a Dedicated MinIO User for Flux

For better security, create a dedicated MinIO user with read-only access.

```bash
# Create a read-only policy for Flux
cat > flux-readonly-policy.json <<'EOF'
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:GetObject",
        "s3:ListBucket",
        "s3:GetBucketLocation"
      ],
      "Resource": [
        "arn:aws:s3:::flux-manifests",
        "arn:aws:s3:::flux-manifests/*"
      ]
    }
  ]
}
EOF

# Create the policy in MinIO
mc admin policy create myminio flux-readonly flux-readonly-policy.json

# Create a dedicated user for Flux
mc admin user add myminio flux-reader FluxReaderPassword123

# Attach the read-only policy to the user
mc admin policy attach myminio flux-readonly --user flux-reader
```

Update the Kubernetes secret with the new credentials.

```bash
# Update the secret with dedicated credentials
kubectl delete secret minio-bucket-creds -n flux-system
kubectl create secret generic minio-bucket-creds \
  --namespace flux-system \
  --from-literal=accesskey=flux-reader \
  --from-literal=secretkey=FluxReaderPassword123
```

## Connecting a Kustomization

Deploy the manifests from the MinIO Bucket source.

```yaml
# flux-system/my-app-kustomization.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: my-app
  namespace: flux-system
spec:
  interval: 10m
  targetNamespace: my-app
  sourceRef:
    kind: Bucket
    name: my-app
  path: ./
  prune: true
  wait: true
```

## CI/CD Integration

Upload manifests to MinIO from your CI/CD pipeline.

```yaml
# .github/workflows/upload-to-minio.yaml
name: Upload Manifests to MinIO
on:
  push:
    branches: [main]
    paths: ['manifests/**']

jobs:
  upload:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Install MinIO client
        run: |
          curl -sL https://dl.min.io/client/mc/release/linux-amd64/mc -o /usr/local/bin/mc
          chmod +x /usr/local/bin/mc

      - name: Upload manifests
        run: |
          # Configure MinIO client
          mc alias set myminio ${{ secrets.MINIO_ENDPOINT }} \
            ${{ secrets.MINIO_ACCESS_KEY }} \
            ${{ secrets.MINIO_SECRET_KEY }}

          # Sync manifests to MinIO
          mc mirror --overwrite --remove ./manifests/ myminio/flux-manifests/
```

## Verifying the Setup

```bash
# Check Bucket source status
flux get sources bucket -n flux-system

# Describe for details
kubectl describe bucket my-app -n flux-system

# Verify the Kustomization is reconciled
flux get kustomizations -n flux-system
```

## Troubleshooting

**Error: dial tcp: connection refused**

MinIO is not reachable from the Flux source-controller. Verify the endpoint and network connectivity.

```bash
# Test connectivity from within the cluster
kubectl run -n flux-system test-conn --rm -it --image=busybox -- \
  wget -q -O- http://minio.default.svc.cluster.local:9000/minio/health/live
```

**Error: Access Denied**

The credentials are incorrect or the user does not have sufficient permissions. Verify the access key and policy.

**Error: x509 certificate signed by unknown authority**

MinIO uses TLS with a self-signed certificate that Flux does not trust. Add the CA certificate via `certSecretRef`.

## Best Practices

1. **Use TLS in production.** Always configure MinIO with TLS certificates for encrypted communication.

2. **Create dedicated users.** Do not use the root MinIO credentials for Flux. Create a read-only user with scoped permissions.

3. **Enable MinIO versioning.** Turn on bucket versioning to maintain a history of manifest changes.

4. **Run MinIO in distributed mode.** For production, deploy MinIO in distributed mode for high availability.

5. **Monitor MinIO health.** Set up health checks and alerts for the MinIO deployment to catch storage issues early.

## Conclusion

MinIO provides a self-hosted, S3-compatible storage solution that works seamlessly with Flux CD through the `generic` provider. By deploying MinIO on Kubernetes, creating dedicated credentials, and configuring the Bucket source with the endpoint `minio.default.svc.cluster.local:9000`, you can build a fully self-contained GitOps workflow without depending on cloud provider services. This is particularly valuable for on-premises environments, development clusters, and air-gapped deployments.
